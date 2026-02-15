package com.wheelsongo.app.ui.screens.driver

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.data.location.LocationService
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.ui.components.map.GoogleMapView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverActiveRideScreen(
    rideId: String,
    onBack: () -> Unit,
    onRideCompleted: () -> Unit,
    viewModel: DriverActiveRideViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(rideId) {
        viewModel.initialize(rideId)
    }

    LaunchedEffect(uiState.isCompleted) {
        if (uiState.isCompleted) {
            onRideCompleted()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    // Determine status display
    val (statusText, statusColor) = when (uiState.phase) {
        DriverRidePhase.EN_ROUTE_PICKUP -> "En Route to Pickup" to Color(0xFF2196F3)
        DriverRidePhase.AT_PICKUP -> "Arrived at Pickup" to Color(0xFFFF9800)
        DriverRidePhase.EN_ROUTE_DROPOFF -> "Ride in Progress" to Color(0xFF4CAF50)
        DriverRidePhase.COMPLETED -> "Ride Completed" to Color(0xFF9E9E9E)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(statusText) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = statusColor,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                return@Scaffold
            }

            val ride = uiState.ride

            Column(modifier = Modifier.fillMaxSize()) {
                // Map showing relevant location
                val targetLocation = if (uiState.phase == DriverRidePhase.EN_ROUTE_PICKUP ||
                    uiState.phase == DriverRidePhase.AT_PICKUP
                ) {
                    ride?.let {
                        LocationData(latitude = it.pickupLatitude, longitude = it.pickupLongitude)
                    }
                } else {
                    ride?.let {
                        LocationData(latitude = it.dropoffLatitude, longitude = it.dropoffLongitude)
                    }
                }

                GoogleMapView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    initialLatitude = targetLocation?.latitude ?: LocationService.DEFAULT_LATITUDE,
                    initialLongitude = targetLocation?.longitude ?: LocationService.DEFAULT_LONGITUDE,
                    initialZoom = 15.0,
                    pickupLocation = ride?.let {
                        LocationData(latitude = it.pickupLatitude, longitude = it.pickupLongitude)
                    },
                    dropoffLocation = ride?.let {
                        LocationData(latitude = it.dropoffLatitude, longitude = it.dropoffLongitude)
                    },
                    onMapTap = null
                )

                // Ride info card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        // Addresses
                        Text(
                            text = "Pickup",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = ride?.pickupAddress ?: "---",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Dropoff",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = ride?.dropoffAddress ?: "---",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Fare
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Fare",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "PHP ${ride?.estimatedFare?.let { "%.0f".format(it) } ?: "---"}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Phase-specific action button
                        when (uiState.phase) {
                            DriverRidePhase.EN_ROUTE_PICKUP -> {
                                Button(
                                    onClick = { viewModel.markArrived() },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !uiState.isUpdatingStatus,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFFF9800)
                                    )
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("I've Arrived", color = Color.White)
                                    }
                                }
                            }
                            DriverRidePhase.AT_PICKUP -> {
                                Button(
                                    onClick = { viewModel.startRide() },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !uiState.isUpdatingStatus,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF4CAF50)
                                    )
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Start Ride", color = Color.White)
                                    }
                                }
                            }
                            DriverRidePhase.EN_ROUTE_DROPOFF -> {
                                Button(
                                    onClick = { viewModel.completeRide() },
                                    modifier = Modifier.fillMaxWidth(),
                                    enabled = !uiState.isUpdatingStatus,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary
                                    )
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Complete Ride", color = Color.White)
                                    }
                                }
                            }
                            DriverRidePhase.COMPLETED -> {
                                // Auto-navigates via LaunchedEffect
                            }
                        }
                    }
                }
            }
        }
    }
}
