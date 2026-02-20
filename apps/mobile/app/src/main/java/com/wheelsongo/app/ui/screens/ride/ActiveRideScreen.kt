package com.wheelsongo.app.ui.screens.ride

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
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveRideScreen(
    rideId: String,
    onBack: () -> Unit,
    onRideCompleted: (driverName: String) -> Unit,
    viewModel: ActiveRideViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(rideId) {
        viewModel.initialize(rideId)
    }

    LaunchedEffect(uiState.isCompleted) {
        if (uiState.isCompleted) {
            // Brief delay to show completion status before navigating
            kotlinx.coroutines.delay(500)
            val driverName = uiState.ride?.driver?.phoneNumber ?: "your driver"
            onRideCompleted(driverName)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Your Ride") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            // SOS button
            FloatingActionButton(
                onClick = { /* TODO: SOS functionality */ },
                containerColor = Color.Red,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Warning, contentDescription = "SOS")
            }
        },
        snackbarHost = {
            if (uiState.errorMessage != null) {
                Snackbar(
                    action = { TextButton(onClick = { viewModel.clearError() }) { Text("OK") } }
                ) { Text(uiState.errorMessage!!) }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Status banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = when (uiState.rideStatus) {
                        "PENDING" -> MaterialTheme.colorScheme.secondaryContainer
                        "ACCEPTED", "DRIVER_ARRIVED" -> MaterialTheme.colorScheme.primaryContainer
                        "STARTED" -> MaterialTheme.colorScheme.tertiaryContainer
                        "COMPLETED" -> MaterialTheme.colorScheme.primaryContainer
                        else -> MaterialTheme.colorScheme.errorContainer
                    }
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (uiState.rideStatus == "PENDING" && uiState.dispatchStatus == "SEARCHING") {
                        CircularProgressIndicator(
                            modifier = Modifier.size(32.dp),
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    Text(
                        uiState.statusMessage,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Ride details
            if (uiState.ride != null) {
                val ride = uiState.ride!!

                // Route info
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("From", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Text(ride.pickupAddress, style = MaterialTheme.typography.bodyMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("To", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                        Text(ride.dropoffAddress, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Driver info (shown when accepted)
                if (ride.driver != null) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Your Driver", style = MaterialTheme.typography.titleSmall)
                            Spacer(modifier = Modifier.height(8.dp))
                            ride.driver.driverProfile?.vehicle?.let { vehicle ->
                                Text(
                                    "${vehicle.make} ${vehicle.model} (${vehicle.color})",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    vehicle.plateNumber,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Fare info
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Estimated Fare", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "PHP ${ride.estimatedFare?.toInt() ?: "..."}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Cancel button
            if (uiState.canCancel) {
                OutlinedButton(
                    onClick = viewModel::cancelRide,
                    enabled = !uiState.isCancelling,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (uiState.isCancelling) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp))
                    } else {
                        Text("Cancel Ride", color = MaterialTheme.colorScheme.error)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
