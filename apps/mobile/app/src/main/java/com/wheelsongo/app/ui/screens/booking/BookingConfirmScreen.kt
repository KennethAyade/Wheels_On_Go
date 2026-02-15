package com.wheelsongo.app.ui.screens.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingConfirmScreen(
    pickupLat: Double,
    pickupLng: Double,
    pickupAddress: String,
    dropoffLat: Double,
    dropoffLng: Double,
    dropoffAddress: String,
    onBack: () -> Unit,
    onRideCreated: (rideId: String) -> Unit,
    onAddVehicle: () -> Unit,
    viewModel: BookingConfirmViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.initialize(pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress)
    }

    LaunchedEffect(uiState.bookingSuccess) {
        if (uiState.bookingSuccess && uiState.createdRideId != null) {
            onRideCreated(uiState.createdRideId!!)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Confirm Booking") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.errorMessage != null) {
                Snackbar(
                    action = { TextButton(onClick = { viewModel.clearError() }) { Text("Dismiss") } }
                ) { Text(uiState.errorMessage!!) }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // Route summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("From", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    Text(pickupAddress, style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("To", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                    Text(dropoffAddress, style = MaterialTheme.typography.bodyMedium)
                }
            }

            // Fare estimate
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Fare Estimate", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingEstimate) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else if (uiState.estimate != null) {
                        val est = uiState.estimate!!
                        FareRow("Distance", "${est.distanceText} (${est.durationText})")
                        FareRow("Base fare", "${est.currency} ${est.baseFare}")
                        FareRow("Distance fare", "${est.currency} ${est.distanceFare}")
                        FareRow("Time fare", "${est.currency} ${est.timeFare}")
                        if (est.surgePricing > 0) {
                            FareRow("Surge (${est.surgeMultiplier}x)", "+${est.currency} ${est.surgePricing}")
                        }
                        if (est.promoDiscount > 0) {
                            FareRow("Promo discount", "-${est.currency} ${est.promoDiscount}")
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${est.currency} ${est.estimatedFare}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            // Vehicle selector
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Your Vehicle", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingVehicles) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else if (uiState.vehicles.isEmpty()) {
                        Text(
                            "No vehicle registered. Please add your car first.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(onClick = onAddVehicle, modifier = Modifier.fillMaxWidth()) {
                            Text("Add Vehicle")
                        }
                    } else {
                        uiState.vehicles.forEach { vehicle ->
                            val isSelected = vehicle.id == uiState.selectedVehicle?.id
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected)
                                        MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surface
                                ),
                                onClick = { viewModel.onVehicleSelected(vehicle) }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        vehicle.displayName,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                    Text(
                                        vehicle.plateNumber,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Promo code
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = uiState.promoCode,
                    onValueChange = viewModel::onPromoCodeChange,
                    label = { Text("Promo Code") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedButton(onClick = viewModel::applyPromoCode) {
                    Text("Apply")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Find a Driver button
            PrimaryButton(
                text = "Find a Driver",
                onClick = viewModel::findDriver,
                enabled = uiState.selectedVehicle != null && !uiState.isBooking && uiState.estimate != null,
                isLoading = uiState.isBooking,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun FareRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}
