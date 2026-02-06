package com.wheelsongo.app.ui.screens.auth

import android.app.Application
import android.graphics.Bitmap
import android.util.Base64
import com.wheelsongo.app.data.models.auth.BiometricVerifyResponse
import com.wheelsongo.app.data.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
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
import java.io.OutputStream

@OptIn(ExperimentalCoroutinesApi::class)
class BiometricVerificationViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var application: Application
    private lateinit var viewModel: BiometricVerificationViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)

        // Mock android.util.Base64 which is not available in local JVM tests
        mockkStatic(Base64::class)
        every { Base64.encodeToString(any(), any()) } returns "bW9ja2VkLWJhc2U2NA=="

        authRepository = mockk()
        application = mockk(relaxed = true)
        viewModel = BiometricVerificationViewModel(application, authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createMockBitmap(): Bitmap {
        val bitmap = mockk<Bitmap>()
        every { bitmap.compress(any(), any(), any()) } answers {
            val outputStream = thirdArg<OutputStream>()
            outputStream.write(byteArrayOf(0xFF.toByte(), 0xD8.toByte())) // JPEG header
            true
        }
        return bitmap
    }

    @Test
    fun `onPhotoCaptured sets isVerifying true`() = runTest {
        val bitmap = createMockBitmap()
        coEvery { authRepository.verifyBiometric(any()) } returns
                Result.success(BiometricVerifyResponse(
                    userId = "driver-1",
                    accessToken = "jwt-token",
                    match = true,
                    confidence = 98.5f
                ))

        viewModel.onPhotoCaptured(bitmap)
        // Immediately after calling, isVerifying should be set (after dispatcher advances)
        testDispatcher.scheduler.advanceUntilIdle()

        // After completion, isVerifying is false
        assertFalse(viewModel.uiState.value.isVerifying)
    }

    @Test
    fun `onPhotoCaptured calls verifyBiometric with Base64 string`() = runTest {
        val bitmap = createMockBitmap()
        coEvery { authRepository.verifyBiometric(any()) } returns
                Result.success(BiometricVerifyResponse(
                    userId = "driver-1",
                    accessToken = "jwt-token",
                    match = true,
                    confidence = 98.5f
                ))

        viewModel.onPhotoCaptured(bitmap)
        advanceUntilIdle()

        coVerify { authRepository.verifyBiometric(any()) }
    }

    @Test
    fun `sets isVerified true when response match is true`() = runTest {
        val bitmap = createMockBitmap()
        coEvery { authRepository.verifyBiometric(any()) } returns
                Result.success(BiometricVerifyResponse(
                    userId = "driver-1",
                    accessToken = "jwt-token",
                    match = true,
                    confidence = 98.5f
                ))

        viewModel.onPhotoCaptured(bitmap)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isVerified)
        assertNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `sets errorMessage when response match is false`() = runTest {
        val bitmap = createMockBitmap()
        coEvery { authRepository.verifyBiometric(any()) } returns
                Result.success(BiometricVerifyResponse(
                    userId = "driver-1",
                    accessToken = "jwt-token",
                    match = false,
                    confidence = 45.0f
                ))

        viewModel.onPhotoCaptured(bitmap)
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isVerified)
        assertNotNull(viewModel.uiState.value.errorMessage)
        assertTrue(viewModel.uiState.value.errorMessage!!.contains("did not match"))
    }

    @Test
    fun `sets errorMessage on network failure`() = runTest {
        val bitmap = createMockBitmap()
        coEvery { authRepository.verifyBiometric(any()) } returns
                Result.failure(Exception("Network error"))

        viewModel.onPhotoCaptured(bitmap)
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isVerified)
        assertEquals("Network error", viewModel.uiState.value.errorMessage)
    }

    @Test
    fun `clearError clears errorMessage`() {
        viewModel.clearError()
        assertNull(viewModel.uiState.value.errorMessage)
    }
}
