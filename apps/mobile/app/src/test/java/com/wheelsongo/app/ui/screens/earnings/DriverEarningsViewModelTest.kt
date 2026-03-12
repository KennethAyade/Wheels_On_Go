package com.wheelsongo.app.ui.screens.earnings

import com.wheelsongo.app.data.models.earnings.EarningsPeriod
import com.wheelsongo.app.data.models.earnings.EarningsSummaryResponse
import com.wheelsongo.app.data.models.earnings.EarningsTransaction
import com.wheelsongo.app.data.models.earnings.EarningsTransactionsResponse
import com.wheelsongo.app.data.models.earnings.WalletResponse
import com.wheelsongo.app.data.repository.EarningsRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DriverEarningsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var repository: EarningsRepository

    private fun makeSummary() = EarningsSummaryResponse(
        today = EarningsPeriod(100.0, 2),
        thisWeek = EarningsPeriod(500.0, 8),
        thisMonth = EarningsPeriod(2000.0, 30),
        total = EarningsPeriod(10000.0, 150)
    )

    private fun makeTransaction() = EarningsTransaction(
        id = "tx-1",
        type = "RIDE_PAYMENT",
        amount = 100.0,
        grossAmount = 100.0,
        commissionAmount = 20.0,
        commissionRate = 0.2,
        netAmount = 80.0,
        paymentMethod = "GCASH",
        description = "Ride payment",
        processedAt = "2026-03-12T10:00:00Z",
        createdAt = "2026-03-12T10:00:00Z"
    )

    private fun makeTransactionsResponse() = EarningsTransactionsResponse(
        data = listOf(makeTransaction()),
        total = 1, page = 1, limit = 50, totalPages = 1
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        repository = mockk()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): DriverEarningsViewModel {
        return DriverEarningsViewModel(repository)
    }

    @Test
    fun `init loads wallet, earnings, and transactions`() = runTest {
        coEvery { repository.getWallet() } returns Result.success(WalletResponse(1500.0))
        coEvery { repository.getEarnings() } returns Result.success(makeSummary())
        coEvery { repository.getTransactions(any(), any()) } returns Result.success(makeTransactionsResponse())

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1500.0, state.walletBalance, 0.01)
        assertEquals(100.0, state.today.earnings, 0.01)
        assertEquals(500.0, state.thisWeek.earnings, 0.01)
        assertEquals(2000.0, state.thisMonth.earnings, 0.01)
        assertEquals(10000.0, state.total.earnings, 0.01)
        assertEquals(1, state.transactions.size)
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
    }

    @Test
    fun `init sets errorMessage when wallet call fails`() = runTest {
        coEvery { repository.getWallet() } returns Result.failure(Exception("Wallet error"))
        coEvery { repository.getEarnings() } returns Result.success(makeSummary())
        coEvery { repository.getTransactions(any(), any()) } returns Result.success(makeTransactionsResponse())

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Wallet error", state.errorMessage)
        assertFalse(state.isLoading)
    }

    @Test
    fun `init sets errorMessage when earnings call fails`() = runTest {
        coEvery { repository.getWallet() } returns Result.success(WalletResponse(1500.0))
        coEvery { repository.getEarnings() } returns Result.failure(Exception("Earnings error"))
        coEvery { repository.getTransactions(any(), any()) } returns Result.success(makeTransactionsResponse())

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Earnings error", state.errorMessage)
    }

    @Test
    fun `init sets errorMessage when transactions call fails`() = runTest {
        coEvery { repository.getWallet() } returns Result.success(WalletResponse(1500.0))
        coEvery { repository.getEarnings() } returns Result.success(makeSummary())
        coEvery { repository.getTransactions(any(), any()) } returns Result.failure(Exception("Tx error"))

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Tx error", state.errorMessage)
    }

    @Test
    fun `init still populates successful results when one fails`() = runTest {
        coEvery { repository.getWallet() } returns Result.failure(Exception("Wallet error"))
        coEvery { repository.getEarnings() } returns Result.success(makeSummary())
        coEvery { repository.getTransactions(any(), any()) } returns Result.success(makeTransactionsResponse())

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        // Wallet failed, so balance stays default
        assertEquals(0.0, state.walletBalance, 0.01)
        // But earnings and transactions are still populated
        assertEquals(100.0, state.today.earnings, 0.01)
        assertEquals(1, state.transactions.size)
        assertNotNull(state.errorMessage)
    }
}
