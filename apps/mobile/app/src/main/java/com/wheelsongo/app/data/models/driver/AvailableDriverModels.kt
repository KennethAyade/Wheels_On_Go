package com.wheelsongo.app.data.models.driver

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class AvailableDriverResponse(
    @Json(name = "driverProfileId") val driverProfileId: String,
    @Json(name = "userId") val userId: String,
    @Json(name = "firstName") val firstName: String?,
    @Json(name = "lastName") val lastName: String?,
    @Json(name = "profilePhotoUrl") val profilePhotoUrl: String?,
    @Json(name = "isVerified") val isVerified: Boolean,
    @Json(name = "distanceKm") val distanceKm: Double,
    @Json(name = "averageRating") val averageRating: Double?,
    @Json(name = "totalRides") val totalRides: Int,
    @Json(name = "estimatedFare") val estimatedFare: Int,
    @Json(name = "vehicle") val vehicle: AvailableDriverVehicle?
)

@JsonClass(generateAdapter = true)
data class AvailableDriverVehicle(
    @Json(name = "make") val make: String,
    @Json(name = "model") val model: String,
    @Json(name = "year") val year: Int,
    @Json(name = "color") val color: String,
    @Json(name = "plateNumber") val plateNumber: String,
    @Json(name = "vehicleType") val vehicleType: String
)
