package com.wheelsongo.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.profile.DriverProfileSetupRequest
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class DriverProfileSetupUiState(
    val firstName: String = "",
    val lastName: String = "",
    val licenseNumber: String = "",
    val licenseExpiryDateMillis: Long? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
) {
    val licenseExpiryDateLabel: String
        get() = licenseExpiryDateMillis?.let {
            SimpleDateFormat("MMM dd, yyyy", Locale.US).format(Date(it))
        } ?: ""

    val canSave: Boolean
        get() = firstName.isNotBlank() && lastName.isNotBlank() &&
                licenseNumber.isNotBlank() && licenseExpiryDateMillis != null && !isLoading
}

class DriverProfileSetupViewModel : ViewModel() {

    private val tokenManager = ApiClient.getTokenManager()
    private val driverApi = ApiClient.driverApi

    private val _uiState = MutableStateFlow(DriverProfileSetupUiState())
    val uiState: StateFlow<DriverProfileSetupUiState> = _uiState.asStateFlow()

    fun onFirstNameChange(value: String) = _uiState.update { it.copy(firstName = value, errorMessage = null) }
    fun onLastNameChange(value: String) = _uiState.update { it.copy(lastName = value, errorMessage = null) }
    fun onLicenseNumberChange(value: String) = _uiState.update { it.copy(licenseNumber = value, errorMessage = null) }
    fun onExpiryDateSelected(millis: Long) = _uiState.update { it.copy(licenseExpiryDateMillis = millis, errorMessage = null) }

    fun saveProfile() {
        val state = _uiState.value
        if (!state.canSave) return

        val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .format(Date(state.licenseExpiryDateMillis!!))

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = driverApi.setupProfile(
                    DriverProfileSetupRequest(
                        firstName = state.firstName.trim(),
                        lastName = state.lastName.trim(),
                        licenseNumber = state.licenseNumber.trim(),
                        licenseExpiryDate = isoDate
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
