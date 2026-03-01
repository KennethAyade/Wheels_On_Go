package com.wheelsongo.app.ui.screens.fatigue

import android.app.Application
import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.fatigue.FatigueCheckRequest
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

data class FatigueCheckUiState(
    val isChecking: Boolean = false,
    val isPassed: Boolean = false,
    val isDenied: Boolean = false,
    val fatigueLevel: String? = null,
    val reasons: List<String> = emptyList(),
    val cooldownMinutes: Int = 0,
    val cooldownUntilMs: Long = 0L,
    val errorMessage: String? = null
)

class FatigueCheckViewModel @JvmOverloads constructor(
    application: Application
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(FatigueCheckUiState())
    val uiState: StateFlow<FatigueCheckUiState> = _uiState.asStateFlow()

    fun onPhotoCaptured(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isChecking = true, errorMessage = null, isDenied = false, isPassed = false) }

            try {
                val base64 = encodeBitmapToBase64(bitmap)
                val response = ApiClient.fatigueApi.checkFatigue(FatigueCheckRequest(base64))

                if (response.isSuccessful) {
                    val body = response.body()!!
                    if (!body.isFatigued) {
                        _uiState.update {
                            it.copy(isChecking = false, isPassed = true, isDenied = false)
                        }
                    } else {
                        val cooldownMs = System.currentTimeMillis() + (body.cooldownMinutes * 60 * 1000L)
                        _uiState.update {
                            it.copy(
                                isChecking = false,
                                isPassed = false,
                                isDenied = true,
                                fatigueLevel = body.fatigueLevel,
                                reasons = body.reasons,
                                cooldownMinutes = body.cooldownMinutes,
                                cooldownUntilMs = cooldownMs
                            )
                        }
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    val msg = errorBody?.let {
                        try {
                            org.json.JSONObject(it).optString("message", "Check failed")
                        } catch (_: Exception) { "Check failed" }
                    } ?: "Check failed"
                    _uiState.update { it.copy(isChecking = false, errorMessage = msg) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isChecking = false, errorMessage = e.message ?: "Failed to check fatigue")
                }
            }
        }
    }

    fun resetForRetry() {
        _uiState.update {
            it.copy(isDenied = false, isPassed = false, errorMessage = null, isChecking = false)
        }
    }

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
        return Bitmap.createScaledBitmap(bitmap, (width * ratio).toInt(), (height * ratio).toInt(), true)
    }

    fun onPermissionDenied() {
        _uiState.update {
            it.copy(errorMessage = "Camera permission is required for the safety check. Please grant camera access in Settings.")
        }
    }
}
