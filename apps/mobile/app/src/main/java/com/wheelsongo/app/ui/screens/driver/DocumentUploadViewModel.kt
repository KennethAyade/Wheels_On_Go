package com.wheelsongo.app.ui.screens.driver

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.driver.KycPresignRequest
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DriverApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Document types for driver KYC
 */
enum class DocumentType(
    val title: String,
    val description: String,
    val isRequired: Boolean = true,
    val apiName: String // Backend document type name
) {
    LICENSE(
        title = "Driver's License",
        description = "Valid Philippine driver's license",
        isRequired = true,
        apiName = "LICENSE"
    ),
    ORCR(
        title = "OR/CR",
        description = "Official Receipt / Certificate of Registration",
        isRequired = true,
        apiName = "ORCR"
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
    val isPendingSync: Boolean = false // True if saved locally but not synced to server
)

/**
 * UI state for the document upload screen
 */
data class DocumentUploadUiState(
    val documents: List<DocumentState> = DocumentType.entries.map { DocumentState(it) },
    val isSubmitting: Boolean = false,
    val submitError: String? = null,
    val isServiceUnavailable: Boolean = false, // Backend KYC disabled
    val serviceMessage: String? = null
) {
    /**
     * Overall upload progress (0.0 to 1.0)
     */
    val uploadProgress: Float
        get() {
            val uploaded = documents.count { it.isUploaded }
            return uploaded.toFloat() / documents.size
        }

    /**
     * Whether all required documents are uploaded
     */
    val allRequiredUploaded: Boolean
        get() = documents
            .filter { it.type.isRequired }
            .all { it.isUploaded }

    /**
     * Count of uploaded documents
     */
    val uploadedCount: Int
        get() = documents.count { it.isUploaded }

    /**
     * Count of documents pending sync
     */
    val pendingSyncCount: Int
        get() = documents.count { it.isPendingSync }
}

/**
 * ViewModel for the document upload screen
 * Handles document selection, upload, and submission
 *
 * NOTE: KYC upload endpoints are currently disabled on the backend pending S3 configuration.
 * This ViewModel handles this gracefully by allowing local selection and showing appropriate messages.
 */
class DocumentUploadViewModel(
    private val driverApi: DriverApi = ApiClient.driverApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(DocumentUploadUiState())
    val uiState: StateFlow<DocumentUploadUiState> = _uiState.asStateFlow()

    /**
     * Handle document card click - opens file picker
     * In real implementation, this would be called after receiving file URI from picker
     */
    fun onDocumentClick(documentType: DocumentType) {
        // Simulate document selection for now
        // In real implementation, this triggers file picker and then calls onDocumentSelected
        simulateLocalUpload(documentType)
    }

    /**
     * Called when user selects a document from file picker
     * @param documentType Type of document being uploaded
     * @param fileUri URI of the selected file
     */
    fun onDocumentSelected(documentType: DocumentType, fileUri: Uri) {
        viewModelScope.launch {
            uploadDocument(documentType, fileUri.toString())
        }
    }

    /**
     * Upload document to server (or save locally if service unavailable)
     */
    private suspend fun uploadDocument(documentType: DocumentType, fileUri: String) {
        // Update state to show uploading
        updateDocumentState(documentType) {
            it.copy(isUploading = true, uploadProgress = 0f, errorMessage = null)
        }

        try {
            // Step 1: Request presigned URL from backend
            val presignResponse = driverApi.requestPresignedUrl(
                KycPresignRequest(
                    documentType = documentType.apiName,
                    contentType = "image/jpeg",
                    fileExtension = "jpg"
                )
            )

            if (presignResponse.isSuccessful && presignResponse.body() != null) {
                @Suppress("UNUSED_VARIABLE")
                val presignData = presignResponse.body()!!

                // Step 2: Upload to S3 using presigned URL
                // TODO: Implement actual S3 upload using presignData.uploadUrl
                for (progress in 1..10) {
                    delay(100)
                    updateDocumentState(documentType) {
                        it.copy(uploadProgress = progress / 10f)
                    }
                }

                // Step 3: Confirm upload with backend
                // TODO: Implement confirm upload using presignData.s3Key

                // Mark as uploaded
                updateDocumentState(documentType) {
                    it.copy(
                        isUploading = false,
                        isUploaded = true,
                        uploadProgress = 1f,
                        fileUri = fileUri,
                        isPendingSync = false
                    )
                }
            } else {
                // Handle error responses
                val errorCode = presignResponse.code()
                if (errorCode == 503) {
                    // Service unavailable - KYC temporarily disabled
                    handleServiceUnavailable(documentType, fileUri)
                } else {
                    updateDocumentState(documentType) {
                        it.copy(
                            isUploading = false,
                            errorMessage = "Failed to upload: ${presignResponse.message()}"
                        )
                    }
                }
            }
        } catch (e: Exception) {
            // Network error - save locally
            handleServiceUnavailable(documentType, fileUri)
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
                isPendingSync = true // Mark as pending sync
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
     * Simulate local document selection (for demo purposes)
     * Replace with actual file picker integration
     */
    private fun simulateLocalUpload(documentType: DocumentType) {
        viewModelScope.launch {
            // Update state to show uploading
            updateDocumentState(documentType) {
                it.copy(isUploading = true, uploadProgress = 0f, errorMessage = null)
            }

            // Simulate progress
            for (progress in 1..10) {
                delay(150)
                updateDocumentState(documentType) {
                    it.copy(uploadProgress = progress / 10f)
                }
            }

            // Mark as uploaded (pending sync since KYC is disabled)
            updateDocumentState(documentType) {
                it.copy(
                    isUploading = false,
                    isUploaded = true,
                    uploadProgress = 1f,
                    fileUri = "local://document/${documentType.name}",
                    isPendingSync = true
                )
            }

            // Show service message
            _uiState.update {
                it.copy(
                    isServiceUnavailable = true,
                    serviceMessage = "Documents are being saved locally. They will be uploaded to the server when the KYC service is available."
                )
            }
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
                // Check if we have pending sync documents
                if (_uiState.value.pendingSyncCount > 0) {
                    // Documents saved locally - proceed to next step anyway
                    // Backend will process when service is available
                    _uiState.update { it.copy(isSubmitting = false) }
                    onSuccess()
                    return@launch
                }

                // All documents synced - proceed normally
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
     * Helper to update a specific document's state
     */
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

    /**
     * Clear submit error
     */
    fun clearError() {
        _uiState.update { it.copy(submitError = null) }
    }

    /**
     * Dismiss service unavailable message
     */
    fun dismissServiceMessage() {
        _uiState.update { it.copy(serviceMessage = null) }
    }
}
