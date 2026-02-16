package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.driver.AvailableDriverResponse
import com.wheelsongo.app.data.models.driver.ConfirmUploadRequest
import com.wheelsongo.app.data.models.driver.ConfirmUploadResponse
import com.wheelsongo.app.data.models.driver.DriverProfileResponse
import com.wheelsongo.app.data.models.driver.DriverPublicProfileResponse
import com.wheelsongo.app.data.models.driver.KycStatusResponse
import com.wheelsongo.app.data.models.driver.PresignUrlRequest
import com.wheelsongo.app.data.models.driver.PresignUrlResponse
import com.wheelsongo.app.data.models.driver.UpdateDriverStatusRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface DriverApi {

    @GET("drivers/me")
    suspend fun getProfile(): Response<DriverProfileResponse>

    @GET("drivers/kyc")
    suspend fun getKycStatus(): Response<KycStatusResponse>

    @POST("drivers/kyc/presign")
    suspend fun requestPresignedUrl(@Body request: PresignUrlRequest): Response<PresignUrlResponse>

    @POST("drivers/kyc/confirm")
    suspend fun confirmUpload(@Body request: ConfirmUploadRequest): Response<ConfirmUploadResponse>

    @PATCH("drivers/me/status")
    suspend fun updateStatus(@Body request: UpdateDriverStatusRequest): Response<DriverProfileResponse>

    @GET("drivers/available")
    suspend fun getAvailableDrivers(
        @Query("pickupLatitude") pickupLatitude: Double,
        @Query("pickupLongitude") pickupLongitude: Double,
        @Query("dropoffLatitude") dropoffLatitude: Double,
        @Query("dropoffLongitude") dropoffLongitude: Double,
        @Query("radiusKm") radiusKm: Double? = null
    ): Response<List<AvailableDriverResponse>>

    @GET("drivers/{id}/public-profile")
    suspend fun getPublicProfile(
        @Path("id") driverProfileId: String
    ): Response<DriverPublicProfileResponse>
}
