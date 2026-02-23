package com.wheelsongo.app.ui.screens.ride

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun RideCompletionScreen(
    rideId: String,
    driverName: String,
    onDone: () -> Unit = {},
    viewModel: RideCompletionViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.initialize(rideId, driverName)
    }

    LaunchedEffect(uiState.submitted) {
        if (uiState.submitted) onDone()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        Text(
            "Ride Complete!",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "How was your ride with $driverName?",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Overall rating
        Text("Overall Rating", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(8.dp))
        StarRatingBar(
            rating = uiState.overallRating,
            onRatingChanged = { viewModel.setOverallRating(it) },
            starSize = 40
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Sub-ratings
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Rate specific areas", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(12.dp))

                SubRatingRow("Punctuality", uiState.punctualityRating) { viewModel.setPunctualityRating(it) }
                SubRatingRow("Safety", uiState.safetyRating) { viewModel.setSafetyRating(it) }
                SubRatingRow("Cleanliness", uiState.cleanlinessRating) { viewModel.setCleanlinessRating(it) }
                SubRatingRow("Communication", uiState.communicationRating) { viewModel.setCommunicationRating(it) }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Review text
        OutlinedTextField(
            value = uiState.review,
            onValueChange = { viewModel.setReview(it) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Write a review (optional)") },
            minLines = 3,
            maxLines = 5,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Error
        if (uiState.errorMessage != null) {
            Text(
                uiState.errorMessage ?: "",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Submit button
        Button(
            onClick = { viewModel.submitRating() },
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isSubmitting && uiState.overallRating > 0,
            shape = RoundedCornerShape(12.dp)
        ) {
            if (uiState.isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                if (uiState.isSubmitting) "Submitting..." else "Submit Rating",
                style = MaterialTheme.typography.titleMedium
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Skip button
        TextButton(onClick = onDone) {
            Text("Skip")
        }
    }
}

@Composable
private fun StarRatingBar(
    rating: Int,
    onRatingChanged: (Int) -> Unit,
    starSize: Int = 32
) {
    Row {
        for (i in 1..5) {
            Icon(
                imageVector = if (i <= rating) Icons.Filled.Star else Icons.Outlined.Star,
                contentDescription = "Star $i",
                tint = if (i <= rating) Color(0xFFFFC107) else Color(0xFFBDBDBD),
                modifier = Modifier
                    .size(starSize.dp)
                    .clickable { onRatingChanged(i) }
            )
        }
    }
}

@Composable
private fun SubRatingRow(
    label: String,
    rating: Int,
    onRatingChanged: (Int) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(110.dp))
        StarRatingBar(rating = rating, onRatingChanged = onRatingChanged, starSize = 24)
    }
}
