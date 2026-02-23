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
