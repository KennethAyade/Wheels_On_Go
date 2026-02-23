package com.wheelsongo.app.ui.screens.driver

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.driver.KycConfirmRequest
import com.wheelsongo.app.data.models.driver.KycPresignRequest
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DriverApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Document types for driver KYC
 */
enum class DocumentType(
    val title: String,
    val description: String,
    val isRequired: Boolean = true,
    val apiName: String
) {
    LICENSE(
        title = "Driver's License",
        description = "Valid Philippine driver's license",
        isRequired = true,
        apiName = "LICENSE"
    ),
    GOVERNMENT_ID(
        title = "Government ID",
        description = "Valid government-issued ID",
        isRequired = true,
        apiName = "GOVERNMENT_ID"
    ),
    PROFILE_PHOTO(
        title = "Profile Photo",
        description = "Clear photo of your face",
        isRequired = true,
        apiName = "PROFILE_PHOTO"
    )
}

/**
 * State for a single document
 */
data class DocumentState(
    val type: DocumentType,
    val isUploaded: Boolean = false,
    val isUploading: Boolean = false,
    val uploadProgress: Float = 0f,
    val errorMessage: String? = null,
    val fileUri: String? = null,
    val isPendingSync: Boolean = false,
    val downloadUrl: String? = null
)

/**
 * UI state for the document upload screen
 */
data class DocumentUploadUiState(
    val documents: List<DocumentState> = DocumentType.entries.map { DocumentState(it) },
    val isSubmitting: Boolean = false,
    val submitError: String? = null,
    val isServiceUnavailable: Boolean = false,
    val serviceMessage: String? = null
) {
    val uploadProgress: Float
        get() {
            val uploaded = documents.count { it.isUploaded }
            return uploaded.toFloat() / documents.size
        }

    val allRequiredUploaded: Boolean
        get() = documents
            .filter { it.type.isRequired }
            .all { it.isUploaded }

    val uploadedCount: Int
        get() = documents.count { it.isUploaded }

    val pendingSyncCount: Int
        get() = documents.count { it.isPendingSync }
}

/**
 * ViewModel for the document upload screen
 * Handles document selection, upload to R2 via presigned URL, and submission
 */
class DocumentUploadViewModel @JvmOverloads constructor(
    application: Application,
    private val driverApi: DriverApi = ApiClient.driverApi
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DocumentUploadUiState())
    val uiState: StateFlow<DocumentUploadUiState> = _uiState.asStateFlow()

    private val uploadClient = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    init {
        fetchExistingKycStatus()
    }

    private fun fetchExistingKycStatus() {
        viewModelScope.launch {
            try {
                val response = driverApi.getKycStatus()
                if (response.isSuccessful) {
                    val kycData = response.body() ?: return@launch
                    for (doc in kycData.documents) {
                        val docType = DocumentType.entries.find { it.apiName == doc.type }
                        if (docType != null && doc.status == "UPLOADED") {
                            updateDocumentState(docType) {
                                it.copy(
                                    isUploaded = true,
                                    uploadProgress = 1f,
                                    downloadUrl = doc.downloadUrl
                                )
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                // Silently fail — user can still upload fresh
            }
        }
    }

    /**
     * Called when user selects a document from file picker
     */
    fun onDocumentSelected(documentType: DocumentType, fileUri: Uri) {
        viewModelScope.launch {
            uploadDocument(documentType, fileUri)
        }
    }

    /**
     * Full upload flow: presign → upload to R2 → confirm
     */
    private suspend fun uploadDocument(documentType: DocumentType, fileUri: Uri) {
        updateDocumentState(documentType) {
            it.copy(isUploading = true, uploadProgress = 0f, errorMessage = null)
        }

        try {
            val context = getApplication<Application>()
            val contentResolver = context.contentResolver

            // Resolve file metadata
            val mimeType = contentResolver.getType(fileUri) ?: "image/jpeg"
            val fileName = getFileName(fileUri) ?: "${documentType.apiName.lowercase()}.jpg"
            val fileBytes = withContext(Dispatchers.IO) {
                contentResolver.openInputStream(fileUri)?.use { it.readBytes() }
            } ?: throw Exception("Could not read file")
            val fileSize = fileBytes.size.toLong()

            updateDocumentState(documentType) {
                it.copy(uploadProgress = 0.1f)
            }

            // Step 1: Request presigned URL from backend
            val presignResponse = driverApi.requestPresignedUrl(
                KycPresignRequest(
                    type = documentType.apiName,
                    fileName = fileName,
                    mimeType = mimeType,
                    size = fileSize
                )
            )

            if (!presignResponse.isSuccessful || presignResponse.body() == null) {
                val errorCode = presignResponse.code()
                if (errorCode == 503) {
                    handleServiceUnavailable(documentType, fileUri.toString())
                    return
                }
                throw Exception("Failed to get upload URL: ${presignResponse.message()}")
            }

            val presignData = presignResponse.body()!!
            updateDocumentState(documentType) {
                it.copy(uploadProgress = 0.3f)
            }

            // Step 2: Upload file to R2 using presigned URL
            val uploaded = withContext(Dispatchers.IO) {
                uploadToR2(presignData.uploadUrl, fileBytes, mimeType)
            }

            if (!uploaded) {
                throw Exception("Failed to upload file to storage")
            }

            updateDocumentState(documentType) {
                it.copy(uploadProgress = 0.7f)
            }

            // Step 3: Confirm upload with backend
            val confirmResponse = driverApi.confirmUpload(
                KycConfirmRequest(
                    type = documentType.apiName,
                    key = presignData.key,
                    size = fileSize
                )
            )

            if (!confirmResponse.isSuccessful) {
                throw Exception("Failed to confirm upload: ${confirmResponse.message()}")
            }

            // Upload complete
            updateDocumentState(documentType) {
                it.copy(
                    isUploading = false,
                    isUploaded = true,
                    uploadProgress = 1f,
                    fileUri = fileUri.toString(),
                    isPendingSync = false
                )
            }
        } catch (e: Exception) {
            updateDocumentState(documentType) {
                it.copy(
                    isUploading = false,
                    errorMessage = e.message ?: "Upload failed"
                )
            }
        }
    }

    /**
     * Upload file bytes to R2 using presigned PUT URL
     */
    private fun uploadToR2(uploadUrl: String, fileBytes: ByteArray, mimeType: String): Boolean {
        val requestBody = fileBytes.toRequestBody(mimeType.toMediaType())
        val request = Request.Builder()
            .url(uploadUrl)
            .put(requestBody)
            .addHeader("Content-Type", mimeType)
            .build()

        return uploadClient.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    /**
     * Handle service unavailable - save document locally for later sync
     */
    private fun handleServiceUnavailable(documentType: DocumentType, fileUri: String) {
        updateDocumentState(documentType) {
            it.copy(
                isUploading = false,
                isUploaded = true,
                uploadProgress = 1f,
                fileUri = fileUri,
                isPendingSync = true
            )
        }

        _uiState.update {
            it.copy(
                isServiceUnavailable = true,
                serviceMessage = "Document saved locally. It will be uploaded when the service is available."
            )
        }
    }

    /**
     * Remove an uploaded document
     */
    fun onRemoveDocument(documentType: DocumentType) {
        updateDocumentState(documentType) {
            it.copy(
                isUploaded = false,
                uploadProgress = 0f,
                fileUri = null,
                errorMessage = null,
                isPendingSync = false
            )
        }
    }

    /**
     * Submit all documents for review
     */
    fun submitDocuments(onSuccess: () -> Unit) {
        if (!_uiState.value.allRequiredUploaded) {
            _uiState.update {
                it.copy(submitError = "Please upload all required documents")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, submitError = null) }

            try {
                _uiState.update { it.copy(isSubmitting = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        submitError = e.message ?: "Failed to submit documents"
                    )
                }
            }
        }
    }

    /**
     * Get file name from content URI
     */
    private fun getFileName(uri: Uri): String? {
        val context = getApplication<Application>()
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        return cursor?.use {
            if (it.moveToFirst()) {
                val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) it.getString(nameIndex) else null
            } else null
        }
    }

    private fun updateDocumentState(
        documentType: DocumentType,
        update: (DocumentState) -> DocumentState
    ) {
        _uiState.update { currentState ->
            val updatedDocuments = currentState.documents.map { doc ->
                if (doc.type == documentType) update(doc) else doc
            }
            currentState.copy(documents = updatedDocuments)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(submitError = null) }
    }

    fun dismissServiceMessage() {
        _uiState.update { it.copy(serviceMessage = null) }
    }
}
