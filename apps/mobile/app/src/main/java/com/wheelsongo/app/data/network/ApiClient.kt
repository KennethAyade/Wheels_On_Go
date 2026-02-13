package com.wheelsongo.app.data.network

import android.content.Context
import com.wheelsongo.app.AppConfig
import com.wheelsongo.app.data.auth.TokenManager
import com.wheelsongo.app.data.models.auth.BiometricVerifyRequest
import com.wheelsongo.app.data.models.auth.BiometricVerifyResponse
import com.wheelsongo.app.data.models.auth.CurrentUserResponse
import com.wheelsongo.app.data.models.auth.LogoutRequest
import com.wheelsongo.app.data.models.auth.RefreshTokenRequest
import com.wheelsongo.app.data.models.auth.RefreshTokenResponse
import com.wheelsongo.app.data.models.auth.RequestOtpRequest
import com.wheelsongo.app.data.models.auth.RequestOtpResponse
import com.wheelsongo.app.data.models.auth.VerifyFirebaseRequest
import com.wheelsongo.app.data.models.auth.VerifyOtpRequest
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import com.wheelsongo.app.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

/**
 * Centralized API client using Retrofit
 *
 * Must be initialized with context before use via [initialize]
 */
object ApiClient {

    private lateinit var tokenManager: TokenManager
    private var isInitialized = false

    /**
     * Initialize the API client with application context
     * Call this from Application.onCreate()
     */
    fun initialize(context: Context) {
        if (isInitialized) return
        tokenManager = TokenManager(context.applicationContext)
        isInitialized = true
    }

    /**
     * Get the TokenManager instance
     * @throws IllegalStateException if not initialized
     */
    fun getTokenManager(): TokenManager {
        check(isInitialized) { "ApiClient must be initialized before use. Call ApiClient.initialize(context) in Application.onCreate()" }
        return tokenManager
    }

    private val moshi: Moshi by lazy {
        Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    private val loggingInterceptor: HttpLoggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.BASIC
        }
    }

    private val client: OkHttpClient by lazy {
        check(isInitialized) { "ApiClient must be initialized before use" }
        OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(AppConfig.BASE_URL)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .client(client)
            .build()
    }

    /**
     * Authentication API endpoints
     */
    val authApi: AuthApi by lazy {
        retrofit.create(AuthApi::class.java)
    }

    /**
     * Driver management API endpoints
     */
    val driverApi: DriverApi by lazy {
        retrofit.create(DriverApi::class.java)
    }

    /**
     * Location/maps API endpoints
     */
    val locationApi: LocationApi by lazy {
        retrofit.create(LocationApi::class.java)
    }
}

/**
 * Authentication API interface
 * Matches backend auth.controller.ts endpoints
 */
interface AuthApi {

    /**
     * Request OTP code to be sent to phone
     * POST /auth/request-otp
     *
     * @param request Phone number and role
     * @return Success message with expiry time
     */
    @POST("auth/request-otp")
    suspend fun requestOtp(@Body request: RequestOtpRequest): Response<RequestOtpResponse>

    /**
     * Verify OTP code and receive JWT tokens
     * POST /auth/verify-otp
     *
     * @param request Phone number, OTP code, and role
     * @return JWT tokens and user info on success
     */
    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<VerifyOtpResponse>

    /**
     * Verify Firebase Phone Auth token and receive JWT tokens
     * POST /auth/verify-firebase
     * Used on real phones (Firebase handles SMS delivery + OTP verification)
     */
    @POST("auth/verify-firebase")
    suspend fun verifyFirebase(@Body request: VerifyFirebaseRequest): Response<VerifyOtpResponse>

    /**
     * Get current authenticated user's profile
     * GET /auth/me
     * Requires: JWT token in Authorization header
     *
     * @return Current user info
     */
    @GET("auth/me")
    suspend fun getCurrentUser(): Response<CurrentUserResponse>

    /**
     * Verify biometric (face) for driver login
     * POST /auth/biometric/verify
     * Requires: Biometric JWT token in Authorization header
     */
    @POST("auth/biometric/verify")
    suspend fun verifyBiometric(@Body request: BiometricVerifyRequest): Response<BiometricVerifyResponse>

    /**
     * Refresh access token using refresh token
     * POST /auth/refresh
     */
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    /**
     * Logout — revokes refresh token family on server
     * POST /auth/logout
     */
    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<Unit>
}
