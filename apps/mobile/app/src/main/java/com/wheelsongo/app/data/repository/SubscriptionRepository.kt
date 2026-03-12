package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.subscription.CancelSubscriptionResponse
import com.wheelsongo.app.data.models.subscription.MySubscriptionResponse
import com.wheelsongo.app.data.models.subscription.SubscribeRequest
import com.wheelsongo.app.data.models.subscription.SubscribeResponse
import com.wheelsongo.app.data.models.subscription.SubscriptionPlan
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.SubscriptionApi

class SubscriptionRepository(
    private val api: SubscriptionApi = ApiClient.subscriptionApi
) {

    suspend fun listPlans(): Result<List<SubscriptionPlan>> {
        return try {
            val response = api.listPlans()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load plans"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMySubscription(): Result<MySubscriptionResponse> {
        return try {
            val response = api.getMySubscription()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load subscription"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun subscribe(planId: String): Result<SubscribeResponse> {
        return try {
            val response = api.subscribe(SubscribeRequest(planId))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to subscribe"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cancelSubscription(): Result<CancelSubscriptionResponse> {
        return try {
            val response = api.cancelSubscription()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to cancel subscription"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
