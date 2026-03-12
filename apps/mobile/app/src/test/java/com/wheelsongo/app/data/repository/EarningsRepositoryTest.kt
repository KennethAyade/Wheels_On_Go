package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.earnings.EarningsPeriod
import com.wheelsongo.app.data.models.earnings.EarningsSummaryResponse
import com.wheelsongo.app.data.models.earnings.EarningsTransaction
import com.wheelsongo.app.data.models.earnings.EarningsTransactionsResponse
import com.wheelsongo.app.data.models.earnings.WalletResponse
import com.wheelsongo.app.data.network.EarningsApi
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response
import java.io.IOException

class EarningsRepositoryTest {

    private lateinit var api: EarningsApi
    private lateinit var repository: EarningsRepository

    @Before
    fun setup() {
        api = mockk()
        repository = EarningsRepository(api)
    }

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

    @Test
    fun `getEarnings returns success with summary`() = runTest {
        coEvery { api.getEarnings() } returns Response.success(makeSummary())

        val result = repository.getEarnings()

        assertTrue(result.isSuccess)
        assertEquals(100.0, result.getOrNull()!!.today.earnings, 0.01)
    }

    @Test
    fun `getEarnings returns failure on error`() = runTest {
        coEvery { api.getEarnings() } returns Response.error(
            500, "Error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getEarnings()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getTransactions returns success with paginated data`() = runTest {
        val response = EarningsTransactionsResponse(
            data = listOf(makeTransaction()),
            total = 1, page = 1, limit = 20, totalPages = 1
        )
        coEvery { api.getTransactions(any(), any()) } returns Response.success(response)

        val result = repository.getTransactions()

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrNull()!!.data.size)
    }

    @Test
    fun `getTransactions passes page and limit parameters`() = runTest {
        val response = EarningsTransactionsResponse(
            data = emptyList(), total = 0, page = 2, limit = 10, totalPages = 0
        )
        coEvery { api.getTransactions(2, 10) } returns Response.success(response)

        repository.getTransactions(page = 2, limit = 10)

        coVerify { api.getTransactions(2, 10) }
    }

    @Test
    fun `getTransactions returns failure on error`() = runTest {
        coEvery { api.getTransactions(any(), any()) } returns Response.error(
            500, "Error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getTransactions()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getWallet returns success with balance`() = runTest {
        coEvery { api.getWallet() } returns Response.success(WalletResponse(balance = 1500.0))

        val result = repository.getWallet()

        assertTrue(result.isSuccess)
        assertEquals(1500.0, result.getOrNull()!!.balance, 0.01)
    }

    @Test
    fun `getWallet returns failure on error`() = runTest {
        coEvery { api.getWallet() } returns Response.error(
            500, "Error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getWallet()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getEarnings returns failure on exception`() = runTest {
        coEvery { api.getEarnings() } throws IOException("timeout")

        val result = repository.getEarnings()

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
    }
}
