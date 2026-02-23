package com.wheelsongo.app.data.models.ride

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ==========================================
// Rider Vehicle (rider's own car)
// ==========================================

@JsonClass(generateAdapter = true)
data class CreateRiderVehicleRequest(
    @Json(name = "make") val make: String,
    @Json(name = "model") val model: String,
    @Json(name = "year") val year: Int,
    @Json(name = "color") val color: String,
    @Json(name = "plateNumber") val plateNumber: String,
    @Json(name = "vehicleType") val vehicleType: String = "SEDAN",
    @Json(name = "isDefault") val isDefault: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class UpdateRiderVehicleRequest(
    @Json(name = "make") val make: String? = null,
    @Json(name = "model") val model: String? = null,
    @Json(name = "year") val year: Int? = null,
    @Json(name = "color") val color: String? = null,
    @Json(name = "plateNumber") val plateNumber: String? = null,
    @Json(name = "vehicleType") val vehicleType: String? = null
)

@JsonClass(generateAdapter = true)
data class RiderVehicleResponse(
    @Json(name = "id") val id: String,
    @Json(name = "make") val make: String,
    @Json(name = "model") val model: String,
    @Json(name = "year") val year: Int,
    @Json(name = "color") val color: String,
    @Json(name = "plateNumber") val plateNumber: String,
    @Json(name = "vehicleType") val vehicleType: String,
    @Json(name = "isDefault") val isDefault: Boolean,
    @Json(name = "createdAt") val createdAt: String,
    @Json(name = "updatedAt") val updatedAt: String
) {
    /**
     * Display name for UI: "2022 Toyota Vios (White)"
     */
    val displayName: String
        get() = "$year $make $model ($color)"
}

/**
 * Supported vehicle types
 */
enum class VehicleType(val displayName: String) {
    SEDAN("Sedan"),
    SUV("SUV"),
    HATCHBACK("Hatchback"),
    VAN("Van"),
    MOTORCYCLE("Motorcycle")
}
