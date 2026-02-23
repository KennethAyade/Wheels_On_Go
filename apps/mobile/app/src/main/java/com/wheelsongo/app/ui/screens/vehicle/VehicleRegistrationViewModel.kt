package com.wheelsongo.app.ui.screens.vehicle

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.VehicleType
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.repository.VehicleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

data class VehicleRegistrationUiState(
    val make: String = "",
    val model: String = "",
    val year: String = "",
    val color: String = "",
    val plateNumber: String = "",
    val vehicleType: VehicleType = VehicleType.SEDAN,
    val orUri: Uri? = null,
    val orFileName: String? = null,
    val crUri: Uri? = null,
    val crFileName: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSuccess: Boolean = false
) {
    val isFormValid: Boolean
        get() = make.isNotBlank() && model.isNotBlank() && year.length == 4 &&
                color.isNotBlank() && plateNumber.isNotBlank()
}

class VehicleRegistrationViewModel @JvmOverloads constructor(
    application: Application,
    private val vehicleRepository: VehicleRepository = VehicleRepository()
) : AndroidViewModel(application) {

    private val riderVehicleApi = ApiClient.riderVehicleApi
    private val contentResolver = application.contentResolver

    private val _uiState = MutableStateFlow(VehicleRegistrationUiState())
    val uiState: StateFlow<VehicleRegistrationUiState> = _uiState.asStateFlow()

    fun onMakeChange(value: String) { _uiState.update { it.copy(make = value) } }
    fun onModelChange(value: String) { _uiState.update { it.copy(model = value) } }
    fun onYearChange(value: String) { _uiState.update { it.copy(year = value.filter { c -> c.isDigit() }.take(4)) } }
    fun onColorChange(value: String) { _uiState.update { it.copy(color = value) } }
    fun onPlateNumberChange(value: String) { _uiState.update { it.copy(plateNumber = value.uppercase()) } }
    fun onVehicleTypeChange(type: VehicleType) { _uiState.update { it.copy(vehicleType = type) } }

    fun onOrDocumentSelected(uri: Uri?) {
        val fileName = uri?.let { resolveFileName(it) }
        _uiState.update { it.copy(orUri = uri, orFileName = fileName) }
    }

    fun onCrDocumentSelected(uri: Uri?) {
        val fileName = uri?.let { resolveFileName(it) }
        _uiState.update { it.copy(crUri = uri, crFileName = fileName) }
    }

    private fun resolveFileName(uri: Uri): String? {
        return try {
            val cursor = contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                it.moveToFirst()
                if (nameIndex >= 0) it.getString(nameIndex) else null
            }
        } catch (e: Exception) { null }
    }

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
                onSuccess = { vehicle ->
                    // Upload OR/CR documents if selected
                    state.orUri?.let { uploadDocument(vehicle.id, "OR", it) }
                    state.crUri?.let { uploadDocument(vehicle.id, "CR", it) }
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

    private suspend fun uploadDocument(vehicleId: String, type: String, uri: Uri) {
        try {
            val bytes = contentResolver.openInputStream(uri)?.readBytes() ?: return
            val mimeType = contentResolver.getType(uri) ?: "image/*"
            val fileName = resolveFileName(uri) ?: "document"
            val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", fileName, requestBody)
            riderVehicleApi.uploadVehicleDocument(vehicleId, part, type)
        } catch (e: Exception) {
            android.util.Log.w("VehicleRegistrationVM", "Failed to upload $type document: ${e.message}")
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
