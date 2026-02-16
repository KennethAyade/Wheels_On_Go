package com.wheelsongo.app.ui.screens.ride

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.rating.CreateRatingRequest
import com.wheelsongo.app.data.repository.RatingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RideCompletionUiState(
    val rideId: String = "",
    val driverName: String = "",
    val overallRating: Int = 0,
    val punctualityRating: Int = 0,
    val safetyRating: Int = 0,
    val cleanlinessRating: Int = 0,
    val communicationRating: Int = 0,
    val review: String = "",
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val errorMessage: String? = null
)

class RideCompletionViewModel(
    private val ratingRepository: RatingRepository = RatingRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(RideCompletionUiState())
    val uiState: StateFlow<RideCompletionUiState> = _uiState.asStateFlow()

    fun initialize(rideId: String, driverName: String) {
        _uiState.update { it.copy(rideId = rideId, driverName = driverName) }
    }

    fun setOverallRating(rating: Int) {
        _uiState.update { it.copy(overallRating = rating) }
    }

    fun setPunctualityRating(rating: Int) {
        _uiState.update { it.copy(punctualityRating = rating) }
    }

    fun setSafetyRating(rating: Int) {
        _uiState.update { it.copy(safetyRating = rating) }
    }

    fun setCleanlinessRating(rating: Int) {
        _uiState.update { it.copy(cleanlinessRating = rating) }
    }

    fun setCommunicationRating(rating: Int) {
        _uiState.update { it.copy(communicationRating = rating) }
    }

    fun setReview(text: String) {
        _uiState.update { it.copy(review = text) }
    }

    fun submitRating() {
        val state = _uiState.value
        if (state.overallRating == 0) {
            _uiState.update { it.copy(errorMessage = "Please select an overall rating") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }

            ratingRepository.createRating(
                CreateRatingRequest(
                    rideId = state.rideId,
                    rating = state.overallRating,
                    review = state.review.ifBlank { null },
                    punctualityRating = state.punctualityRating.takeIf { it > 0 },
                    safetyRating = state.safetyRating.takeIf { it > 0 },
                    cleanlinessRating = state.cleanlinessRating.takeIf { it > 0 },
                    communicationRating = state.communicationRating.takeIf { it > 0 }
                )
            ).fold(
                onSuccess = {
                    _uiState.update { it.copy(isSubmitting = false, submitted = true) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isSubmitting = false, errorMessage = error.message ?: "Failed to submit rating")
                    }
                }
            )
        }
    }
}
