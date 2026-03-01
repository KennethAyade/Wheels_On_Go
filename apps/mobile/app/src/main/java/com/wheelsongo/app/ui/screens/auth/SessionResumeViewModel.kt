package com.wheelsongo.app.ui.screens.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.repository.AuthRepository
import kotlinx.coroutines.delay
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
        val navigateTo: String? = null, // "home" or "welcome"
        val isNetworkError: Boolean = false
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
            // Check if driver has biometric login enabled (default: true)
            viewModelScope.launch {
                val tokenManager = ApiClient.getTokenManager()
                val biometricEnabled = tokenManager.isBiometricEnabled()
                if (biometricEnabled) {
                    _uiState.value = UiState(isChecking = false, needsBiometric = true)
                } else {
                    // Biometric disabled — skip prompt, refresh directly
                    refreshAndNavigate()
                }
            }
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

    /**
     * Called from the network error screen — biometric was already verified, just retry the refresh.
     */
    fun retryRefresh() {
        _uiState.value = _uiState.value.copy(isNetworkError = false, isChecking = true)
        refreshAndNavigate()
    }

    private fun refreshAndNavigate(retryCount: Int = 0) {
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
                val tokenManager = ApiClient.getTokenManager()
                if (tokenManager.getRefreshToken() == null) {
                    // Tokens were cleared by refreshSession() — session truly expired/rejected
                    _uiState.value = UiState(isChecking = false, navigateTo = "welcome")
                } else if (retryCount < 2) {
                    // Network error — tokens still valid — auto-retry with backoff
                    // Handles Render free-tier spin-up delay (~20-50s after 15min inactivity)
                    delay(3000L * (retryCount + 1)) // 3s, then 6s
                    refreshAndNavigate(retryCount + 1)
                } else {
                    // All auto-retries exhausted — show manual retry UI
                    _uiState.value = UiState(isChecking = false, isNetworkError = true)
                }
            }
        }
    }
}
