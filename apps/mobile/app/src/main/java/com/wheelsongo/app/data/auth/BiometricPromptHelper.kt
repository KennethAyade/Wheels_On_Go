package com.wheelsongo.app.data.auth

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * Helper for Android BiometricPrompt (device fingerprint/face unlock).
 * Used for session resumption — drivers must verify identity before
 * their refresh token is used to obtain a new access token.
 */
object BiometricPromptHelper {

    /**
     * Check if the device supports any biometric authentication (strong or weak)
     */
    fun canAuthenticate(context: Context): Boolean {
        val biometricManager = BiometricManager.from(context)
        // Accept strong biometrics first, fall back to weak
        return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
                BiometricManager.BIOMETRIC_SUCCESS ||
               biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    /**
     * Show the biometric prompt to the user.
     * Accepts strong or weak biometrics. On devices with no biometric support,
     * callers should skip this entirely (check canAuthenticate first).
     *
     * @param activity FragmentActivity required by BiometricPrompt
     * @param onSuccess Called when authentication succeeds
     * @param onError Called when authentication fails or is cancelled
     */
    fun showPrompt(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val biometricManager = BiometricManager.from(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                onError(errString.toString())
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Don't call onError here — BiometricPrompt shows its own retry UI
                // onError is only called on final failure via onAuthenticationError
            }
        }

        val biometricPrompt = BiometricPrompt(activity, executor, callback)

        // Use strong if available, otherwise weak
        val canStrong = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
                BiometricManager.BIOMETRIC_SUCCESS
        val authenticators = if (canStrong)
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        else
            BiometricManager.Authenticators.BIOMETRIC_WEAK

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Verify your identity")
            .setSubtitle("Use your fingerprint or face to continue")
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(authenticators)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}
