package com.wheelsongo.app.data.models.ride

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ==========================================
// Ride Estimate
// ==========================================

@JsonClass(generateAdapter = true)
data class RideEstimateRequest(
    @Json(name = "pickupLatitude") val pickupLatitude: Double,
    @Json(name = "pickupLongitude") val pickupLongitude: Double,
    @Json(name = "dropoffLatitude") val dropoffLatitude: Double,
    @Json(name = "dropoffLongitude") val dropoffLongitude: Double,
    @Json(name = "promoCode") val promoCode: String? = null
)

@JsonClass(generateAdapter = true)
data class RideEstimateResponse(
    @Json(name = "distanceMeters") val distanceMeters: Double,
    @Json(name = "distanceKm") val distanceKm: Double,
    @Json(name = "distanceText") val distanceText: String,
    @Json(name = "durationSeconds") val durationSeconds: Int,
    @Json(name = "durationMinutes") val durationMinutes: Int,
    @Json(name = "durationText") val durationText: String,
    @Json(name = "baseFare") val baseFare: Int,
    @Json(name = "distanceFare") val distanceFare: Int,
    @Json(name = "timeFare") val timeFare: Int,
    @Json(name = "surgePricing") val surgePricing: Int,
    @Json(name = "surgeMultiplier") val surgeMultiplier: Double,
    @Json(name = "promoDiscount") val promoDiscount: Int,
    @Json(name = "estimatedFare") val estimatedFare: Int,
    @Json(name = "currency") val currency: String,
    @Json(name = "costPerKm") val costPerKm: Int,
    @Json(name = "costPerMinute") val costPerMinute: Int
)

// ==========================================
// Create Ride
// ==========================================

@JsonClass(generateAdapter = true)
data class CreateRideRequest(
    @Json(name = "pickupLatitude") val pickupLatitude: Double,
    @Json(name = "pickupLongitude") val pickupLongitude: Double,
    @Json(name = "pickupAddress") val pickupAddress: String,
    @Json(name = "pickupPlaceId") val pickupPlaceId: String? = null,
    @Json(name = "dropoffLatitude") val dropoffLatitude: Double,
    @Json(name = "dropoffLongitude") val dropoffLongitude: Double,
    @Json(name = "dropoffAddress") val dropoffAddress: String,
    @Json(name = "dropoffPlaceId") val dropoffPlaceId: String? = null,
    @Json(name = "rideType") val rideType: String = "INSTANT",
    @Json(name = "paymentMethod") val paymentMethod: String = "CASH",
    @Json(name = "promoCode") val promoCode: String? = null,
    @Json(name = "riderVehicleId") val riderVehicleId: String? = null,
    @Json(name = "scheduledPickupTime") val scheduledPickupTime: String? = null
)

@JsonClass(generateAdapter = true)
data class CreateRideResponse(
    @Json(name = "id") val id: String,
    @Json(name = "riderId") val riderId: String,
    @Json(name = "status") val status: String,
    @Json(name = "rideType") val rideType: String,
    @Json(name = "pickupLatitude") val pickupLatitude: Double,
    @Json(name = "pickupLongitude") val pickupLongitude: Double,
    @Json(name = "pickupAddress") val pickupAddress: String,
    @Json(name = "dropoffLatitude") val dropoffLatitude: Double,
    @Json(name = "dropoffLongitude") val dropoffLongitude: Double,
    @Json(name = "dropoffAddress") val dropoffAddress: String,
    @Json(name = "estimatedDistance") val estimatedDistance: Double?,
    @Json(name = "estimatedDuration") val estimatedDuration: Int?,
    @Json(name = "estimatedFare") val estimatedFare: Double?,
    @Json(name = "paymentMethod") val paymentMethod: String,
    @Json(name = "createdAt") val createdAt: String
)

// ==========================================
// Ride Response (full)
// ==========================================

@JsonClass(generateAdapter = true)
data class RideResponse(
    @Json(name = "id") val id: String,
    @Json(name = "riderId") val riderId: String,
    @Json(name = "driverId") val driverId: String? = null,
    @Json(name = "status") val status: String,
    @Json(name = "rideType") val rideType: String,
    @Json(name = "pickupLatitude") val pickupLatitude: Double,
    @Json(name = "pickupLongitude") val pickupLongitude: Double,
    @Json(name = "pickupAddress") val pickupAddress: String,
    @Json(name = "dropoffLatitude") val dropoffLatitude: Double,
    @Json(name = "dropoffLongitude") val dropoffLongitude: Double,
    @Json(name = "dropoffAddress") val dropoffAddress: String,
    @Json(name = "estimatedDistance") val estimatedDistance: Double? = null,
    @Json(name = "estimatedDuration") val estimatedDuration: Int? = null,
    @Json(name = "estimatedFare") val estimatedFare: Double? = null,
    @Json(name = "baseFare") val baseFare: Double? = null,
    @Json(name = "surgePricing") val surgePricing: Double? = null,
    @Json(name = "promoDiscount") val promoDiscount: Double? = null,
    @Json(name = "paymentMethod") val paymentMethod: String,
    @Json(name = "paymentStatus") val paymentStatus: String? = null,
    @Json(name = "createdAt") val createdAt: String,
    @Json(name = "acceptedAt") val acceptedAt: String? = null,
    @Json(name = "startedAt") val startedAt: String? = null,
    @Json(name = "completedAt") val completedAt: String? = null,
    @Json(name = "cancelledAt") val cancelledAt: String? = null,
    @Json(name = "driver") val driver: RideDriverInfo? = null
)

@JsonClass(generateAdapter = true)
data class RideDriverInfo(
    @Json(name = "id") val id: String,
    @Json(name = "userId") val userId: String,
    @Json(name = "phoneNumber") val phoneNumber: String? = null,
    @Json(name = "driverProfile") val driverProfile: RideDriverProfile? = null
)

@JsonClass(generateAdapter = true)
data class RideDriverProfile(
    @Json(name = "id") val id: String,
    @Json(name = "vehicle") val vehicle: RideDriverVehicle? = null
)

@JsonClass(generateAdapter = true)
data class RideDriverVehicle(
    @Json(name = "make") val make: String,
    @Json(name = "model") val model: String,
    @Json(name = "color") val color: String,
    @Json(name = "plateNumber") val plateNumber: String
)

// ==========================================
// Update Ride Status (driver)
// ==========================================

@JsonClass(generateAdapter = true)
data class UpdateRideStatusRequest(
    @Json(name = "status") val status: String,
    @Json(name = "reason") val reason: String? = null,
    @Json(name = "currentLatitude") val currentLatitude: Double? = null,
    @Json(name = "currentLongitude") val currentLongitude: Double? = null
)

// ==========================================
// Cancel Ride
// ==========================================

@JsonClass(generateAdapter = true)
data class CancelRideRequest(
    @Json(name = "reason") val reason: String? = null
)
