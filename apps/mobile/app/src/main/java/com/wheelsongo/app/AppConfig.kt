package com.wheelsongo.app

import com.wheelsongo.app.utils.DeviceUtils

object AppConfig {
    val BASE_URL: String = if (DeviceUtils.isEmulator()) {
        "http://10.0.2.2:3000/"
    } else {
        BuildConfig.API_BASE_URL
    }
}
