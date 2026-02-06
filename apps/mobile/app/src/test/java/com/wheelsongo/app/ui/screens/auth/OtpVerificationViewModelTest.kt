package com.wheelsongo.app.ui.screens.auth

import com.wheelsongo.app.data.models.auth.RequestOtpResponse
import com.wheelsongo.app.data.models.auth.UserDto
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import com.wheelsongo.app.data.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OtpVerificationViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: OtpVerificationViewModel

    private val phone = "+639171234567"
    private val role = "RIDER"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk()
        viewModel = OtpVerificationViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `onDigitEntered appends digit to otpValue`() {
        viewModel.onDigitEntered("1", phone, role)
        assertEquals("1", viewModel.uiState.value.otpValue)

        viewModel.onDigitEntered("2", phone, role)
        assertEquals("12", viewModel.uiState.value.otpValue)
    }

    @Test
    fun `onDigitEntered ignores input after 6 digits`() {
        // Enter 6 digits first (need to mock the auto-verify)
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.failure(Exception("test"))

        repeat(6) { viewModel.onDigitEntered("${it + 1}", phone, role) }
        viewModel.onDigitEntered("7", phone, role)

        assertEquals("123456", viewModel.uiState.value.otpValue)
    }

    @Test
    fun `onDigitEntered clears errorMessage`() {
        // Trigger an error first
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.failure(Exception("Invalid code"))

        repeat(6) { viewModel.onDigitEntered("0", phone, role) }

        // Wait for the error to be set
        testDispatcher.scheduler.advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.errorMessage)

        // Now clear the OTP and enter a new digit - error should clear
        viewModel.onBackspace()
        viewModel.onDigitEntered("1", phone, role)
        assertNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `auto-verifies when 6th digit entered`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.success(createRiderResponse())

        repeat(6) { viewModel.onDigitEntered("${it + 1}", phone, role) }

        advanceUntilIdle()

        coVerify { authRepository.verifyOtp(phone, "123456", role) }
        assertTrue(viewModel.uiState.value.isVerified)
    }

    @Test
    fun `onBackspace removes last digit`() {
        viewModel.onDigitEntered("1", phone, role)
        viewModel.onDigitEntered("2", phone, role)
        viewModel.onBackspace()

        assertEquals("1", viewModel.uiState.value.otpValue)
    }

    @Test
    fun `startCountdown decrements from 60 to 0`() = runTest {
        viewModel.startCountdown()

        assertEquals(60, viewModel.uiState.value.countdownSeconds)

        // Advance 3 seconds + a bit and run pending tasks
        advanceTimeBy(3100)
        testDispatcher.scheduler.runCurrent()
        assertTrue(viewModel.uiState.value.countdownSeconds <= 57)
        assertTrue(viewModel.uiState.value.countdownSeconds >= 56)
    }

    @Test
    fun `canResend true only when countdown reaches 0`() = runTest {
        assertFalse(viewModel.uiState.value.canResend)

        viewModel.startCountdown()
        advanceTimeBy(61000)

        assertTrue(viewModel.uiState.value.canResend)
    }

    @Test
    fun `verifyOtp sets isVerified true on success`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.success(createRiderResponse())

        repeat(6) { viewModel.onDigitEntered("1", phone, role) }
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isVerified)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `verifyOtp sets biometricRequired from response`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.success(createDriverBiometricResponse())

        repeat(6) { viewModel.onDigitEntered("1", phone, "DRIVER") }
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.biometricRequired)
        assertTrue(viewModel.uiState.value.isVerified)
    }

    @Test
    fun `verifyOtp preserves otpValue on error (no clear)`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.failure(Exception("Invalid code"))

        repeat(6) { viewModel.onDigitEntered("1", phone, role) }
        advanceUntilIdle()

        assertEquals("111111", viewModel.uiState.value.otpValue)
        assertNotNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `resendOtp resets countdown to 60`() = runTest {
        coEvery { authRepository.requestOtp(any(), any()) } returns
                Result.success(RequestOtpResponse(message = "OTP sent"))

        // First exhaust countdown
        viewModel.startCountdown()
        advanceTimeBy(61000)
        testDispatcher.scheduler.runCurrent()
        assertTrue(viewModel.uiState.value.canResend)

        // Now resend — advance just enough for the API call, not the full new countdown
        viewModel.resendOtp(phone, role)
        advanceTimeBy(100)
        testDispatcher.scheduler.runCurrent()

        // Countdown should have been reset to 60 (may have decremented slightly)
        assertTrue(viewModel.uiState.value.countdownSeconds >= 59)
    }

    @Test
    fun `resendOtp clears otpValue on success`() = runTest {
        coEvery { authRepository.requestOtp(any(), any()) } returns
                Result.success(RequestOtpResponse(message = "OTP sent"))
        coEvery { authRepository.verifyOtp(any(), any(), any()) } returns
                Result.failure(Exception("Bad code"))

        // Enter some OTP digits
        repeat(3) { viewModel.onDigitEntered("1", phone, role) }

        // Exhaust countdown
        viewModel.startCountdown()
        advanceTimeBy(61000)

        // Resend
        viewModel.resendOtp(phone, role)
        advanceUntilIdle()

        assertEquals("", viewModel.uiState.value.otpValue)
    }

    // -- Helpers --

    private fun createRiderResponse() = VerifyOtpResponse(
        accessToken = "jwt-access-token",
        user = UserDto(id = "user-1", phoneNumber = phone, role = "RIDER"),
    )

    private fun createDriverBiometricResponse() = VerifyOtpResponse(
        accessToken = null,
        user = UserDto(id = "driver-1", phoneNumber = phone, role = "DRIVER"),
        biometricRequired = true,
        biometricToken = "jwt-biometric-token",
        biometricEnrolled = true,
        driverStatus = "PENDING",
    )
}
