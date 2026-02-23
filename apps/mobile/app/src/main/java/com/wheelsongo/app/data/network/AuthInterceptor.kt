package com.wheelsongo.app.data.network

import android.util.Log
import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import com.wheelsongo.app.data.models.auth.RefreshTokenRequest
import com.wheelsongo.app.data.models.auth.RefreshTokenResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit

/**
 * OkHttp Interceptor that automatically adds JWT Bearer token to requests
 * and handles 401 responses by refreshing the access token and retrying.
 */
class AuthInterceptor(
    private val tokenManager: TokenManager
) : Interceptor {

    companion object {
        private const val TAG = "AuthInterceptor"
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "

        // Endpoints that don't require authentication
        private val PUBLIC_ENDPOINTS = listOf(
            "auth/request-otp",
            "auth/verify-otp",
            "auth/verify-firebase",
            "auth/refresh",
            "auth/logout",
            "auth/admin/login",
            "health"
        )
    }

    private val refreshLock = Object()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestPath = originalRequest.url.encodedPath

        // Skip adding auth header for public endpoints
        if (isPublicEndpoint(requestPath)) {
            return chain.proceed(originalRequest)
        }

        // Biometric verify endpoint uses biometric token instead of access token
        val token = if (requestPath.contains("auth/biometric/verify", ignoreCase = true)) {
            tokenManager.getBiometricToken()
        } else {
            tokenManager.getAccessToken()
        }

        // If no token available, proceed without auth header
        if (token.isNullOrBlank()) {
            return chain.proceed(originalRequest)
        }

        // Add Authorization header with Bearer token
        val authenticatedRequest = originalRequest.newBuilder()
            .header(AUTHORIZATION_HEADER, "$BEARER_PREFIX$token")
            .build()

        val response = chain.proceed(authenticatedRequest)

        // If 401 and not a public/auth endpoint, try refreshing the token
        if (response.code == 401 && !isPublicEndpoint(requestPath)) {
            val newToken = tryRefreshToken(token)
            if (newToken != null) {
                response.close()
                val retryRequest = originalRequest.newBuilder()
                    .header(AUTHORIZATION_HEADER, "$BEARER_PREFIX$newToken")
                    .build()
                return chain.proceed(retryRequest)
            }
        }

        return response
    }

    /**
     * Attempt to refresh the access token using the stored refresh token.
     * Uses a plain OkHttpClient (no interceptors) to avoid infinite recursion.
     * Thread-safe: only one refresh at a time.
     *
     * @param failedToken The token that caused the 401 — if the stored token
     *   has already changed (another thread refreshed), skip the refresh.
     * @return New access token, or null if refresh failed.
     */
    private fun tryRefreshToken(failedToken: String): String? {
        synchronized(refreshLock) {
            // Double-check: if another thread already refreshed, use the new token
            val currentToken = tokenManager.getAccessToken()
            if (currentToken != null && currentToken != failedToken) {
                return currentToken
            }

            val refreshToken = tokenManager.getRefreshToken() ?: return null

            return try {
                val moshi = Moshi.Builder()
                    .add(KotlinJsonAdapterFactory())
                    .build()

                val jsonBody = moshi.adapter(RefreshTokenRequest::class.java)
                    .toJson(RefreshTokenRequest(refreshToken))

                val request = Request.Builder()
                    .url("${AppConfig.BASE_URL}auth/refresh")
                    .post(jsonBody.toRequestBody("application/json".toMediaType()))
                    .build()

                // Use a plain client with no interceptors to avoid recursion
                val plainClient = OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build()

                val refreshResponse = plainClient.newCall(request).execute()

                if (refreshResponse.isSuccessful) {
                    val body = refreshResponse.body?.string()
                    val tokenResponse = moshi.adapter(RefreshTokenResponse::class.java)
                        .fromJson(body ?: "")

                    if (tokenResponse != null) {
                        // Save both new tokens (blocking — same pattern as getAccessToken)
                        runBlocking {
                            tokenManager.updateAccessToken(tokenResponse.accessToken)
                            tokenManager.saveRefreshToken(tokenResponse.refreshToken)
                        }
                        Log.d(TAG, "Token refreshed successfully")
                        tokenResponse.accessToken
                    } else null
                } else {
                    Log.w(TAG, "Token refresh failed: ${refreshResponse.code}")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Token refresh error: ${e.message}")
                null
            }
        }
    }

    /**
     * Check if the endpoint is public (doesn't require authentication)
     */
    private fun isPublicEndpoint(path: String): Boolean {
        return PUBLIC_ENDPOINTS.any { endpoint ->
            path.contains(endpoint, ignoreCase = true)
        }
    }
}
