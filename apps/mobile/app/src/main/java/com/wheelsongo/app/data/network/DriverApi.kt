package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.driver.ConfirmUploadRequest
import com.wheelsongo.app.data.models.driver.ConfirmUploadResponse
import com.wheelsongo.app.data.models.driver.DriverProfileResponse
import com.wheelsongo.app.data.models.driver.KycStatusResponse
import com.wheelsongo.app.data.models.driver.PresignUrlRequest
import com.wheelsongo.app.data.models.driver.PresignUrlResponse
import com.wheelsongo.app.data.models.driver.UpdateDriverStatusRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

/**
 * Retrofit API interface for driver-related endpoints
 * Requires JWT authentication (added via AuthInterceptor)
 */
interface DriverApi {

    /**
     * Get current driver's profile
     * GET /drivers/me
     */
    @GET("drivers/me")
    suspend fun getProfile(): Response<DriverProfileResponse>

    /**
     * Get KYC document status
     * GET /drivers/kyc
     */
    @GET("drivers/kyc")
    suspend fun getKycStatus(): Response<KycStatusResponse>

    /**
     * Request a presigned URL for document upload
     * POST /drivers/kyc/presign
     */
    @POST("drivers/kyc/presign")
    suspend fun requestPresignedUrl(@Body request: PresignUrlRequest): Response<PresignUrlResponse>

    /**
     * Confirm document upload after successful R2 upload
     * POST /drivers/kyc/confirm
     */
    @POST("drivers/kyc/confirm")
    suspend fun confirmUpload(@Body request: ConfirmUploadRequest): Response<ConfirmUploadResponse>

    /**
     * Update driver online/offline status
     * PATCH /drivers/me/status
     */
    @PATCH("drivers/me/status")
    suspend fun updateStatus(@Body request: UpdateDriverStatusRequest): Response<DriverProfileResponse>
}
