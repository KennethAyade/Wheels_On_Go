package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.subscription.CancelSubscriptionResponse
import com.wheelsongo.app.data.models.subscription.MySubscriptionResponse
import com.wheelsongo.app.data.models.subscription.SubscribeRequest
import com.wheelsongo.app.data.models.subscription.SubscribeResponse
import com.wheelsongo.app.data.models.subscription.SubscriptionPlan
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST

interface SubscriptionApi {

    @GET("subscriptions/plans")
    suspend fun listPlans(): Response<List<SubscriptionPlan>>

    @GET("subscriptions/me")
    suspend fun getMySubscription(): Response<MySubscriptionResponse>

    @POST("subscriptions/subscribe")
    suspend fun subscribe(@Body request: SubscribeRequest): Response<SubscribeResponse>

    @DELETE("subscriptions/me")
    suspend fun cancelSubscription(): Response<CancelSubscriptionResponse>
}
