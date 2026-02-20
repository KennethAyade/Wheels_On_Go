package com.wheelsongo.app.ui.screens.driver

import android.app.Application
import android.content.pm.PackageManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.PolyUtil
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.DirectionsApi
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class DriverRidePhase {
    EN_ROUTE_PICKUP,   // ACCEPTED — driving to rider
    AT_PICKUP,         // DRIVER_ARRIVED — waiting for rider
    EN_ROUTE_DROPOFF,  // STARTED — driving rider to destination
    COMPLETED          // COMPLETED — ride done
}

data class DriverActiveRideUiState(
    val rideId: String = "",
    val ride: RideResponse? = null,
    val phase: DriverRidePhase = DriverRidePhase.EN_ROUTE_PICKUP,
    val isUpdatingStatus: Boolean = false,
    val navigateToCompletion: Boolean = false,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val routePoints: List<LatLng> = emptyList(),
    val isLoadingRoute: Boolean = false,
    val riderName: String = "",
    val paymentMethod: String = "",
    val rideDurationMinutes: Int = 0,
    val rideDistanceKm: Double = 0.0
)

class DriverActiveRideViewModel @JvmOverloads constructor(
    application: Application,
    private val rideRepository: RideRepository = RideRepository()
) : AndroidViewModel(application) {

    private val locationService = LocationService(application)
    private val directionsApi = DirectionsApi.instance
    private val mapsApiKey: String
    private var routeFetchJob: Job? = null

    init {
        val appInfo = application.packageManager.getApplicationInfo(
            application.packageName, PackageManager.GET_META_DATA
        )
        mapsApiKey = appInfo.metaData?.getString("com.google.android.geo.API_KEY") ?: ""
    }

    private val _uiState = MutableStateFlow(DriverActiveRideUiState())
    val uiState: StateFlow<DriverActiveRideUiState> = _uiState.asStateFlow()

    fun initialize(rideId: String, riderName: String = "") {
        _uiState.update { it.copy(rideId = rideId, isLoading = true, riderName = riderName) }
        viewModelScope.launch {
            rideRepository.getRideById(rideId)
                .onSuccess { ride ->
                    val phase = statusToPhase(ride.status)
                    val durationMinutes = (ride.estimatedDuration ?: 0) / 60
                    val distanceKm = (ride.estimatedDistance ?: 0.0) / 1000.0
                    _uiState.update {
                        it.copy(
                            ride = ride,
                            phase = phase,
                            isLoading = false,
                            paymentMethod = ride.paymentMethod,
                            rideDurationMinutes = durationMinutes,
                            rideDistanceKm = distanceKm
                        )
                    }
                    fetchRouteForPhase(phase, ride)
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message ?: "Failed to load ride")
                    }
                }
        }
    }

    fun markArrived() {
        updateStatus("DRIVER_ARRIVED", DriverRidePhase.AT_PICKUP)
    }

    fun startRide() {
        updateStatus("STARTED", DriverRidePhase.EN_ROUTE_DROPOFF)
    }

    fun completeRide() {
        updateStatus("COMPLETED", DriverRidePhase.COMPLETED)
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun onCompletionNavigated() {
        _uiState.update { it.copy(navigateToCompletion = false) }
    }

    private fun fetchRouteForPhase(phase: DriverRidePhase, ride: RideResponse) {
        when (phase) {
            DriverRidePhase.EN_ROUTE_PICKUP -> {
                viewModelScope.launch {
                    val location = locationService.getCurrentLocation()
                    if (location != null) {
                        fetchRoute(
                            "${location.latitude},${location.longitude}",
                            "${ride.pickupLatitude},${ride.pickupLongitude}"
                        )
                    }
                }
            }
            DriverRidePhase.AT_PICKUP -> {
                _uiState.update { it.copy(routePoints = emptyList()) }
            }
            DriverRidePhase.EN_ROUTE_DROPOFF -> {
                fetchRoute(
                    "${ride.pickupLatitude},${ride.pickupLongitude}",
                    "${ride.dropoffLatitude},${ride.dropoffLongitude}"
                )
            }
            DriverRidePhase.COMPLETED -> {
                _uiState.update { it.copy(navigateToCompletion = true) }
            }
        }
    }

    private fun fetchRoute(origin: String, destination: String) {
        routeFetchJob?.cancel()
        routeFetchJob = viewModelScope.launch {
            _uiState.update { it.copy(isLoadingRoute = true) }
            try {
                val response = directionsApi.getDirections(origin, destination, mapsApiKey)
                if (response.isSuccessful) {
                    val encodedPolyline = response.body()?.routes?.firstOrNull()?.overviewPolyline?.points
                    if (encodedPolyline != null) {
                        val points = PolyUtil.decode(encodedPolyline)
                        _uiState.update { it.copy(routePoints = points, isLoadingRoute = false) }
                    } else {
                        _uiState.update { it.copy(routePoints = emptyList(), isLoadingRoute = false) }
                    }
                } else {
                    _uiState.update { it.copy(routePoints = emptyList(), isLoadingRoute = false) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(routePoints = emptyList(), isLoadingRoute = false) }
            }
        }
    }

    private fun updateStatus(status: String, nextPhase: DriverRidePhase) {
        val rideId = _uiState.value.rideId
        if (rideId.isBlank()) return

        _uiState.update { it.copy(isUpdatingStatus = true) }

        viewModelScope.launch {
            rideRepository.updateRideStatus(rideId, status)
                .onSuccess { ride ->
                    _uiState.update {
                        it.copy(
                            ride = ride,
                            phase = nextPhase,
                            isUpdatingStatus = false,
                            navigateToCompletion = nextPhase == DriverRidePhase.COMPLETED
                        )
                    }
                    if (nextPhase != DriverRidePhase.COMPLETED) {
                        fetchRouteForPhase(nextPhase, ride)
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isUpdatingStatus = false, errorMessage = error.message ?: "Failed to update status")
                    }
                }
        }
    }

    private fun statusToPhase(status: String): DriverRidePhase {
        return when (status) {
            "ACCEPTED" -> DriverRidePhase.EN_ROUTE_PICKUP
            "DRIVER_ARRIVED" -> DriverRidePhase.AT_PICKUP
            "STARTED" -> DriverRidePhase.EN_ROUTE_DROPOFF
            "COMPLETED" -> DriverRidePhase.COMPLETED
            else -> DriverRidePhase.EN_ROUTE_PICKUP
        }
    }
}
