package com.wheelsongo.app.ui.screens.ride

import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.DispatchSocketClient
import com.wheelsongo.app.data.repository.RideRepository
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import com.wheelsongo.app.data.network.DispatchEvent

@OptIn(ExperimentalCoroutinesApi::class)
class ActiveRideViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var rideRepository: RideRepository
    private lateinit var socketClient: DispatchSocketClient
    private lateinit var eventsFlow: MutableSharedFlow<DispatchEvent>
    private lateinit var viewModel: ActiveRideViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        rideRepository = mockk()
        socketClient = mockk(relaxUnitFun = true)
        eventsFlow = MutableSharedFlow()
        every { socketClient.events } returns eventsFlow

        viewModel = ActiveRideViewModel(rideRepository, socketClient)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun makeRideResponse(
        id: String = "ride-1",
        status: String = "PENDING"
    ) = RideResponse(
        id = id, riderId = "rider-1", status = status,
        rideType = "INSTANT", pickupLatitude = 14.55, pickupLongitude = 121.0,
        pickupAddress = "Makati", dropoffLatitude = 14.60, dropoffLongitude = 121.05,
        dropoffAddress = "BGC", paymentMethod = "CASH", createdAt = "2026-02-15T10:00:00Z"
    )

    @Test
    fun `initial state is PENDING with SEARCHING`() {
        val state = viewModel.uiState.value
        assertEquals("PENDING", state.rideStatus)
        assertEquals("SEARCHING", state.dispatchStatus)
        assertEquals("Finding a driver for you...", state.statusMessage)
    }

    @Test
    fun `initialize connects socket and fetches ride`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRideResponse())

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        verify { socketClient.connect() }
        assertEquals("ride-1", viewModel.uiState.value.rideId)
    }

    @Test
    fun `fetchRide updates ride data`() = runTest {
        val ride = makeRideResponse(status = "ACCEPTED")
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(ride)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("ACCEPTED", state.rideStatus)
        assertNotNull(state.ride)
    }

    @Test
    fun `canCancel is true for PENDING`() {
        val state = ActiveRideUiState(rideStatus = "PENDING")
        assertTrue(state.canCancel)
    }

    @Test
    fun `canCancel is true for ACCEPTED`() {
        val state = ActiveRideUiState(rideStatus = "ACCEPTED")
        assertTrue(state.canCancel)
    }

    @Test
    fun `canCancel is false for STARTED`() {
        val state = ActiveRideUiState(rideStatus = "STARTED")
        assertFalse(state.canCancel)
    }

    @Test
    fun `canCancel is false for COMPLETED`() {
        val state = ActiveRideUiState(rideStatus = "COMPLETED")
        assertFalse(state.canCancel)
    }

    @Test
    fun `statusMessage for STARTED`() {
        val state = ActiveRideUiState(rideStatus = "STARTED")
        assertEquals("Ride in progress", state.statusMessage)
    }

    @Test
    fun `statusMessage for COMPLETED`() {
        val state = ActiveRideUiState(rideStatus = "COMPLETED")
        assertEquals("Ride completed!", state.statusMessage)
    }

    @Test
    fun `statusMessage for NO_DRIVERS`() {
        val state = ActiveRideUiState(rideStatus = "PENDING", dispatchStatus = "NO_DRIVERS")
        assertEquals("No drivers available. Please try again.", state.statusMessage)
    }

    @Test
    fun `cancelRide success updates state`() = runTest {
        val cancelled = makeRideResponse(status = "CANCELLED_BY_RIDER")
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRideResponse())
        coEvery { rideRepository.cancelRide("ride-1") } returns Result.success(cancelled)

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        viewModel.cancelRide()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("CANCELLED_BY_RIDER", state.rideStatus)
        assertTrue(state.isCompleted)
    }

    @Test
    fun `cancelRide failure sets error`() = runTest {
        coEvery { rideRepository.getRideById("ride-1") } returns Result.success(makeRideResponse())
        coEvery { rideRepository.cancelRide("ride-1") } returns
                Result.failure(Exception("Cannot cancel"))

        viewModel.initialize("ride-1")
        advanceUntilIdle()

        viewModel.cancelRide()
        advanceUntilIdle()

        assertEquals("Cannot cancel", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isCancelling)
    }

    @Test
    fun `clearError clears error`() {
        viewModel.clearError()
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
