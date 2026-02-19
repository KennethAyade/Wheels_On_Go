package com.wheelsongo.app.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val heading: Float? = null,
    val speed: Float? = null
)

interface TrackingApi {
    @POST("tracking/location")
    suspend fun updateLocation(@Body request: UpdateLocationRequest): Response<Unit>
}
