package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.driver.AvailableDriverResponse
import com.wheelsongo.app.data.models.driver.DriverPublicProfileResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DriverApi

class DriverRepository(
    private val driverApi: DriverApi = ApiClient.driverApi
) {

    suspend fun getAvailableDrivers(
        pickupLat: Double,
        pickupLng: Double,
        dropoffLat: Double,
        dropoffLng: Double,
        radiusKm: Double? = null
    ): Result<List<AvailableDriverResponse>> {
        return try {
            val response = driverApi.getAvailableDrivers(
                pickupLatitude = pickupLat,
                pickupLongitude = pickupLng,
                dropoffLatitude = dropoffLat,
                dropoffLongitude = dropoffLng,
                radiusKm = radiusKm
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get available drivers: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPublicProfile(driverProfileId: String): Result<DriverPublicProfileResponse> {
        return try {
            val response = driverApi.getPublicProfile(driverProfileId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get driver profile: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
