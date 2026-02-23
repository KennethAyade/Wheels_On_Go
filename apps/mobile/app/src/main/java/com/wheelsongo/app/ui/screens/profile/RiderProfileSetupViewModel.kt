package com.wheelsongo.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.profile.RiderProfileSetupRequest
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RiderProfileSetupUiState(
    val firstName: String = "",
    val lastName: String = "",
    val age: String = "",
    val address: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
) {
    val canSave: Boolean
        get() = firstName.isNotBlank() && lastName.isNotBlank() &&
                age.isNotBlank() && age.toIntOrNull() != null &&
                address.isNotBlank() && !isLoading
}

class RiderProfileSetupViewModel : ViewModel() {

    private val tokenManager = ApiClient.getTokenManager()
    private val authApi = ApiClient.authApi

    private val _uiState = MutableStateFlow(RiderProfileSetupUiState())
    val uiState: StateFlow<RiderProfileSetupUiState> = _uiState.asStateFlow()

    fun onFirstNameChange(value: String) = _uiState.update { it.copy(firstName = value, errorMessage = null) }
    fun onLastNameChange(value: String) = _uiState.update { it.copy(lastName = value, errorMessage = null) }
    fun onAgeChange(value: String) {
        if (value.length <= 3 && value.all { it.isDigit() }) {
            _uiState.update { it.copy(age = value, errorMessage = null) }
        }
    }
    fun onAddressChange(value: String) = _uiState.update { it.copy(address = value, errorMessage = null) }

    fun saveProfile() {
        val state = _uiState.value
        if (!state.canSave) return
        val ageInt = state.age.toIntOrNull() ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = authApi.updateRiderProfile(
                    RiderProfileSetupRequest(
                        firstName = state.firstName.trim(),
                        lastName = state.lastName.trim(),
                        age = ageInt,
                        address = state.address.trim()
                    )
                )
                if (response.isSuccessful) {
                    tokenManager.saveProfileComplete(true)
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                } else {
                    val msg = response.errorBody()?.string() ?: "Failed to save profile"
                    _uiState.update { it.copy(isLoading = false, errorMessage = msg) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message ?: "Network error") }
            }
        }
    }

    fun clearError() = _uiState.update { it.copy(errorMessage = null) }
}
