package com.wheelsongo.app.ui.screens.booking

import com.wheelsongo.app.data.models.ride.CreateRideResponse
import com.wheelsongo.app.data.models.ride.RideEstimateResponse
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.repository.RideRepository
import com.wheelsongo.app.data.repository.VehicleRepository
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
class BookingConfirmViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var rideRepository: RideRepository
    private lateinit var vehicleRepository: VehicleRepository
    private lateinit var viewModel: BookingConfirmViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        rideRepository = mockk()
        vehicleRepository = mockk()
        viewModel = BookingConfirmViewModel(rideRepository, vehicleRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun makeEstimate() = RideEstimateResponse(
        distanceMeters = 5000.0, distanceKm = 5.0, distanceText = "5.0 km",
        durationSeconds = 900, durationMinutes = 15, durationText = "15 min",
        baseFare = 50, distanceFare = 50, timeFare = 15, surgePricing = 0,
        surgeMultiplier = 1.0, promoDiscount = 0, estimatedFare = 115,
        currency = "PHP", costPerKm = 10, costPerMinute = 1
    )

    private fun makeVehicle(id: String = "v1", isDefault: Boolean = true) =
        RiderVehicleResponse(id, "Toyota", "Vios", 2022, "White", "ABC 1234", "SEDAN", isDefault, "2026-02-15T10:00:00Z", "2026-02-15T10:00:00Z")

    @Test
    fun `initialize sets addresses and fetches estimate + vehicles`() = runTest {
        coEvery { rideRepository.getEstimate(any(), any(), any(), any(), any()) } returns
                Result.success(makeEstimate())
        coEvery { vehicleRepository.getVehicles() } returns
                Result.success(listOf(makeVehicle()))

        viewModel.initialize(14.55, 121.0, "Makati", 14.60, 121.05, "BGC")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Makati", state.pickupAddress)
        assertEquals("BGC", state.dropoffAddress)
        assertNotNull(state.estimate)
        assertEquals(115, state.estimate?.estimatedFare)
        assertEquals(1, state.vehicles.size)
        assertNotNull(state.selectedVehicle) // default vehicle auto-selected
    }

    @Test
    fun `initialize handles estimate failure gracefully`() = runTest {
        coEvery { rideRepository.getEstimate(any(), any(), any(), any(), any()) } returns
                Result.failure(Exception("Network error"))
        coEvery { vehicleRepository.getVehicles() } returns
                Result.success(emptyList())

        viewModel.initialize(14.55, 121.0, "Makati", 14.60, 121.05, "BGC")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.estimate)
        assertEquals("Network error", state.errorMessage)
    }

    @Test
    fun `onVehicleSelected updates selected vehicle`() {
        val vehicle = makeVehicle("v2", false)
        viewModel.onVehicleSelected(vehicle)

        assertEquals("v2", viewModel.uiState.value.selectedVehicle?.id)
    }

    @Test
    fun `onPromoCodeChange updates promo code`() {
        viewModel.onPromoCodeChange("SAVE20")

        assertEquals("SAVE20", viewModel.uiState.value.promoCode)
    }

    @Test
    fun `findDriver fails without vehicle`() = runTest {
        viewModel.findDriver()
        advanceUntilIdle()

        assertEquals("Please register a vehicle first", viewModel.uiState.value.errorMessage)
        coVerify(exactly = 0) { rideRepository.createRide(any()) }
    }

    @Test
    fun `findDriver succeeds and sets bookingSuccess`() = runTest {
        val response = CreateRideResponse(
            id = "ride-1", riderId = "rider-1", status = "PENDING",
            rideType = "INSTANT", pickupLatitude = 14.55, pickupLongitude = 121.0,
            pickupAddress = "Makati", dropoffLatitude = 14.60, dropoffLongitude = 121.05,
            dropoffAddress = "BGC", estimatedDistance = 5.0, estimatedDuration = 15,
            estimatedFare = 115.0, paymentMethod = "CASH", createdAt = "2026-02-15T10:00:00Z"
        )
        coEvery { rideRepository.createRide(any()) } returns Result.success(response)
        coEvery { rideRepository.getEstimate(any(), any(), any(), any(), any()) } returns
                Result.success(makeEstimate())
        coEvery { vehicleRepository.getVehicles() } returns
                Result.success(listOf(makeVehicle()))

        viewModel.initialize(14.55, 121.0, "Makati", 14.60, 121.05, "BGC")
        advanceUntilIdle()

        viewModel.findDriver()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.bookingSuccess)
        assertEquals("ride-1", state.createdRideId)
        assertFalse(state.isBooking)
    }

    @Test
    fun `findDriver handles failure`() = runTest {
        coEvery { rideRepository.createRide(any()) } returns
                Result.failure(Exception("No drivers available"))
        coEvery { rideRepository.getEstimate(any(), any(), any(), any(), any()) } returns
                Result.success(makeEstimate())
        coEvery { vehicleRepository.getVehicles() } returns
                Result.success(listOf(makeVehicle()))

        viewModel.initialize(14.55, 121.0, "Makati", 14.60, 121.05, "BGC")
        advanceUntilIdle()

        viewModel.findDriver()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.bookingSuccess)
        assertEquals("No drivers available", state.errorMessage)
    }

    @Test
    fun `clearError clears error message`() {
        // Trigger an error state
        viewModel.findDriver() // No vehicle, will set error
        viewModel.clearError()

        assertNull(viewModel.uiState.value.errorMessage)
    }
}
