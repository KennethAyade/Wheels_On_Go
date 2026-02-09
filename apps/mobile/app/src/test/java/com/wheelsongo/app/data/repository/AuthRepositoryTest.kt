package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.auth.TokenManager
import com.wheelsongo.app.data.models.auth.BiometricVerifyResponse
import com.wheelsongo.app.data.models.auth.RequestOtpResponse
import com.wheelsongo.app.data.models.auth.UserDto
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import com.wheelsongo.app.data.network.AuthApi
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class AuthRepositoryTest {

    private lateinit var authApi: AuthApi
    private lateinit var tokenManager: TokenManager
    private lateinit var repository: AuthRepository

    @Before
    fun setup() {
        authApi = mockk()
        tokenManager = mockk(relaxUnitFun = true)

        repository = AuthRepository(authApi, tokenManager)
    }

    @Test
    fun `requestOtp returns success Result on 200`() = runTest {
        coEvery { authApi.requestOtp(any()) } returns
                Response.success(RequestOtpResponse(message = "OTP sent"))

        val result = repository.requestOtp("+639171234567", "RIDER")

        assertTrue(result.isSuccess)
        assertEquals("OTP sent", result.getOrNull()?.message)
    }

    @Test
    fun `requestOtp returns failure Result on 4xx`() = runTest {
        coEvery { authApi.requestOtp(any()) } returns
                Response.error(
                    429,
                    """{"statusCode":429,"message":"Too many requests"}"""
                        .toResponseBody("application/json".toMediaType())
                )

        val result = repository.requestOtp("+639171234567", "RIDER")

        assertTrue(result.isFailure)
    }

    @Test
    fun `requestOtp returns failure on network exception`() = runTest {
        coEvery { authApi.requestOtp(any()) } throws Exception("Connection refused")

        val result = repository.requestOtp("+639171234567", "RIDER")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("Network error") == true)
    }

    @Test
    fun `verifyOtp saves accessToken to TokenManager`() = runTest {
        val response = VerifyOtpResponse(
            accessToken = "jwt-access-token",
            user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        )
        coEvery { authApi.verifyOtp(any()) } returns Response.success(response)

        repository.verifyOtp("+639171234567", "123456", "RIDER")

        coVerify { tokenManager.saveTokens(response) }
    }

    @Test
    fun `verifyOtp saves biometricToken when biometricRequired is true`() = runTest {
        val response = VerifyOtpResponse(
            accessToken = null,
            user = UserDto(id = "driver-1", phoneNumber = "+639171234567", role = "DRIVER"),
            biometricRequired = true,
            biometricToken = "jwt-biometric-token"
        )
        coEvery { authApi.verifyOtp(any()) } returns Response.success(response)

        repository.verifyOtp("+639171234567", "123456", "DRIVER")

        coVerify { tokenManager.saveBiometricToken("jwt-biometric-token") }
    }

    @Test
    fun `verifyOtp skips accessToken save when null`() = runTest {
        val response = VerifyOtpResponse(
            accessToken = null,
            user = UserDto(id = "driver-1", phoneNumber = "+639171234567", role = "DRIVER"),
            biometricRequired = true,
            biometricToken = "jwt-biometric-token"
        )
        coEvery { authApi.verifyOtp(any()) } returns Response.success(response)

        repository.verifyOtp("+639171234567", "123456", "DRIVER")

        // saveTokens should NOT be called when accessToken is null
        coVerify(exactly = 0) { tokenManager.saveTokens(any()) }
    }

    @Test
    fun `verifyBiometric updates accessToken in TokenManager`() = runTest {
        val response = BiometricVerifyResponse(
            userId = "driver-1",
            accessToken = "new-access-token",
            match = true,
            confidence = 98.5f
        )
        coEvery { authApi.verifyBiometric(any()) } returns Response.success(response)

        repository.verifyBiometric("base64data")

        coVerify { tokenManager.updateAccessToken("new-access-token") }
    }

    @Test
    fun `verifyBiometric clears biometricToken on success`() = runTest {
        val response = BiometricVerifyResponse(
            userId = "driver-1",
            accessToken = "new-access-token",
            match = true,
            confidence = 98.5f
        )
        coEvery { authApi.verifyBiometric(any()) } returns Response.success(response)

        repository.verifyBiometric("base64data")

        coVerify { tokenManager.clearBiometricToken() }
    }

    @Test
    fun `verifyBiometric returns failure on API error`() = runTest {
        coEvery { authApi.verifyBiometric(any()) } returns
                Response.error(
                    401,
                    """{"statusCode":401,"message":"Invalid biometric token"}"""
                        .toResponseBody("application/json".toMediaType())
                )

        val result = repository.verifyBiometric("base64data")

        assertTrue(result.isFailure)
    }

    @Test
    fun `logout clears all tokens`() = runTest {
        // Stub getRefreshToken — logout sends it to server before clearing
        every { tokenManager.getRefreshToken() } returns "refresh-token"
        coEvery { authApi.logout(any()) } returns Response.success(Unit)

        repository.logout()

        coVerify { tokenManager.clearTokens() }
    }

    /**
     * Helper to set private/val fields on mock objects via reflection.
     * Needed because MockK relaxed mocks return wrong types for Flow<> val properties.
     */
    private fun setField(target: Any, fieldName: String, value: Any?) {
        var clazz: Class<*>? = target.javaClass
        while (clazz != null) {
            try {
                val field = clazz.getDeclaredField(fieldName)
                field.isAccessible = true
                field.set(target, value)
                return
            } catch (_: NoSuchFieldException) {
                clazz = clazz.superclass
            }
        }
        // Field not found — skip silently (some fields may not exist on the mock)
    }
}
