package com.wheelsongo.app.ui.screens.subscription

import com.wheelsongo.app.data.models.subscription.CancelSubscriptionResponse
import com.wheelsongo.app.data.models.subscription.MySubscriptionResponse
import com.wheelsongo.app.data.models.subscription.SubscribeResponse
import com.wheelsongo.app.data.models.subscription.SubscriptionPlan
import com.wheelsongo.app.data.repository.SubscriptionRepository
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
class SubscriptionViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var repository: SubscriptionRepository

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

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        repository = mockk()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SubscriptionViewModel {
        return SubscriptionViewModel(repository)
    }

    @Test
    fun `init loads plans and current subscription`() = runTest {
        val plan = makePlan()
        coEvery { repository.listPlans() } returns Result.success(listOf(plan))
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = true, plan = plan, startDate = "2026-03-01", endDate = "2026-03-31")
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.plans.size)
        assertEquals("Premium", state.currentPlan?.name)
        assertTrue(state.isActive)
        assertEquals("2026-03-31", state.endDate)
        assertFalse(state.isLoading)
    }

    @Test
    fun `init handles plans failure gracefully`() = runTest {
        coEvery { repository.listPlans() } returns Result.failure(Exception("Plans error"))
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = false, plan = null, startDate = null, endDate = null)
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.plans.isEmpty())
        assertFalse(state.isLoading)
    }

    @Test
    fun `init handles subscription failure gracefully`() = runTest {
        coEvery { repository.listPlans() } returns Result.success(listOf(makePlan()))
        coEvery { repository.getMySubscription() } returns Result.failure(Exception("Sub error"))

        val viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.plans.size)
        assertNull(state.currentPlan)
        assertFalse(state.isLoading)
    }

    @Test
    fun `subscribe updates state on success`() = runTest {
        val plan = makePlan()
        coEvery { repository.listPlans() } returns Result.success(listOf(plan))
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = false, plan = null, startDate = null, endDate = null)
        )
        coEvery { repository.subscribe("plan-1") } returns Result.success(
            SubscribeResponse(success = true, plan = plan, startDate = "2026-03-12", endDate = "2026-04-11")
        )

        val viewModel = createViewModel()
        advanceUntilIdle()
        viewModel.subscribe("plan-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Premium", state.currentPlan?.name)
        assertTrue(state.isActive)
        assertEquals("2026-04-11", state.endDate)
        assertTrue(state.successMessage?.contains("Premium") == true)
        assertFalse(state.isSubscribing)
    }

    @Test
    fun `subscribe sets error on failure`() = runTest {
        coEvery { repository.listPlans() } returns Result.success(emptyList())
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = false, plan = null, startDate = null, endDate = null)
        )
        coEvery { repository.subscribe("plan-1") } returns Result.failure(Exception("Already subscribed"))

        val viewModel = createViewModel()
        advanceUntilIdle()
        viewModel.subscribe("plan-1")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Already subscribed", state.errorMessage)
        assertFalse(state.isSubscribing)
    }

    @Test
    fun `cancelSubscription clears plan on success`() = runTest {
        val plan = makePlan()
        coEvery { repository.listPlans() } returns Result.success(listOf(plan))
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = true, plan = plan, startDate = "2026-03-01", endDate = "2026-03-31")
        )
        coEvery { repository.cancelSubscription() } returns Result.success(
            CancelSubscriptionResponse(success = true)
        )

        val viewModel = createViewModel()
        advanceUntilIdle()
        viewModel.cancelSubscription()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertNull(state.currentPlan)
        assertFalse(state.isActive)
        assertNull(state.endDate)
        assertEquals("Subscription cancelled", state.successMessage)
        assertFalse(state.isCancelling)
    }

    @Test
    fun `cancelSubscription sets error on failure`() = runTest {
        coEvery { repository.listPlans() } returns Result.success(emptyList())
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = false, plan = null, startDate = null, endDate = null)
        )
        coEvery { repository.cancelSubscription() } returns Result.failure(Exception("Cancel failed"))

        val viewModel = createViewModel()
        advanceUntilIdle()
        viewModel.cancelSubscription()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("Cancel failed", state.errorMessage)
        assertFalse(state.isCancelling)
    }

    @Test
    fun `clearMessages clears both success and error`() = runTest {
        coEvery { repository.listPlans() } returns Result.success(emptyList())
        coEvery { repository.getMySubscription() } returns Result.success(
            MySubscriptionResponse(active = false, plan = null, startDate = null, endDate = null)
        )
        coEvery { repository.subscribe("plan-1") } returns Result.failure(Exception("Error"))

        val viewModel = createViewModel()
        advanceUntilIdle()
        viewModel.subscribe("plan-1")
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.errorMessage)

        viewModel.clearMessages()
        assertNull(viewModel.uiState.value.successMessage)
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
