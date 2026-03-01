package com.wheelsongo.app.ui.screens.fatigue

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
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import kotlinx.coroutines.delay

@Composable
fun FaceEnrollmentScreen(
    onEnrolled: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FaceEnrollmentViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCamera by remember { mutableStateOf(false) }

    // Auto-navigate after successful enrollment
    LaunchedEffect(uiState.isEnrolled) {
        if (uiState.isEnrolled) {
            delay(1500)
            onEnrolled()
        }
    }

    // Exit camera on error so user sees error message and can retry
    LaunchedEffect(uiState.errorMessage) {
        if (uiState.errorMessage != null && showCamera) {
            showCamera = false
        }
    }

    if (showCamera && !uiState.isEnrolled) {
        // Embedded camera screen
        FaceCameraCapture(
            title = "Register Your Face",
            subtitle = "Center your face in the oval and hold still",
            statusText = when {
                uiState.isEnrolled -> "Face Enrolled Successfully"
                uiState.isEnrolling -> "Registering your face...."
                else -> "Hold your face steady"
            },
            isProcessing = uiState.isEnrolling,
            isSuccess = uiState.isEnrolled,
            errorMessage = uiState.errorMessage,
            onImageCaptured = { bitmap -> viewModel.onPhotoCaptured(bitmap) },
            onBack = { showCamera = false }
        )
    } else {
        Scaffold(modifier = modifier) { paddingValues ->
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
                        .size(160.dp)
                        .clip(CircleShape)
                        .background(
                            if (uiState.isEnrolled)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surfaceVariant
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (uiState.isEnrolled) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Enrolled",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(72.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Face,
                            contentDescription = "Face enrollment",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(72.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = if (uiState.isEnrolled) "Face Enrolled Successfully"
                           else "Register Your Face",
                    style = MaterialTheme.typography.headlineMedium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = if (uiState.isEnrolled)
                        "Your face has been registered. Redirecting..."
                    else
                        "Take a clear selfie to register your face. This will be used for safety verification before each drive.\n\nMake sure:\n- Your face is centered and well-lit\n- Remove sunglasses or hats\n- Look directly at the camera",
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

                if (!uiState.isEnrolled) {
                    PrimaryButton(
                        text = if (uiState.errorMessage != null) "Try Again" else "Capture Face",
                        onClick = { showCamera = true },
                        enabled = !uiState.isEnrolling,
                        isLoading = false
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
