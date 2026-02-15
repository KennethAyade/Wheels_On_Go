package com.wheelsongo.app.data.network

import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * WebSocket client for real-time dispatch updates
 *
 * Connects to the backend /dispatch namespace and emits dispatch events
 * as a Kotlin Flow for UI consumption. Supports both rider and driver events.
 */
class DispatchSocketClient(
    private val tokenManager: TokenManager = ApiClient.getTokenManager()
) {
    private var webSocket: WebSocket? = null
    private var isConnected = false

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val _events = MutableSharedFlow<DispatchEvent>(replay = 1)
    val events: SharedFlow<DispatchEvent> = _events

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // No timeout for WebSocket
        .build()

    /**
     * Connect to the dispatch WebSocket
     */
    fun connect() {
        if (isConnected) return

        val token = tokenManager.getAccessToken() ?: return

        // Convert HTTP URL to WS URL
        val wsUrl = AppConfig.BASE_URL
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            .trimEnd('/') + "/dispatch"

        val request = Request.Builder()
            .url("$wsUrl?token=$token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected = true
                _events.tryEmit(DispatchEvent.Connected)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                isConnected = false
                webSocket.close(1000, null)
                _events.tryEmit(DispatchEvent.Disconnected)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                _events.tryEmit(DispatchEvent.Error(t.message ?: "Connection failed"))

                // Auto-reconnect after 5 seconds
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    connect()
                }, 5000)
            }
        })
    }

    /**
     * Disconnect from the dispatch WebSocket
     */
    fun disconnect() {
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
        isConnected = false
    }

    // ==========================================
    // Client → Server: Driver actions
    // ==========================================

    /**
     * Send dispatch accept (driver accepts a ride request)
     */
    fun sendAccept(dispatchAttemptId: String) {
        val msg = """{"event":"dispatch:accept","data":{"dispatchAttemptId":"$dispatchAttemptId"}}"""
        webSocket?.send(msg)
    }

    /**
     * Send dispatch decline (driver declines a ride request)
     */
    fun sendDecline(dispatchAttemptId: String, reason: String? = null) {
        val reasonPart = if (reason != null) ""","reason":"$reason"""" else ""
        val msg = """{"event":"dispatch:decline","data":{"dispatchAttemptId":"$dispatchAttemptId"$reasonPart}}"""
        webSocket?.send(msg)
    }

    /**
     * Parse incoming WebSocket messages
     */
    private fun handleMessage(text: String) {
        try {
            val adapter = moshi.adapter(SocketMessage::class.java)
            val message = adapter.fromJson(text) ?: return

            when (message.event) {
                // Rider events
                "dispatch:status" -> {
                    val status = message.data?.get("status") ?: return
                    val rideId = message.data["rideId"]
                    _events.tryEmit(
                        DispatchEvent.StatusUpdate(
                            status = status,
                            rideId = rideId ?: ""
                        )
                    )
                }
                "ride:driver_assigned" -> {
                    _events.tryEmit(DispatchEvent.DriverAssigned(message.data ?: emptyMap()))
                }
                "ride:status_update" -> {
                    val status = message.data?.get("status") ?: return
                    _events.tryEmit(DispatchEvent.RideStatusChanged(status))
                }

                // Driver events
                "dispatch:request" -> {
                    val dispatchAttemptId = message.data?.get("dispatchAttemptId") ?: return
                    _events.tryEmit(
                        DispatchEvent.IncomingRideRequest(
                            dispatchAttemptId = dispatchAttemptId,
                            rideData = message.data
                        )
                    )
                }
                "dispatch:accepted" -> {
                    _events.tryEmit(DispatchEvent.DispatchAccepted(message.data))
                }
                "dispatch:declined" -> {
                    val attemptId = message.data?.get("dispatchAttemptId") ?: ""
                    _events.tryEmit(DispatchEvent.DispatchDeclined(attemptId))
                }
                "dispatch:error" -> {
                    val msg = message.data?.get("message") ?: "Unknown dispatch error"
                    _events.tryEmit(DispatchEvent.Error(msg))
                }
            }
        } catch (e: Exception) {
            // Ignore parse errors for non-JSON messages
        }
    }
}

/**
 * Events emitted by the dispatch WebSocket
 */
sealed class DispatchEvent {
    // Connection
    data object Connected : DispatchEvent()
    data object Disconnected : DispatchEvent()
    data class Error(val message: String) : DispatchEvent()

    // Rider-side events
    data class StatusUpdate(val status: String, val rideId: String) : DispatchEvent()
    data class DriverAssigned(val data: Map<String, String>) : DispatchEvent()
    data class RideStatusChanged(val status: String) : DispatchEvent()

    // Driver-side events
    data class IncomingRideRequest(
        val dispatchAttemptId: String,
        val rideData: Map<String, String>
    ) : DispatchEvent()
    data class DispatchAccepted(val data: Map<String, String>?) : DispatchEvent()
    data class DispatchDeclined(val dispatchAttemptId: String) : DispatchEvent()
}

/**
 * Generic socket message format
 */
@JsonClass(generateAdapter = true)
data class SocketMessage(
    @Json(name = "event") val event: String? = null,
    @Json(name = "data") val data: Map<String, String>? = null
)
