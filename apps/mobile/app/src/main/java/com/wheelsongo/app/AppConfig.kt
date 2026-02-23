package com.wheelsongo.app

import com.wheelsongo.app.utils.DeviceUtils

object AppConfig {
    // Temporarily pointing both emulator and real device to Render for cross-device testing.
    // Revert this when done: restore the isEmulator() check.
    val BASE_URL: String = BuildConfig.API_BASE_URL
}
