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
class DriverActiveRideViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var rideRepository: RideRepository
    private lateinit var viewModel: DriverActiveRideViewModel

    private val sampleRide = RideResponse(
        id = "ride-1",
        riderId = "rider-1",
        driverId = "driver-1",
        status = "ACCEPTED",
        rideType = "INSTANT",
        pickupLatitude = 14.5995,
        pickupLongitude = 120.9842,
        pickupAddress = "SM Mall of Asia",
        dropoffLatitude = 14.5547,
        dropoffLongitude = 121.0244,
        dropoffAddress = "Makati CBD",
        estimatedFare = 150.0,
        paymentMethod = "CASH",
        createdAt = "2026-02-15T10:00:00Z"
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        rideRepository = mockk()
        viewModel = DriverActiveRideViewModel(rideRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initialize loads ride and sets phase from status`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(sampleRide)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("ride-1", state.rideId)
        assertEquals(DriverRidePhase.EN_ROUTE_PICKUP, state.phase)
        assertFalse(state.isLoading)
        assertNotNull(state.ride)
    }

    @Test
    fun `initialize sets error on failure`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.failure(Exception("Not found"))

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals("Not found", state.errorMessage)
    }

    @Test
    fun `markArrived transitions to AT_PICKUP`() = runTest {
        val arrivedRide = sampleRide.copy(status = "DRIVER_ARRIVED")
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(sampleRide)
        coEvery { rideRepository.updateRideStatus("ride-1", "DRIVER_ARRIVED", any(), any()) } returns Result.success(arrivedRide)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        viewModel.markArrived()
        advanceUntilIdle()

        assertEquals(DriverRidePhase.AT_PICKUP, viewModel.uiState.value.phase)
        assertFalse(viewModel.uiState.value.isUpdatingStatus)
    }

    @Test
    fun `startRide transitions to EN_ROUTE_DROPOFF`() = runTest {
        val startedRide = sampleRide.copy(status = "STARTED")
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(sampleRide.copy(status = "DRIVER_ARRIVED"))
        coEvery { rideRepository.updateRideStatus("ride-1", "STARTED", any(), any()) } returns Result.success(startedRide)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        viewModel.startRide()
        advanceUntilIdle()

        assertEquals(DriverRidePhase.EN_ROUTE_DROPOFF, viewModel.uiState.value.phase)
    }

    @Test
    fun `completeRide transitions to COMPLETED and sets isCompleted`() = runTest {
        val completedRide = sampleRide.copy(status = "COMPLETED")
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(sampleRide.copy(status = "STARTED"))
        coEvery { rideRepository.updateRideStatus("ride-1", "COMPLETED", any(), any()) } returns Result.success(completedRide)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        viewModel.completeRide()
        advanceUntilIdle()

        assertEquals(DriverRidePhase.COMPLETED, viewModel.uiState.value.phase)
        assertTrue(viewModel.uiState.value.isCompleted)
    }

    @Test
    fun `clearError clears error message`() {
        viewModel.clearError()
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
