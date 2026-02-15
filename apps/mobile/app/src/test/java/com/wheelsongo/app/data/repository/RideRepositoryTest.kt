package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.ride.CreateRideRequest
import com.wheelsongo.app.data.models.ride.CreateRideResponse
import com.wheelsongo.app.data.models.ride.RideEstimateResponse
import com.wheelsongo.app.data.models.ride.RideResponse
import com.wheelsongo.app.data.network.RideApi
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class RideRepositoryTest {

    private lateinit var rideApi: RideApi
    private lateinit var repository: RideRepository

    @Before
    fun setup() {
        rideApi = mockk()
        repository = RideRepository(rideApi)
    }

    private fun makeEstimateResponse() = RideEstimateResponse(
        distanceMeters = 5000.0,
        distanceKm = 5.0,
        distanceText = "5.0 km",
        durationSeconds = 900,
        durationMinutes = 15,
        durationText = "15 min",
        baseFare = 50,
        distanceFare = 50,
        timeFare = 15,
        surgePricing = 0,
        surgeMultiplier = 1.0,
        promoDiscount = 0,
        estimatedFare = 115,
        currency = "PHP",
        costPerKm = 10,
        costPerMinute = 1
    )

    private fun makeRideResponse(
        id: String = "ride-1",
        status: String = "PENDING"
    ) = RideResponse(
        id = id,
        riderId = "rider-1",
        status = status,
        rideType = "INSTANT",
        pickupLatitude = 14.55,
        pickupLongitude = 121.0,
        pickupAddress = "Makati",
        dropoffLatitude = 14.60,
        dropoffLongitude = 121.05,
        dropoffAddress = "BGC",
        estimatedFare = 115.0,
        paymentMethod = "CASH",
        createdAt = "2026-02-15T10:00:00Z"
    )

    @Test
    fun `getEstimate returns success`() = runTest {
        coEvery { rideApi.getEstimate(any()) } returns Response.success(makeEstimateResponse())

        val result = repository.getEstimate(14.55, 121.0, 14.60, 121.05)

        assertTrue(result.isSuccess)
        assertEquals(115, result.getOrNull()?.estimatedFare)
    }

    @Test
    fun `getEstimate returns failure on error`() = runTest {
        coEvery { rideApi.getEstimate(any()) } returns Response.error(
            400, "Bad request".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getEstimate(14.55, 121.0, 14.60, 121.05)

        assertTrue(result.isFailure)
    }

    @Test
    fun `createRide returns success`() = runTest {
        val response = CreateRideResponse(
            id = "ride-1", riderId = "rider-1", status = "PENDING",
            rideType = "INSTANT", pickupLatitude = 14.55, pickupLongitude = 121.0,
            pickupAddress = "Makati", dropoffLatitude = 14.60, dropoffLongitude = 121.05,
            dropoffAddress = "BGC", estimatedDistance = 5.0, estimatedDuration = 15,
            estimatedFare = 115.0, paymentMethod = "CASH", createdAt = "2026-02-15T10:00:00Z"
        )
        coEvery { rideApi.createRide(any()) } returns Response.success(201, response)

        val result = repository.createRide(
            CreateRideRequest(14.55, 121.0, "Makati", null, 14.60, 121.05, "BGC")
        )

        assertTrue(result.isSuccess)
        assertEquals("ride-1", result.getOrNull()?.id)
    }

    @Test
    fun `createRide returns failure on error`() = runTest {
        coEvery { rideApi.createRide(any()) } returns Response.error(
            422, "Unprocessable".toResponseBody("application/json".toMediaType())
        )

        val result = repository.createRide(
            CreateRideRequest(14.55, 121.0, "Makati", null, 14.60, 121.05, "BGC")
        )

        assertTrue(result.isFailure)
    }

    @Test
    fun `getRideById returns success`() = runTest {
        coEvery { rideApi.getRideById("ride-1") } returns Response.success(makeRideResponse())

        val result = repository.getRideById("ride-1")

        assertTrue(result.isSuccess)
        assertEquals("PENDING", result.getOrNull()?.status)
    }

    @Test
    fun `getRideById returns failure on 404`() = runTest {
        coEvery { rideApi.getRideById("ride-x") } returns Response.error(
            404, "Not found".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getRideById("ride-x")

        assertTrue(result.isFailure)
    }

    @Test
    fun `getActiveRide returns null on 404`() = runTest {
        coEvery { rideApi.getActiveRide() } returns Response.error(
            404, "No active ride".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getActiveRide()

        assertTrue(result.isSuccess)
        assertNull(result.getOrNull())
    }

    @Test
    fun `getActiveRide returns ride on success`() = runTest {
        coEvery { rideApi.getActiveRide() } returns Response.success(makeRideResponse())

        val result = repository.getActiveRide()

        assertTrue(result.isSuccess)
        assertNotNull(result.getOrNull())
    }

    @Test
    fun `cancelRide returns success`() = runTest {
        val cancelled = makeRideResponse(status = "CANCELLED_BY_RIDER")
        coEvery { rideApi.cancelRide(any(), any()) } returns Response.success(cancelled)

        val result = repository.cancelRide("ride-1", "Changed plans")

        assertTrue(result.isSuccess)
        assertEquals("CANCELLED_BY_RIDER", result.getOrNull()?.status)
    }

    @Test
    fun `cancelRide returns failure on error`() = runTest {
        coEvery { rideApi.cancelRide(any(), any()) } returns Response.error(
            400, "Cannot cancel".toResponseBody("application/json".toMediaType())
        )

        val result = repository.cancelRide("ride-1")

        assertTrue(result.isFailure)
    }
}
