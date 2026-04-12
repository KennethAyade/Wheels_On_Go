package com.wheelsongo.app.data.location

import android.content.Context
import android.content.IntentSender
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Typed outcome of asking Play Services whether the current location settings
 * satisfy our request.
 */
sealed class LocationSettingsOutcome {
    data object Satisfied : LocationSettingsOutcome()

    /** The user must be prompted via [IntentSender] to enable settings. */
    data class Resolvable(val intentSender: IntentSender) : LocationSettingsOutcome()

    /** Settings can't be auto-resolved — user must open system Settings. */
    data object Unresolvable : LocationSettingsOutcome()
}

/**
 * Wraps Play Services' SettingsClient so the UI can trigger the in-app
 * "Turn on Location" dialog instead of sending the user out to system Settings.
 */
object LocationSettingsHelper {

    suspend fun checkSettings(context: Context): LocationSettingsOutcome =
        suspendCancellableCoroutine { cont ->
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000L).build()
            val settingsRequest = LocationSettingsRequest.Builder()
                .addLocationRequest(request)
                .setAlwaysShow(true)
                .build()

            LocationServices.getSettingsClient(context)
                .checkLocationSettings(settingsRequest)
                .addOnSuccessListener {
                    if (cont.isActive) cont.resume(LocationSettingsOutcome.Satisfied)
                }
                .addOnFailureListener { e ->
                    if (!cont.isActive) return@addOnFailureListener
                    if (e is ResolvableApiException) {
                        cont.resume(LocationSettingsOutcome.Resolvable(e.resolution.intentSender))
                    } else {
                        cont.resume(LocationSettingsOutcome.Unresolvable)
                    }
                }
        }
}
