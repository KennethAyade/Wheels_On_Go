package com.wheelsongo.app.data.network

import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject
import java.net.URISyntaxException

/**
 * Events emitted by the tracking WebSocket
 */
sealed class TrackingEvent {
    // Connection
    data object Connected : TrackingEvent()
    data object Disconnected : TrackingEvent()
    data class Error(val message: String) : TrackingEvent()

    // Rider-side: driver location updates
    data class DriverLocationUpdate(
        val rideId: String,
        val latitude: Double,
        val longitude: Double,
        val heading: Float?,
        val speed: Float?,
        val timestamp: String
    ) : TrackingEvent()

    // Geofence events (approaching/arrived at pickup/dropoff)
    data class GeofenceEvent(
        val rideId: String,
        val eventType: String,
        val timestamp: String
    ) : TrackingEvent()

    // Subscription confirmed
    data class Subscribed(val rideId: String) : TrackingEvent()

    // Driver-side: location update acknowledged
    data class LocationUpdated(val timestamp: String) : TrackingEvent()
}

/**
 * WebSocket client for real-time location tracking using Socket.IO
 *
 * Connects to the backend /tracking namespace.
 * - Riders subscribe to driver location for their active ride
 * - Drivers send location updates during active rides
 */
class TrackingSocketClient(
    private val tokenManager: TokenManager = ApiClient.getTokenManager()
) {
    private var socket: Socket? = null
    private var isConnected = false

    private val _events = MutableSharedFlow<TrackingEvent>(replay = 1)
    val events: SharedFlow<TrackingEvent> = _events

    /**
     * Connect to the tracking WebSocket
     */
    fun connect() {
        if (isConnected) return

        val token = tokenManager.getAccessToken() ?: return

        try {
            val baseUrl = AppConfig.BASE_URL.trimEnd('/')
            val socketUrl = "$baseUrl/tracking"

            val options = IO.Options().apply {
                query = "token=$token"
                reconnection = true
                reconnectionDelay = 5000
                reconnectionAttempts = Int.MAX_VALUE
                timeout = 10000
                transports = arrayOf("websocket", "polling")
            }

            socket = IO.socket(socketUrl, options)

            // Connection lifecycle handlers
            socket?.on(Socket.EVENT_CONNECT, onConnect)
            socket?.on(Socket.EVENT_DISCONNECT, onDisconnect)
            socket?.on(Socket.EVENT_CONNECT_ERROR, onConnectError)

            // Server → Client events
            socket?.on("driver:location", onDriverLocation)
            socket?.on("geofence:event", onGeofenceEvent)
            socket?.on("subscribed", onSubscribed)
            socket?.on("location:updated", onLocationUpdated)

            socket?.connect()
        } catch (e: URISyntaxException) {
            _events.tryEmit(TrackingEvent.Error("Invalid server URL: ${e.message}"))
        }
    }

    /**
     * Disconnect from the tracking WebSocket
     */
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnected = false
    }

    // ==========================================
    // Client → Server: Rider actions
    // ==========================================

    fun subscribeToRide(rideId: String) {
        socket?.emit("rider:subscribe:ride", JSONObject().apply {
            put("rideId", rideId)
        })
    }

    fun unsubscribeFromRide(rideId: String) {
        socket?.emit("rider:unsubscribe:ride", JSONObject().apply {
            put("rideId", rideId)
        })
    }

    // ==========================================
    // Client → Server: Driver actions
    // ==========================================

    fun sendLocationUpdate(
        lat: Double,
        lng: Double,
        heading: Float?,
        speed: Float?,
        accuracy: Float?,
        altitude: Double?
    ) {
        val data = JSONObject().apply {
            put("latitude", lat)
            put("longitude", lng)
            heading?.let { put("heading", it.toDouble()) }
            speed?.let { put("speed", it.toDouble()) }
            accuracy?.let { put("accuracy", it.toDouble()) }
            altitude?.let { put("altitude", it) }
        }
        socket?.emit("driver:location:update", data)
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    private val onConnect = Emitter.Listener {
        isConnected = true
        _events.tryEmit(TrackingEvent.Connected)
    }

    private val onDisconnect = Emitter.Listener {
        isConnected = false
        _events.tryEmit(TrackingEvent.Disconnected)
    }

    private val onConnectError = Emitter.Listener { args ->
        val error = args.getOrNull(0)?.toString() ?: "Connection failed"
        _events.tryEmit(TrackingEvent.Error(error))
    }

    private val onDriverLocation = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            _events.tryEmit(TrackingEvent.DriverLocationUpdate(
                rideId = data.optString("rideId", ""),
                latitude = data.optDouble("latitude", 0.0),
                longitude = data.optDouble("longitude", 0.0),
                heading = if (data.has("heading")) data.optDouble("heading").toFloat() else null,
                speed = if (data.has("speed")) data.optDouble("speed").toFloat() else null,
                timestamp = data.optString("timestamp", "")
            ))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onGeofenceEvent = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            _events.tryEmit(TrackingEvent.GeofenceEvent(
                rideId = data.optString("rideId", ""),
                eventType = data.optString("eventType", ""),
                timestamp = data.optString("timestamp", "")
            ))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onSubscribed = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            _events.tryEmit(TrackingEvent.Subscribed(
                rideId = data.optString("rideId", "")
            ))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }

    private val onLocationUpdated = Emitter.Listener { args ->
        try {
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            _events.tryEmit(TrackingEvent.LocationUpdated(
                timestamp = data.optString("timestamp", "")
            ))
        } catch (e: Exception) {
            // Ignore parse errors
        }
    }
}
