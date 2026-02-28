package com.wheelsongo.app.ui.screens.driver

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.ui.components.map.GoogleMapView
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch

@Composable
fun DriverActiveRideScreen(
    rideId: String,
    riderName: String = "",
    onBack: () -> Unit,
    onNavigateToCompletion: (rideId: String, riderName: String) -> Unit,
    viewModel: DriverActiveRideViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showSosDialog by remember { mutableStateOf(false) }

    LaunchedEffect(rideId) {
        viewModel.initialize(rideId, riderName)
    }

    LaunchedEffect(uiState.navigateToCompletion) {
        if (uiState.navigateToCompletion) {
            viewModel.onCompletionNavigated()
            onNavigateToCompletion(uiState.rideId, uiState.riderName)
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    var showCancelledDialog by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.isCancelled) {
        if (uiState.isCancelled) {
            showCancelledDialog = true
        }
    }

    val ride = uiState.ride

    Box(modifier = Modifier.fillMaxSize()) {
        // Layer 1: Full-screen map
        val pickupLocationData = ride?.let {
            LocationData(latitude = it.pickupLatitude, longitude = it.pickupLongitude)
        }
        val dropoffLocationData = ride?.let {
            LocationData(latitude = it.dropoffLatitude, longitude = it.dropoffLongitude)
        }
        val focusLocation = when (uiState.phase) {
            DriverRidePhase.EN_ROUTE_PICKUP, DriverRidePhase.AT_PICKUP -> pickupLocationData
            else -> dropoffLocationData
        }

        GoogleMapView(
            modifier = Modifier.fillMaxSize(),
            initialLatitude = focusLocation?.latitude ?: LocationService.DEFAULT_LATITUDE,
            initialLongitude = focusLocation?.longitude ?: LocationService.DEFAULT_LONGITUDE,
            initialZoom = 15.0,
            pickupLocation = pickupLocationData,
            dropoffLocation = dropoffLocationData,
            routePoints = uiState.routePoints,
            onMapTap = null
        )

        // Loading overlay
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color.White)
            }
        }

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

        // Layer 2b: SOS button (top-right)
        IconButton(
            onClick = { showSosDialog = true },
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

        // Layer 3: Bottom overlay (status + rider card + action button)
        if (!uiState.isLoading && ride != null && !uiState.isCancelled) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
            ) {
                // Status banner
                StatusBanner(
                    phase = uiState.phase,
                    rideDurationMinutes = uiState.rideDurationMinutes,
                    rideDistanceKm = uiState.rideDistanceKm,
                    dropoffAddress = ride.dropoffAddress
                )

                // Rider info + action card
                Card(
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        // Rider info row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Avatar circle
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF4CAF50)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = uiState.riderName.initials(),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = uiState.riderName.ifEmpty { "Customer" },
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = paymentLabel(uiState.paymentMethod),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Text(
                                text = "₱${"%.0f".format(ride.estimatedFare ?: 0.0)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4CAF50)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Message button stub
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    snackbarHostState.showSnackbar("Chat feature coming soon")
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Chat,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Message")
                        }

                        // Navigate button (EN_ROUTE phases only)
                        if (uiState.phase == DriverRidePhase.EN_ROUTE_PICKUP || uiState.phase == DriverRidePhase.EN_ROUTE_DROPOFF) {
                            val context = LocalContext.current
                            OutlinedButton(
                                onClick = {
                                    val target = viewModel.getNavigationTarget()
                                    if (target != null) {
                                        val uri = Uri.parse("google.navigation:q=${target.first},${target.second}&mode=d")
                                        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                                            setPackage("com.google.android.apps.maps")
                                        }
                                        try {
                                            context.startActivity(intent)
                                        } catch (_: Exception) {
                                            val browserUri = Uri.parse(
                                                "https://www.google.com/maps/dir/?api=1&destination=${target.first},${target.second}&travelmode=driving"
                                            )
                                            context.startActivity(Intent(Intent.ACTION_VIEW, browserUri))
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Navigation,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Navigate")
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Phase action button
                        when (uiState.phase) {
                            DriverRidePhase.EN_ROUTE_PICKUP -> {
                                Button(
                                    onClick = { viewModel.markArrived() },
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    enabled = !uiState.isUpdatingStatus,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(22.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("I've Arrived", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            DriverRidePhase.AT_PICKUP -> {
                                Button(
                                    onClick = { viewModel.startRide() },
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    enabled = !uiState.isUpdatingStatus,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(22.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Start Ride", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            DriverRidePhase.EN_ROUTE_DROPOFF -> {
                                Button(
                                    onClick = { viewModel.completeRide() },
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    enabled = !uiState.isUpdatingStatus,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                                ) {
                                    if (uiState.isUpdatingStatus) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(22.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Text("Complete Ride", color = Color.White, fontWeight = FontWeight.Bold)
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

        // Snackbar host
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 280.dp)
        )
    }

    // Ride cancelled dialog
    if (showCancelledDialog) {
        AlertDialog(
            onDismissRequest = { /* Block dismiss — must tap OK */ },
            title = { Text("Ride Cancelled", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    if (uiState.cancellationReason.isNotBlank())
                        "This ride has been cancelled by the rider.\nReason: ${uiState.cancellationReason}"
                    else
                        "This ride has been cancelled by the rider."
                )
            },
            confirmButton = {
                Button(onClick = {
                    showCancelledDialog = false
                    onBack()
                }) {
                    Text("OK")
                }
            }
        )
    }

    // SOS confirmation dialog
    if (showSosDialog) {
        val sosContext = LocalContext.current
        AlertDialog(
            onDismissRequest = { showSosDialog = false },
            title = { Text("Emergency SOS", fontWeight = FontWeight.Bold) },
            text = { Text("This will open the phone dialer to call emergency services (911). Are you sure?") },
            confirmButton = {
                Button(
                    onClick = {
                        showSosDialog = false
                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:911"))
                        sosContext.startActivity(intent)
                        viewModel.triggerSos()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Call 911", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSosDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun StatusBanner(
    phase: DriverRidePhase,
    rideDurationMinutes: Int,
    rideDistanceKm: Double,
    dropoffAddress: String
) {
    val (text, subText) = when (phase) {
        DriverRidePhase.EN_ROUTE_PICKUP -> "You are on the way" to null
        DriverRidePhase.AT_PICKUP -> "You have arrived" to null
        DriverRidePhase.EN_ROUTE_DROPOFF ->
            "$rideDurationMinutes min  ·  ${"%.1f".format(rideDistanceKm)} km" to dropoffAddress
        DriverRidePhase.COMPLETED -> null to null
    }

    if (text != null) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(0.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF388E3C))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = text,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                if (subText != null) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subText,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

private fun String.initials(): String {
    val parts = trim().split(" ")
    return when {
        parts.size >= 2 -> "${parts[0].firstOrNull() ?: ""}${parts[1].firstOrNull() ?: ""}".uppercase()
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> "?"
    }
}

private fun paymentLabel(method: String): String = when (method.uppercase()) {
    "GCASH" -> "GCash"
    "CARD" -> "Card"
    else -> "Cash"
}
