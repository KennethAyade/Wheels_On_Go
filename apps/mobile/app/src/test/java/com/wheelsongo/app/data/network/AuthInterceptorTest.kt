package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.auth.TokenManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import okhttp3.Interceptor
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class AuthInterceptorTest {

    private lateinit var tokenManager: TokenManager
    private lateinit var interceptor: AuthInterceptor

    @Before
    fun setup() {
        tokenManager = mockk()
        interceptor = AuthInterceptor(tokenManager)
    }

    private fun createMockChain(url: String): Interceptor.Chain {
        val request = Request.Builder()
            .url("https://api.example.com$url")
            .build()

        val response = Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_2)
            .code(200)
            .message("OK")
            .body("{}".toResponseBody())
            .build()

        val chain = mockk<Interceptor.Chain>()
        every { chain.request() } returns request
        every { chain.proceed(any()) } returns response
        return chain
    }

    @Test
    fun `skips auth header for auth request-otp`() {
        val chain = createMockChain("/api/auth/request-otp")

        interceptor.intercept(chain)

        verify { chain.proceed(match { it.header("Authorization") == null }) }
    }

    @Test
    fun `skips auth header for auth verify-otp`() {
        val chain = createMockChain("/api/auth/verify-otp")

        interceptor.intercept(chain)

        verify { chain.proceed(match { it.header("Authorization") == null }) }
    }

    @Test
    fun `skips auth header for health`() {
        val chain = createMockChain("/api/health")

        interceptor.intercept(chain)

        verify { chain.proceed(match { it.header("Authorization") == null }) }
    }

    @Test
    fun `adds Bearer accessToken for drivers me`() {
        every { tokenManager.getAccessToken() } returns "access-jwt-token"
        val chain = createMockChain("/api/drivers/me")

        interceptor.intercept(chain)

        verify {
            chain.proceed(match {
                it.header("Authorization") == "Bearer access-jwt-token"
            })
        }
    }

    @Test
    fun `adds Bearer biometricToken for auth biometric verify`() {
        every { tokenManager.getBiometricToken() } returns "biometric-jwt-token"
        val chain = createMockChain("/api/auth/biometric/verify")

        interceptor.intercept(chain)

        verify {
            chain.proceed(match {
                it.header("Authorization") == "Bearer biometric-jwt-token"
            })
        }
    }

    @Test
    fun `proceeds without header when no token available`() {
        every { tokenManager.getAccessToken() } returns null
        val chain = createMockChain("/api/drivers/me")

        interceptor.intercept(chain)

        verify { chain.proceed(match { it.header("Authorization") == null }) }
    }

    @Test
    fun `uses correct token type based on endpoint path`() {
        every { tokenManager.getAccessToken() } returns "access-token"
        every { tokenManager.getBiometricToken() } returns "biometric-token"

        // Protected endpoint should use access token
        val protectedChain = createMockChain("/api/drivers/status")
        interceptor.intercept(protectedChain)
        verify {
            protectedChain.proceed(match {
                it.header("Authorization") == "Bearer access-token"
            })
        }

        // Biometric endpoint should use biometric token
        val biometricChain = createMockChain("/api/auth/biometric/verify")
        interceptor.intercept(biometricChain)
        verify {
            biometricChain.proceed(match {
                it.header("Authorization") == "Bearer biometric-token"
            })
        }
    }
}
