package com.wheelsongo.app.ui.screens.driver

import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.repository.RideRepository
import io.mockk.coEvery
import io.mockk.coVerify
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
class DriverTripCompletionViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var rideRepository: RideRepository
    private lateinit var viewModel: DriverTripCompletionViewModel

    private fun makeRide(
        paymentMethod: String = "CASH",
        paymentStatus: String? = "PENDING"
    ) = RideResponse(
        id = "ride-1",
        riderId = "rider-1",
        driverId = "driver-1",
        status = "COMPLETED",
        rideType = "INSTANT",
        pickupLatitude = 14.55,
        pickupLongitude = 121.0,
        pickupAddress = "Makati",
        dropoffLatitude = 14.60,
        dropoffLongitude = 121.05,
        dropoffAddress = "BGC",
        estimatedFare = 150.0,
        paymentMethod = paymentMethod,
        paymentStatus = paymentStatus,
        createdAt = "2026-03-12T10:00:00Z"
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        rideRepository = mockk()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initialize sets isCashPayment true for CASH rides`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRide())
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isCashPayment)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `initialize sets isCashPayment false for GCASH rides`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(
            makeRide(paymentMethod = "GCASH")
        )
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isCashPayment)
    }

    @Test
    fun `initialize sets isCashConfirmed true when CASH and COMPLETED`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(
            makeRide(paymentMethod = "CASH", paymentStatus = "COMPLETED")
        )
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isCashPayment)
        assertTrue(viewModel.uiState.value.isCashConfirmed)
    }

    @Test
    fun `initialize sets error on failure`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.failure(
            Exception("Network error")
        )
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        assertEquals("Network error", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `confirmCashPayment sets isCashConfirmed on success`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRide())
        coEvery { rideRepository.confirmCashPayment("ride-1") } returns Result.success(true)
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()
        viewModel.confirmCashPayment()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isCashConfirmed)
        assertFalse(viewModel.uiState.value.isConfirmingCash)
    }

    @Test
    fun `confirmCashPayment sets error on failure`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRide())
        coEvery { rideRepository.confirmCashPayment("ride-1") } returns Result.failure(
            Exception("Payment failed")
        )
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()
        viewModel.confirmCashPayment()
        advanceUntilIdle()

        assertEquals("Payment failed", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isConfirmingCash)
    }

    @Test
    fun `confirmCashPayment does nothing when rideId blank`() = runTest {
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.confirmCashPayment()
        advanceUntilIdle()

        coVerify(exactly = 0) { rideRepository.confirmCashPayment(any()) }
    }

    @Test
    fun `clearError clears errorMessage`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.failure(
            Exception("Error")
        )
        viewModel = DriverTripCompletionViewModel(rideRepository)

        viewModel.initialize("ride-1")
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.errorMessage)

        viewModel.clearError()
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
