package com.wheelsongo.app.data.network

import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject
import java.net.URISyntaxException

/**
 * WebSocket client for real-time dispatch updates using Socket.IO
 *
 * Connects to the backend /dispatch namespace and emits dispatch events
 * as a Kotlin Flow for UI consumption. Supports both rider and driver events.
 */
class DispatchSocketClient(
    private val tokenManager: TokenManager = ApiClient.getTokenManager()
) {
    private var socket: Socket? = null
    private var isConnected = false

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val _events = MutableSharedFlow<DispatchEvent>(replay = 1)
    val events: SharedFlow<DispatchEvent> = _events

    /**
     * Connect to the dispatch WebSocket using Socket.IO
     */
    fun connect() {
        if (isConnected) return

        val token = tokenManager.getAccessToken() ?: return

        try {
            // Convert HTTP URL to Socket.IO URL with namespace
            val baseUrl = AppConfig.BASE_URL.trimEnd('/')
            val socketUrl = "$baseUrl/dispatch"

            // Configure Socket.IO options with authentication
            val options = IO.Options().apply {
                // Auth via query param (Socket.IO will send in handshake)
                query = "token=$token"

                // Connection settings
                reconnection = true
                reconnectionDelay = 5000
                reconnectionAttempts = Int.MAX_VALUE
                timeout = 10000
                transports = arrayOf("websocket", "polling")
            }

            // Create Socket.IO connection
            socket = IO.socket(socketUrl, options)

            // Connection lifecycle handlers
            socket?.on(Socket.EVENT_CONNECT, onConnect)
            socket?.on(Socket.EVENT_DISCONNECT, onDisconnect)
            socket?.on(Socket.EVENT_CONNECT_ERROR, onConnectError)

            // Rider-side events
            socket?.on("dispatch:status", onDispatchStatus)
            socket?.on("ride:driver_assigned", onDriverAssigned)
            socket?.on("ride:status_update", onRideStatusUpdate)

            // Driver-side events
            socket?.on("dispatch:request", onDispatchRequest)
            socket?.on("dispatch:accepted", onDispatchAccepted)
            socket?.on("dispatch:declined", onDispatchDeclined)
            socket?.on("dispatch:error", onDispatchError)

            // Connect to server
            socket?.connect()
        } catch (e: URISyntaxException) {
            _events.tryEmit(DispatchEvent.Error("Invalid server URL: ${e.message}"))
        }
    }

    /**
     * Disconnect from the dispatch WebSocket
     */
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnected = false
    }

    // ==========================================
    // Client → Server: Driver actions
    // ==========================================

    /**
     * Send dispatch accept (driver accepts a ride request)
     */
    fun sendAccept(dispatchAttemptId: String) {
        val data = JSONObject().apply {
            put("dispatchAttemptId", dispatchAttemptId)
        }
        socket?.emit("dispatch:accept", data)
    }

    /**
     * Send dispatch decline (driver declines a ride request)
     */
    fun sendDecline(dispatchAttemptId: String, reason: String? = null) {
        val data = JSONObject().apply {
            put("dispatchAttemptId", dispatchAttemptId)
            if (reason != null) {
                put("reason", reason)
            }
        }
        socket?.emit("dispatch:decline", data)
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    private val onConnect = Emitter.Listener {
        isConnected = true
        _events.tryEmit(DispatchEvent.Connected)
    }

    private val onDisconnect = Emitter.Listener {
        isConnected = false
        _events.tryEmit(DispatchEvent.Disconnected)
    }

    private val onConnectError = Emitter.Listener { args ->
        val error = args.getOrNull(0)?.toString() ?: "Connection failed"
        _events.tryEmit(DispatchEvent.Error(error))
    }

    private val onDispatchStatus = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val status = data.optString("status", "")
            val rideId = data.optString("rideId", "")
            _events.tryEmit(DispatchEvent.StatusUpdate(status, rideId))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onDriverAssigned = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val dataMap = jsonToMap(data)
            _events.tryEmit(DispatchEvent.DriverAssigned(dataMap))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onRideStatusUpdate = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val status = data.optString("status", "")
            _events.tryEmit(DispatchEvent.RideStatusChanged(status))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onDispatchRequest = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val dispatchAttemptId = data.optString("dispatchAttemptId", "")
            val dataMap = jsonToMap(data)
            _events.tryEmit(
                DispatchEvent.IncomingRideRequest(
                    dispatchAttemptId = dispatchAttemptId,
                    rideData = dataMap
                )
            )
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onDispatchAccepted = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject
            val dataMap = data?.let { jsonToMap(it) }
            _events.tryEmit(DispatchEvent.DispatchAccepted(dataMap))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onDispatchDeclined = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val attemptId = data.optString("dispatchAttemptId", "")
            _events.tryEmit(DispatchEvent.DispatchDeclined(attemptId))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onDispatchError = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val message = data.optString("message", "Unknown dispatch error")
            _events.tryEmit(DispatchEvent.Error(message))
        } catch (e: Exception) {
            _events.tryEmit(DispatchEvent.Error("Dispatch error"))
        }
    }

    /**
     * Helper: Convert JSONObject to Map<String, String>
     */
    private fun jsonToMap(json: JSONObject): Map<String, String> {
        val map = mutableMapOf<String, String>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next() as String
            map[key] = json.optString(key, "")
        }
        return map
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
 * Generic socket message format (kept for compatibility)
 */
@JsonClass(generateAdapter = true)
data class SocketMessage(
    @Json(name = "event") val event: String? = null,
    @Json(name = "data") val data: Map<String, String>? = null
)
