package com.wheelsongo.app

import android.app.Application
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
    }
}
