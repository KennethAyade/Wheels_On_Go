package com.wheelsongo.app.ui.screens.driver

import android.Manifest
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.ui.components.map.GoogleMapView

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun DriverHomeScreen(
    onMenuClick: () -> Unit,
    drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed),
    drawerContent: @Composable () -> Unit = {},
    onNavigateToActiveRide: (String) -> Unit,
    onNavigateToDriveRequests: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DriverHomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Location permissions
    val locationPermissions = rememberMultiplePermissionsState(
        listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        viewModel.onLocationPermissionResult(allGranted)
    }

    LaunchedEffect(Unit) {
        if (!locationPermissions.allPermissionsGranted) {
            locationPermissions.launchMultiplePermissionRequest()
        } else {
            viewModel.onLocationPermissionResult(true)
        }
    }

    // Navigate to DriveRequests when flag is set
    LaunchedEffect(uiState.navigateToDriveRequests) {
        if (uiState.navigateToDriveRequests) {
            viewModel.onDriveRequestsNavigated()
            onNavigateToDriveRequests()
        }
    }

    // Navigate to active ride when dispatch was accepted
    LaunchedEffect(uiState.acceptedRideId) {
        val rideId = uiState.acceptedRideId
        if (rideId != null) {
            viewModel.onActiveRideNavigated()
            onNavigateToActiveRide(rideId)
        }
    }

    // Navigate to existing active ride from checkForActiveRide
    LaunchedEffect(uiState.activeRideId) {
        val rideId = uiState.activeRideId
        if (rideId != null && uiState.acceptedRideId == null) {
            viewModel.clearActiveRideState()
            onNavigateToActiveRide(rideId)
        }
    }

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
            // Full-screen Google Maps
            GoogleMapView(
                modifier = Modifier.fillMaxSize(),
                initialLatitude = LocationService.DEFAULT_LATITUDE,
                initialLongitude = LocationService.DEFAULT_LONGITUDE,
                initialZoom = LocationService.DEFAULT_ZOOM.toDouble(),
                currentLocation = if (uiState.currentLatitude != LocationService.DEFAULT_LATITUDE) {
                    currentLocationData
                } else null,
                onMapTap = null
            )

            // Top bar: hamburger + status toggle
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onMenuClick,
                        modifier = Modifier
                            .shadow(4.dp, CircleShape)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surface)
                            .size(48.dp)
                    ) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    DriverStatusToggle(
                        isOnline = uiState.isOnline,
                        isLoading = uiState.isTogglingStatus,
                        onToggle = { viewModel.toggleOnlineStatus() }
                    )
                }
            }

            // Bottom section: location + CTA
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)
                ) {
                    // Current location row
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Your current location",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = if (uiState.currentLocationAddress.isNotEmpty())
                                    uiState.currentLocationAddress
                                else if (uiState.isLoadingLocation) "Getting location..."
                                else "Location unavailable",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // "Find Drive Requests" CTA
                    Button(
                        onClick = { viewModel.goOnlineAndFindRides() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !uiState.isTogglingStatus,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50),
                            disabledContainerColor = Color(0xFF4CAF50).copy(alpha = 0.5f)
                        )
                    ) {
                        if (uiState.isTogglingStatus) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "Find Drive Requests",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // Error snackbar
            if (uiState.errorMessage != null) {
                Snackbar(
                    modifier = Modifier
                        .padding(16.dp)
                        .align(Alignment.BottomCenter),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(uiState.errorMessage!!)
                }
            }
        }
    }
}

@Composable
private fun DriverStatusToggle(
    isOnline: Boolean,
    isLoading: Boolean,
    onToggle: () -> Unit
) {
    val bgColor by animateColorAsState(
        targetValue = if (isOnline) Color(0xFF4CAF50) else Color(0xFF757575),
        label = "statusColor"
    )

    Card(
        modifier = Modifier.shadow(4.dp, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (isOnline) "Online" else "Offline",
                color = Color.White,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.width(8.dp))
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
            } else {
                Switch(
                    checked = isOnline,
                    onCheckedChange = { onToggle() },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF388E3C),
                        uncheckedThumbColor = Color.White,
                        uncheckedTrackColor = Color(0xFF9E9E9E)
                    )
                )
            }
        }
    }
}
