package com.wheelsongo.app.data.models.messaging

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class AdminMessageResponse(
    @Json(name = "id") val id: String,
    @Json(name = "senderId") val senderId: String,
    @Json(name = "receiverId") val receiverId: String,
    @Json(name = "senderName") val senderName: String,
    @Json(name = "content") val content: String,
    @Json(name = "messageType") val messageType: String,
    @Json(name = "sentAt") val sentAt: String,
    @Json(name = "isRead") val isRead: Boolean,
    @Json(name = "readAt") val readAt: String? = null,
    @Json(name = "isFromAdmin") val isFromAdmin: Boolean
)

@JsonClass(generateAdapter = true)
data class SendAdminMessageRequest(
    @Json(name = "content") val content: String
)

@JsonClass(generateAdapter = true)
data class UnreadCountResponse(
    @Json(name = "count") val count: Int
)
