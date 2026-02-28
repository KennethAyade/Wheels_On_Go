package com.wheelsongo.app.data.models.ride

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class TriggerSosRequest(
    val latitude: Double,
    val longitude: Double,
    val description: String? = null,
    val incidentType: String = "EMERGENCY"
)

@JsonClass(generateAdapter = true)
data class SosResponse(
    val id: String,
    val rideId: String?,
    val status: String,
    val createdAt: String
)
