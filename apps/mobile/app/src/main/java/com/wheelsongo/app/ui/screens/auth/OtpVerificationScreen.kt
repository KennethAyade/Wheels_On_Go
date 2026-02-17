package com.wheelsongo.app.ui.screens.auth

import android.content.pm.PackageManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

import com.wheelsongo.app.ui.components.NumericKeypad
import com.wheelsongo.app.ui.components.headers.TopBarWithBack
import com.wheelsongo.app.ui.components.inputs.OtpInputField
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * OTP verification screen
 * User enters the 6-digit code sent to their phone
 */
@Composable
fun OtpVerificationScreen(
    phoneNumber: String,
    role: String,
    verificationId: String? = null,
    onBack: () -> Unit,
    onVerified: (needsKyc: Boolean) -> Unit,
    onBiometricRequired: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: OtpVerificationViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Start countdown on first composition
    LaunchedEffect(Unit) {
        viewModel.startCountdown()
    }

    // Navigate when verified - route to biometric if required
    LaunchedEffect(uiState.isVerified, uiState.biometricRequired) {
        if (uiState.isVerified) {
            if (uiState.biometricRequired && context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
                // Returning driver — proceed with camera-based face verification
                onBiometricRequired()
            } else {
                // Not required — OTP is sufficient
                val needsKyc = uiState.userRole == "DRIVER" && !uiState.biometricEnrolled
                onVerified(needsKyc)
            }
        }
    }

    Scaffold(
        topBar = {
            TopBarWithBack(
                title = "",
                onBack = onBack
            )
        },
        modifier = modifier
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Info banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .padding(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // App icon placeholder
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "V",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }

                    Column(
                        modifier = Modifier.padding(start = 12.dp)
                    ) {
                        Text(
                            text = "Valet&Go",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "Check your SMS for the verification code",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Title
            Text(
                text = "Enter the code",
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle with phone number
            Text(
                text = "We have sent you a verification code to",
                style = MaterialTheme.typography.bodyMedium,
                color = WheelsOnGoTextSecondary,
                textAlign = TextAlign.Center
            )
            Text(
                text = phoneNumber,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            // OTP Input Dots
            if (uiState.isLoading) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(horizontal = 24.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(48.dp),
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = 4.dp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Verifying with server...",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "This may take up to a minute on first login.\nPlease wait...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                OtpInputField(
                    otpValue = uiState.otpValue,
                    isError = uiState.errorMessage != null,
                    modifier = Modifier.padding(horizontal = 48.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Error message
            if (uiState.errorMessage != null) {
                Text(
                    text = uiState.errorMessage!!,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Countdown Timer / Resend
            if (uiState.canResend) {
                Text(
                    text = "Resend code",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .clickable { viewModel.resendOtp(phoneNumber, role) }
                        .padding(16.dp)
                )
            } else {
                Text(
                    text = "You can request code again in ${uiState.countdownSeconds}s",
                    style = MaterialTheme.typography.bodyMedium,
                    color = WheelsOnGoTextSecondary
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Numeric Keypad
            NumericKeypad(
                onNumberClick = { digit ->
                    viewModel.onDigitEntered(digit, phoneNumber, role, verificationId)
                },
                onBackspaceClick = viewModel::onBackspace,
                modifier = Modifier.padding(bottom = 24.dp)
            )
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun OtpVerificationScreenPreview() {
    WheelsOnGoTheme {
        OtpVerificationScreen(
            phoneNumber = "+639761337834",
            role = "RIDER",
            onBack = {},
            onVerified = { _ -> }
        )
    }
}
