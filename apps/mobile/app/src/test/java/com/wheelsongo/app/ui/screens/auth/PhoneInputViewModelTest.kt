package com.wheelsongo.app.ui.screens.auth

import com.wheelsongo.app.data.models.auth.RequestOtpResponse
import com.wheelsongo.app.data.repository.AuthRepository
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
class PhoneInputViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: PhoneInputViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk()
        viewModel = PhoneInputViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `sanitizes phone input to digits only, max 10`() {
        viewModel.onPhoneNumberChange("912abc34567890")
        assertEquals("9123456789", viewModel.uiState.value.phoneNumber)
    }

    @Test
    fun `clears error message on phone number change`() {
        // Simulate an error state by requesting OTP with invalid number
        viewModel.requestOtp("RIDER") {}
        assertNotNull(viewModel.uiState.value.errorMessage)

        // Typing should clear the error
        viewModel.onPhoneNumberChange("9")
        assertNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `isValid true for 10-digit number starting with 9`() {
        viewModel.onPhoneNumberChange("9171234567")
        assertTrue(viewModel.uiState.value.isValid)
    }

    @Test
    fun `isValid false for number not starting with 9`() {
        viewModel.onPhoneNumberChange("1234567890")
        assertFalse(viewModel.uiState.value.isValid)
    }

    @Test
    fun `isValid false for less than 10 digits`() {
        viewModel.onPhoneNumberChange("917123")
        assertFalse(viewModel.uiState.value.isValid)
    }

    @Test
    fun `formattedPhoneNumber prepends +63`() {
        viewModel.onPhoneNumberChange("9171234567")
        assertEquals("+639171234567", viewModel.uiState.value.formattedPhoneNumber)
    }

    @Test
    fun `requestOtp shows loading then calls repository`() = runTest {
        coEvery { authRepository.requestOtp(any(), any()) } returns
                Result.success(RequestOtpResponse(message = "OTP sent"))

        viewModel.onPhoneNumberChange("9171234567")
        viewModel.requestOtp("RIDER") {}

        advanceUntilIdle()

        coVerify { authRepository.requestOtp("+639171234567", "RIDER") }
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `requestOtp sets errorMessage on failure`() = runTest {
        coEvery { authRepository.requestOtp(any(), any()) } returns
                Result.failure(Exception("Server error"))

        viewModel.onPhoneNumberChange("9171234567")
        viewModel.requestOtp("RIDER") {}

        advanceUntilIdle()

        assertEquals("Server error", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isLoading)
    }
}
