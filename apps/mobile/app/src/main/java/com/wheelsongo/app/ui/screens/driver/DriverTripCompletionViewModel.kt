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
    val errorMessage: String? = null,
    val isCashPayment: Boolean = false,
    val isCashConfirmed: Boolean = false,
    val isConfirmingCash: Boolean = false
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
                    val isCash = ride.paymentMethod.equals("CASH", ignoreCase = true)
                    val isAlreadyPaid = ride.paymentStatus?.equals("COMPLETED", ignoreCase = true) == true
                    _uiState.update {
                        it.copy(
                            ride = ride,
                            isLoading = false,
                            isCashPayment = isCash,
                            isCashConfirmed = isCash && isAlreadyPaid
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message ?: "Failed to load ride")
                    }
                }
        }
    }

    fun confirmCashPayment() {
        val rideId = _uiState.value.rideId
        if (rideId.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isConfirmingCash = true, errorMessage = null) }
            rideRepository.confirmCashPayment(rideId)
                .onSuccess {
                    _uiState.update { it.copy(isConfirmingCash = false, isCashConfirmed = true) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isConfirmingCash = false,
                            errorMessage = error.message ?: "Failed to confirm cash payment"
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
