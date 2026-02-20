package com.wheelsongo.app.ui.screens.driver

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.driver.DriverPublicProfileResponse
import com.wheelsongo.app.data.models.ride.CreateRideRequest
import com.wheelsongo.app.data.repository.DriverRepository
import com.wheelsongo.app.data.repository.RideRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DriverProfileUiState(
    val driverProfileId: String = "",
    val pickupLat: Double = 0.0,
    val pickupLng: Double = 0.0,
    val dropoffLat: Double = 0.0,
    val dropoffLng: Double = 0.0,
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val profile: DriverPublicProfileResponse? = null,
    val isLoading: Boolean = false,
    val isBooking: Boolean = false,
    val createdRideId: String? = null,
    val errorMessage: String? = null
)

class DriverProfileViewModel(
    private val driverRepository: DriverRepository = DriverRepository(),
    private val rideRepository: RideRepository = RideRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverProfileUiState())
    val uiState: StateFlow<DriverProfileUiState> = _uiState.asStateFlow()

    fun initialize(
        driverProfileId: String,
        pickupLat: Double, pickupLng: Double,
        dropoffLat: Double, dropoffLng: Double,
        pickupAddress: String, dropoffAddress: String
    ) {
        _uiState.update {
            it.copy(
                driverProfileId = driverProfileId,
                pickupLat = pickupLat, pickupLng = pickupLng,
                dropoffLat = dropoffLat, dropoffLng = dropoffLng,
                pickupAddress = pickupAddress, dropoffAddress = dropoffAddress
            )
        }
        fetchProfile()
    }

    private fun fetchProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            driverRepository.getPublicProfile(_uiState.value.driverProfileId).fold(
                onSuccess = { profile ->
                    _uiState.update { it.copy(isLoading = false, profile = profile) }
                },
                onFailure = { error ->
                    _uiState.update { it.copy(isLoading = false, errorMessage = error.message) }
                }
            )
        }
    }

    fun bookDriver() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isBooking = true, errorMessage = null) }

            rideRepository.createRide(
                CreateRideRequest(
                    pickupLatitude = state.pickupLat,
                    pickupLongitude = state.pickupLng,
                    pickupAddress = state.pickupAddress,
                    dropoffLatitude = state.dropoffLat,
                    dropoffLongitude = state.dropoffLng,
                    dropoffAddress = state.dropoffAddress,
                    rideType = "INSTANT",
                    paymentMethod = "CASH",
                    selectedDriverId = state.driverProfileId
                )
            ).fold(
                onSuccess = { response ->
                    _uiState.update {
                        it.copy(isBooking = false, createdRideId = response.id)
                    }
                },
                onFailure = { error ->
                    if (error.message?.contains("already have an active ride", ignoreCase = true) == true) {
                        rideRepository.getActiveRide().fold(
                            onSuccess = { ride ->
                                if (ride != null) {
                                    _uiState.update { it.copy(isBooking = false, createdRideId = ride.id) }
                                } else {
                                    _uiState.update { it.copy(isBooking = false, errorMessage = error.message) }
                                }
                            },
                            onFailure = {
                                _uiState.update { it.copy(isBooking = false, errorMessage = error.message) }
                            }
                        )
                    } else {
                        _uiState.update {
                            it.copy(isBooking = false, errorMessage = error.message ?: "Failed to book driver")
                        }
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
