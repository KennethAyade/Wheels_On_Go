package com.wheelsongo.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.repository.AuthRepository
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
    val countryFlag: String = "🇵🇭",
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
 * ViewModel for the phone input screen
 * Handles phone number validation and OTP request
 */
class PhoneInputViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(PhoneInputUiState())
    val uiState: StateFlow<PhoneInputUiState> = _uiState.asStateFlow()

    /**
     * Update the phone number
     */
    fun onPhoneNumberChange(number: String) {
        // Only allow digits and limit to 10 characters
        val sanitized = number.filter { it.isDigit() }.take(10)
        _uiState.update {
            it.copy(
                phoneNumber = sanitized,
                errorMessage = null // Clear error when user types
            )
        }
    }

    /**
     * Clear the phone number
     */
    fun onClearPhoneNumber() {
        _uiState.update {
            it.copy(
                phoneNumber = "",
                errorMessage = null
            )
        }
    }

    /**
     * Request OTP for the phone number
     * @param role User role (RIDER or DRIVER)
     * @param onSuccess Callback when OTP is successfully requested
     */
    fun requestOtp(role: String, onSuccess: (String) -> Unit) {
        val currentState = _uiState.value

        // Validate phone number
        if (!currentState.isValid) {
            _uiState.update {
                it.copy(errorMessage = "Please enter a valid 10-digit phone number starting with 9")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = authRepository.requestOtp(
                phoneNumber = currentState.formattedPhoneNumber,
                role = role
            )

            result.fold(
                onSuccess = { _ ->
                    _uiState.update { it.copy(isLoading = false) }
                    // OTP sent successfully - navigate to verification screen
                    onSuccess(currentState.formattedPhoneNumber)
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "Failed to send verification code. Please try again."
                        )
                    }
                }
            )
        }
    }

    /**
     * Clear any error message
     */
    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
