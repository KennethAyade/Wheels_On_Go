package com.wheelsongo.app.data.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import com.google.android.gms.location.*
import com.wheelsongo.app.data.models.location.LocationData
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Service for getting device location using Google Play Services FusedLocationProvider
 */
class LocationService(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    /**
     * Default location request for high accuracy location updates
     */
    private val locationRequest = LocationRequest.Builder(
        Priority.PRIORITY_HIGH_ACCURACY,
        3000L // 3 second interval
    ).apply {
        setMinUpdateIntervalMillis(2000L) // 2 second minimum
        setMaxUpdateDelayMillis(5000L) // 5 second max delay for batching
        setWaitForAccurateLocation(false)
    }.build()

    /**
     * Check if GPS or network location provider is enabled on the device.
     * Returns false if the user has disabled location in system settings.
     */
    fun isLocationEnabled(): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
        return locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) ||
               locationManager.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)
    }

    /**
     * Get current location once
     * @return LocationData or null if location unavailable
     */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): LocationData? = suspendCancellableCoroutine { cont ->
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            null // CancellationToken - null means no cancellation
        ).addOnSuccessListener { location: Location? ->
            if (cont.isActive) {
                if (location != null) {
                    cont.resume(location.toLocationData())
                } else {
                    // Try to get last known location as fallback
                    fusedLocationClient.lastLocation
                        .addOnSuccessListener { lastLocation ->
                            if (cont.isActive) {
                                cont.resume(lastLocation?.toLocationData())
                            }
                        }
                        .addOnFailureListener { e ->
                            if (cont.isActive) {
                                cont.resume(null)
                            }
                        }
                }
            }
        }.addOnFailureListener { e ->
            if (cont.isActive) {
                cont.resumeWithException(e)
            }
        }
    }

    /**
     * Reliably get current location with active GPS search and timeout.
     *
     * Strategy:
     * 1. Try fast path: getCurrentLocation() for cached/recent fix
     * 2. If null, actively request GPS updates and take the first result
     * 3. Times out after [timeoutMs] (default 10 seconds) and returns null
     */
    @SuppressLint("MissingPermission")
    suspend fun getReliableCurrentLocation(timeoutMs: Long = 10_000L): LocationData? {
        // Fast path: try cached location first (instant)
        try {
            val cached = getCurrentLocation()
            if (cached != null) return cached
        } catch (_: Exception) {
            // Fall through to active search
        }

        // Slow path: actively request GPS updates, take first result
        return withTimeoutOrNull(timeoutMs) {
            getLocationUpdates().first()
        }
    }

    /**
     * Get last known location (faster but may be stale)
     */
    @SuppressLint("MissingPermission")
    suspend fun getLastKnownLocation(): LocationData? = suspendCancellableCoroutine { cont ->
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (cont.isActive) {
                    cont.resume(location?.toLocationData())
                }
            }
            .addOnFailureListener { e ->
                if (cont.isActive) {
                    cont.resumeWithException(e)
                }
            }
    }

    /**
     * Get continuous location updates as a Flow
     * Used for active ride tracking
     */
    @SuppressLint("MissingPermission")
    fun getLocationUpdates(): Flow<LocationData> = callbackFlow {
        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    trySend(location.toLocationData())
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            callback,
            Looper.getMainLooper()
        )

        awaitClose {
            fusedLocationClient.removeLocationUpdates(callback)
        }
    }

    /**
     * Get location updates with custom interval
     */
    @SuppressLint("MissingPermission")
    fun getLocationUpdates(intervalMs: Long): Flow<LocationData> = callbackFlow {
        val customRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            intervalMs
        ).apply {
            setMinUpdateIntervalMillis(intervalMs / 2)
        }.build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    trySend(location.toLocationData())
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            customRequest,
            callback,
            Looper.getMainLooper()
        )

        awaitClose {
            fusedLocationClient.removeLocationUpdates(callback)
        }
    }

    /**
     * Extension function to convert Android Location to LocationData
     */
    private fun Location.toLocationData(): LocationData = LocationData(
        latitude = latitude,
        longitude = longitude,
        accuracy = accuracy,
        speed = if (hasSpeed()) speed else null,
        heading = if (hasBearing()) bearing else null,
        altitude = if (hasAltitude()) altitude else null,
        timestamp = time
    )

    companion object {
        // Metro Manila center coordinates (BGC)
        const val DEFAULT_LATITUDE = 14.5547
        const val DEFAULT_LONGITUDE = 121.0244
        const val DEFAULT_ZOOM = 15f
    }
}
