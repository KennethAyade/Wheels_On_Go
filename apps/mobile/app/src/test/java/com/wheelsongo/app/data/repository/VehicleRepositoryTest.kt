package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.ride.CreateRiderVehicleRequest
import com.wheelsongo.app.data.models.ride.RiderVehicleResponse
import com.wheelsongo.app.data.network.RiderVehicleApi
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class VehicleRepositoryTest {

    private lateinit var vehicleApi: RiderVehicleApi
    private lateinit var repository: VehicleRepository

    @Before
    fun setup() {
        vehicleApi = mockk()
        repository = VehicleRepository(vehicleApi)
    }

    private fun makeVehicle(
        id: String = "v1",
        make: String = "Toyota",
        model: String = "Vios",
        year: Int = 2022,
        color: String = "White",
        plateNumber: String = "ABC 1234",
        vehicleType: String = "SEDAN",
        isDefault: Boolean = false
    ) = RiderVehicleResponse(id, make, model, year, color, plateNumber, vehicleType, isDefault, "2026-02-15T10:00:00Z", "2026-02-15T10:00:00Z")

    @Test
    fun `createVehicle returns success on 201`() = runTest {
        val vehicle = makeVehicle()
        coEvery { vehicleApi.createVehicle(any()) } returns Response.success(201, vehicle)

        val result = repository.createVehicle(
            CreateRiderVehicleRequest("Toyota", "Vios", 2022, "White", "ABC 1234", "SEDAN")
        )

        assertTrue(result.isSuccess)
        assertEquals("v1", result.getOrNull()?.id)
    }

    @Test
    fun `createVehicle returns failure on 400`() = runTest {
        coEvery { vehicleApi.createVehicle(any()) } returns Response.error(
            400, "Bad request".toResponseBody("application/json".toMediaType())
        )

        val result = repository.createVehicle(
            CreateRiderVehicleRequest("Toyota", "Vios", 2022, "White", "ABC 1234", "SEDAN")
        )

        assertTrue(result.isFailure)
    }

    @Test
    fun `createVehicle returns failure on network error`() = runTest {
        coEvery { vehicleApi.createVehicle(any()) } throws java.io.IOException("Network error")

        val result = repository.createVehicle(
            CreateRiderVehicleRequest("Toyota", "Vios", 2022, "White", "ABC 1234", "SEDAN")
        )

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is java.io.IOException)
    }

    @Test
    fun `getVehicles returns list on success`() = runTest {
        val vehicles = listOf(makeVehicle("v1"), makeVehicle("v2", plateNumber = "DEF 5678"))
        coEvery { vehicleApi.getVehicles() } returns Response.success(vehicles)

        val result = repository.getVehicles()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getVehicles returns failure on error`() = runTest {
        coEvery { vehicleApi.getVehicles() } returns Response.error(
            500, "Server error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getVehicles()

        assertTrue(result.isFailure)
    }

    @Test
    fun `deleteVehicle returns success on 200`() = runTest {
        coEvery { vehicleApi.deleteVehicle("v1") } returns Response.success(Unit)

        val result = repository.deleteVehicle("v1")

        assertTrue(result.isSuccess)
    }

    @Test
    fun `deleteVehicle returns failure on 404`() = runTest {
        coEvery { vehicleApi.deleteVehicle("v1") } returns Response.error(
            404, "Not found".toResponseBody("application/json".toMediaType())
        )

        val result = repository.deleteVehicle("v1")

        assertTrue(result.isFailure)
    }

    @Test
    fun `setDefaultVehicle returns updated vehicle`() = runTest {
        val vehicle = makeVehicle(isDefault = true)
        coEvery { vehicleApi.setDefaultVehicle("v1") } returns Response.success(vehicle)

        val result = repository.setDefaultVehicle("v1")

        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()?.isDefault == true)
    }
}
