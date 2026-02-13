package com.wheelsongo.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.auth.FirebasePhoneAuthHelper
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import com.wheelsongo.app.data.repository.AuthRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * UI state for the OTP verification screen
 */
data class OtpVerificationUiState(
    val otpValue: String = "",
    val isLoading: Boolean = false,
    val isVerified: Boolean = false,
    val biometricRequired: Boolean = false,
    val biometricEnrolled: Boolean = false,
    val errorMessage: String? = null,
    val countdownSeconds: Int = 60,
    val userRole: String? = null
) {
    val canResend: Boolean
        get() = countdownSeconds <= 0 && !isLoading

    val isOtpComplete: Boolean
        get() = otpValue.length == 6
}

/**
 * ViewModel for the OTP verification screen.
 *
 * Supports two flows:
 * - Backend OTP (emulator): verificationId is null → calls authRepository.verifyOtp()
 * - Firebase OTP (real phone): verificationId is set → calls FirebasePhoneAuthHelper + authRepository.verifyFirebaseToken()
 */
class OtpVerificationViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(OtpVerificationUiState())
    val uiState: StateFlow<OtpVerificationUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            while (_uiState.value.countdownSeconds > 0) {
                delay(1000)
                _uiState.update {
                    it.copy(countdownSeconds = it.countdownSeconds - 1)
                }
            }
        }
    }

    /**
     * Add a digit to the OTP value.
     * Auto-verifies when 6 digits are entered.
     *
     * @param verificationId Firebase verification ID (null = backend flow)
     */
    fun onDigitEntered(digit: String, phoneNumber: String, role: String, verificationId: String?) {
        val currentOtp = _uiState.value.otpValue
        if (currentOtp.length >= 6) return

        val newOtp = currentOtp + digit
        _uiState.update {
            it.copy(
                otpValue = newOtp,
                errorMessage = null
            )
        }

        if (newOtp.length == 6) {
            verifyOtp(phoneNumber, role, newOtp, verificationId)
        }
    }

    fun onBackspace() {
        val currentOtp = _uiState.value.otpValue
        if (currentOtp.isNotEmpty()) {
            _uiState.update {
                it.copy(
                    otpValue = currentOtp.dropLast(1),
                    errorMessage = null
                )
            }
        }
    }

    private fun verifyOtp(phoneNumber: String, role: String, code: String, verificationId: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = if (verificationId != null) {
                verifyWithFirebase(verificationId, code, role)
            } else {
                authRepository.verifyOtp(
                    phoneNumber = phoneNumber,
                    code = code,
                    role = role
                )
            }

            result.fold(
                onSuccess = { response ->
                    _uiState.update {
                        it.copy(
                            isVerified = true,
                            isLoading = false,
                            userRole = response.user.role,
                            biometricRequired = response.biometricRequired == true,
                            biometricEnrolled = response.biometricEnrolled == true
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Verification failed. Please try again."
                        )
                    }
                }
            )
        }
    }

    private suspend fun verifyWithFirebase(
        verificationId: String,
        code: String,
        role: String
    ): Result<VerifyOtpResponse> {
        return try {
            val idToken = FirebasePhoneAuthHelper.verifyCodeAndGetIdToken(verificationId, code)
            authRepository.verifyFirebaseToken(idToken, role)
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "Firebase verification failed"))
        }
    }

    fun resendOtp(phoneNumber: String, role: String) {
        if (!_uiState.value.canResend) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = authRepository.requestOtp(
                phoneNumber = phoneNumber,
                role = role
            )

            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            countdownSeconds = 60,
                            otpValue = "",
                            isLoading = false,
                            errorMessage = null
                        )
                    }
                    startCountdown()
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Failed to resend code. Please try again."
                        )
                    }
                }
            )
        }
    }

    fun onVerifyClick(phoneNumber: String, role: String, verificationId: String?) {
        val currentOtp = _uiState.value.otpValue
        if (currentOtp.length == 6 && !_uiState.value.isLoading) {
            verifyOtp(phoneNumber, role, currentOtp, verificationId)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    override fun onCleared() {
        countdownJob?.cancel()
        super.onCleared()
    }
}
