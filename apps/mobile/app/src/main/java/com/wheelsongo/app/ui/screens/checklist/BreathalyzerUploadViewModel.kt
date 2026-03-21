package com.wheelsongo.app.ui.screens.checklist

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.checklist.ConfirmBreathalyzerRequest
import com.wheelsongo.app.data.models.checklist.PresignBreathalyzerRequest
import com.wheelsongo.app.data.network.ApiClient
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
import java.util.concurrent.TimeUnit

data class BreathalyzerUiState(
    val imageUri: Uri? = null,
    val isUploading: Boolean = false,
    val isVerifying: Boolean = false,
    val result: String? = null, // "PASS" | "FAIL" | "INVALID_IMAGE"
    val bacReading: Float? = null,
    val cooldownUntil: String? = null,
    val errorMessage: String? = null,
    val isPassed: Boolean = false,
    val details: String? = null
)

class BreathalyzerUploadViewModel(application: Application) : AndroidViewModel(application) {

    private val checklistApi = ApiClient.checklistApi

    private val uploadClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val _uiState = MutableStateFlow(BreathalyzerUiState())
    val uiState: StateFlow<BreathalyzerUiState> = _uiState.asStateFlow()

    fun onPhotoCaptured(uri: Uri) {
        _uiState.update { it.copy(imageUri = uri, result = null, errorMessage = null) }
    }

    fun uploadAndVerify(rideId: String) {
        val uri = _uiState.value.imageUri ?: return

        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isUploading = true, errorMessage = null, result = null) }

                val context = getApplication<Application>()
                val contentResolver = context.contentResolver
                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val fileBytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw Exception("Could not read image file")

                val fileName = "breathalyzer_${System.currentTimeMillis()}.jpg"

                // Step 1: Get presigned URL
                val presignResponse = checklistApi.presignBreathalyzer(
                    PresignBreathalyzerRequest(fileName = fileName, mimeType = mimeType)
                )

                if (!presignResponse.isSuccessful || presignResponse.body() == null) {
                    throw Exception(extractErrorMessage(presignResponse) ?: "Failed to get upload URL")
                }

                val presignData = presignResponse.body()!!

                // Step 2: Upload to R2
                _uiState.update { it.copy(isUploading = true) }

                val uploaded = withContext(Dispatchers.IO) {
                    uploadToR2(presignData.uploadUrl, fileBytes, mimeType)
                }

                if (!uploaded) {
                    throw Exception("Failed to upload image. Please check your internet connection and try again.")
                }

                // Step 3: Confirm and verify via AI
                _uiState.update { it.copy(isUploading = false, isVerifying = true) }

                val confirmResponse = checklistApi.confirmBreathalyzer(
                    ConfirmBreathalyzerRequest(key = presignData.key, rideId = rideId)
                )

                if (!confirmResponse.isSuccessful || confirmResponse.body() == null) {
                    throw Exception(extractErrorMessage(confirmResponse) ?: "Verification failed. Please try again.")
                }

                val result = confirmResponse.body()!!

                _uiState.update {
                    it.copy(
                        isVerifying = false,
                        result = result.result,
                        bacReading = result.bacReading,
                        cooldownUntil = result.cooldownUntil,
                        isPassed = result.passed,
                        details = result.details
                    )
                }
            } catch (e: Exception) {
                android.util.Log.e("BreathalyzerVM", "Upload/verify failed", e)
                _uiState.update {
                    it.copy(
                        isUploading = false,
                        isVerifying = false,
                        errorMessage = e.message ?: "An error occurred"
                    )
                }
            }
        }
    }

    fun resetForRetry() {
        _uiState.update {
            it.copy(
                imageUri = null,
                result = null,
                errorMessage = null,
                isPassed = false,
                details = null
            )
        }
    }

    /**
     * Extract the error message from a failed Retrofit response.
     * NestJS returns JSON like {"message":"Ride not found","statusCode":400}
     */
    private fun <T> extractErrorMessage(response: retrofit2.Response<T>): String? {
        return try {
            val errorBody = response.errorBody()?.string() ?: return null
            val json = org.json.JSONObject(errorBody)
            json.optString("message", null)
        } catch (_: Exception) {
            null
        }
    }

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
}
