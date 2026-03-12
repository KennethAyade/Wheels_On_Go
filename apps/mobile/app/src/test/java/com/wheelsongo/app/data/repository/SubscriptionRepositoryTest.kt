package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.subscription.CancelSubscriptionResponse
import com.wheelsongo.app.data.models.subscription.MySubscriptionResponse
import com.wheelsongo.app.data.models.subscription.SubscribeResponse
import com.wheelsongo.app.data.models.subscription.SubscriptionPlan
import com.wheelsongo.app.data.network.SubscriptionApi
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

class SubscriptionRepositoryTest {

    private lateinit var api: SubscriptionApi
    private lateinit var repository: SubscriptionRepository

    @Before
    fun setup() {
        api = mockk()
        repository = SubscriptionRepository(api)
    }

    private fun makePlan(id: String = "plan-1", name: String = "Premium") = SubscriptionPlan(
        id = id,
        name = name,
        description = "Test plan",
        monthlyFee = 199.0,
        discountPercentage = 10.0,
        maxRidesPerMonth = null,
        priorityDispatch = false,
        isActive = true
    )

    @Test
    fun `listPlans returns success with plans list`() = runTest {
        val plans = listOf(makePlan())
        coEvery { api.listPlans() } returns Response.success(plans)

        val result = repository.listPlans()

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrNull()?.size)
        assertEquals("Premium", result.getOrNull()?.first()?.name)
    }

    @Test
    fun `listPlans returns failure on error response`() = runTest {
        coEvery { api.listPlans() } returns Response.error(
            500, "Server error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.listPlans()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getMySubscription returns success`() = runTest {
        val sub = MySubscriptionResponse(
            active = true,
            plan = makePlan(),
            startDate = "2026-03-01",
            endDate = "2026-03-31"
        )
        coEvery { api.getMySubscription() } returns Response.success(sub)

        val result = repository.getMySubscription()

        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.active)
    }

    @Test
    fun `getMySubscription returns failure on error`() = runTest {
        coEvery { api.getMySubscription() } returns Response.error(
            400, "Error".toResponseBody("application/json".toMediaType())
        )

        val result = repository.getMySubscription()

        assertTrue(result.isFailure)
    }

    @Test
    fun `subscribe returns success`() = runTest {
        val response = SubscribeResponse(
            success = true,
            plan = makePlan(),
            startDate = "2026-03-12",
            endDate = "2026-04-11"
        )
        coEvery { api.subscribe(any()) } returns Response.success(response)

        val result = repository.subscribe("plan-1")

        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.success)
        coVerify { api.subscribe(match { it.planId == "plan-1" }) }
    }

    @Test
    fun `subscribe returns failure on error`() = runTest {
        coEvery { api.subscribe(any()) } returns Response.error(
            400, "Already subscribed".toResponseBody("application/json".toMediaType())
        )

        val result = repository.subscribe("plan-1")

        assertTrue(result.isFailure)
    }

    @Test
    fun `cancelSubscription returns success`() = runTest {
        coEvery { api.cancelSubscription() } returns Response.success(
            CancelSubscriptionResponse(success = true)
        )

        val result = repository.cancelSubscription()

        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.success)
    }

    @Test
    fun `cancelSubscription returns failure on error`() = runTest {
        coEvery { api.cancelSubscription() } returns Response.error(
            400, "No subscription".toResponseBody("application/json".toMediaType())
        )

        val result = repository.cancelSubscription()

        assertTrue(result.isFailure)
    }

    @Test
    fun `listPlans returns failure on exception`() = runTest {
        coEvery { api.listPlans() } throws IOException("timeout")

        val result = repository.listPlans()

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
    }
}
