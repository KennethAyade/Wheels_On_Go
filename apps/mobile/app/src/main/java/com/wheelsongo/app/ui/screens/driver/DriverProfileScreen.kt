package com.wheelsongo.app.ui.screens.driver

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.wheelsongo.app.data.models.driver.DriverPublicProfileResponse
import com.wheelsongo.app.data.models.driver.DriverReview

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverProfileScreen(
    driverProfileId: String,
    pickupLat: Double,
    pickupLng: Double,
    dropoffLat: Double,
    dropoffLng: Double,
    pickupAddress: String,
    dropoffAddress: String,
    onNavigateBack: () -> Unit = {},
    onRideCreated: (rideId: String) -> Unit = {},
    viewModel: DriverProfileViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.initialize(
            driverProfileId, pickupLat, pickupLng,
            dropoffLat, dropoffLng, pickupAddress, dropoffAddress
        )
    }

    LaunchedEffect(uiState.createdRideId) {
        uiState.createdRideId?.let { rideId -> onRideCreated(rideId) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Driver Profile") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        },
        bottomBar = {
            if (uiState.profile != null) {
                Surface(
                    shadowElevation = 8.dp
                ) {
                    Button(
                        onClick = { viewModel.bookDriver() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        enabled = !uiState.isBooking,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (uiState.isBooking) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            if (uiState.isBooking) "Booking..." else "Book This Driver",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
            }
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.errorMessage != null && uiState.profile == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(uiState.errorMessage ?: "Error", color = MaterialTheme.colorScheme.error)
                }
            }
            uiState.profile != null -> {
                ProfileContent(
                    profile = uiState.profile!!,
                    errorMessage = uiState.errorMessage,
                    onDismissError = { viewModel.clearError() },
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun ProfileContent(
    profile: DriverPublicProfileResponse,
    errorMessage: String?,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Error snackbar
        if (errorMessage != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        errorMessage,
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall
                    )
                    TextButton(onClick = onDismissError) { Text("Dismiss") }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Profile photo + name
        if (profile.profilePhotoUrl != null) {
            AsyncImage(
                model = profile.profilePhotoUrl,
                contentDescription = "Driver photo",
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            Surface(
                modifier = Modifier.size(100.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.padding(24.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            "${profile.firstName ?: ""} ${profile.lastName ?: ""}".trim().ifEmpty { "Driver" },
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        // Rating
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Star, null, Modifier.size(18.dp), tint = Color(0xFFFFC107))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                String.format("%.1f", profile.averageRating ?: 0.0),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                " (${profile.totalRatings} ratings)",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (profile.isOnline) {
            Spacer(modifier = Modifier.height(4.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF4CAF50).copy(alpha = 0.15f)
            ) {
                Text(
                    "Online",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF4CAF50),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Activity Summary
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Activity Summary", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    StatItem("Total Rides", "${profile.totalRides}")
                    StatItem("Acceptance", String.format("%.0f%%", (profile.acceptanceRate ?: 0.0) * 100))
                    StatItem("Completion", String.format("%.0f%%", (profile.completionRate ?: 0.0) * 100))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Safety & Verification
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Safety & Verification", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(12.dp))
                VerificationRow("NBI Clearance", profile.nbiClearance)
                VerificationRow("Drug Test", profile.drugTest)
                VerificationRow("Health Certificate", profile.healthCertificate)
                VerificationRow("ID Verification", profile.idVerified)
                VerificationRow("Fatigue Detection", profile.fatigueDetection, comingSoon = !profile.fatigueDetection)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Vehicle Info
        if (profile.vehicle != null) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Vehicle", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "${profile.vehicle.year} ${profile.vehicle.make} ${profile.vehicle.model}",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        "${profile.vehicle.color} | ${profile.vehicle.plateNumber}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "${profile.vehicle.vehicleType} | ${profile.vehicle.seatingCapacity} seats",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Reviews
        if (profile.reviews.isNotEmpty()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Reviews (${profile.reviews.size})",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    profile.reviews.take(5).forEachIndexed { index, review ->
                        ReviewItem(review)
                        if (index < profile.reviews.size - 1 && index < 4) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        }
                    }
                }
            }
        }

        // Bottom spacing for button
        Spacer(modifier = Modifier.height(80.dp))
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun VerificationRow(label: String, verified: Boolean, comingSoon: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        if (comingSoon) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    "Coming Soon",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        } else {
            Icon(
                if (verified) Icons.Default.CheckCircle else Icons.Default.Info,
                contentDescription = if (verified) "Verified" else "Not verified",
                tint = if (verified) Color(0xFF4CAF50) else Color(0xFFBDBDBD),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun ReviewItem(review: DriverReview) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                review.reviewerFirstName ?: "Anonymous",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.width(8.dp))
            repeat(review.rating) {
                Icon(Icons.Default.Star, null, Modifier.size(14.dp), tint = Color(0xFFFFC107))
            }
        }
        if (review.review != null) {
            Text(
                review.review,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}
