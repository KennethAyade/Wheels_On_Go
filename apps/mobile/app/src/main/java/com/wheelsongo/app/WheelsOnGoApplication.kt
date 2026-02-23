package com.wheelsongo.app

import android.app.Application
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.wheelsongo.app.data.network.ApiClient

/**
 * Application class for Wheels On Go
 *
 * Initializes app-wide dependencies and configurations
 */
class WheelsOnGoApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize API client with application context
        // This enables TokenManager and AuthInterceptor
        ApiClient.initialize(this)

        // Initialize Firebase App Check
        // Debug builds: DebugAppCheckProviderFactory generates a UUID debug token
        //   → register that token in Firebase Console (App Check → Manage debug tokens)
        //   → Firebase trusts all requests from that token, no reCAPTCHA or Play Integrity needed
        // Release builds: PlayIntegrityAppCheckProviderFactory uses Google Play Integrity API
        val appCheck = FirebaseAppCheck.getInstance()
        if (BuildConfig.DEBUG) {
            appCheck.installAppCheckProviderFactory(
                DebugAppCheckProviderFactory.getInstance()
            )
        } else {
            appCheck.installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance()
            )
        }
    }
}
