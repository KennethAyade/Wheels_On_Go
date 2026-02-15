package com.wheelsongo.app.ui.screens.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.location.LocationData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * UI state for the home screen
 */
data class HomeUiState(
    val fromAddress: String = "",
    val toAddress: String = "",
    val currentLatitude: Double = LocationService.DEFAULT_LATITUDE,
    val currentLongitude: Double = LocationService.DEFAULT_LONGITUDE,
    val pickupLocation: LocationData? = null,
    val dropoffLocation: LocationData? = null,
    val isLoadingLocation: Boolean = false,
    val hasLocationPermission: Boolean = false,
    val errorMessage: String? = null
) {
    val canProceedToBooking: Boolean
        get() = pickupLocation != null && dropoffLocation != null
                && fromAddress.isNotBlank() && toAddress.isNotBlank()
}

/**
 * ViewModel for the home screen
 * Handles map state, address input, and location services
 */
class HomeViewModel @JvmOverloads constructor(
    application: Application
) : AndroidViewModel(application) {

    private val locationService = LocationService(application)

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    /**
     * Update location permission status
     */
    fun onLocationPermissionResult(granted: Boolean) {
        _uiState.update { it.copy(hasLocationPermission = granted) }
        if (granted) {
            // Get current location when permission granted
            onMyLocationClick()
        }
    }

    /**
     * Update the from (pickup) address
     */
    fun onFromAddressChange(address: String) {
        _uiState.update { it.copy(fromAddress = address) }
    }

    /**
     * Update the to (dropoff) address
     */
    fun onToAddressChange(address: String) {
        _uiState.update { it.copy(toAddress = address) }
    }

    /**
     * Set pickup location from selected place
     */
    fun setPickupLocation(location: LocationData, address: String) {
        _uiState.update {
            it.copy(
                pickupLocation = location,
                fromAddress = address
            )
        }
    }

    /**
     * Set dropoff location from selected place
     */
    fun setDropoffLocation(location: LocationData, address: String) {
        _uiState.update {
            it.copy(
                dropoffLocation = location,
                toAddress = address
            )
        }
    }

    /**
     * Use the pinned location on map as pickup address
     */
    fun onUsePinnedAddress() {
        val state = _uiState.value
        // Use current map center as pickup
        _uiState.update {
            it.copy(
                pickupLocation = LocationData(
                    latitude = state.currentLatitude,
                    longitude = state.currentLongitude
                ),
                fromAddress = "Pinned location"
            )
        }
        // TODO: Call reverse geocoding API to get actual address
    }

    /**
     * Center map on current location
     */
    fun onMyLocationClick() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingLocation = true) }

            try {
                val location = locationService.getCurrentLocation()
                if (location != null) {
                    _uiState.update {
                        it.copy(
                            isLoadingLocation = false,
                            currentLatitude = location.latitude,
                            currentLongitude = location.longitude,
                            errorMessage = null
                        )
                    }
                } else {
                    // Try last known location as fallback
                    val lastKnown = locationService.getLastKnownLocation()
                    _uiState.update {
                        it.copy(
                            isLoadingLocation = false,
                            currentLatitude = lastKnown?.latitude ?: LocationService.DEFAULT_LATITUDE,
                            currentLongitude = lastKnown?.longitude ?: LocationService.DEFAULT_LONGITUDE,
                            errorMessage = if (lastKnown == null) "Could not get current location" else null
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingLocation = false,
                        errorMessage = "Failed to get location: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Handle map tap to drop pin
     */
    fun onMapTap(latitude: Double, longitude: Double) {
        _uiState.update {
            it.copy(
                currentLatitude = latitude,
                currentLongitude = longitude
            )
        }
    }

    /**
     * Update camera position (called when map is moved)
     */
    fun onCameraMove(latitude: Double, longitude: Double) {
        _uiState.update {
            it.copy(
                currentLatitude = latitude,
                currentLongitude = longitude
            )
        }
    }

    /**
     * Clear any error message
     */
    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
