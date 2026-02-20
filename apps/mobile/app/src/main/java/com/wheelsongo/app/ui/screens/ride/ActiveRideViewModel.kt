package com.wheelsongo.app.ui.screens.ride

import android.app.Application
import android.content.pm.PackageManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.PolyUtil
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.DirectionsApi
import com.wheelsongo.app.data.network.DispatchEvent
import com.wheelsongo.app.data.network.DispatchSocketClient
import com.wheelsongo.app.data.network.TrackingEvent
import com.wheelsongo.app.data.network.TrackingSocketClient
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

data class ActiveRideUiState(
    val rideId: String = "",
    val ride: RideResponse? = null,
    val dispatchStatus: String = "SEARCHING",
    val rideStatus: String = "PENDING",
    val isLoading: Boolean = false,
    val isCancelling: Boolean = false,
    val errorMessage: String? = null,
    val isCompleted: Boolean = false,
    // Map & tracking
    val driverLocation: LocationData? = null,
    val pickupLocation: LocationData? = null,
    val dropoffLocation: LocationData? = null,
    val routePoints: List<LatLng> = emptyList(),
    // ETA
    val etaMinutes: Int? = null,
    // Geofence
    val geofenceMessage: String? = null,
    val geofenceMessageTimestamp: Long = 0L
) {
    val canCancel: Boolean
        get() = rideStatus in listOf("PENDING", "ACCEPTED")

    val statusMessage: String
        get() = when (rideStatus) {
            "PENDING" -> when (dispatchStatus) {
                "SEARCHING" -> "Finding a driver for you..."
                "NO_DRIVERS" -> "No drivers available. Please try again."
                else -> "Waiting for driver..."
            }
            "ACCEPTED" -> if (etaMinutes != null) "Driver arriving in ~$etaMinutes min" else "Driver accepted! On the way..."
            "DRIVER_ARRIVED" -> "Driver has arrived!"
            "STARTED" -> if (etaMinutes != null) "Arriving in ~$etaMinutes min" else "Ride in progress"
            "COMPLETED" -> "Ride completed!"
            else -> if (rideStatus.startsWith("CANCELLED")) "Ride cancelled" else rideStatus
        }
}

class ActiveRideViewModel @JvmOverloads constructor(
    application: Application,
    private val rideRepository: RideRepository = RideRepository(),
    private val socketClient: DispatchSocketClient = DispatchSocketClient(),
    private val trackingSocketClient: TrackingSocketClient = TrackingSocketClient()
) : AndroidViewModel(application) {

    private val directionsApi = DirectionsApi.instance
    private val mapsApiKey: String

    init {
        val appInfo = application.packageManager.getApplicationInfo(
            application.packageName, PackageManager.GET_META_DATA
        )
        mapsApiKey = appInfo.metaData?.getString("com.google.android.geo.API_KEY") ?: ""
    }

    private val _uiState = MutableStateFlow(ActiveRideUiState())
    val uiState: StateFlow<ActiveRideUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private var routeFetchJob: Job? = null
    private var lastEtaFetchTime = 0L
    private var hasSubscribedToTracking = false

    fun initialize(rideId: String) {
        _uiState.update { it.copy(rideId = rideId) }

        // Connect dispatch socket for status events
        socketClient.connect()
        listenToDispatchEvents()

        // Connect tracking socket for driver location
        trackingSocketClient.connect()
        listenToTrackingEvents()

        // Start polling as fallback
        startPolling(rideId)

        // Fetch initial ride state
        fetchRide(rideId)
    }

    private fun listenToDispatchEvents() {
        viewModelScope.launch {
            socketClient.events.collect { event ->
                when (event) {
                    is DispatchEvent.StatusUpdate -> {
                        _uiState.update { it.copy(dispatchStatus = event.status) }
                    }
                    is DispatchEvent.DriverAssigned -> {
                        _uiState.update { it.copy(dispatchStatus = "DRIVER_FOUND") }
                        fetchRide(_uiState.value.rideId)
                    }
                    is DispatchEvent.RideStatusChanged -> {
                        _uiState.update { it.copy(rideStatus = event.status) }
                        if (event.status == "COMPLETED" || event.status.startsWith("CANCELLED") || event.status == "EXPIRED") {
                            _uiState.update { it.copy(isCompleted = true) }
                        }
                        fetchRide(_uiState.value.rideId)
                    }
                    else -> { /* ignore connection events */ }
                }
            }
        }
    }

    private fun listenToTrackingEvents() {
        viewModelScope.launch {
            trackingSocketClient.events.collect { event ->
                when (event) {
                    is TrackingEvent.DriverLocationUpdate -> {
                        val driverLoc = LocationData(
                            latitude = event.latitude,
                            longitude = event.longitude,
                            heading = event.heading,
                            speed = event.speed
                        )
                        _uiState.update { it.copy(driverLocation = driverLoc) }
                        updateEta(event.latitude, event.longitude)
                    }
                    is TrackingEvent.GeofenceEvent -> {
                        val message = when (event.eventType) {
                            "DRIVER_APPROACHING_PICKUP" -> "Your driver is approaching!"
                            "DRIVER_ARRIVED_PICKUP" -> "Your driver has arrived!"
                            "DRIVER_APPROACHING_DROPOFF" -> "Approaching your destination"
                            "DRIVER_ARRIVED_DROPOFF" -> "You have arrived!"
                            else -> null
                        }
                        message?.let { msg ->
                            _uiState.update { it.copy(
                                geofenceMessage = msg,
                                geofenceMessageTimestamp = System.currentTimeMillis()
                            ) }
                        }
                    }
                    is TrackingEvent.Subscribed -> { /* subscription confirmed */ }
                    else -> { /* ignore */ }
                }
            }
        }
    }

    private fun startPolling(rideId: String) {
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                fetchRide(rideId)
            }
        }
    }

    private fun fetchRide(rideId: String) {
        viewModelScope.launch {
            val result = rideRepository.getRideById(rideId)
            result.fold(
                onSuccess = { ride ->
                    val pickup = LocationData(ride.pickupLatitude, ride.pickupLongitude)
                    val dropoff = LocationData(ride.dropoffLatitude, ride.dropoffLongitude)

                    _uiState.update {
                        it.copy(
                            ride = ride,
                            rideStatus = ride.status,
                            pickupLocation = pickup,
                            dropoffLocation = dropoff,
                            isCompleted = ride.status == "COMPLETED" || ride.status.startsWith("CANCELLED") || ride.status == "EXPIRED"
                        )
                    }

                    // Subscribe to tracking when driver is assigned
                    if (ride.driverId != null && !hasSubscribedToTracking &&
                        ride.status in listOf("ACCEPTED", "DRIVER_ARRIVED", "STARTED")) {
                        trackingSocketClient.subscribeToRide(rideId)
                        hasSubscribedToTracking = true
                    }

                    // Fetch route if not already loaded
                    if (_uiState.value.routePoints.isEmpty()) {
                        fetchRoute(pickup, dropoff)
                    }
                },
                onFailure = { /* Silently fail polling */ }
            )
        }
    }

    private fun fetchRoute(pickup: LocationData, dropoff: LocationData) {
        routeFetchJob?.cancel()
        routeFetchJob = viewModelScope.launch {
            try {
                val response = directionsApi.getDirections(
                    "${pickup.latitude},${pickup.longitude}",
                    "${dropoff.latitude},${dropoff.longitude}",
                    mapsApiKey
                )
                if (response.isSuccessful) {
                    val route = response.body()?.routes?.firstOrNull()
                    val encoded = route?.overviewPolyline?.points
                    if (encoded != null) {
                        _uiState.update { it.copy(routePoints = PolyUtil.decode(encoded)) }
                    }
                }
            } catch (_: Exception) { /* ignore */ }
        }
    }

    private fun updateEta(driverLat: Double, driverLng: Double) {
        val ride = _uiState.value.ride ?: return
        val status = _uiState.value.rideStatus

        // Determine target based on ride status
        val (targetLat, targetLng) = when (status) {
            "ACCEPTED", "DRIVER_ARRIVED" -> Pair(ride.pickupLatitude, ride.pickupLongitude)
            "STARTED" -> Pair(ride.dropoffLatitude, ride.dropoffLongitude)
            else -> return
        }

        // Quick Haversine estimation (~20 km/h Manila avg)
        val distanceKm = haversineDistance(driverLat, driverLng, targetLat, targetLng)
        val quickEtaMinutes = maxOf(1, (distanceKm / 0.33).roundToInt())
        _uiState.update { it.copy(etaMinutes = quickEtaMinutes) }

        // Throttled Directions API call every 30s for accurate ETA
        val now = System.currentTimeMillis()
        if (now - lastEtaFetchTime > 30_000L) {
            lastEtaFetchTime = now
            viewModelScope.launch {
                try {
                    val resp = directionsApi.getDirections(
                        "$driverLat,$driverLng",
                        "$targetLat,$targetLng",
                        mapsApiKey
                    )
                    if (resp.isSuccessful) {
                        val durationSeconds = resp.body()?.routes?.firstOrNull()
                            ?.legs?.firstOrNull()?.duration?.value
                        if (durationSeconds != null && durationSeconds > 0) {
                            val etaMin = maxOf(1, (durationSeconds / 60.0).roundToInt())
                            _uiState.update { it.copy(etaMinutes = etaMin) }
                        }
                    }
                } catch (_: Exception) { /* fall back to Haversine */ }
            }
        }
    }

    private fun haversineDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2)
        return r * 2 * atan2(sqrt(a), sqrt(1 - a))
    }

    fun cancelRide() {
        val rideId = _uiState.value.rideId
        viewModelScope.launch {
            _uiState.update { it.copy(isCancelling = true) }
            val result = rideRepository.cancelRide(rideId)
            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            isCancelling = false,
                            rideStatus = "CANCELLED_BY_RIDER",
                            isCompleted = true
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isCancelling = false, errorMessage = error.message)
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun clearGeofenceMessage() {
        _uiState.update { it.copy(geofenceMessage = null) }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        routeFetchJob?.cancel()
        socketClient.disconnect()
        trackingSocketClient.unsubscribeFromRide(_uiState.value.rideId)
        trackingSocketClient.disconnect()
    }
}
