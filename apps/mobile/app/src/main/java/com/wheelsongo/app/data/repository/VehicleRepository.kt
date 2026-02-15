package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.RiderVehicleApi

/**
 * Repository for rider vehicle management
 *
 * Riders register their own cars here so drivers can be dispatched to drive them
 */
class VehicleRepository(
    private val vehicleApi: RiderVehicleApi = ApiClient.riderVehicleApi
) {

    /**
     * Register a new vehicle
     */
    suspend fun createVehicle(request: CreateRiderVehicleRequest): Result<RiderVehicleResponse> {
        return try {
            val response = vehicleApi.createVehicle(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create vehicle: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get all rider's vehicles
     */
    suspend fun getVehicles(): Result<List<RiderVehicleResponse>> {
        return try {
            val response = vehicleApi.getVehicles()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get vehicles: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Delete a vehicle
     */
    suspend fun deleteVehicle(vehicleId: String): Result<Unit> {
        return try {
            val response = vehicleApi.deleteVehicle(vehicleId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete vehicle: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Set vehicle as default
     */
    suspend fun setDefaultVehicle(vehicleId: String): Result<RiderVehicleResponse> {
        return try {
            val response = vehicleApi.setDefaultVehicle(vehicleId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to set default: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
