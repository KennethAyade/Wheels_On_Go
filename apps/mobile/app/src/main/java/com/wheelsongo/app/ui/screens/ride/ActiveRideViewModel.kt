package com.wheelsongo.app.ui.screens.ride

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.DispatchEvent
import com.wheelsongo.app.data.network.DispatchSocketClient
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class ActiveRideUiState(
    val rideId: String = "",
    val ride: RideResponse? = null,
    val dispatchStatus: String = "SEARCHING", // SEARCHING, DRIVER_FOUND, NO_DRIVERS
    val rideStatus: String = "PENDING", // PENDING, ACCEPTED, DRIVER_ARRIVED, STARTED, COMPLETED, CANCELLED
    val isLoading: Boolean = false,
    val isCancelling: Boolean = false,
    val errorMessage: String? = null,
    val isCompleted: Boolean = false
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
            "ACCEPTED" -> "Driver accepted! On the way..."
            "DRIVER_ARRIVED" -> "Driver has arrived!"
            "STARTED" -> "Ride in progress"
            "COMPLETED" -> "Ride completed!"
            else -> if (rideStatus.startsWith("CANCELLED")) "Ride cancelled" else rideStatus
        }
}

class ActiveRideViewModel(
    private val rideRepository: RideRepository = RideRepository(),
    private val socketClient: DispatchSocketClient = DispatchSocketClient()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveRideUiState())
    val uiState: StateFlow<ActiveRideUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null

    fun initialize(rideId: String) {
        _uiState.update { it.copy(rideId = rideId) }

        // Connect WebSocket for real-time updates
        socketClient.connect()
        listenToDispatchEvents()

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
                        // Re-fetch ride to get driver info
                        fetchRide(_uiState.value.rideId)
                    }
                    is DispatchEvent.RideStatusChanged -> {
                        _uiState.update { it.copy(rideStatus = event.status) }
                        if (event.status == "COMPLETED" || event.status.startsWith("CANCELLED") || event.status == "EXPIRED") {
                            _uiState.update { it.copy(isCompleted = true) }
                        }
                        // Re-fetch ride for updated details
                        fetchRide(_uiState.value.rideId)
                    }
                    else -> { /* ignore connection events */ }
                }
            }
        }
    }

    private fun startPolling(rideId: String) {
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000) // Poll every 10 seconds
                fetchRide(rideId)
            }
        }
    }

    private fun fetchRide(rideId: String) {
        viewModelScope.launch {
            val result = rideRepository.getRideById(rideId)
            result.fold(
                onSuccess = { ride ->
                    _uiState.update {
                        it.copy(
                            ride = ride,
                            rideStatus = ride.status,
                            isCompleted = ride.status == "COMPLETED" || ride.status.startsWith("CANCELLED") || ride.status == "EXPIRED"
                        )
                    }
                },
                onFailure = { /* Silently fail polling */ }
            )
        }
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

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        socketClient.disconnect()
    }
}
