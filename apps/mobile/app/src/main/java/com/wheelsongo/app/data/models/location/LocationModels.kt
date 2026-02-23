package com.wheelsongo.app.data.models.location

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Location data from device GPS
 */
data class LocationData(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val heading: Float? = null,
    val altitude: Double? = null,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Place prediction from autocomplete
 * Note: Photon API returns lat/lng directly - no separate place details call needed
 */
@JsonClass(generateAdapter = true)
data class PlacePrediction(
    @Json(name = "placeId") val placeId: String,
    @Json(name = "description") val description: String,
    @Json(name = "mainText") val mainText: String,
    @Json(name = "secondaryText") val secondaryText: String,
    @Json(name = "types") val types: List<String> = emptyList(),
    // Photon provides coordinates directly in autocomplete response
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null
)

/**
 * Place details response
 */
@JsonClass(generateAdapter = true)
data class PlaceDetails(
    @Json(name = "placeId") val placeId: String,
    @Json(name = "name") val name: String,
    @Json(name = "address") val address: String,
    @Json(name = "latitude") val latitude: Double,
    @Json(name = "longitude") val longitude: Double,
    @Json(name = "types") val types: List<String> = emptyList(),
    @Json(name = "formattedPhoneNumber") val formattedPhoneNumber: String? = null,
    @Json(name = "website") val website: String? = null,
    @Json(name = "vicinity") val vicinity: String? = null
)

/**
 * Geocode response
 */
@JsonClass(generateAdapter = true)
data class GeocodeResponse(
    @Json(name = "address") val address: String,
    @Json(name = "latitude") val latitude: Double,
    @Json(name = "longitude") val longitude: Double,
    @Json(name = "placeId") val placeId: String? = null,
    @Json(name = "formattedAddress") val formattedAddress: String? = null,
    @Json(name = "types") val types: List<String> = emptyList()
)

/**
 * Autocomplete response wrapper
 */
@JsonClass(generateAdapter = true)
data class PlaceAutocompleteResponse(
    @Json(name = "predictions") val predictions: List<PlacePrediction>,
    @Json(name = "status") val status: String
)

/**
 * Reverse geocode request
 */
@JsonClass(generateAdapter = true)
data class ReverseGeocodeRequest(
    @Json(name = "latitude") val latitude: Double,
    @Json(name = "longitude") val longitude: Double
)

/**
 * Distance/fare estimate request
 */
@JsonClass(generateAdapter = true)
data class RideEstimateRequest(
    @Json(name = "pickupLatitude") val pickupLatitude: Double,
    @Json(name = "pickupLongitude") val pickupLongitude: Double,
    @Json(name = "dropoffLatitude") val dropoffLatitude: Double,
    @Json(name = "dropoffLongitude") val dropoffLongitude: Double,
    @Json(name = "promoCode") val promoCode: String? = null
)

/**
 * Distance/fare estimate response
 */
@JsonClass(generateAdapter = true)
data class RideEstimateResponse(
    @Json(name = "distanceMeters") val distanceMeters: Int,
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
