package com.wheelsongo.app.data.models.subscription

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SubscriptionPlan(
    @Json(name = "id") val id: String,
    @Json(name = "name") val name: String,
    @Json(name = "description") val description: String?,
    @Json(name = "monthlyFee") val monthlyFee: Double,
    @Json(name = "discountPercentage") val discountPercentage: Double,
    @Json(name = "maxRidesPerMonth") val maxRidesPerMonth: Int?,
    @Json(name = "priorityDispatch") val priorityDispatch: Boolean,
    @Json(name = "isActive") val isActive: Boolean
)

@JsonClass(generateAdapter = true)
data class MySubscriptionResponse(
    @Json(name = "active") val active: Boolean,
    @Json(name = "plan") val plan: SubscriptionPlan?,
    @Json(name = "startDate") val startDate: String?,
    @Json(name = "endDate") val endDate: String?
)

@JsonClass(generateAdapter = true)
data class SubscribeRequest(
    @Json(name = "planId") val planId: String
)

@JsonClass(generateAdapter = true)
data class SubscribeResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "plan") val plan: SubscriptionPlan?,
    @Json(name = "startDate") val startDate: String?,
    @Json(name = "endDate") val endDate: String?
)

@JsonClass(generateAdapter = true)
data class CancelSubscriptionResponse(
    @Json(name = "success") val success: Boolean
)
