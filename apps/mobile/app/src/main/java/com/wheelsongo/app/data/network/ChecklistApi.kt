package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.checklist.BreathalyzerStatusResponse
import com.wheelsongo.app.data.models.checklist.ConfirmBreathalyzerRequest
import com.wheelsongo.app.data.models.checklist.ConfirmBreathalyzerResponse
import com.wheelsongo.app.data.models.checklist.PresignBreathalyzerRequest
import com.wheelsongo.app.data.models.checklist.PresignBreathalyzerResponse
import com.wheelsongo.app.data.models.checklist.SubmitBlowbagetsRequest
import com.wheelsongo.app.data.models.checklist.SubmitBlowbagetsResponse
import com.wheelsongo.app.data.models.checklist.BlowbagetsChecklistResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ChecklistApi {
    @GET("checklist/breathalyzer/status")
    suspend fun getBreathalyzerStatus(): Response<BreathalyzerStatusResponse>

    @POST("checklist/breathalyzer/presign")
    suspend fun presignBreathalyzer(@Body request: PresignBreathalyzerRequest): Response<PresignBreathalyzerResponse>

    @POST("checklist/breathalyzer/confirm")
    suspend fun confirmBreathalyzer(@Body request: ConfirmBreathalyzerRequest): Response<ConfirmBreathalyzerResponse>

    @POST("checklist/blowbagets/submit")
    suspend fun submitBlowbagets(@Body request: SubmitBlowbagetsRequest): Response<SubmitBlowbagetsResponse>

    @GET("checklist/blowbagets/{rideId}")
    suspend fun getBlowbagetsForRide(@Path("rideId") rideId: String): Response<BlowbagetsChecklistResponse>
}
