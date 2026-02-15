package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.models.ride.UpdateRiderVehicleRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Rider vehicle management API interface
 * Matches backend rider-vehicle.controller.ts endpoints
 */
interface RiderVehicleApi {

    /**
     * Register a new vehicle
     * POST /rider-vehicles
     */
    @POST("rider-vehicles")
    suspend fun createVehicle(@Body request: CreateRiderVehicleRequest): Response<RiderVehicleResponse>

    /**
     * List all rider's vehicles
     * GET /rider-vehicles
     */
    @GET("rider-vehicles")
    suspend fun getVehicles(): Response<List<RiderVehicleResponse>>

    /**
     * Get vehicle by ID
     * GET /rider-vehicles/{id}
     */
    @GET("rider-vehicles/{id}")
    suspend fun getVehicleById(@Path("id") vehicleId: String): Response<RiderVehicleResponse>

    /**
     * Update a vehicle
     * PATCH /rider-vehicles/{id}
     */
    @PATCH("rider-vehicles/{id}")
    suspend fun updateVehicle(
        @Path("id") vehicleId: String,
        @Body request: UpdateRiderVehicleRequest
    ): Response<RiderVehicleResponse>

    /**
     * Delete a vehicle
     * DELETE /rider-vehicles/{id}
     */
    @DELETE("rider-vehicles/{id}")
    suspend fun deleteVehicle(@Path("id") vehicleId: String): Response<Unit>

    /**
     * Set vehicle as default
     * PATCH /rider-vehicles/{id}/default
     */
    @PATCH("rider-vehicles/{id}/default")
    suspend fun setDefaultVehicle(@Path("id") vehicleId: String): Response<RiderVehicleResponse>
}
