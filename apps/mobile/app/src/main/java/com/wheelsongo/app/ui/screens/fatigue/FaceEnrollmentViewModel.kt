package com.wheelsongo.app.ui.screens.fatigue

import android.app.Application
import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.fatigue.FaceEnrollRequest
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

data class FaceEnrollmentUiState(
    val isEnrolling: Boolean = false,
    val isEnrolled: Boolean = false,
    val errorMessage: String? = null
)

class FaceEnrollmentViewModel @JvmOverloads constructor(
    application: Application
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(FaceEnrollmentUiState())
    val uiState: StateFlow<FaceEnrollmentUiState> = _uiState.asStateFlow()

    fun onPhotoCaptured(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isEnrolling = true, errorMessage = null) }

            try {
                val base64 = encodeBitmapToBase64(bitmap)
                val response = ApiClient.fatigueApi.enrollFace(FaceEnrollRequest(base64))

                if (response.isSuccessful && response.body()?.success == true) {
                    ApiClient.getTokenManager().saveFaceEnrolled(true)
                    _uiState.update { it.copy(isEnrolling = false, isEnrolled = true) }
                } else {
                    val errorBody = response.errorBody()?.string()
                    val msg = errorBody?.let {
                        try {
                            org.json.JSONObject(it).optString("message", "Enrollment failed")
                        } catch (_: Exception) { "Enrollment failed" }
                    } ?: "Enrollment failed"
                    _uiState.update { it.copy(isEnrolling = false, errorMessage = msg) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isEnrolling = false, errorMessage = e.message ?: "Failed to enroll face")
                }
            }
        }
    }

    private fun encodeBitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    fun onPermissionDenied() {
        _uiState.update {
            it.copy(errorMessage = "Camera permission is required for face enrollment. Please grant camera access in Settings.")
        }
    }
}
