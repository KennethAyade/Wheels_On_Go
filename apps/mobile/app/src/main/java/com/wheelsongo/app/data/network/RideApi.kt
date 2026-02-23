package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.ride.CancelRideRequest
import com.wheelsongo.app.data.models.ride.CreateRideRequest
import com.wheelsongo.app.data.models.ride.CreateRideResponse
import com.wheelsongo.app.data.models.ride.RideEstimateRequest
import com.wheelsongo.app.data.models.ride.RideEstimateResponse
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.models.ride.UpdateRideStatusRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Ride management API interface
 * Matches backend ride.controller.ts endpoints
 */
interface RideApi {

    /**
     * Get fare estimate
     * POST /rides/estimate
     */
    @POST("rides/estimate")
    suspend fun getEstimate(@Body request: RideEstimateRequest): Response<RideEstimateResponse>

    /**
     * Create a new ride request
     * POST /rides
     */
    @POST("rides")
    suspend fun createRide(@Body request: CreateRideRequest): Response<CreateRideResponse>

    /**
     * Get active ride for current user
     * GET /rides/active
     */
    @GET("rides/active")
    suspend fun getActiveRide(): Response<RideResponse?>

    /**
     * Get ride by ID
     * GET /rides/{id}
     */
    @GET("rides/{id}")
    suspend fun getRideById(@Path("id") rideId: String): Response<RideResponse>

    /**
     * Cancel a ride
     * POST /rides/{id}/cancel
     */
    /**
     * Update ride status (driver only)
     * PATCH /rides/{id}/status
     */
    @PATCH("rides/{id}/status")
    suspend fun updateRideStatus(
        @Path("id") rideId: String,
        @Body request: UpdateRideStatusRequest
    ): Response<RideResponse>

    @POST("rides/{id}/cancel")
    suspend fun cancelRide(
        @Path("id") rideId: String,
        @Body request: CancelRideRequest
    ): Response<RideResponse>
}
