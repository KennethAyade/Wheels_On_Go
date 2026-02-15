package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.ride.CancelRideRequest
import com.wheelsongo.app.data.models.ride.CreateRideRequest
import com.wheelsongo.app.data.models.ride.CreateRideResponse
import com.wheelsongo.app.data.models.ride.RideEstimateRequest
import com.wheelsongo.app.data.models.ride.RideEstimateResponse
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.models.ride.UpdateRideStatusRequest
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.RideApi

/**
 * Repository for ride-related operations
 *
 * Handles fare estimates, ride creation, status checking, and cancellation
 */
class RideRepository(
    private val rideApi: RideApi = ApiClient.rideApi
) {

    /**
     * Get fare estimate for a ride
     */
    suspend fun getEstimate(
        pickupLat: Double,
        pickupLng: Double,
        dropoffLat: Double,
        dropoffLng: Double,
        promoCode: String? = null
    ): Result<RideEstimateResponse> {
        return try {
            val response = rideApi.getEstimate(
                RideEstimateRequest(
                    pickupLatitude = pickupLat,
                    pickupLongitude = pickupLng,
                    dropoffLatitude = dropoffLat,
                    dropoffLongitude = dropoffLng,
                    promoCode = promoCode
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get estimate: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create a new ride request
     */
    suspend fun createRide(request: CreateRideRequest): Result<CreateRideResponse> {
        return try {
            val response = rideApi.createRide(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to create ride: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get active ride for current user
     */
    suspend fun getActiveRide(): Result<RideResponse?> {
        return try {
            val response = rideApi.getActiveRide()
            if (response.isSuccessful) {
                Result.success(response.body())
            } else if (response.code() == 404) {
                Result.success(null)
            } else {
                Result.failure(Exception("Failed to get active ride: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get ride by ID
     */
    suspend fun getRideById(rideId: String): Result<RideResponse> {
        return try {
            val response = rideApi.getRideById(rideId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get ride: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update ride status (driver only)
     * Used for: ACCEPTED → DRIVER_ARRIVED → STARTED → COMPLETED
     */
    suspend fun updateRideStatus(
        rideId: String,
        status: String,
        latitude: Double? = null,
        longitude: Double? = null
    ): Result<RideResponse> {
        return try {
            val response = rideApi.updateRideStatus(
                rideId,
                UpdateRideStatusRequest(
                    status = status,
                    currentLatitude = latitude,
                    currentLongitude = longitude
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update ride status: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Cancel a ride
     */
    suspend fun cancelRide(rideId: String, reason: String? = null): Result<RideResponse> {
        return try {
            val response = rideApi.cancelRide(rideId, CancelRideRequest(reason))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to cancel ride: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
