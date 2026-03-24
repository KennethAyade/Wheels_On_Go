package com.wheelsongo.app.ui.screens.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ScheduledRidesUiState(
    val rides: List<RideResponse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val cancellingRideId: String? = null
)

class ScheduledRidesViewModel(
    private val rideRepository: RideRepository = RideRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScheduledRidesUiState())
    val uiState: StateFlow<ScheduledRidesUiState> = _uiState.asStateFlow()

    init {
        fetchScheduledRides()
    }

    fun fetchScheduledRides() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            rideRepository.getScheduledRides().fold(
                onSuccess = { rides ->
                    _uiState.update { it.copy(isLoading = false, rides = rides) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message)
                    }
                }
            )
        }
    }

    fun cancelScheduledRide(rideId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(cancellingRideId = rideId) }

            rideRepository.cancelRide(rideId, "Cancelled by rider").fold(
                onSuccess = {
                    // Remove the cancelled ride from the list
                    _uiState.update { state ->
                        state.copy(
                            cancellingRideId = null,
                            rides = state.rides.filter { it.id != rideId }
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            cancellingRideId = null,
                            errorMessage = error.message
                        )
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
