package com.wheelsongo.app.ui.screens.driver

import android.app.Application
import android.location.Geocoder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.driver.UpdateDriverStatusRequest
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.DispatchEvent
import com.wheelsongo.app.data.network.DispatchSocketClient
import com.wheelsongo.app.data.repository.RideRepository
import com.wheelsongo.app.data.network.TrackingApi
import com.wheelsongo.app.data.network.UpdateLocationRequest
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Locale

data class IncomingRideRequestUiData(
    val dispatchAttemptId: String,
    val rideId: String,
    val riderName: String,
    val pickupAddress: String,
    val dropoffAddress: String,
    val estimatedFare: String,
    val paymentMethod: String,
    val rideDurationMinutes: Int,
    val rideDistanceKm: Double,
    val pickupLat: Double,
    val pickupLng: Double,
    val isScheduled: Boolean = false,
    val scheduledTime: String? = null
)

data class DriverHomeUiState(
    val isOnline: Boolean = false,
    val isTogglingStatus: Boolean = false,
    val currentLatitude: Double = LocationService.DEFAULT_LATITUDE,
    val currentLongitude: Double = LocationService.DEFAULT_LONGITUDE,
    val currentLocationAddress: String = "",
    val hasLocationPermission: Boolean = false,
    val isLoadingLocation: Boolean = false,
    val pendingRequests: List<IncomingRideRequestUiData> = emptyList(),
    val acceptedRideId: String? = null,
    val acceptedRiderName: String = "",
    val activeRideId: String? = null,
    val activeRide: RideResponse? = null,
    val navigateToDriveRequests: Boolean = false,
    val errorMessage: String? = null,
    val showProfileSetupPrompt: Boolean = false,
    val needsFatigueCheck: Boolean = false,
    val needsFaceEnrollment: Boolean = false
)

class DriverHomeViewModel @JvmOverloads constructor(
    application: Application,
    private val socketClient: DispatchSocketClient = DispatchSocketClient(),
    private val rideRepository: RideRepository = RideRepository(),
    private val driverApi: com.wheelsongo.app.data.network.DriverApi = ApiClient.driverApi,
    private val trackingApi: TrackingApi = ApiClient.trackingApi
) : AndroidViewModel(application) {

    private val locationService = LocationService(application)
    private val tokenManager = ApiClient.getTokenManager()

    private val _uiState = MutableStateFlow(DriverHomeUiState())
    val uiState: StateFlow<DriverHomeUiState> = _uiState.asStateFlow()

    private var locationTrackingJob: Job? = null

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
            val location = locationService.getReliableCurrentLocation()
            if (location != null) {
                _uiState.update {
                    it.copy(
                        currentLatitude = location.latitude,
                        currentLongitude = location.longitude,
                        isLoadingLocation = false
                    )
                }
                loadAddressForLocation(location.latitude, location.longitude)
            } else {
                _uiState.update { it.copy(isLoadingLocation = false) }
            }
        }
    }

    private fun loadAddressForLocation(lat: Double, lng: Double) {
        viewModelScope.launch {
            try {
                val geocoder = Geocoder(getApplication(), Locale.getDefault())
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(lat, lng, 1)
                val address = addresses?.firstOrNull()
                if (address != null) {
                    val parts = listOfNotNull(
                        address.thoroughfare,
                        address.subLocality ?: address.locality
                    )
                    val readable = if (parts.isNotEmpty()) parts.joinToString(", ") else address.getAddressLine(0) ?: ""
                    _uiState.update { it.copy(currentLocationAddress = readable) }
                }
            } catch (e: Exception) {
                // Geocoder unavailable — leave address empty
            }
        }
    }

    fun clearProfileSetupPrompt() {
        _uiState.update { it.copy(showProfileSetupPrompt = false) }
    }

    fun clearFatigueCheckFlag() {
        _uiState.update { it.copy(needsFatigueCheck = false) }
    }

    fun clearFaceEnrollmentFlag() {
        _uiState.update { it.copy(needsFaceEnrollment = false) }
    }

    /**
     * Check fatigue status before going online.
     * Returns true if the driver is allowed to go online, false if blocked.
     */
    private suspend fun checkFatigueGate(): Boolean {
        try {
            val statusResp = ApiClient.fatigueApi.getFatigueStatus()
            android.util.Log.d("DriverHomeVM", "Fatigue status response: code=${statusResp.code()}, body=${statusResp.body()}")
            if (statusResp.isSuccessful) {
                val body = statusResp.body()
                if (body != null && !body.allowed) {
                    android.util.Log.d("DriverHomeVM", "Fatigue gate blocked: reason=${body.reason}")
                    when (body.reason) {
                        "Face enrollment required" -> {
                            _uiState.update { it.copy(isTogglingStatus = false, needsFaceEnrollment = true) }
                            return false
                        }
                        "Fatigue check required" -> {
                            _uiState.update { it.copy(isTogglingStatus = false, needsFatigueCheck = true) }
                            return false
                        }
                        "Fatigue cooldown active" -> {
                            val cooldownMsg = if (body.cooldownUntil != null) {
                                "You need to rest before going online. Cooldown active."
                            } else {
                                "Fatigue cooldown is active. Please rest before driving."
                            }
                            _uiState.update { it.copy(isTogglingStatus = false, errorMessage = cooldownMsg) }
                            return false
                        }
                        else -> {
                            _uiState.update { it.copy(isTogglingStatus = false, errorMessage = body.reason ?: "Cannot go online") }
                            return false
                        }
                    }
                }
                android.util.Log.d("DriverHomeVM", "Fatigue gate passed: allowed")
            } else {
                val errorBody = statusResp.errorBody()?.string()
                android.util.Log.w("DriverHomeVM", "Fatigue status API error: code=${statusResp.code()}, error=$errorBody")
                _uiState.update {
                    it.copy(isTogglingStatus = false, errorMessage = "Unable to verify fatigue status. Please try again.")
                }
                return false
            }
        } catch (e: Exception) {
            android.util.Log.e("DriverHomeVM", "Fatigue status check failed", e)
            _uiState.update {
                it.copy(isTogglingStatus = false, errorMessage = "Unable to verify fatigue status. Please check your connection and try again.")
            }
            return false
        }
        return true
    }

    fun toggleOnlineStatus() {
        if (!tokenManager.isProfileComplete()) {
            _uiState.update { it.copy(showProfileSetupPrompt = true) }
            return
        }
        val newStatus = !_uiState.value.isOnline
        _uiState.value = _uiState.value.copy(isTogglingStatus = true)

        viewModelScope.launch {
            // Get fresh GPS coordinates before going online so we never send Manila defaults
            val (lat, lng) = if (newStatus) {
                if (!locationService.isLocationEnabled()) {
                    _uiState.update {
                        it.copy(
                            isTogglingStatus = false,
                            errorMessage = "Location services are disabled. Please enable GPS in your device settings."
                        )
                    }
                    return@launch
                }

                val location = locationService.getReliableCurrentLocation()
                if (location == null) {
                    _uiState.update {
                        it.copy(
                            isTogglingStatus = false,
                            errorMessage = "Unable to get GPS fix. Please move to an open area and try again."
                        )
                    }
                    return@launch
                }
                _uiState.update {
                    it.copy(
                        currentLatitude = location.latitude,
                        currentLongitude = location.longitude
                    )
                }
                android.util.Log.d("DriverHomeVM", "Going online at lat=${location.latitude}, lng=${location.longitude}")
                loadAddressForLocation(location.latitude, location.longitude)
                Pair(location.latitude, location.longitude)
            } else {
                Pair(_uiState.value.currentLatitude, _uiState.value.currentLongitude)
            }

            // Fatigue safety gate — check before going online
            if (newStatus && !checkFatigueGate()) return@launch

            try {
                val response = driverApi.updateStatus(
                    UpdateDriverStatusRequest(
                        isOnline = newStatus,
                        latitude = lat,
                        longitude = lng
                    )
                )
                if (response.isSuccessful) {
                    _uiState.update { it.copy(isOnline = newStatus, isTogglingStatus = false) }
                    if (newStatus) {
                        socketClient.connect()
                        startLocationTracking()
                    } else {
                        socketClient.disconnect()
                        stopLocationTracking()
                    }
                } else {
                    _uiState.update { it.copy(isTogglingStatus = false, errorMessage = "Failed to update status") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isTogglingStatus = false, errorMessage = e.message ?: "Failed to update status") }
            }
        }
    }

    /**
     * Called when driver taps "Find Drive Requests".
     * Goes online (if not already) and triggers navigation to DriveRequestsScreen.
     */
    fun goOnlineAndFindRides() {
        if (!tokenManager.isProfileComplete()) {
            _uiState.update { it.copy(showProfileSetupPrompt = true) }
            return
        }
        if (!_uiState.value.isOnline) {
            // toggleOnlineStatus sets navigateToDriveRequests after going online
            viewModelScope.launch {
                val newStatus = true
                _uiState.update { it.copy(isTogglingStatus = true) }

                if (!locationService.isLocationEnabled()) {
                    _uiState.update {
                        it.copy(
                            isTogglingStatus = false,
                            errorMessage = "Location services are disabled. Please enable GPS in your device settings."
                        )
                    }
                    return@launch
                }

                val location = locationService.getReliableCurrentLocation()
                if (location == null) {
                    _uiState.update {
                        it.copy(
                            isTogglingStatus = false,
                            errorMessage = "Unable to get GPS fix. Please move to an open area and try again."
                        )
                    }
                    return@launch
                }
                _uiState.update {
                    it.copy(
                        currentLatitude = location.latitude,
                        currentLongitude = location.longitude
                    )
                }
                loadAddressForLocation(location.latitude, location.longitude)

                // Fatigue safety gate
                if (!checkFatigueGate()) return@launch

                try {
                    val response = driverApi.updateStatus(
                        UpdateDriverStatusRequest(
                            isOnline = newStatus,
                            latitude = location.latitude,
                            longitude = location.longitude
                        )
                    )
                    if (response.isSuccessful) {
                        _uiState.update {
                            it.copy(isOnline = true, isTogglingStatus = false, navigateToDriveRequests = true)
                        }
                        socketClient.connect()
                        startLocationTracking()
                    } else {
                        _uiState.update { it.copy(isTogglingStatus = false, errorMessage = "Failed to go online") }
                    }
                } catch (e: Exception) {
                    _uiState.update {
                        it.copy(isTogglingStatus = false, errorMessage = e.message ?: "Failed to go online")
                    }
                }
            }
        } else {
            // Already online — just navigate
            _uiState.update { it.copy(navigateToDriveRequests = true) }
        }
    }

    fun onDriveRequestsNavigated() {
        _uiState.update { it.copy(navigateToDriveRequests = false) }
    }

    private fun startLocationTracking() {
        locationTrackingJob?.cancel()
        locationTrackingJob = viewModelScope.launch {
            locationService.getLocationUpdates(5_000L).collect { location ->
                _uiState.update {
                    it.copy(
                        currentLatitude = location.latitude,
                        currentLongitude = location.longitude
                    )
                }
                try {
                    trackingApi.updateLocation(
                        UpdateLocationRequest(
                            latitude = location.latitude,
                            longitude = location.longitude
                        )
                    )
                    android.util.Log.d("DriverHomeVM", "Location update sent: ${location.latitude}, ${location.longitude}")
                } catch (e: Exception) {
                    android.util.Log.w("DriverHomeVM", "Location update failed: ${e.message}")
                }
            }
        }
    }

    private fun stopLocationTracking() {
        locationTrackingJob?.cancel()
        locationTrackingJob = null
    }

    fun acceptRide(dispatchAttemptId: String) {
        val request = _uiState.value.pendingRequests.find { it.dispatchAttemptId == dispatchAttemptId }
        socketClient.sendAccept(dispatchAttemptId)
        _uiState.update { s ->
            s.copy(
                pendingRequests = s.pendingRequests.filter { it.dispatchAttemptId != dispatchAttemptId },
                acceptedRiderName = request?.riderName ?: s.acceptedRiderName,
                acceptedRideId = request?.rideId ?: s.acceptedRideId
            )
        }
    }

    fun declineRide(dispatchAttemptId: String) {
        socketClient.sendDecline(dispatchAttemptId)
        _uiState.update { s ->
            s.copy(pendingRequests = s.pendingRequests.filter { it.dispatchAttemptId != dispatchAttemptId })
        }
    }

    fun checkForActiveRide() {
        viewModelScope.launch {
            rideRepository.getActiveRide()
                .onSuccess { ride ->
                    if (ride != null && ride.driverId != null) {
                        _uiState.update {
                            it.copy(activeRideId = ride.id, activeRide = ride, isOnline = true)
                        }
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun onActiveRideNavigated() {
        _uiState.update { it.copy(acceptedRideId = null) }
    }

    fun clearActiveRideState() {
        _uiState.update { it.copy(
            activeRideId = null,
            acceptedRideId = null,
            acceptedRiderName = ""
        ) }
    }

    private fun handleDispatchEvent(event: DispatchEvent) {
        when (event) {
            is DispatchEvent.IncomingRideRequest -> {
                val data = event.rideData
                val newRequest = IncomingRideRequestUiData(
                    dispatchAttemptId = event.dispatchAttemptId,
                    rideId = data["id"] ?: data["rideId"] ?: "",
                    riderName = data["riderName"] ?: "Customer",
                    pickupAddress = data["pickupAddress"] ?: "Unknown pickup",
                    dropoffAddress = data["dropoffAddress"] ?: "Unknown dropoff",
                    estimatedFare = data["estimatedFare"]?.toDoubleOrNull()?.let { "%.0f".format(it) } ?: "---",
                    paymentMethod = data["paymentMethod"] ?: "CASH",
                    rideDurationMinutes = data["estimatedDuration"]?.toIntOrNull()?.div(60) ?: 0,
                    rideDistanceKm = data["estimatedDistance"]?.toDoubleOrNull()?.div(1000.0) ?: 0.0,
                    pickupLat = data["pickupLat"]?.toDoubleOrNull() ?: 0.0,
                    pickupLng = data["pickupLng"]?.toDoubleOrNull() ?: 0.0
                )
                _uiState.update { it.copy(pendingRequests = it.pendingRequests + newRequest) }
            }
            is DispatchEvent.DispatchAccepted -> {
                // Extract rideId from event data (backend sends { ride: { id, ... } })
                val rideId = event.data?.get("id")?.takeIf { it.isNotEmpty() }
                    ?: _uiState.value.acceptedRideId ?: return
                _uiState.update { it.copy(pendingRequests = emptyList(), acceptedRideId = rideId) }
            }
            is DispatchEvent.DispatchDeclined -> {
                // Clear all pending (backend rejected or timed out)
                _uiState.update { it.copy(pendingRequests = emptyList()) }
            }
            is DispatchEvent.Error -> {
                _uiState.update { it.copy(
                    errorMessage = event.message,
                    acceptedRideId = null
                ) }
            }
            else -> { /* Rider-side events — ignore for driver */ }
        }
    }

    override fun onCleared() {
        super.onCleared()
        socketClient.disconnect()
        stopLocationTracking()
    }
}
