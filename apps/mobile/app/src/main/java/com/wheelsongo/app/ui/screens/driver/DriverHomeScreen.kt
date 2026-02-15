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
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.style.TextAlign
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

    // Navigate to active ride when accepted
    LaunchedEffect(uiState.activeRideId) {
        val rideId = uiState.activeRideId
        if (rideId != null && uiState.isAccepting) {
            viewModel.onActiveRideNavigated()
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
            // Google Maps
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
                    // Hamburger menu
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

                    // Online/Offline toggle
                    DriverStatusToggle(
                        isOnline = uiState.isOnline,
                        isLoading = uiState.isTogglingStatus,
                        onToggle = { viewModel.toggleOnlineStatus() }
                    )
                }
            }

            // Active ride banner (bottom)
            if (uiState.activeRideId != null && uiState.incomingRequest == null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .align(Alignment.BottomCenter),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    onClick = { onNavigateToActiveRide(uiState.activeRideId!!) }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Active Ride",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Tap to view",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            // Incoming ride request overlay
            if (uiState.incomingRequest != null) {
                IncomingRideRequestCard(
                    request = uiState.incomingRequest!!,
                    countdown = uiState.requestCountdownSeconds,
                    isAccepting = uiState.isAccepting,
                    onAccept = { viewModel.acceptRide() },
                    onDecline = { viewModel.declineRide() },
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
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

@Composable
private fun IncomingRideRequestCard(
    request: IncomingRideRequestUiData,
    countdown: Int,
    isAccepting: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Header with countdown
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "New Ride Request",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                // Countdown circle
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        progress = { countdown / 30f },
                        modifier = Modifier.size(48.dp),
                        color = if (countdown <= 10) Color.Red else MaterialTheme.colorScheme.primary,
                        strokeWidth = 4.dp
                    )
                    Text(
                        text = "${countdown}s",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Pickup
            Text(
                text = "Pickup",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = request.pickupAddress,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Dropoff
            Text(
                text = "Dropoff",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = request.dropoffAddress,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Fare
            if (request.estimatedFare.isNotBlank() && request.estimatedFare != "---") {
                Text(
                    text = "Est. Fare: PHP ${request.estimatedFare}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Accept / Decline buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDecline,
                    modifier = Modifier.weight(1f),
                    enabled = !isAccepting,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Decline")
                }

                Button(
                    onClick = onAccept,
                    modifier = Modifier.weight(1f),
                    enabled = !isAccepting,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50)
                    )
                ) {
                    if (isAccepting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Accept", color = Color.White)
                    }
                }
            }
        }
    }
}
