package com.wheelsongo.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val errorMessage: String? = null,
    val countdownSeconds: Int = 60,
    val userRole: String? = null
) {
    /**
     * Whether user can request a new OTP
     */
    val canResend: Boolean
        get() = countdownSeconds <= 0 && !isLoading

    /**
     * Whether OTP is complete (6 digits)
     */
    val isOtpComplete: Boolean
        get() = otpValue.length == 6
}

/**
 * ViewModel for the OTP verification screen
 * Handles OTP entry, countdown timer, and verification via AuthRepository
 */
class OtpVerificationViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(OtpVerificationUiState())
    val uiState: StateFlow<OtpVerificationUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    /**
     * Start the countdown timer for resend
     */
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
     * Add a digit to the OTP value
     * Auto-verifies when 6 digits are entered
     */
    fun onDigitEntered(digit: String, phoneNumber: String, role: String) {
        val currentOtp = _uiState.value.otpValue
        if (currentOtp.length >= 6) return

        val newOtp = currentOtp + digit
        _uiState.update {
            it.copy(
                otpValue = newOtp,
                errorMessage = null
            )
        }

        // Auto-verify when 6 digits entered
        if (newOtp.length == 6) {
            verifyOtp(phoneNumber, role, newOtp)
        }
    }

    /**
     * Remove the last digit from OTP
     */
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

    /**
     * Verify the OTP code via API
     */
    private fun verifyOtp(phoneNumber: String, role: String, code: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = authRepository.verifyOtp(
                phoneNumber = phoneNumber,
                code = code,
                role = role
            )

            result.fold(
                onSuccess = { response ->
                    // Token automatically saved by AuthRepository
                    _uiState.update {
                        it.copy(
                            isVerified = true,
                            isLoading = false,
                            userRole = response.user.role,
                            biometricRequired = response.biometricRequired == true
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            // Don't clear otpValue - let user backspace to fix their input
                            errorMessage = error.message ?: "Verification failed. Please try again."
                        )
                    }
                }
            )
        }
    }

    /**
     * Request a new OTP code
     */
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
                    // Reset countdown and clear OTP
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

    /**
     * Manual verify button (if user doesn't want to wait for auto-verify)
     */
    fun onVerifyClick(phoneNumber: String, role: String) {
        val currentOtp = _uiState.value.otpValue
        if (currentOtp.length == 6 && !_uiState.value.isLoading) {
            verifyOtp(phoneNumber, role, currentOtp)
        }
    }

    /**
     * Clear any error message
     */
    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    override fun onCleared() {
        countdownJob?.cancel()
        super.onCleared()
    }
}
