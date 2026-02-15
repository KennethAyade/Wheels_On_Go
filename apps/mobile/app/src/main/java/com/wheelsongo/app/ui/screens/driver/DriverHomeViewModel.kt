package com.wheelsongo.app.ui.screens.driver

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.driver.UpdateDriverStatusRequest
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DispatchEvent
import com.wheelsongo.app.data.network.DispatchSocketClient
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class IncomingRideRequestUiData(
    val dispatchAttemptId: String,
    val pickupAddress: String,
    val dropoffAddress: String,
    val estimatedFare: String,
    val rideId: String
)

data class DriverHomeUiState(
    val isOnline: Boolean = false,
    val isTogglingStatus: Boolean = false,
    val currentLatitude: Double = LocationService.DEFAULT_LATITUDE,
    val currentLongitude: Double = LocationService.DEFAULT_LONGITUDE,
    val hasLocationPermission: Boolean = false,
    val isLoadingLocation: Boolean = false,
    val incomingRequest: IncomingRideRequestUiData? = null,
    val requestCountdownSeconds: Int = 30,
    val isAccepting: Boolean = false,
    val activeRideId: String? = null,
    val activeRide: RideResponse? = null,
    val errorMessage: String? = null
)

class DriverHomeViewModel @JvmOverloads constructor(
    application: Application,
    private val socketClient: DispatchSocketClient = DispatchSocketClient(),
    private val rideRepository: RideRepository = RideRepository(),
    private val driverApi: com.wheelsongo.app.data.network.DriverApi = ApiClient.driverApi
) : AndroidViewModel(application) {

    private val locationService = LocationService(application)

    private val _uiState = MutableStateFlow(DriverHomeUiState())
    val uiState: StateFlow<DriverHomeUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    init {
        // Listen for dispatch events
        viewModelScope.launch {
            socketClient.events.collect { event ->
                handleDispatchEvent(event)
            }
        }

        // Check for active ride on startup
        checkForActiveRide()
    }

    fun onLocationPermissionResult(granted: Boolean) {
        _uiState.value = _uiState.value.copy(hasLocationPermission = granted)
        if (granted) {
            startLocationUpdates()
        }
    }

    private fun startLocationUpdates() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingLocation = true)
            val location = locationService.getCurrentLocation()
            if (location != null) {
                _uiState.value = _uiState.value.copy(
                    currentLatitude = location.latitude,
                    currentLongitude = location.longitude,
                    isLoadingLocation = false
                )
            } else {
                _uiState.value = _uiState.value.copy(isLoadingLocation = false)
            }
        }
    }

    fun toggleOnlineStatus() {
        val newStatus = !_uiState.value.isOnline
        _uiState.value = _uiState.value.copy(isTogglingStatus = true)

        viewModelScope.launch {
            try {
                val state = _uiState.value
                val response = driverApi.updateStatus(
                    UpdateDriverStatusRequest(
                        isOnline = newStatus,
                        latitude = state.currentLatitude,
                        longitude = state.currentLongitude
                    )
                )
                if (response.isSuccessful) {
                    _uiState.value = _uiState.value.copy(
                        isOnline = newStatus,
                        isTogglingStatus = false
                    )
                    // Connect/disconnect WebSocket based on status
                    if (newStatus) {
                        socketClient.connect()
                    } else {
                        socketClient.disconnect()
                    }
                } else {
                    _uiState.value = _uiState.value.copy(
                        isTogglingStatus = false,
                        errorMessage = "Failed to update status"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isTogglingStatus = false,
                    errorMessage = e.message ?: "Failed to update status"
                )
            }
        }
    }

    fun acceptRide() {
        val request = _uiState.value.incomingRequest ?: return
        _uiState.value = _uiState.value.copy(isAccepting = true)
        countdownJob?.cancel()

        socketClient.sendAccept(request.dispatchAttemptId)

        // The server will respond with dispatch:accepted, which sets activeRideId
    }

    fun declineRide() {
        val request = _uiState.value.incomingRequest ?: return
        countdownJob?.cancel()

        socketClient.sendDecline(request.dispatchAttemptId)

        _uiState.value = _uiState.value.copy(
            incomingRequest = null,
            requestCountdownSeconds = 30,
            isAccepting = false
        )
    }

    fun checkForActiveRide() {
        viewModelScope.launch {
            rideRepository.getActiveRide()
                .onSuccess { ride ->
                    if (ride != null && ride.driverId != null) {
                        _uiState.value = _uiState.value.copy(
                            activeRideId = ride.id,
                            activeRide = ride,
                            isOnline = true
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun onActiveRideNavigated() {
        // Reset accepting state after navigation
        _uiState.value = _uiState.value.copy(isAccepting = false)
    }

    private fun handleDispatchEvent(event: DispatchEvent) {
        when (event) {
            is DispatchEvent.IncomingRideRequest -> {
                val data = event.rideData
                _uiState.value = _uiState.value.copy(
                    incomingRequest = IncomingRideRequestUiData(
                        dispatchAttemptId = event.dispatchAttemptId,
                        pickupAddress = data["pickupAddress"] ?: "Unknown pickup",
                        dropoffAddress = data["dropoffAddress"] ?: "Unknown dropoff",
                        estimatedFare = data["estimatedFare"] ?: "---",
                        rideId = data["rideId"] ?: ""
                    ),
                    requestCountdownSeconds = 30
                )
                startCountdown()
            }
            is DispatchEvent.DispatchAccepted -> {
                val rideId = _uiState.value.incomingRequest?.rideId ?: return
                _uiState.value = _uiState.value.copy(
                    activeRideId = rideId,
                    incomingRequest = null,
                    requestCountdownSeconds = 30,
                    isAccepting = false
                )
            }
            is DispatchEvent.DispatchDeclined -> {
                _uiState.value = _uiState.value.copy(
                    incomingRequest = null,
                    requestCountdownSeconds = 30,
                    isAccepting = false
                )
            }
            is DispatchEvent.Error -> {
                _uiState.value = _uiState.value.copy(
                    errorMessage = event.message,
                    isAccepting = false
                )
            }
            else -> { /* Rider-side events — ignore for driver */ }
        }
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            for (i in 30 downTo 0) {
                _uiState.value = _uiState.value.copy(requestCountdownSeconds = i)
                if (i == 0) {
                    // Auto-decline when timer expires
                    declineRide()
                    break
                }
                delay(1000)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        socketClient.disconnect()
        countdownJob?.cancel()
    }
}
