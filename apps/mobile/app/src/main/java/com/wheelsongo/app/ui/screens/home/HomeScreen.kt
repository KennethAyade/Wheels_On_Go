package com.wheelsongo.app.ui.screens.home

import android.Manifest
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.inputs.SearchField
import com.wheelsongo.app.ui.components.map.GoogleMapView
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Home screen with map view and ride booking interface
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    onMenuClick: () -> Unit,
    drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed),
    drawerContent: @Composable () -> Unit = {},
    onFromFieldClick: () -> Unit = {},
    onToFieldClick: () -> Unit = {},
    onConfirmBooking: () -> Unit = {},
    onNavigateToActiveRide: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Auto-navigate to active ride if one exists
    LaunchedEffect(uiState.activeRideId) {
        uiState.activeRideId?.let { rideId ->
            viewModel.onActiveRideNavigated()
            onNavigateToActiveRide(rideId)
        }
    }

    // Location permissions
    val locationPermissions = rememberMultiplePermissionsState(
        listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    ) { permissions ->
        // Callback when permissions result is received
        val allGranted = permissions.values.all { it }
        viewModel.onLocationPermissionResult(allGranted)
    }

    // Request permissions on first launch
    LaunchedEffect(Unit) {
        if (!locationPermissions.allPermissionsGranted) {
            locationPermissions.launchMultiplePermissionRequest()
        } else {
            viewModel.onLocationPermissionResult(true)
        }
    }

    // Current location as LocationData for the map
    val currentLocationData = remember(uiState.currentLatitude, uiState.currentLongitude) {
        LocationData(
            latitude = uiState.currentLatitude,
            longitude = uiState.currentLongitude
        )
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = drawerContent
    ) {
    Box(modifier = modifier.fillMaxSize()) {
        // Google Maps
        GoogleMapView(
            modifier = Modifier.fillMaxSize(),
            initialLatitude = LocationService.DEFAULT_LATITUDE,
            initialLongitude = LocationService.DEFAULT_LONGITUDE,
            initialZoom = LocationService.DEFAULT_ZOOM.toDouble(),
            currentLocation = if (uiState.currentLatitude != LocationService.DEFAULT_LATITUDE) {
                currentLocationData
            } else null,
            pickupLocation = uiState.pickupLocation,
            dropoffLocation = uiState.dropoffLocation,
            routePoints = uiState.routePoints,
            onMapTap = { lat, lng ->
                viewModel.onMapTap(lat, lng)
            }
        )

        // Center pin indicator (when selecting location)
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(bottom = 24.dp) // Offset to point at center
        ) {
            Text(
                text = "📍",
                style = MaterialTheme.typography.headlineMedium
            )
        }

        // Hamburger Menu Button
        IconButton(
            onClick = onMenuClick,
            modifier = Modifier
                .statusBarsPadding()
                .padding(16.dp)
                .size(48.dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surface)
                .align(Alignment.TopStart)
        ) {
            Icon(
                imageVector = Icons.Default.Menu,
                contentDescription = "Menu",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }

        // Current Location Button
        FloatingActionButton(
            onClick = { viewModel.onMyLocationClick() },
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 16.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary,
            elevation = FloatingActionButtonDefaults.elevation(
                defaultElevation = 4.dp
            )
        ) {
            if (uiState.isLoadingLocation) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "My Location"
                )
            }
        }

        // Bottom Sheet - Search Fields
        BottomSearchSheet(
            fromAddress = uiState.fromAddress,
            toAddress = uiState.toAddress,
            onFromFieldClick = onFromFieldClick,
            onToFieldClick = onToFieldClick,
            onUsePinnedAddress = viewModel::onUsePinnedAddress,
            canProceedToBooking = uiState.canProceedToBooking,
            onConfirmBooking = onConfirmBooking,
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
        )

        // Error Snackbar
        uiState.errorMessage?.let { error ->
            Snackbar(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 220.dp, start = 16.dp, end = 16.dp),
                action = {
                    TextButton(onClick = { viewModel.clearError() }) {
                        Text("Dismiss")
                    }
                }
            ) {
                Text(error)
            }
        }
    }
    } // ModalNavigationDrawer
}

/**
 * Bottom sheet with From/To search fields
 */
@Composable
private fun BottomSearchSheet(
    fromAddress: String,
    toAddress: String,
    onFromFieldClick: () -> Unit,
    onToFieldClick: () -> Unit,
    onUsePinnedAddress: () -> Unit,
    canProceedToBooking: Boolean = false,
    onConfirmBooking: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(24.dp)
            .navigationBarsPadding()
    ) {
        // From Field (clickable, opens search)
        SearchField(
            value = fromAddress,
            onValueChange = { },
            placeholder = "From",
            readOnly = true,
            onClick = onFromFieldClick,
            leadingIcon = {
                // Green dot for pickup
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                )
            }
        )

        Spacer(modifier = Modifier.height(12.dp))

        // To Field (clickable, opens search)
        SearchField(
            value = toAddress,
            onValueChange = { },
            placeholder = "To",
            readOnly = true,
            onClick = onToFieldClick,
            leadingIcon = {
                // Red dot for dropoff
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.error)
                )
            }
        )

        Spacer(modifier = Modifier.height(20.dp))

        if (canProceedToBooking) {
            // Confirm Booking Button — shown when both pickup and dropoff are set
            PrimaryButton(
                text = "Confirm Booking",
                onClick = onConfirmBooking
            )
        } else {
            // Use Pinned Address Button
            PrimaryButton(
                text = "Use pinned address",
                onClick = onUsePinnedAddress
            )
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun HomeScreenPreview() {
    WheelsOnGoTheme {
        // Preview without actual map
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.LightGray)
        ) {
            BottomSearchSheet(
                fromAddress = "",
                toAddress = "",
                onFromFieldClick = {},
                onToFieldClick = {},
                onUsePinnedAddress = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun BottomSearchSheetPreview() {
    WheelsOnGoTheme {
        BottomSearchSheet(
            fromAddress = "",
            toAddress = "",
            onFromFieldClick = {},
            onToFieldClick = {},
            onUsePinnedAddress = {}
        )
    }
}
