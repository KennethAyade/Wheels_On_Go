package com.wheelsongo.app.data.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.wheelsongo.app.data.models.auth.VerifyOtpResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

/**
 * Extension property to create a DataStore instance
 */
private val Context.authDataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

/**
 * Manages JWT tokens and user session data using DataStore
 * Handles token persistence, retrieval, and session state
 */
class TokenManager(private val context: Context) {

    companion object {
        private val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val BIOMETRIC_TOKEN_KEY = stringPreferencesKey("biometric_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_ROLE_KEY = stringPreferencesKey("user_role")
        private val PHONE_NUMBER_KEY = stringPreferencesKey("phone_number")
    }

    /**
     * Save tokens and user data after successful OTP verification
     * Note: accessToken can be null for drivers requiring biometric auth
     */
    suspend fun saveTokens(response: VerifyOtpResponse) {
        context.authDataStore.edit { prefs ->
            response.accessToken?.let { prefs[ACCESS_TOKEN_KEY] = it }
            response.refreshToken?.let { prefs[REFRESH_TOKEN_KEY] = it }
            prefs[USER_ID_KEY] = response.user.id
            prefs[USER_ROLE_KEY] = response.user.role
            prefs[PHONE_NUMBER_KEY] = response.user.phoneNumber
        }
    }

    /**
     * Get the current access token (blocking for use in interceptor)
     * @return Access token or null if not logged in
     */
    fun getAccessToken(): String? {
        return runBlocking {
            context.authDataStore.data.first()[ACCESS_TOKEN_KEY]
        }
    }

    /**
     * Get access token as a Flow for reactive updates
     */
    val accessTokenFlow: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN_KEY]
    }

    /**
     * Flow indicating whether user is logged in
     */
    val isLoggedIn: Flow<Boolean> = context.authDataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN_KEY] != null
    }

    /**
     * Flow of user's role (RIDER, DRIVER, ADMIN)
     */
    val userRole: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[USER_ROLE_KEY]
    }

    /**
     * Flow of user's ID
     */
    val userId: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[USER_ID_KEY]
    }

    /**
     * Flow of user's phone number
     */
    val phoneNumber: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[PHONE_NUMBER_KEY]
    }

    /**
     * Get user role synchronously
     */
    fun getUserRole(): String? {
        return runBlocking {
            context.authDataStore.data.first()[USER_ROLE_KEY]
        }
    }

    /**
     * Get user ID synchronously
     */
    fun getUserId(): String? {
        return runBlocking {
            context.authDataStore.data.first()[USER_ID_KEY]
        }
    }

    /**
     * Clear all tokens and user data (logout)
     */
    suspend fun clearTokens() {
        context.authDataStore.edit { prefs ->
            prefs.clear()
        }
    }

    /**
     * Update access token (for token refresh scenarios)
     */
    suspend fun updateAccessToken(newToken: String) {
        context.authDataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY] = newToken
        }
    }

    /**
     * Save biometric token (short-lived, used for /auth/biometric/verify)
     */
    suspend fun saveBiometricToken(token: String) {
        context.authDataStore.edit { prefs ->
            prefs[BIOMETRIC_TOKEN_KEY] = token
        }
    }

    /**
     * Get biometric token synchronously (for interceptor)
     */
    fun getBiometricToken(): String? {
        return runBlocking {
            context.authDataStore.data.first()[BIOMETRIC_TOKEN_KEY]
        }
    }

    /**
     * Clear biometric token after successful face verification
     */
    suspend fun clearBiometricToken() {
        context.authDataStore.edit { prefs ->
            prefs.remove(BIOMETRIC_TOKEN_KEY)
        }
    }
}
