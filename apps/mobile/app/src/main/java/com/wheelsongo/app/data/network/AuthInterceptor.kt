package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.auth.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp Interceptor that automatically adds JWT Bearer token to requests
 *
 * This interceptor reads the access token from TokenManager and adds it
 * to the Authorization header for all outgoing requests (except auth endpoints).
 */
class AuthInterceptor(
    private val tokenManager: TokenManager
) : Interceptor {

    companion object {
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "

        // Endpoints that don't require authentication
        private val PUBLIC_ENDPOINTS = listOf(
            "auth/request-otp",
            "auth/verify-otp",
            "health"
        )
    }

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

        return chain.proceed(authenticatedRequest)
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
