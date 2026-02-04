package com.wheelsongo.app.ui.components.map

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.wheelsongo.app.data.models.location.LocationData

/**
 * Google Maps-based map composable.
 *
 * @param modifier              Modifier for the map container
 * @param initialLatitude       Initial latitude (defaults to Metro Manila)
 * @param initialLongitude      Initial longitude
 * @param initialZoom           Initial zoom level
 * @param currentLocation       When set, camera animates to this point
 * @param pickupLocation        Green marker
 * @param dropoffLocation       Red marker
 * @param driverLocation        Blue marker (for active-ride tracking)
 * @param onMapTap              Fires with (lat, lng) when the map surface is tapped
 */
@Composable
fun GoogleMapView(
    modifier: Modifier = Modifier,
    initialLatitude: Double = 14.5995,
    initialLongitude: Double = 120.9842,
    initialZoom: Double = 14.0,
    currentLocation: LocationData? = null,
    pickupLocation: LocationData? = null,
    dropoffLocation: LocationData? = null,
    driverLocation: LocationData? = null,
    onMapTap: ((Double, Double) -> Unit)? = null
) {
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            LatLng(initialLatitude, initialLongitude),
            initialZoom.toFloat()
        )
    }

    // Animate camera to the new current-location whenever it changes
    LaunchedEffect(currentLocation) {
        if (currentLocation != null) {
            cameraPositionState.animate(
                update = CameraUpdateFactory.newLatLngZoom(
                    LatLng(currentLocation.latitude, currentLocation.longitude),
                    15f
                )
            )
        }
    }

    GoogleMap(
        modifier = modifier,
        cameraPositionState = cameraPositionState,
        onMapClick = { latLng ->
            onMapTap?.invoke(latLng.latitude, latLng.longitude)
        }
    ) {
        // Pickup marker (green)
        pickupLocation?.let {
            Marker(
                state = MarkerState(position = LatLng(it.latitude, it.longitude)),
                title = "Pickup",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
            )
        }

        // Dropoff marker (red)
        dropoffLocation?.let {
            Marker(
                state = MarkerState(position = LatLng(it.latitude, it.longitude)),
                title = "Dropoff",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
            )
        }

        // Driver marker (azure/blue)
        driverLocation?.let {
            Marker(
                state = MarkerState(position = LatLng(it.latitude, it.longitude)),
                title = "Driver",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
            )
        }
    }
}
