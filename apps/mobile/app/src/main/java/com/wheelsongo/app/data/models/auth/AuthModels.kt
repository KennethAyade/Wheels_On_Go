package com.wheelsongo.app.data.models.auth

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * User roles in the system
 */
enum class UserRole {
    @Json(name = "RIDER") RIDER,
    @Json(name = "DRIVER") DRIVER,
    @Json(name = "ADMIN") ADMIN
}

// ==========================================
// Request OTP
// ==========================================

/**
 * Request to send OTP to phone number
 * POST /auth/request-otp
 */
@JsonClass(generateAdapter = true)
data class RequestOtpRequest(
    @Json(name = "phoneNumber") val phoneNumber: String,
    @Json(name = "role") val role: String
)

/**
 * Response from OTP request
 */
@JsonClass(generateAdapter = true)
data class RequestOtpResponse(
    @Json(name = "message") val message: String,
    @Json(name = "expiresIn") val expiresIn: Int? = null // seconds
)

// ==========================================
// Verify OTP
// ==========================================

/**
 * Request to verify OTP code
 * POST /auth/verify-otp
 */
@JsonClass(generateAdapter = true)
data class VerifyOtpRequest(
    @Json(name = "phoneNumber") val phoneNumber: String,
    @Json(name = "code") val code: String,
    @Json(name = "role") val role: String
)

/**
 * Response from successful OTP verification
 * Contains JWT tokens for authentication
 */
@JsonClass(generateAdapter = true)
data class VerifyOtpResponse(
    @Json(name = "accessToken") val accessToken: String?,
    @Json(name = "refreshToken") val refreshToken: String? = null,
    @Json(name = "user") val user: UserDto,
    // Driver-specific fields (optional)
    @Json(name = "biometricRequired") val biometricRequired: Boolean? = null,
    @Json(name = "biometricToken") val biometricToken: String? = null,
    @Json(name = "biometricEnrolled") val biometricEnrolled: Boolean? = null,
    @Json(name = "driverStatus") val driverStatus: String? = null
)

// ==========================================
// User Data
// ==========================================

/**
 * User data transfer object
 */
@JsonClass(generateAdapter = true)
data class UserDto(
    @Json(name = "id") val id: String,
    @Json(name = "phoneNumber") val phoneNumber: String,
    @Json(name = "role") val role: String,
    @Json(name = "isActive") val isActive: Boolean = true,
    @Json(name = "createdAt") val createdAt: String? = null
)

// ==========================================
// Current User
// ==========================================

/**
 * Response from GET /auth/me
 */
@JsonClass(generateAdapter = true)
data class CurrentUserResponse(
    @Json(name = "user") val user: UserDto
)

// ==========================================
// Biometric Verification
// ==========================================

/**
 * Request for biometric (face) verification
 * POST /auth/biometric/verify
 * Backend expects: { liveImageBase64: string }
 */
@JsonClass(generateAdapter = true)
data class BiometricVerifyRequest(
    @Json(name = "liveImageBase64") val liveImageBase64: String
)

/**
 * Response from biometric verification
 * Backend returns: { userId, accessToken, confidence, match }
 */
@JsonClass(generateAdapter = true)
data class BiometricVerifyResponse(
    @Json(name = "userId") val userId: String,
    @Json(name = "accessToken") val accessToken: String,
    @Json(name = "refreshToken") val refreshToken: String? = null,
    @Json(name = "confidence") val confidence: Float? = null,
    @Json(name = "match") val match: Boolean = false
)

// ==========================================
// Refresh Token
// ==========================================

/**
 * Request to refresh access token
 * POST /auth/refresh
 */
@JsonClass(generateAdapter = true)
data class RefreshTokenRequest(
    @Json(name = "refreshToken") val refreshToken: String
)

/**
 * Response from token refresh
 */
@JsonClass(generateAdapter = true)
data class RefreshTokenResponse(
    @Json(name = "accessToken") val accessToken: String,
    @Json(name = "refreshToken") val refreshToken: String
)

/**
 * Request to logout (revoke refresh token)
 * POST /auth/logout
 */
@JsonClass(generateAdapter = true)
data class LogoutRequest(
    @Json(name = "refreshToken") val refreshToken: String
)

// ==========================================
// Error Response
// ==========================================

/**
 * Standard error response from API
 */
@JsonClass(generateAdapter = true)
data class ApiErrorResponse(
    @Json(name = "statusCode") val statusCode: Int,
    @Json(name = "message") val message: String,
    @Json(name = "error") val error: String? = null
)
