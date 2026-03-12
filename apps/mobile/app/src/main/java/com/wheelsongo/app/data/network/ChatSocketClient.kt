package com.wheelsongo.app.data.network

import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject

@JsonClass(generateAdapter = true)
data class ChatMessage(
    @Json(name = "id") val id: String,
    @Json(name = "rideId") val rideId: String?,
    @Json(name = "senderId") val senderId: String,
    @Json(name = "receiverId") val receiverId: String,
    @Json(name = "content") val content: String,
    @Json(name = "messageType") val messageType: String = "TEXT",
    @Json(name = "sentAt") val sentAt: String,
    @Json(name = "isRead") val isRead: Boolean = false
)

sealed class ChatEvent {
    data class Connected(val connected: Boolean) : ChatEvent()
    data class History(val messages: List<ChatMessage>) : ChatEvent()
    data class NewMessage(val message: ChatMessage) : ChatEvent()
    data class Error(val message: String) : ChatEvent()
}

class ChatSocketClient(
    private val tokenManager: TokenManager = ApiClient.getTokenManager()
) {
    private var socket: Socket? = null
    private var isConnected = false

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val messageAdapter = moshi.adapter(ChatMessage::class.java)
    private val messageListType = Types.newParameterizedType(List::class.java, ChatMessage::class.java)
    private val messageListAdapter = moshi.adapter<List<ChatMessage>>(messageListType)

    private val _events = MutableSharedFlow<ChatEvent>(replay = 1)
    val events: SharedFlow<ChatEvent> = _events

    fun connect() {
        if (isConnected) return

        val token = tokenManager.getAccessToken() ?: return

        try {
            val baseUrl = AppConfig.BASE_URL.trimEnd('/')
            val socketUrl = "$baseUrl/chat"

            val options = IO.Options().apply {
                query = "token=$token"
                reconnection = true
                reconnectionDelay = 3000
                reconnectionAttempts = Int.MAX_VALUE
                timeout = 10000
                transports = arrayOf("websocket", "polling")
            }

            socket = IO.socket(socketUrl, options)

            socket?.on(Socket.EVENT_CONNECT) {
                isConnected = true
                _events.tryEmit(ChatEvent.Connected(true))
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                isConnected = false
                _events.tryEmit(ChatEvent.Connected(false))
            }

            socket?.on("chat:history") { args ->
                try {
                    val data = args[0] as JSONObject
                    val messagesJson = data.getJSONArray("messages").toString()
                    val messages = messageListAdapter.fromJson(messagesJson) ?: emptyList()
                    _events.tryEmit(ChatEvent.History(messages))
                } catch (e: Exception) {
                    _events.tryEmit(ChatEvent.Error("Failed to parse history"))
                }
            }

            socket?.on("chat:message") { args ->
                try {
                    val data = args[0] as JSONObject
                    val message = messageAdapter.fromJson(data.toString())
                    if (message != null) {
                        _events.tryEmit(ChatEvent.NewMessage(message))
                    }
                } catch (e: Exception) {
                    _events.tryEmit(ChatEvent.Error("Failed to parse message"))
                }
            }

            socket?.on("error") { args ->
                try {
                    val data = args[0] as JSONObject
                    _events.tryEmit(ChatEvent.Error(data.optString("message", "Unknown error")))
                } catch (_: Exception) {}
            }

            socket?.connect()
        } catch (e: Exception) {
            _events.tryEmit(ChatEvent.Error("Connection failed: ${e.message}"))
        }
    }

    fun joinRoom(rideId: String) {
        socket?.emit("chat:join", JSONObject().put("rideId", rideId))
    }

    fun sendMessage(rideId: String, content: String) {
        socket?.emit("chat:send", JSONObject().apply {
            put("rideId", rideId)
            put("content", content)
        })
    }

    fun markAsRead(rideId: String) {
        socket?.emit("chat:read", JSONObject().put("rideId", rideId))
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnected = false
    }
}
