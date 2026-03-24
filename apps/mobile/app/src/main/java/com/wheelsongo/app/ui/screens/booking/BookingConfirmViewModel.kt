package com.wheelsongo.app.ui.screens.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.CreateRideRequest
import com.wheelsongo.app.data.models.ride.RideEstimateResponse
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.repository.RideRepository
import com.wheelsongo.app.data.repository.VehicleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

data class BookingConfirmUiState(
    val pickupLat: Double = 0.0,
    val pickupLng: Double = 0.0,
    val pickupAddress: String = "",
    val dropoffLat: Double = 0.0,
    val dropoffLng: Double = 0.0,
    val dropoffAddress: String = "",
    val estimate: RideEstimateResponse? = null,
    val isLoadingEstimate: Boolean = false,
    val vehicles: List<RiderVehicleResponse> = emptyList(),
    val selectedVehicle: RiderVehicleResponse? = null,
    val isLoadingVehicles: Boolean = false,
    val paymentMethod: String = "CASH",
    val promoCode: String = "",
    val isBooking: Boolean = false,
    val bookingSuccess: Boolean = false,
    val createdRideId: String? = null,
    val errorMessage: String? = null,
    val existingActiveRideId: String? = null,
    // Scheduling fields
    val isScheduledRide: Boolean = false,
    val scheduledPickupTime: Long? = null,
    val scheduledPickupTimeFormatted: String = "",
    val selectedDate: LocalDate? = null,
    val showDatePicker: Boolean = false,
    val showTimePicker: Boolean = false,
    val schedulingSuccess: Boolean = false
)

class BookingConfirmViewModel(
    private val rideRepository: RideRepository = RideRepository(),
    private val vehicleRepository: VehicleRepository = VehicleRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingConfirmUiState())
    val uiState: StateFlow<BookingConfirmUiState> = _uiState.asStateFlow()

    /**
     * Initialize with pickup/dropoff data from HomeScreen
     */
    fun initialize(
        pickupLat: Double,
        pickupLng: Double,
        pickupAddress: String,
        dropoffLat: Double,
        dropoffLng: Double,
        dropoffAddress: String
    ) {
        _uiState.update {
            it.copy(
                pickupLat = pickupLat,
                pickupLng = pickupLng,
                pickupAddress = pickupAddress,
                dropoffLat = dropoffLat,
                dropoffLng = dropoffLng,
                dropoffAddress = dropoffAddress
            )
        }
        fetchEstimate()
        fetchVehicles()
    }

    /**
     * Fetch fare estimate from backend
     */
    private fun fetchEstimate() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingEstimate = true) }

            val result = rideRepository.getEstimate(
                pickupLat = state.pickupLat,
                pickupLng = state.pickupLng,
                dropoffLat = state.dropoffLat,
                dropoffLng = state.dropoffLng,
                promoCode = state.promoCode.ifBlank { null }
            )

            result.fold(
                onSuccess = { estimate ->
                    _uiState.update { it.copy(isLoadingEstimate = false, estimate = estimate) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isLoadingEstimate = false, errorMessage = error.message)
                    }
                }
            )
        }
    }

    /**
     * Fetch rider's registered vehicles
     */
    fun fetchVehicles() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingVehicles = true) }

            val result = vehicleRepository.getVehicles()
            result.fold(
                onSuccess = { vehicles ->
                    val defaultVehicle = vehicles.firstOrNull { it.isDefault } ?: vehicles.firstOrNull()
                    _uiState.update {
                        it.copy(
                            isLoadingVehicles = false,
                            vehicles = vehicles,
                            selectedVehicle = defaultVehicle
                        )
                    }
                },
                onFailure = {
                    _uiState.update { it.copy(isLoadingVehicles = false) }
                }
            )
        }
    }

    fun onVehicleSelected(vehicle: RiderVehicleResponse) {
        _uiState.update { it.copy(selectedVehicle = vehicle) }
    }

    fun onPaymentMethodChange(method: String) {
        _uiState.update { it.copy(paymentMethod = method) }
    }

    fun onPromoCodeChange(code: String) {
        _uiState.update { it.copy(promoCode = code) }
    }

    /**
     * Re-fetch estimate with promo code applied
     */
    fun applyPromoCode() {
        fetchEstimate()
    }

    // --- Scheduling methods ---

    fun onToggleScheduled(isScheduled: Boolean) {
        _uiState.update {
            it.copy(
                isScheduledRide = isScheduled,
                scheduledPickupTime = if (!isScheduled) null else it.scheduledPickupTime,
                scheduledPickupTimeFormatted = if (!isScheduled) "" else it.scheduledPickupTimeFormatted,
                selectedDate = if (!isScheduled) null else it.selectedDate,
                showDatePicker = false,
                showTimePicker = false
            )
        }
    }

    fun showDatePicker() {
        _uiState.update { it.copy(showDatePicker = true) }
    }

    fun dismissDatePicker() {
        _uiState.update { it.copy(showDatePicker = false) }
    }

    fun onDateSelected(year: Int, month: Int, dayOfMonth: Int) {
        val date = LocalDate.of(year, month, dayOfMonth)
        _uiState.update { it.copy(selectedDate = date, showDatePicker = false, showTimePicker = true) }
    }

    fun dismissTimePicker() {
        _uiState.update { it.copy(showTimePicker = false) }
    }

    fun onTimeSelected(hour: Int, minute: Int) {
        val state = _uiState.value
        val date = state.selectedDate ?: return

        val time = LocalTime.of(hour, minute)
        val zonedDateTime = ZonedDateTime.of(date, time, ZoneId.systemDefault())
        val epochMillis = zonedDateTime.toInstant().toEpochMilli()
        val minTimeMillis = System.currentTimeMillis() + 30 * 60 * 1000

        if (epochMillis < minTimeMillis) {
            _uiState.update {
                it.copy(
                    showTimePicker = false,
                    errorMessage = "Pickup time must be at least 30 minutes from now"
                )
            }
            return
        }

        val maxTimeMillis = System.currentTimeMillis() + 7L * 24 * 60 * 60 * 1000
        if (epochMillis > maxTimeMillis) {
            _uiState.update {
                it.copy(
                    showTimePicker = false,
                    errorMessage = "Pickup time cannot be more than 7 days in advance"
                )
            }
            return
        }

        val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a")
        val formatted = zonedDateTime.format(formatter)

        _uiState.update {
            it.copy(
                scheduledPickupTime = epochMillis,
                scheduledPickupTimeFormatted = formatted,
                showTimePicker = false
            )
        }
    }

    /**
     * Create ride and trigger dispatch (instant) or schedule (scheduled)
     */
    fun findDriver() {
        val state = _uiState.value
        if (state.selectedVehicle == null) {
            _uiState.update { it.copy(errorMessage = "Please register a vehicle first") }
            return
        }

        // Validate scheduled time if scheduling
        if (state.isScheduledRide) {
            if (state.scheduledPickupTime == null) {
                _uiState.update { it.copy(errorMessage = "Please select a pickup time") }
                return
            }
            val minTimeMillis = System.currentTimeMillis() + 30 * 60 * 1000
            if (state.scheduledPickupTime < minTimeMillis) {
                _uiState.update { it.copy(errorMessage = "Pickup time must be at least 30 minutes from now") }
                return
            }
        }

        val rideType = if (state.isScheduledRide) "SCHEDULED" else "INSTANT"
        val scheduledTime = if (state.isScheduledRide && state.scheduledPickupTime != null) {
            Instant.ofEpochMilli(state.scheduledPickupTime).toString()
        } else null

        viewModelScope.launch {
            _uiState.update { it.copy(isBooking = true, errorMessage = null) }

            val result = rideRepository.createRide(
                CreateRideRequest(
                    pickupLatitude = state.pickupLat,
                    pickupLongitude = state.pickupLng,
                    pickupAddress = state.pickupAddress,
                    dropoffLatitude = state.dropoffLat,
                    dropoffLongitude = state.dropoffLng,
                    dropoffAddress = state.dropoffAddress,
                    rideType = rideType,
                    paymentMethod = state.paymentMethod,
                    promoCode = state.promoCode.ifBlank { null },
                    riderVehicleId = state.selectedVehicle.id,
                    scheduledPickupTime = scheduledTime
                )
            )

            result.fold(
                onSuccess = { response ->
                    if (state.isScheduledRide) {
                        _uiState.update {
                            it.copy(
                                isBooking = false,
                                schedulingSuccess = true,
                                createdRideId = response.id
                            )
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isBooking = false,
                                bookingSuccess = true,
                                createdRideId = response.id
                            )
                        }
                    }
                },
                onFailure = { error ->
                    if (error.message?.contains("already have an active ride", ignoreCase = true) == true) {
                        // Fetch the existing active ride and redirect
                        rideRepository.getActiveRide().onSuccess { ride ->
                            if (ride != null) {
                                _uiState.update {
                                    it.copy(isBooking = false, existingActiveRideId = ride.id)
                                }
                            } else {
                                _uiState.update {
                                    it.copy(isBooking = false, errorMessage = error.message)
                                }
                            }
                        }.onFailure {
                            _uiState.update {
                                it.copy(isBooking = false, errorMessage = error.message)
                            }
                        }
                    } else {
                        _uiState.update {
                            it.copy(isBooking = false, errorMessage = error.message ?: "Failed to create ride")
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
