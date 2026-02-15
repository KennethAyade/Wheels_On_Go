package com.wheelsongo.app.ui.screens.vehicle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.repository.VehicleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VehicleListUiState(
    val vehicles: List<RiderVehicleResponse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val actionMessage: String? = null
)

class VehicleListViewModel(
    private val vehicleRepository: VehicleRepository = VehicleRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(VehicleListUiState())
    val uiState: StateFlow<VehicleListUiState> = _uiState.asStateFlow()

    fun loadVehicles() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            vehicleRepository.getVehicles()
                .onSuccess { vehicles ->
                    _uiState.value = _uiState.value.copy(
                        vehicles = vehicles,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Failed to load vehicles"
                    )
                }
        }
    }

    fun deleteVehicle(vehicleId: String) {
        viewModelScope.launch {
            vehicleRepository.deleteVehicle(vehicleId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        vehicles = _uiState.value.vehicles.filter { it.id != vehicleId },
                        actionMessage = "Vehicle removed"
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        errorMessage = error.message ?: "Failed to delete vehicle"
                    )
                }
        }
    }

    fun setDefaultVehicle(vehicleId: String) {
        viewModelScope.launch {
            vehicleRepository.setDefaultVehicle(vehicleId)
                .onSuccess {
                    // Update all vehicles: set the selected one as default, others as not
                    _uiState.value = _uiState.value.copy(
                        vehicles = _uiState.value.vehicles.map { v ->
                            if (v.id == vehicleId) v.copy(isDefault = true)
                            else v.copy(isDefault = false)
                        },
                        actionMessage = "Default vehicle updated"
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        errorMessage = error.message ?: "Failed to set default"
                    )
                }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(errorMessage = null, actionMessage = null)
    }
}
