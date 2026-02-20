package com.wheelsongo.app.ui.screens.ride

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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.ui.components.map.GoogleMapView

@Composable
fun ActiveRideScreen(
    rideId: String,
    onBack: () -> Unit,
    onRideCompleted: (driverName: String) -> Unit,
    viewModel: ActiveRideViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(rideId) {
        viewModel.initialize(rideId)
    }

    LaunchedEffect(uiState.isCompleted) {
        if (uiState.isCompleted) {
            kotlinx.coroutines.delay(500)
            val driverName = uiState.ride?.driver?.phoneNumber ?: "your driver"
            onRideCompleted(driverName)
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    // Auto-dismiss geofence message after 5 seconds
    LaunchedEffect(uiState.geofenceMessageTimestamp) {
        if (uiState.geofenceMessage != null) {
            kotlinx.coroutines.delay(5000)
            viewModel.clearGeofenceMessage()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Layer 1: Full-screen map
        GoogleMapView(
            modifier = Modifier.fillMaxSize(),
            initialLatitude = uiState.pickupLocation?.latitude ?: LocationService.DEFAULT_LATITUDE,
            initialLongitude = uiState.pickupLocation?.longitude ?: LocationService.DEFAULT_LONGITUDE,
            initialZoom = 15.0,
            pickupLocation = uiState.pickupLocation,
            dropoffLocation = uiState.dropoffLocation,
            driverLocation = uiState.driverLocation,
            routePoints = uiState.routePoints,
            onMapTap = null
        )

        // Layer 2: Back button (top-left)
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(16.dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surface)
                .size(48.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }

        // Layer 3: SOS button (top-right)
        IconButton(
            onClick = { /* TODO: SOS functionality */ },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(16.dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(Color.Red)
                .size(48.dp)
        ) {
            Icon(Icons.Default.Warning, contentDescription = "SOS", tint = Color.White)
        }

        // Layer 4: Geofence notification banner (top-center)
        uiState.geofenceMessage?.let { message ->
            Card(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(top = 72.dp, start = 16.dp, end = 16.dp)
                    .fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = when {
                        message.contains("arrived", ignoreCase = true) -> Color(0xFF4CAF50)
                        message.contains("approaching", ignoreCase = true) -> Color(0xFF2196F3)
                        else -> MaterialTheme.colorScheme.primaryContainer
                    }
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = message,
                    modifier = Modifier.padding(16.dp),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleSmall
                )
            }
        }

        // Layer 5: Bottom overlay
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
        ) {
            // Status banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(0.dp),
                colors = CardDefaults.cardColors(
                    containerColor = when (uiState.rideStatus) {
                        "PENDING" -> Color(0xFF1565C0)
                        "ACCEPTED" -> Color(0xFF388E3C)
                        "DRIVER_ARRIVED" -> Color(0xFF4CAF50)
                        "STARTED" -> Color(0xFF0288D1)
                        "COMPLETED" -> Color(0xFF388E3C)
                        else -> Color(0xFFD32F2F)
                    }
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (uiState.rideStatus == "PENDING" && uiState.dispatchStatus == "SEARCHING") {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    Text(
                        uiState.statusMessage,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            // Info card
            Card(
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    val ride = uiState.ride

                    // Driver info (when assigned)
                    if (ride?.driver != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Avatar
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF4CAF50)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = (ride.driver.phoneNumber?.takeLast(2) ?: "??"),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                ride.driver.driverProfile?.vehicle?.let { vehicle ->
                                    Text(
                                        text = "${vehicle.make} ${vehicle.model}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "${vehicle.plateNumber} · ${vehicle.color}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Text(
                                text = "₱${"%.0f".format(ride.estimatedFare ?: 0.0)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Route info
                    if (ride != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Pickup",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF4CAF50)
                                )
                                Text(
                                    ride.pickupAddress,
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Dropoff",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFFF44336)
                                )
                                Text(
                                    ride.dropoffAddress,
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        // Fare row (when no driver yet)
                        if (ride.driver == null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Estimated Fare", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "₱${ride.estimatedFare?.toInt() ?: "..."}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Cancel button
                    if (uiState.canCancel) {
                        OutlinedButton(
                            onClick = viewModel::cancelRide,
                            enabled = !uiState.isCancelling,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (uiState.isCancelling) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp))
                            } else {
                                Text("Cancel Ride", color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }
        }

        // Snackbar host
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 280.dp)
        )
    }
}
