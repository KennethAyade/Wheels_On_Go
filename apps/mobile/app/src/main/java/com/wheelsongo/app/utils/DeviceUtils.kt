package com.wheelsongo.app.utils

import android.os.Build

object DeviceUtils {
    fun isEmulator(): Boolean {
        return try {
            val fingerprint = Build.FINGERPRINT.orEmpty()
            val model = Build.MODEL.orEmpty()
            val manufacturer = Build.MANUFACTURER.orEmpty()
            val hardware = Build.HARDWARE.orEmpty()
            val product = Build.PRODUCT.orEmpty()

            (fingerprint.startsWith("generic")
                    || fingerprint.startsWith("unknown")
                    || model.contains("google_sdk")
                    || model.contains("Emulator")
                    || model.contains("Android SDK built for x86")
                    || manufacturer.contains("Genymotion")
                    || hardware.contains("goldfish")
                    || hardware.contains("ranchu")
                    || product.contains("sdk")
                    || product.contains("vbox86p")
                    || product.contains("emulator")
                    || product.contains("simulator"))
        } catch (_: Exception) {
            false
        }
    }
}
