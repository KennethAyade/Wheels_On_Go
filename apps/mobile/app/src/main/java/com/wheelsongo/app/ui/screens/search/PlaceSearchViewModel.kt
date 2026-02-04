package com.wheelsongo.app.ui.screens.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.location.PlaceDetails
import com.wheelsongo.app.data.models.location.PlacePrediction
import com.wheelsongo.app.data.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * UI state for place search screen
 */
data class PlaceSearchUiState(
    val query: String = "",
    val predictions: List<PlacePrediction> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val selectedPlace: PlaceDetails? = null
)

/**
 * ViewModel for place search screen
 * Handles autocomplete suggestions and place selection
 * Uses Photon API which returns coordinates directly in autocomplete response
 */
class PlaceSearchViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(PlaceSearchUiState())
    val uiState: StateFlow<PlaceSearchUiState> = _uiState.asStateFlow()

    // Session token (kept for backwards compatibility, Photon doesn't need it)
    private var sessionToken: String = UUID.randomUUID().toString()

    // Debounce job for search
    private var searchJob: Job? = null

    /**
     * Update search query and trigger autocomplete
     */
    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }

        // Cancel previous search
        searchJob?.cancel()

        if (query.length < 3) {
            // Don't search for short queries
            _uiState.update { it.copy(predictions = emptyList()) }
            return
        }

        // Debounce search
        searchJob = viewModelScope.launch {
            delay(300) // 300ms debounce
            searchPlaces(query)
        }
    }

    /**
     * Search for places using autocomplete API
     */
    private suspend fun searchPlaces(query: String) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        try {
            val response = ApiClient.locationApi.getPlaceAutocomplete(
                input = query,
                sessionToken = sessionToken
            )

            if (response.isSuccessful) {
                val body = response.body()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        predictions = body?.predictions ?: emptyList()
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "Failed to search places"
                    )
                }
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = "Network error: ${e.message}"
                )
            }
        }
    }

    /**
     * Select a place from predictions
     * Photon API returns lat/lng directly in autocomplete - no separate API call needed
     */
    fun onPlaceSelected(prediction: PlacePrediction) {
        // Check if Photon already provided coordinates (preferred - no API call needed)
        if (prediction.latitude != null && prediction.longitude != null) {
            // Use coordinates directly from Photon response
            _uiState.update {
                it.copy(
                    selectedPlace = PlaceDetails(
                        placeId = prediction.placeId,
                        name = prediction.mainText,
                        address = prediction.description,
                        latitude = prediction.latitude,
                        longitude = prediction.longitude,
                        types = prediction.types
                    )
                )
            }
            return
        }

        // Fallback: fetch place details if coordinates not available
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val response = ApiClient.locationApi.getPlaceDetails(
                    placeId = prediction.placeId,
                    sessionToken = sessionToken
                )

                if (response.isSuccessful && response.body() != null) {
                    // Generate new session token for next search session
                    sessionToken = UUID.randomUUID().toString()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            selectedPlace = response.body()
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "Failed to get place details"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "Network error: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Clear the selected place (for navigation result handling)
     */
    fun clearSelectedPlace() {
        _uiState.update { it.copy(selectedPlace = null) }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    /**
     * Clear all state (for screen reset)
     */
    fun clearAll() {
        sessionToken = UUID.randomUUID().toString()
        _uiState.update {
            PlaceSearchUiState()
        }
    }
}
