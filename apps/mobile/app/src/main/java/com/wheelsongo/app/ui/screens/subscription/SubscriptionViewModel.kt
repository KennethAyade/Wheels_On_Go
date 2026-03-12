package com.wheelsongo.app.ui.screens.subscription

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.subscription.SubscriptionPlan
import com.wheelsongo.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SubscriptionUiState(
    val plans: List<SubscriptionPlan> = emptyList(),
    val currentPlan: SubscriptionPlan? = null,
    val isActive: Boolean = false,
    val endDate: String? = null,
    val isLoading: Boolean = true,
    val isSubscribing: Boolean = false,
    val isCancelling: Boolean = false,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

class SubscriptionViewModel(
    private val repository: SubscriptionRepository = SubscriptionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SubscriptionUiState())
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Load plans and current subscription in parallel
            val plansResult = repository.listPlans()
            val subResult = repository.getMySubscription()

            plansResult.onSuccess { plans ->
                _uiState.update { it.copy(plans = plans) }
            }

            subResult.onSuccess { sub ->
                _uiState.update {
                    it.copy(
                        currentPlan = sub.plan,
                        isActive = sub.active,
                        endDate = sub.endDate
                    )
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun subscribe(planId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubscribing = true, errorMessage = null, successMessage = null) }
            repository.subscribe(planId)
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isSubscribing = false,
                            currentPlan = response.plan,
                            isActive = true,
                            endDate = response.endDate,
                            successMessage = "Subscribed to ${response.plan?.name} plan!"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isSubscribing = false, errorMessage = error.message ?: "Failed to subscribe")
                    }
                }
        }
    }

    fun cancelSubscription() {
        viewModelScope.launch {
            _uiState.update { it.copy(isCancelling = true, errorMessage = null, successMessage = null) }
            repository.cancelSubscription()
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isCancelling = false,
                            currentPlan = null,
                            isActive = false,
                            endDate = null,
                            successMessage = "Subscription cancelled"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isCancelling = false, errorMessage = error.message ?: "Failed to cancel")
                    }
                }
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(successMessage = null, errorMessage = null) }
    }
}
