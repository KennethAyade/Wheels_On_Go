package com.wheelsongo.app.ui.screens.vehicle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.VehicleType
import com.wheelsongo.app.data.repository.VehicleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class VehicleRegistrationUiState(
    val make: String = "",
    val model: String = "",
    val year: String = "",
    val color: String = "",
    val plateNumber: String = "",
    val vehicleType: VehicleType = VehicleType.SEDAN,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
) {
    val isFormValid: Boolean
        get() = make.isNotBlank() && model.isNotBlank() && year.length == 4 &&
                color.isNotBlank() && plateNumber.isNotBlank()
}

class VehicleRegistrationViewModel(
    private val vehicleRepository: VehicleRepository = VehicleRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(VehicleRegistrationUiState())
    val uiState: StateFlow<VehicleRegistrationUiState> = _uiState.asStateFlow()

    fun onMakeChange(value: String) { _uiState.update { it.copy(make = value) } }
    fun onModelChange(value: String) { _uiState.update { it.copy(model = value) } }
    fun onYearChange(value: String) { _uiState.update { it.copy(year = value.filter { c -> c.isDigit() }.take(4)) } }
    fun onColorChange(value: String) { _uiState.update { it.copy(color = value) } }
    fun onPlateNumberChange(value: String) { _uiState.update { it.copy(plateNumber = value.uppercase()) } }
    fun onVehicleTypeChange(type: VehicleType) { _uiState.update { it.copy(vehicleType = type) } }

    fun registerVehicle() {
        val state = _uiState.value
        if (!state.isFormValid) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val result = vehicleRepository.createVehicle(
                CreateRiderVehicleRequest(
                    make = state.make.trim(),
                    model = state.model.trim(),
                    year = state.year.toInt(),
                    color = state.color.trim(),
                    plateNumber = state.plateNumber.trim(),
                    vehicleType = state.vehicleType.name
                )
            )

            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = error.message ?: "Failed to register vehicle")
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
