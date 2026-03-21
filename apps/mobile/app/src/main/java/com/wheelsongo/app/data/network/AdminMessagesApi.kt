package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.messaging.AdminMessageResponse
import com.wheelsongo.app.data.models.messaging.SendAdminMessageRequest
import com.wheelsongo.app.data.models.messaging.UnreadCountResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

interface AdminMessagesApi {

    @GET("messages/admin")
    suspend fun getMessages(): Response<List<AdminMessageResponse>>

    @POST("messages/admin")
    suspend fun sendMessage(@Body request: SendAdminMessageRequest): Response<AdminMessageResponse>

    @PATCH("messages/admin/read")
    suspend fun markAsRead(): Response<Unit>

    @GET("messages/admin/unread-count")
    suspend fun getUnreadCount(): Response<UnreadCountResponse>
}
