package com.wheelsongo.app.ui.screens.driver

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    val isCompleted: Boolean = false,
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

class DriverActiveRideViewModel(
    private val rideRepository: RideRepository = RideRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverActiveRideUiState())
    val uiState: StateFlow<DriverActiveRideUiState> = _uiState.asStateFlow()

    fun initialize(rideId: String) {
        _uiState.value = _uiState.value.copy(rideId = rideId, isLoading = true)
        viewModelScope.launch {
            rideRepository.getRideById(rideId)
                .onSuccess { ride ->
                    _uiState.value = _uiState.value.copy(
                        ride = ride,
                        phase = statusToPhase(ride.status),
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Failed to load ride"
                    )
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
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    private fun updateStatus(status: String, nextPhase: DriverRidePhase) {
        val rideId = _uiState.value.rideId
        if (rideId.isBlank()) return

        _uiState.value = _uiState.value.copy(isUpdatingStatus = true)

        viewModelScope.launch {
            rideRepository.updateRideStatus(rideId, status)
                .onSuccess { ride ->
                    _uiState.value = _uiState.value.copy(
                        ride = ride,
                        phase = nextPhase,
                        isUpdatingStatus = false,
                        isCompleted = nextPhase == DriverRidePhase.COMPLETED
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isUpdatingStatus = false,
                        errorMessage = error.message ?: "Failed to update status"
                    )
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
