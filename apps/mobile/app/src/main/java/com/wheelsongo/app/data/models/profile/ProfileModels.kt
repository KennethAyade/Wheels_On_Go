package com.wheelsongo.app.data.models.profile

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DriverProfileSetupRequest(
    @Json(name = "firstName") val firstName: String,
    @Json(name = "lastName") val lastName: String,
    @Json(name = "licenseNumber") val licenseNumber: String,
    @Json(name = "licenseExpiryDate") val licenseExpiryDate: String // ISO 8601
)

@JsonClass(generateAdapter = true)
data class RiderProfileSetupRequest(
    @Json(name = "firstName") val firstName: String,
    @Json(name = "lastName") val lastName: String,
    @Json(name = "age") val age: Int,
    @Json(name = "address") val address: String
)

@JsonClass(generateAdapter = true)
data class ProfileSetupResponse(
    @Json(name = "firstName") val firstName: String,
    @Json(name = "lastName") val lastName: String,
    @Json(name = "isProfileComplete") val isProfileComplete: Boolean
)

// ==========================================
// Settings — Profile Photo & Account
// ==========================================

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    @Json(name = "firstName") val firstName: String? = null,
    @Json(name = "lastName") val lastName: String? = null,
    @Json(name = "age") val age: Int? = null,
    @Json(name = "address") val address: String? = null
)

@JsonClass(generateAdapter = true)
data class UploadProfilePhotoRequest(
    @Json(name = "imageBase64") val imageBase64: String
)

@JsonClass(generateAdapter = true)
data class ProfilePhotoResponse(
    @Json(name = "profilePhotoUrl") val profilePhotoUrl: String
)

@JsonClass(generateAdapter = true)
data class DeleteAccountResponse(
    @Json(name = "deleted") val deleted: Boolean
)

// ==========================================
// GET /auth/me response (flat shape, no wrapper)
// ==========================================

@JsonClass(generateAdapter = true)
data class MeResponse(
    @Json(name = "id") val id: String,
    @Json(name = "phoneNumber") val phoneNumber: String,
    @Json(name = "role") val role: String,
    @Json(name = "firstName") val firstName: String? = null,
    @Json(name = "lastName") val lastName: String? = null,
    @Json(name = "age") val age: Int? = null,
    @Json(name = "address") val address: String? = null,
    @Json(name = "profilePhotoUrl") val profilePhotoUrl: String? = null,
    @Json(name = "isProfileComplete") val isProfileComplete: Boolean = false,
    @Json(name = "averageRating") val averageRating: Float? = null,
    @Json(name = "totalRatings") val totalRatings: Int? = null,
    @Json(name = "createdAt") val createdAt: String? = null,
    @Json(name = "driverProfile") val driverProfile: DriverProfileSummary? = null
)

@JsonClass(generateAdapter = true)
data class DriverProfileSummary(
    @Json(name = "licenseNumber") val licenseNumber: String? = null,
    @Json(name = "licenseExpiryDate") val licenseExpiryDate: String? = null,
    @Json(name = "faceEnrolledAt") val faceEnrolledAt: String? = null,
    @Json(name = "lastFatigueCheckAt") val lastFatigueCheckAt: String? = null,
    @Json(name = "lastFatigueLevel") val lastFatigueLevel: String? = null,
    @Json(name = "fatigueCooldownUntil") val fatigueCooldownUntil: String? = null,
    @Json(name = "totalRides") val totalRides: Int? = null,
    @Json(name = "totalEarnings") val totalEarnings: Double? = null
)
