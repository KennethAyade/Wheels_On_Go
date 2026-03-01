package com.wheelsongo.app.ui.screens.auth

import android.app.Application
import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

data class BiometricVerificationUiState(
    val isCapturing: Boolean = false,
    val isVerifying: Boolean = false,
    val isVerified: Boolean = false,
    val capturedImageBase64: String? = null,
    val errorMessage: String? = null
)

/**
 * ViewModel for the biometric (face) verification screen.
 * Captures a selfie via camera, encodes to Base64, and sends to backend.
 */
class BiometricVerificationViewModel @JvmOverloads constructor(
    application: Application,
    private val authRepository: AuthRepository = AuthRepository()
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(BiometricVerificationUiState())
    val uiState: StateFlow<BiometricVerificationUiState> = _uiState.asStateFlow()

    /**
     * Called when a photo is captured from the camera.
     * Encodes bitmap to Base64 and triggers verification.
     */
    fun onPhotoCaptured(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isVerifying = true, errorMessage = null) }

            try {
                // Encode bitmap to Base64 JPEG
                val base64 = encodeBitmapToBase64(bitmap)
                _uiState.update { it.copy(capturedImageBase64 = base64) }

                // Send to backend for verification
                val result = authRepository.verifyBiometric(base64)

                result.fold(
                    onSuccess = { response ->
                        if (response.match) {
                            _uiState.update {
                                it.copy(isVerifying = false, isVerified = true)
                            }
                        } else {
                            _uiState.update {
                                it.copy(
                                    isVerifying = false,
                                    errorMessage = "Face did not match. Please try again."
                                )
                            }
                        }
                    },
                    onFailure = { error ->
                        _uiState.update {
                            it.copy(
                                isVerifying = false,
                                errorMessage = error.message ?: "Verification failed"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isVerifying = false,
                        errorMessage = e.message ?: "Failed to process image"
                    )
                }
            }
        }
    }

    /**
     * Encode a Bitmap to Base64 JPEG string.
     * Scales down to max 640px on longest side to keep payload small.
     */
    private fun encodeBitmapToBase64(bitmap: Bitmap): String {
        val scaled = scaleBitmap(bitmap, maxDimension = 640)
        val outputStream = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 60, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun scaleBitmap(bitmap: Bitmap, maxDimension: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        if (width <= maxDimension && height <= maxDimension) return bitmap
        val ratio = maxDimension.toFloat() / maxOf(width, height).toFloat()
        val newWidth = (width * ratio).toInt()
        val newHeight = (height * ratio).toInt()
        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }

    /**
     * Called when user denies camera permission
     */
    fun onPermissionDenied() {
        _uiState.update {
            it.copy(errorMessage = "Camera permission is required for face verification. Please grant camera access in Settings.")
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
