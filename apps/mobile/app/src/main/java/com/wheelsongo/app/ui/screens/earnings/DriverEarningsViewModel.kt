package com.wheelsongo.app.ui.screens.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wheelsongo.app.data.models.earnings.EarningsPeriod
import com.wheelsongo.app.data.models.earnings.EarningsTransaction
import com.wheelsongo.app.data.repository.EarningsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DriverEarningsUiState(
    val walletBalance: Double = 0.0,
    val today: EarningsPeriod = EarningsPeriod(0.0, 0),
    val thisWeek: EarningsPeriod = EarningsPeriod(0.0, 0),
    val thisMonth: EarningsPeriod = EarningsPeriod(0.0, 0),
    val total: EarningsPeriod = EarningsPeriod(0.0, 0),
    val transactions: List<EarningsTransaction> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

class DriverEarningsViewModel(
    private val repository: EarningsRepository = EarningsRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DriverEarningsUiState())
    val uiState: StateFlow<DriverEarningsUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val walletResult = repository.getWallet()
            val earningsResult = repository.getEarnings()
            val transactionsResult = repository.getTransactions(page = 1, limit = 50)

            walletResult.onSuccess { wallet ->
                _uiState.update { it.copy(walletBalance = wallet.balance) }
            }

            earningsResult.onSuccess { summary ->
                _uiState.update {
                    it.copy(
                        today = summary.today,
                        thisWeek = summary.thisWeek,
                        thisMonth = summary.thisMonth,
                        total = summary.total
                    )
                }
            }

            transactionsResult.onSuccess { response ->
                _uiState.update { it.copy(transactions = response.data) }
            }

            val error = listOf(walletResult, earningsResult, transactionsResult)
                .firstOrNull { it.isFailure }?.exceptionOrNull()?.message

            _uiState.update { it.copy(isLoading = false, errorMessage = error) }
        }
    }
}
