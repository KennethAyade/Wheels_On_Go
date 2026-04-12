package com.wheelsongo.app.ui.screens.auth

import android.app.Application
import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.repository.AuthRepository
import com.wheelsongo.app.utils.FaceLivenessCheck
import com.wheelsongo.app.utils.FaceLivenessResult
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
 * Captures a selfie via camera, runs an on-device liveness check,
 * then sends to the backend for identity verification.
 */
class BiometricVerificationViewModel @JvmOverloads constructor(
    application: Application,
    private val authRepository: AuthRepository = AuthRepository()
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(BiometricVerificationUiState())
    val uiState: StateFlow<BiometricVerificationUiState> = _uiState.asStateFlow()

    companion object {
        private const val MIN_BACKEND_CONFIDENCE = 70f
    }

    fun onPhotoCaptured(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isVerifying = true, errorMessage = null) }

            val liveness = FaceLivenessCheck.check(bitmap)
            if (liveness !is FaceLivenessResult.Valid) {
                _uiState.update {
                    it.copy(
                        isVerifying = false,
                        errorMessage = FaceLivenessCheck.userMessageFor(liveness)
                    )
                }
                return@launch
            }

            val base64 = try {
                encodeBitmapToBase64(bitmap)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isVerifying = false,
                        errorMessage = "Failed to process image. Please try again."
                    )
                }
                return@launch
            }

            _uiState.update { it.copy(capturedImageBase64 = base64) }

            val result = authRepository.verifyBiometric(base64)
            result.fold(
                onSuccess = { response ->
                    val confidenceOk = (response.confidence ?: 0f) >= MIN_BACKEND_CONFIDENCE
                    if (response.match && confidenceOk) {
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
                            errorMessage = error.message ?: "Verification failed. Please try again."
                        )
                    }
                }
            )
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

    fun onPermissionDenied() {
        _uiState.update {
            it.copy(errorMessage = "Camera permission is required for face verification. Please grant camera access in Settings.")
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
