package com.wheelsongo.app.data.models.rating

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class CreateRatingRequest(
    @Json(name = "rideId") val rideId: String,
    @Json(name = "rating") val rating: Int,
    @Json(name = "review") val review: String? = null,
    @Json(name = "punctualityRating") val punctualityRating: Int? = null,
    @Json(name = "safetyRating") val safetyRating: Int? = null,
    @Json(name = "cleanlinessRating") val cleanlinessRating: Int? = null,
    @Json(name = "communicationRating") val communicationRating: Int? = null
)

@JsonClass(generateAdapter = true)
data class RatingResponse(
    @Json(name = "id") val id: String,
    @Json(name = "rideId") val rideId: String,
    @Json(name = "rating") val rating: Int,
    @Json(name = "review") val review: String?,
    @Json(name = "createdAt") val createdAt: String
)
