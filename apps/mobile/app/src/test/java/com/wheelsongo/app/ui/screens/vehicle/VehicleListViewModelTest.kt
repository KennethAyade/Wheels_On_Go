package com.wheelsongo.app.ui.screens.vehicle

import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
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
class VehicleListViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var vehicleRepository: VehicleRepository
    private lateinit var viewModel: VehicleListViewModel

    private val sampleVehicle1 = RiderVehicleResponse(
        id = "v1", make = "Toyota", model = "Vios", year = 2022,
        color = "White", plateNumber = "ABC 1234", vehicleType = "SEDAN",
        isDefault = true, createdAt = "2026-02-15T10:00:00Z", updatedAt = "2026-02-15T10:00:00Z"
    )
    private val sampleVehicle2 = RiderVehicleResponse(
        id = "v2", make = "Honda", model = "City", year = 2023,
        color = "Black", plateNumber = "XYZ 5678", vehicleType = "SEDAN",
        isDefault = false, createdAt = "2026-02-15T10:00:00Z", updatedAt = "2026-02-15T10:00:00Z"
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        vehicleRepository = mockk()
        viewModel = VehicleListViewModel(vehicleRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadVehicles populates list on success`() = runTest {
        coEvery { vehicleRepository.getVehicles() } returns Result.success(listOf(sampleVehicle1, sampleVehicle2))

        viewModel.loadVehicles()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(2, state.vehicles.size)
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
    }

    @Test
    fun `loadVehicles sets error on failure`() = runTest {
        coEvery { vehicleRepository.getVehicles() } returns Result.failure(Exception("Network error"))

        viewModel.loadVehicles()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.vehicles.isEmpty())
        assertFalse(state.isLoading)
        assertEquals("Network error", state.errorMessage)
    }

    @Test
    fun `deleteVehicle removes from list`() = runTest {
        coEvery { vehicleRepository.getVehicles() } returns Result.success(listOf(sampleVehicle1, sampleVehicle2))
        coEvery { vehicleRepository.deleteVehicle("v1") } returns Result.success(Unit)

        viewModel.loadVehicles()
        advanceUntilIdle()

        viewModel.deleteVehicle("v1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.vehicles.size)
        assertEquals("v2", state.vehicles[0].id)
    }

    @Test
    fun `setDefaultVehicle updates default flags`() = runTest {
        coEvery { vehicleRepository.getVehicles() } returns Result.success(listOf(sampleVehicle1, sampleVehicle2))
        coEvery { vehicleRepository.setDefaultVehicle("v2") } returns Result.success(sampleVehicle2.copy(isDefault = true))

        viewModel.loadVehicles()
        advanceUntilIdle()

        viewModel.setDefaultVehicle("v2")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.vehicles.find { it.id == "v1" }!!.isDefault)
        assertTrue(state.vehicles.find { it.id == "v2" }!!.isDefault)
    }

    @Test
    fun `clearMessages clears both error and action messages`() {
        viewModel.clearMessages()
        val state = viewModel.uiState.value
        assertNull(state.errorMessage)
        assertNull(state.actionMessage)
    }
}
