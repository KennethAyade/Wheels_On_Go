package com.wheelsongo.app.data.repository

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.wheelsongo.app.data.models.ErrorResponse
import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.RiderVehicleApi
import retrofit2.Response

/**
 * Repository for rider vehicle management
 *
 * Riders register their own cars here so drivers can be dispatched to drive them
 */
class VehicleRepository(
    private val vehicleApi: RiderVehicleApi = ApiClient.riderVehicleApi
) {

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val errorAdapter = moshi.adapter(ErrorResponse::class.java)

    /**
     * Extract error message from response body or fallback to generic message
     */
    private fun parseErrorMessage(response: Response<*>): String {
        return try {
            response.errorBody()?.string()?.let { errorBody ->
                errorAdapter.fromJson(errorBody)?.message
            } ?: "Request failed with code ${response.code()}"
        } catch (e: Exception) {
            "Request failed with code ${response.code()}"
        }
    }

    /**
     * Register a new vehicle
     */
    suspend fun createVehicle(request: CreateRiderVehicleRequest): Result<RiderVehicleResponse> {
        return try {
            val response = vehicleApi.createVehicle(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMessage = parseErrorMessage(response)
                Result.failure(Exception(errorMessage))
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
                val errorMessage = parseErrorMessage(response)
                Result.failure(Exception(errorMessage))
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
                val errorMessage = parseErrorMessage(response)
                Result.failure(Exception(errorMessage))
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
                val errorMessage = parseErrorMessage(response)
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
