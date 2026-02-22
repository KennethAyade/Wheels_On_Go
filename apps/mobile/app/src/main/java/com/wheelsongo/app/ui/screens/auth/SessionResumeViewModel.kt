package com.wheelsongo.app.ui.screens.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for the session resumption screen.
 *
 * On app launch, checks if a refresh token exists:
 * - If not → navigates to Welcome
 * - If yes + RIDER → refreshes silently → Home
 * - If yes + DRIVER → triggers device biometric prompt → then refreshes → Home
 */
class SessionResumeViewModel @JvmOverloads constructor(
    application: Application,
    private val authRepository: AuthRepository = AuthRepository()
) : AndroidViewModel(application) {

    data class UiState(
        val isChecking: Boolean = true,
        val needsBiometric: Boolean = false,
        val navigateTo: String? = null // "home" or "welcome"
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        checkSession()
    }

    /**
     * Check if a valid session exists and determine the next step
     */
    fun checkSession() {
        if (!authRepository.hasSession()) {
            _uiState.value = UiState(isChecking = false, navigateTo = "welcome")
            return
        }

        val role = authRepository.getUserRole()
        if (role == "DRIVER") {
            // Driver needs biometric verification before refreshing
            _uiState.value = UiState(isChecking = false, needsBiometric = true)
        } else {
            // Rider — refresh silently
            refreshAndNavigate()
        }
    }

    /**
     * Called when BiometricPrompt succeeds — now refresh the session
     */
    fun onBiometricSuccess() {
        _uiState.value = _uiState.value.copy(needsBiometric = false, isChecking = true)
        refreshAndNavigate()
    }

    /**
     * Called when BiometricPrompt fails or is cancelled — go to Welcome
     */
    fun onBiometricFailed() {
        viewModelScope.launch {
            authRepository.logout()
        }
        _uiState.value = UiState(isChecking = false, navigateTo = "welcome")
    }

    private fun refreshAndNavigate() {
        viewModelScope.launch {
            val result = authRepository.refreshSession()
            if (result.isSuccess) {
                val tokenManager = ApiClient.getTokenManager()
                if (!tokenManager.isProfileComplete()) {
                    val role = tokenManager.getUserRole() ?: "RIDER"
                    val dest = if (role == "DRIVER")
                        com.wheelsongo.app.ui.navigation.Route.DriverProfileSetup.createRoute(needsKyc = false, returnToHome = false)
                    else
                        com.wheelsongo.app.ui.navigation.Route.RiderProfileSetup.createRoute(returnToHome = false)
                    _uiState.value = UiState(isChecking = false, navigateTo = dest)
                } else {
                    _uiState.value = UiState(isChecking = false, navigateTo = "home")
                }
            } else {
                _uiState.value = UiState(isChecking = false, navigateTo = "welcome")
            }
        }
    }
}
