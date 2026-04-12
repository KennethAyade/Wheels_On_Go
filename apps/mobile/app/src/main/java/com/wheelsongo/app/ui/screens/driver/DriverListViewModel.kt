package com.wheelsongo.app.ui.screens.driver

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.driver.AvailableDriverResponse
import com.wheelsongo.app.data.repository.DriverRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DriverListUiState(
    val pickupLat: Double = 0.0,
    val pickupLng: Double = 0.0,
    val dropoffLat: Double = 0.0,
    val dropoffLng: Double = 0.0,
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val drivers: List<AvailableDriverResponse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val searchRadiusKm: Double = DEFAULT_RADIUS_KM,
    val canExpandSearch: Boolean = true
) {
    companion object {
        const val DEFAULT_RADIUS_KM = 15.0
        const val MAX_RADIUS_KM = 50.0
    }
}

class DriverListViewModel(
    private val driverRepository: DriverRepository = DriverRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverListUiState())
    val uiState: StateFlow<DriverListUiState> = _uiState.asStateFlow()

    fun initialize(
        pickupLat: Double, pickupLng: Double,
        dropoffLat: Double, dropoffLng: Double,
        pickupAddress: String, dropoffAddress: String
    ) {
        _uiState.update {
            it.copy(
                pickupLat = pickupLat, pickupLng = pickupLng,
                dropoffLat = dropoffLat, dropoffLng = dropoffLng,
                pickupAddress = pickupAddress, dropoffAddress = dropoffAddress
            )
        }
        fetchDrivers()
    }

    fun fetchDrivers() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            driverRepository.getAvailableDrivers(
                pickupLat = state.pickupLat,
                pickupLng = state.pickupLng,
                dropoffLat = state.dropoffLat,
                dropoffLng = state.dropoffLng,
                radiusKm = state.searchRadiusKm
            ).fold(
                onSuccess = { drivers ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            drivers = drivers,
                            canExpandSearch = drivers.isEmpty() &&
                                it.searchRadiusKm < DriverListUiState.MAX_RADIUS_KM
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message)
                    }
                }
            )
        }
    }

    /**
     * Widen the search and refetch. Riders can trigger this from the empty
     * state when no drivers were found within the current radius.
     */
    fun expandSearch() {
        val current = _uiState.value.searchRadiusKm
        if (current >= DriverListUiState.MAX_RADIUS_KM) return
        val next = (current * 2).coerceAtMost(DriverListUiState.MAX_RADIUS_KM)
        _uiState.update { it.copy(searchRadiusKm = next) }
        fetchDrivers()
    }
}
