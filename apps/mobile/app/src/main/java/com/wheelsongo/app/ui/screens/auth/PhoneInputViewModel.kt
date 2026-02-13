package com.wheelsongo.app.ui.screens.auth

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.auth.FirebasePhoneAuthHelper
import com.wheelsongo.app.data.auth.FirebaseVerificationResult
import com.wheelsongo.app.data.repository.AuthRepository
import com.wheelsongo.app.utils.DeviceUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * UI state for the phone input screen
 */
data class PhoneInputUiState(
    val phoneNumber: String = "",
    val countryCode: String = "+63",
    val countryFlag: String = "\uD83C\uDDF5\uD83C\uDDED",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
) {
    /**
     * Phone number is valid if it starts with 9 and is 10 digits
     */
    val isValid: Boolean
        get() = phoneNumber.length == 10 && phoneNumber.startsWith("9")

    /**
     * Full phone number with country code in E.164 format
     */
    val formattedPhoneNumber: String
        get() = "$countryCode$phoneNumber"
}

/**
 * ViewModel for the phone input screen.
 *
 * On real phones: Uses Firebase Phone Auth (SMS delivered by Firebase)
 * On emulators: Uses backend /auth/request-otp (console SMS)
 */
class PhoneInputViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(PhoneInputUiState())
    val uiState: StateFlow<PhoneInputUiState> = _uiState.asStateFlow()

    fun onPhoneNumberChange(number: String) {
        val sanitized = number.filter { it.isDigit() }.take(10)
        _uiState.update {
            it.copy(
                phoneNumber = sanitized,
                errorMessage = null
            )
        }
    }

    fun onClearPhoneNumber() {
        _uiState.update {
            it.copy(
                phoneNumber = "",
                errorMessage = null
            )
        }
    }

    /**
     * Request OTP for the phone number.
     *
     * @param role User role (RIDER or DRIVER)
     * @param activity Required for Firebase Phone Auth on real phones
     * @param onSuccess Callback with (phoneNumber, verificationId?).
     *   verificationId is null for emulator (backend OTP) flow.
     *   verificationId is "AUTO_VERIFIED" if Firebase auto-verified (skip OTP screen).
     */
    fun requestOtp(role: String, activity: Activity?, onSuccess: (String, String?) -> Unit) {
        val currentState = _uiState.value

        if (!currentState.isValid) {
            _uiState.update {
                it.copy(errorMessage = "Please enter a valid 10-digit phone number starting with 9")
            }
            return
        }

        val phoneNumber = currentState.formattedPhoneNumber

        if (DeviceUtils.isEmulator() || activity == null) {
            requestOtpBackend(phoneNumber, role, onSuccess)
        } else {
            requestOtpFirebase(phoneNumber, role, activity, onSuccess)
        }
    }

    private fun requestOtpBackend(
        phoneNumber: String,
        role: String,
        onSuccess: (String, String?) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = authRepository.requestOtp(
                phoneNumber = phoneNumber,
                role = role
            )

            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess(phoneNumber, null)
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message
                                ?: "Failed to send verification code. Please try again."
                        )
                    }
                }
            )
        }
    }

    private fun requestOtpFirebase(
        phoneNumber: String,
        role: String,
        activity: Activity,
        onSuccess: (String, String?) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            when (val result = FirebasePhoneAuthHelper.startVerification(phoneNumber, activity)) {
                is FirebaseVerificationResult.CodeSent -> {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess(phoneNumber, result.verificationId)
                }

                is FirebaseVerificationResult.AutoVerified -> {
                    // Auto-verified — get ID token and exchange with backend
                    try {
                        val idToken =
                            FirebasePhoneAuthHelper.getIdTokenFromCredential(result.credential)
                        val backendResult = authRepository.verifyFirebaseToken(idToken, role)
                        _uiState.update { it.copy(isLoading = false) }
                        backendResult.fold(
                            onSuccess = {
                                onSuccess(phoneNumber, "AUTO_VERIFIED")
                            },
                            onFailure = { error ->
                                _uiState.update {
                                    it.copy(
                                        isLoading = false,
                                        errorMessage = error.message ?: "Verification failed"
                                    )
                                }
                            }
                        )
                    } catch (e: Exception) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                errorMessage = e.message ?: "Auto-verification failed"
                            )
                        }
                    }
                }

                is FirebaseVerificationResult.Failed -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.exception.message
                                ?: "Failed to send verification code"
                        )
                    }
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
