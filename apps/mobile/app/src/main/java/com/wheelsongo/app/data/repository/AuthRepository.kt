package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.auth.TokenManager
import com.wheelsongo.app.data.models.auth.ApiErrorResponse
import com.wheelsongo.app.data.models.auth.BiometricVerifyRequest
import com.wheelsongo.app.data.models.auth.BiometricVerifyResponse
import com.wheelsongo.app.data.models.auth.CurrentUserResponse
import com.wheelsongo.app.data.models.auth.LogoutRequest
import com.wheelsongo.app.data.models.auth.RefreshTokenRequest
import com.wheelsongo.app.data.models.auth.RefreshTokenResponse
import com.wheelsongo.app.data.models.auth.RequestOtpRequest
import com.wheelsongo.app.data.models.auth.RequestOtpResponse
import com.wheelsongo.app.data.models.auth.VerifyFirebaseRequest
import com.wheelsongo.app.data.models.auth.VerifyOtpRequest
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.AuthApi
import com.wheelsongo.app.utils.DeviceUtils
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.Flow
import retrofit2.Response

/**
 * Repository for authentication-related operations
 *
 * Handles OTP request/verification, token management, and user session
 */
class AuthRepository(
    private val authApi: AuthApi = ApiClient.authApi,
    private val tokenManager: TokenManager = ApiClient.getTokenManager()
) {

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    /**
     * Request OTP to be sent to phone number
     *
     * @param phoneNumber Phone in E.164 format (e.g., +639XXXXXXXXX)
     * @param role User role (RIDER or DRIVER)
     * @return Result with success message or error
     */
    suspend fun requestOtp(phoneNumber: String, role: String): Result<RequestOtpResponse> {
        return try {
            val response = authApi.requestOtp(
                RequestOtpRequest(
                    phoneNumber = phoneNumber,
                    role = role,
                    debugMode = if (DeviceUtils.isEmulator()) true else null
                )
            )

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Verify OTP code and receive JWT tokens
     *
     * On success, tokens are automatically saved to TokenManager
     *
     * @param phoneNumber Phone in E.164 format
     * @param code 6-digit OTP code
     * @param role User role (RIDER or DRIVER)
     * @return Result with user info and tokens on success
     */
    suspend fun verifyOtp(
        phoneNumber: String,
        code: String,
        role: String
    ): Result<VerifyOtpResponse> {
        return try {
            val response = authApi.verifyOtp(
                VerifyOtpRequest(
                    phoneNumber = phoneNumber,
                    code = code,
                    role = role
                )
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Save user info and tokens to secure storage
                // saveTokens() handles null accessToken/refreshToken gracefully via ?.let
                tokenManager.saveTokens(body)
                // Save biometric token for drivers requiring face verification
                if (body.biometricRequired == true && body.biometricToken != null) {
                    tokenManager.saveBiometricToken(body.biometricToken)
                }
                Result.success(body)
            } else {
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Verify a Firebase Phone Auth ID token with the backend.
     * Used on real phones where Firebase handles SMS OTP delivery + verification.
     *
     * On success, tokens are automatically saved to TokenManager.
     * Returns the same response shape as verifyOtp.
     */
    suspend fun verifyFirebaseToken(
        firebaseIdToken: String,
        role: String
    ): Result<VerifyOtpResponse> {
        return try {
            val response = authApi.verifyFirebase(
                VerifyFirebaseRequest(
                    firebaseIdToken = firebaseIdToken,
                    role = role
                )
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                tokenManager.saveTokens(body)
                if (body.biometricRequired == true && body.biometricToken != null) {
                    tokenManager.saveBiometricToken(body.biometricToken)
                }
                Result.success(body)
            } else {
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Get current authenticated user's info
     *
     * @return Result with user info or error
     */
    suspend fun getCurrentUser(): Result<CurrentUserResponse> {
        return try {
            val response = authApi.getCurrentUser()

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Check if user is currently logged in
     */
    val isLoggedIn: Flow<Boolean> get() = tokenManager.isLoggedIn

    /**
     * Get current user's role
     */
    val userRole: Flow<String?> get() = tokenManager.userRole

    /**
     * Get current user's ID
     */
    val userId: Flow<String?> get() = tokenManager.userId

    /**
     * Verify biometric (face) for driver login
     * Uses biometric token from OTP verification step
     *
     * On success, saves the returned accessToken to TokenManager
     *
     * @param liveImageBase64 Base64-encoded camera image
     * @return Result with biometric response or error
     */
    suspend fun verifyBiometric(liveImageBase64: String): Result<BiometricVerifyResponse> {
        return try {
            val response = authApi.verifyBiometric(
                BiometricVerifyRequest(liveImageBase64 = liveImageBase64)
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Save the access token returned from biometric verification
                tokenManager.updateAccessToken(body.accessToken)
                // Save refresh token for session resumption
                body.refreshToken?.let { tokenManager.saveRefreshToken(it) }
                // Clear the biometric token as it's no longer needed
                tokenManager.clearBiometricToken()
                Result.success(body)
            } else {
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Refresh the session using the stored refresh token.
     * On success, saves new access + refresh tokens.
     */
    suspend fun refreshSession(): Result<RefreshTokenResponse> {
        val refreshToken = tokenManager.getRefreshToken()
            ?: return Result.failure(Exception("No refresh token"))

        return try {
            val response = authApi.refreshToken(
                RefreshTokenRequest(refreshToken = refreshToken)
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                tokenManager.updateAccessToken(body.accessToken)
                tokenManager.saveRefreshToken(body.refreshToken)
                Result.success(body)
            } else {
                // Refresh failed (expired/revoked) — clear local tokens
                tokenManager.clearTokens()
                val error = parseError(response)
                Result.failure(Exception(error.message))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Network error: ${e.message ?: "Unable to connect to server"}"))
        }
    }

    /**
     * Check if a session exists (refresh token is stored)
     */
    fun hasSession(): Boolean {
        return tokenManager.getRefreshToken() != null
    }

    /**
     * Get user role synchronously (for session resume check)
     */
    fun getUserRole(): String? {
        return tokenManager.getUserRole()
    }

    /**
     * Logout - revoke refresh token on server, then clear all local tokens
     */
    suspend fun logout() {
        val refreshToken = tokenManager.getRefreshToken()
        if (refreshToken != null) {
            try {
                authApi.logout(LogoutRequest(refreshToken = refreshToken))
            } catch (_: Exception) {
                // Best-effort server-side revocation — still clear local tokens
            }
        }
        tokenManager.clearTokens()
    }

    /**
     * Parse error response from API
     */
    private fun parseError(response: Response<*>): ApiErrorResponse {
        return try {
            val errorBody = response.errorBody()?.string()
            if (errorBody != null) {
                val adapter = moshi.adapter(ApiErrorResponse::class.java)
                adapter.fromJson(errorBody) ?: ApiErrorResponse(
                    statusCode = response.code(),
                    message = "An error occurred"
                )
            } else {
                ApiErrorResponse(
                    statusCode = response.code(),
                    message = getDefaultErrorMessage(response.code())
                )
            }
        } catch (e: Exception) {
            ApiErrorResponse(
                statusCode = response.code(),
                message = getDefaultErrorMessage(response.code())
            )
        }
    }

    /**
     * Get default error message for HTTP status codes
     */
    private fun getDefaultErrorMessage(statusCode: Int): String {
        return when (statusCode) {
            400 -> "Invalid request. Please check your input."
            401 -> "Session expired. Please login again."
            403 -> "You don't have permission to perform this action."
            404 -> "Resource not found."
            429 -> "Too many requests. Please try again later."
            500 -> "Server error. Please try again later."
            503 -> "Service temporarily unavailable."
            else -> "An unexpected error occurred."
        }
    }
}
