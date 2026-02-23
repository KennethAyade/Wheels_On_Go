package com.wheelsongo.app.data.models.driver

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DriverPublicProfileResponse(
    @Json(name = "driverProfileId") val driverProfileId: String,
    @Json(name = "userId") val userId: String,
    @Json(name = "firstName") val firstName: String?,
    @Json(name = "lastName") val lastName: String?,
    @Json(name = "profilePhotoUrl") val profilePhotoUrl: String?,
    @Json(name = "isOnline") val isOnline: Boolean,
    @Json(name = "isVerified") val isVerified: Boolean,
    @Json(name = "licenseNumber") val licenseNumber: String?,
    @Json(name = "licenseExpiryDate") val licenseExpiryDate: String?,
    @Json(name = "memberSince") val memberSince: String,
    // Safety & Verification
    @Json(name = "nbiClearance") val nbiClearance: Boolean,
    @Json(name = "drugTest") val drugTest: Boolean,
    @Json(name = "healthCertificate") val healthCertificate: Boolean,
    @Json(name = "idVerified") val idVerified: Boolean,
    @Json(name = "fatigueDetection") val fatigueDetection: Boolean,
    // Activity Summary
    @Json(name = "totalRides") val totalRides: Int,
    @Json(name = "averageRating") val averageRating: Double?,
    @Json(name = "totalRatings") val totalRatings: Int,
    @Json(name = "acceptanceRate") val acceptanceRate: Double?,
    @Json(name = "completionRate") val completionRate: Double?,
    // Vehicle
    @Json(name = "vehicle") val vehicle: DriverPublicVehicle?,
    // Reviews
    @Json(name = "reviews") val reviews: List<DriverReview>
)

@JsonClass(generateAdapter = true)
data class DriverPublicVehicle(
    @Json(name = "make") val make: String,
    @Json(name = "model") val model: String,
    @Json(name = "year") val year: Int,
    @Json(name = "color") val color: String,
    @Json(name = "plateNumber") val plateNumber: String,
    @Json(name = "vehicleType") val vehicleType: String,
    @Json(name = "seatingCapacity") val seatingCapacity: Int,
    @Json(name = "registrationExpiry") val registrationExpiry: String?,
    @Json(name = "insuranceExpiry") val insuranceExpiry: String?
)

@JsonClass(generateAdapter = true)
data class DriverReview(
    @Json(name = "rating") val rating: Int,
    @Json(name = "review") val review: String?,
    @Json(name = "reviewerFirstName") val reviewerFirstName: String?,
    @Json(name = "createdAt") val createdAt: String,
    @Json(name = "punctualityRating") val punctualityRating: Int?,
    @Json(name = "safetyRating") val safetyRating: Int?,
    @Json(name = "cleanlinessRating") val cleanlinessRating: Int?,
    @Json(name = "communicationRating") val communicationRating: Int?
)
