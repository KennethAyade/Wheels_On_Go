package com.wheelsongo.app.ui.screens.driver

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DriverTripCompletionUiState(
    val rideId: String = "",
    val ride: RideResponse? = null,
    val riderName: String = "",
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

class DriverTripCompletionViewModel(
    private val rideRepository: RideRepository = RideRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverTripCompletionUiState())
    val uiState: StateFlow<DriverTripCompletionUiState> = _uiState.asStateFlow()

    fun initialize(rideId: String, riderName: String = "") {
        _uiState.update { it.copy(rideId = rideId, riderName = riderName, isLoading = true) }
        viewModelScope.launch {
            rideRepository.getRideById(rideId)
                .onSuccess { ride ->
                    _uiState.update { it.copy(ride = ride, isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message ?: "Failed to load ride")
                    }
                }
        }
    }
}
