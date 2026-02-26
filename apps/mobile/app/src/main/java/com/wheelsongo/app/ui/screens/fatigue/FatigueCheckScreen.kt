package com.wheelsongo.app.ui.screens.fatigue

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import kotlinx.coroutines.delay

@Composable
fun FatigueCheckScreen(
    onPassed: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FatigueCheckViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap: Bitmap? ->
        if (bitmap != null) {
            viewModel.onPhotoCaptured(bitmap)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraLauncher.launch(null)
        } else {
            viewModel.onPermissionDenied()
        }
    }

    // Auto-navigate after passed
    LaunchedEffect(uiState.isPassed) {
        if (uiState.isPassed) {
            delay(1500)
            onPassed()
        }
    }

    Scaffold(modifier = modifier) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            when {
                uiState.isDenied -> FatigueDenialContent(
                    uiState = uiState,
                    onRetry = {
                        viewModel.resetForRetry()
                        val hasPermission = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        if (hasPermission) {
                            cameraLauncher.launch(null)
                        } else {
                            permissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    }
                )
                uiState.isPassed -> PassedContent()
                else -> ReadyContent(
                    uiState = uiState,
                    onTakeSelfie = {
                        val hasPermission = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        if (hasPermission) {
                            cameraLauncher.launch(null)
                        } else {
                            permissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun ColumnScope.ReadyContent(
    uiState: FatigueCheckUiState,
    onTakeSelfie: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(160.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        if (uiState.isChecking) {
            CircularProgressIndicator(
                modifier = Modifier.size(56.dp),
                color = MaterialTheme.colorScheme.primary,
                strokeWidth = 4.dp
            )
        } else {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = "Camera",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(72.dp)
            )
        }
    }

    Spacer(modifier = Modifier.height(32.dp))

    Text(
        text = "Quick Safety Check",
        style = MaterialTheme.typography.headlineMedium,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(12.dp))

    Text(
        text = "Take a selfie so we can verify you're alert and ready to drive safely.",
        style = MaterialTheme.typography.bodyMedium,
        color = WheelsOnGoTextSecondary,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(24.dp))

    // Error message
    if (uiState.errorMessage != null) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.errorContainer)
                .padding(12.dp)
        ) {
            Text(
                text = uiState.errorMessage!!,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onErrorContainer,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }

    Spacer(modifier = Modifier.weight(1f))

    PrimaryButton(
        text = if (uiState.errorMessage != null) "Try Again" else "Take Selfie",
        onClick = onTakeSelfie,
        enabled = !uiState.isChecking,
        isLoading = uiState.isChecking
    )

    Spacer(modifier = Modifier.height(24.dp))
}

@Composable
private fun PassedContent() {
    Box(
        modifier = Modifier
            .size(160.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "Passed",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(72.dp)
        )
    }

    Spacer(modifier = Modifier.height(32.dp))

    Text(
        text = "You're Good to Go!",
        style = MaterialTheme.typography.headlineMedium,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(12.dp))

    Text(
        text = "Safety check passed. Redirecting...",
        style = MaterialTheme.typography.bodyMedium,
        color = WheelsOnGoTextSecondary,
        textAlign = TextAlign.Center
    )
}

@Composable
private fun ColumnScope.FatigueDenialContent(
    uiState: FatigueCheckUiState,
    onRetry: () -> Unit
) {
    // Countdown timer
    var remainingMs by remember(uiState.cooldownUntilMs) {
        mutableLongStateOf(maxOf(0L, uiState.cooldownUntilMs - System.currentTimeMillis()))
    }
    val cooldownActive = remainingMs > 0

    LaunchedEffect(uiState.cooldownUntilMs) {
        while (remainingMs > 0) {
            delay(1000)
            remainingMs = maxOf(0L, uiState.cooldownUntilMs - System.currentTimeMillis())
        }
    }

    val minutes = (remainingMs / 60000).toInt()
    val seconds = ((remainingMs % 60000) / 1000).toInt()

    // Warning icon
    val warningColor = when (uiState.fatigueLevel) {
        "SEVERE" -> Color(0xFFD32F2F)
        "MODERATE" -> Color(0xFFFF9800)
        else -> Color(0xFFFFC107)
    }

    Box(
        modifier = Modifier
            .size(160.dp)
            .clip(CircleShape)
            .background(warningColor.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = "Warning",
            tint = warningColor,
            modifier = Modifier.size(72.dp)
        )
    }

    Spacer(modifier = Modifier.height(32.dp))

    Text(
        text = "Rest Required",
        style = MaterialTheme.typography.headlineMedium,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(12.dp))

    // Fatigue level badge
    val levelLabel = when (uiState.fatigueLevel) {
        "SEVERE" -> "Severe Fatigue"
        "MODERATE" -> "Moderate Fatigue"
        "MILD" -> "Mild Fatigue"
        else -> "Fatigue Detected"
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(warningColor.copy(alpha = 0.15f))
            .padding(horizontal = 16.dp, vertical = 6.dp)
    ) {
        Text(
            text = levelLabel,
            style = MaterialTheme.typography.labelLarge,
            color = warningColor,
            fontWeight = FontWeight.Bold
        )
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Reasons
    if (uiState.reasons.isNotEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            uiState.reasons.forEach { reason ->
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        text = "\u2022",
                        style = MaterialTheme.typography.bodyMedium,
                        color = WheelsOnGoTextSecondary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = reason,
                        style = MaterialTheme.typography.bodyMedium,
                        color = WheelsOnGoTextSecondary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }

    Text(
        text = "Please rest for at least ${uiState.cooldownMinutes} minutes before driving.",
        style = MaterialTheme.typography.bodyMedium,
        color = WheelsOnGoTextSecondary,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(16.dp))

    // Countdown
    if (cooldownActive) {
        Text(
            text = "Try again in ${"%02d:%02d".format(minutes, seconds)}",
            style = MaterialTheme.typography.headlineSmall,
            color = warningColor,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }

    Spacer(modifier = Modifier.weight(1f))

    PrimaryButton(
        text = "Try Again",
        onClick = onRetry,
        enabled = !cooldownActive
    )

    Spacer(modifier = Modifier.height(24.dp))
}
