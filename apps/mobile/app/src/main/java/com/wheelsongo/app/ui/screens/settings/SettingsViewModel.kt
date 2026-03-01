package com.wheelsongo.app.ui.screens.settings

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.profile.UpdateProfileRequest
import com.wheelsongo.app.data.models.profile.UploadProfilePhotoRequest
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsViewModel @JvmOverloads constructor(
    application: Application,
    private val authRepository: AuthRepository = AuthRepository()
) : AndroidViewModel(application) {

    data class UiState(
        val isLoading: Boolean = true,
        val firstName: String? = null,
        val lastName: String? = null,
        val phoneNumber: String? = null,
        val role: String? = null,
        val age: Int? = null,
        val address: String? = null,
        val profilePhotoUrl: String? = null,
        val licenseNumber: String? = null,
        val licenseExpiryDate: String? = null,
        val faceEnrolledAt: String? = null,
        val lastFatigueCheckAt: String? = null,
        val lastFatigueLevel: String? = null,
        val fatigueCooldownUntil: String? = null,
        val biometricEnabled: Boolean = true,
        val isSaving: Boolean = false,
        val isUploadingPhoto: Boolean = false,
        val isDeleting: Boolean = false,
        val successMessage: String? = null,
        val errorMessage: String? = null,
        val isLoggedOut: Boolean = false,
        // Edit mode
        val isEditingProfile: Boolean = false,
        val editFirstName: String = "",
        val editLastName: String = "",
        val editAge: String = "",
        val editAddress: String = ""
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val tokenManager = ApiClient.getTokenManager()
                val biometricEnabled = tokenManager.isBiometricEnabled()
                val response = ApiClient.authApi.me()
                if (response.isSuccessful) {
                    val me = response.body()!!
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            firstName = me.firstName,
                            lastName = me.lastName,
                            phoneNumber = me.phoneNumber,
                            role = me.role,
                            age = me.age,
                            address = me.address,
                            profilePhotoUrl = me.profilePhotoUrl,
                            licenseNumber = me.driverProfile?.licenseNumber,
                            licenseExpiryDate = me.driverProfile?.licenseExpiryDate,
                            faceEnrolledAt = me.driverProfile?.faceEnrolledAt,
                            lastFatigueCheckAt = me.driverProfile?.lastFatigueCheckAt,
                            lastFatigueLevel = me.driverProfile?.lastFatigueLevel,
                            fatigueCooldownUntil = me.driverProfile?.fatigueCooldownUntil,
                            biometricEnabled = biometricEnabled
                        )
                    }
                } else {
                    _uiState.update { it.copy(isLoading = false, errorMessage = "Failed to load profile") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message ?: "Network error") }
            }
        }
    }

    fun startEditingProfile() {
        val current = _uiState.value
        _uiState.update {
            it.copy(
                isEditingProfile = true,
                editFirstName = current.firstName ?: "",
                editLastName = current.lastName ?: "",
                editAge = current.age?.toString() ?: "",
                editAddress = current.address ?: ""
            )
        }
    }

    fun cancelEditing() {
        _uiState.update { it.copy(isEditingProfile = false) }
    }

    fun updateEditFirstName(value: String) {
        _uiState.update { it.copy(editFirstName = value) }
    }

    fun updateEditLastName(value: String) {
        _uiState.update { it.copy(editLastName = value) }
    }

    fun updateEditAge(value: String) {
        _uiState.update { it.copy(editAge = value) }
    }

    fun updateEditAddress(value: String) {
        _uiState.update { it.copy(editAddress = value) }
    }

    fun saveProfile() {
        val state = _uiState.value
        if (state.editFirstName.isBlank() || state.editLastName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "First and last name are required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                val request = UpdateProfileRequest(
                    firstName = state.editFirstName.trim(),
                    lastName = state.editLastName.trim(),
                    age = if (state.role == "RIDER") state.editAge.toIntOrNull() else null,
                    address = if (state.role == "RIDER") state.editAddress.trim().ifEmpty { null } else null
                )
                val response = ApiClient.authApi.updateProfile(request)
                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isEditingProfile = false,
                            successMessage = "Profile updated"
                        )
                    }
                    loadProfile() // Reload to get fresh data
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Update failed"
                    _uiState.update { it.copy(isSaving = false, errorMessage = errorBody) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, errorMessage = e.message ?: "Network error") }
            }
        }
    }

    fun onPhotoSelected(uri: Uri) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPhoto = true, errorMessage = null) }
            try {
                val contentResolver = getApplication<Application>().contentResolver
                val bytes = withContext(Dispatchers.IO) {
                    contentResolver.openInputStream(uri)?.use { it.readBytes() }
                } ?: throw Exception("Could not read image")

                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                val response = ApiClient.authApi.uploadProfilePhoto(
                    UploadProfilePhotoRequest(imageBase64 = base64)
                )
                if (response.isSuccessful) {
                    val photoUrl = response.body()?.profilePhotoUrl
                    _uiState.update {
                        it.copy(
                            isUploadingPhoto = false,
                            profilePhotoUrl = photoUrl,
                            successMessage = "Photo uploaded"
                        )
                    }
                } else {
                    _uiState.update { it.copy(isUploadingPhoto = false, errorMessage = "Upload failed") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isUploadingPhoto = false, errorMessage = e.message ?: "Upload error") }
            }
        }
    }

    fun toggleBiometric(enabled: Boolean) {
        viewModelScope.launch {
            ApiClient.getTokenManager().saveBiometricEnabled(enabled)
            _uiState.update { it.copy(biometricEnabled = enabled) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update { it.copy(isLoggedOut = true) }
        }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            _uiState.update { it.copy(isDeleting = true, errorMessage = null) }
            try {
                val response = ApiClient.authApi.deleteAccount()
                if (response.isSuccessful) {
                    ApiClient.getTokenManager().clearTokens()
                    _uiState.update { it.copy(isDeleting = false, isLoggedOut = true) }
                } else {
                    _uiState.update { it.copy(isDeleting = false, errorMessage = "Failed to delete account") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isDeleting = false, errorMessage = e.message ?: "Network error") }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun clearSuccess() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
