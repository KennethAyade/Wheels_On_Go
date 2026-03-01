package com.wheelsongo.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Face
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.camera.FaceCameraCapture
import com.wheelsongo.app.ui.components.headers.TopBarWithBack
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary

/**
 * Biometric (face) verification screen for driver login.
 * Uses embedded CameraX preview with oval face guide.
 */
@Composable
fun BiometricVerificationScreen(
    onBack: () -> Unit,
    onVerified: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BiometricVerificationViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCamera by remember { mutableStateOf(false) }

    // Navigate when verified
    LaunchedEffect(uiState.isVerified) {
        if (uiState.isVerified) {
            onVerified()
        }
    }

    // Exit camera on error so user sees error message and can retry
    LaunchedEffect(uiState.errorMessage) {
        if (uiState.errorMessage != null && showCamera) {
            showCamera = false
        }
    }

    if (showCamera && !uiState.isVerified) {
        // Embedded camera screen
        FaceCameraCapture(
            title = "Face Recognition",
            subtitle = "Please look into the camera and hold still",
            statusText = when {
                uiState.isVerified -> "Face Recognized Successfully"
                uiState.isVerifying -> "Recognizing your Face...."
                else -> "Hold your face steady"
            },
            isProcessing = uiState.isVerifying,
            isSuccess = uiState.isVerified,
            errorMessage = uiState.errorMessage,
            onImageCaptured = { bitmap -> viewModel.onPhotoCaptured(bitmap) },
            onBack = {
                showCamera = false
            }
        )
    } else {
        Scaffold(
            topBar = {
                TopBarWithBack(
                    title = "Face Verification",
                    onBack = onBack
                )
            },
            modifier = modifier
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Face icon / status indicator
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(
                            if (uiState.isVerified)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surfaceVariant
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (uiState.isVerified) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Verified",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(56.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Face,
                            contentDescription = "Face verification",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(56.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Title
                Text(
                    text = if (uiState.isVerified) "Verification Successful"
                           else "Verify Your Identity",
                    style = MaterialTheme.typography.headlineMedium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Description
                Text(
                    text = if (uiState.isVerified)
                        "Your face has been verified. You can now proceed."
                    else
                        "Use the embedded camera to verify your identity. Make sure your face is well-lit and clearly visible.",
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

                // Capture / Retry button
                if (!uiState.isVerified) {
                    PrimaryButton(
                        text = if (uiState.errorMessage != null) "Try Again" else "Start Verification",
                        onClick = { showCamera = true },
                        enabled = !uiState.isVerifying,
                        isLoading = false
                    )
                } else {
                    PrimaryButton(
                        text = "Continue",
                        onClick = onVerified,
                        enabled = true
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
