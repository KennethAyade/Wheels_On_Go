package com.wheelsongo.app.data.auth

import com.wheelsongo.app.data.models.auth.UserDto
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for TokenManager.
 *
 * TokenManager depends on Android DataStore which requires Context.
 * These tests verify the data model contracts and logic patterns.
 * Full integration tests with DataStore run as Android instrumented tests.
 */
class TokenManagerTest {

    @Test
    fun `VerifyOtpResponse with accessToken is not null`() {
        val response = VerifyOtpResponse(
            accessToken = "jwt-token",
            user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        )
        assertNotNull(response.accessToken)
    }

    @Test
    fun `VerifyOtpResponse with null accessToken for biometric driver`() {
        val response = VerifyOtpResponse(
            accessToken = null,
            user = UserDto(id = "driver-1", phoneNumber = "+639171234567", role = "DRIVER"),
            biometricRequired = true,
            biometricToken = "biometric-jwt"
        )
        assertNull(response.accessToken)
        assertTrue(response.biometricRequired == true)
        assertNotNull(response.biometricToken)
    }

    @Test
    fun `VerifyOtpResponse user contains expected fields`() {
        val response = VerifyOtpResponse(
            accessToken = "jwt-token",
            user = UserDto(
                id = "user-1",
                phoneNumber = "+639171234567",
                role = "RIDER",
                isActive = true,
                createdAt = "2026-01-01T00:00:00Z"
            )
        )
        assertEquals("user-1", response.user.id)
        assertEquals("+639171234567", response.user.phoneNumber)
        assertEquals("RIDER", response.user.role)
        assertTrue(response.user.isActive)
    }

    @Test
    fun `VerifyOtpResponse default biometric fields are null`() {
        val response = VerifyOtpResponse(
            accessToken = "jwt-token",
            user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        )
        assertNull(response.biometricRequired)
        assertNull(response.biometricToken)
        assertNull(response.biometricEnrolled)
        assertNull(response.driverStatus)
    }

    @Test
    fun `VerifyOtpResponse refreshToken defaults to null`() {
        val response = VerifyOtpResponse(
            accessToken = "jwt-token",
            user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        )
        assertNull(response.refreshToken)
    }

    @Test
    fun `UserDto default isActive is true`() {
        val user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        assertTrue(user.isActive)
    }

    @Test
    fun `UserDto createdAt defaults to null`() {
        val user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        assertNull(user.createdAt)
    }

    @Test
    fun `driver response contains all driver-specific fields`() {
        val response = VerifyOtpResponse(
            accessToken = null,
            user = UserDto(id = "driver-1", phoneNumber = "+639171234567", role = "DRIVER"),
            biometricRequired = true,
            biometricToken = "bio-token",
            biometricEnrolled = true,
            driverStatus = "PENDING"
        )
        assertTrue(response.biometricRequired == true)
        assertEquals("bio-token", response.biometricToken)
        assertTrue(response.biometricEnrolled == true)
        assertEquals("PENDING", response.driverStatus)
    }

    @Test
    fun `rider response has no biometric fields`() {
        val response = VerifyOtpResponse(
            accessToken = "jwt-token",
            user = UserDto(id = "user-1", phoneNumber = "+639171234567", role = "RIDER")
        )
        assertNull(response.biometricRequired)
        assertNull(response.biometricToken)
        assertNull(response.biometricEnrolled)
        assertNull(response.driverStatus)
    }
}
