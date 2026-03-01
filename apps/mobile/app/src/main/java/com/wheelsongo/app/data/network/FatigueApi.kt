package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.fatigue.FaceEnrollRequest
import com.wheelsongo.app.data.models.fatigue.FaceEnrollResponse
import com.wheelsongo.app.data.models.fatigue.FatigueCheckRequest
import com.wheelsongo.app.data.models.fatigue.FatigueCheckResponse
import com.wheelsongo.app.data.models.fatigue.FatigueStatusResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface FatigueApi {

    @POST("fatigue/enroll-face")
    suspend fun enrollFace(@Body request: FaceEnrollRequest): Response<FaceEnrollResponse>

    @POST("fatigue/check")
    suspend fun checkFatigue(@Body request: FatigueCheckRequest): Response<FatigueCheckResponse>

    @GET("fatigue/status")
    suspend fun getFatigueStatus(): Response<FatigueStatusResponse>
}
