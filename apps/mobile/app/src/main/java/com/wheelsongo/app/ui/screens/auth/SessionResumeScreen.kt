package com.wheelsongo.app.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.data.auth.BiometricPromptHelper

/**
 * Session resumption screen shown on app launch.
 *
 * Checks for existing session and either:
 * - Auto-refreshes and goes to Home (rider)
 * - Shows biometric prompt then refreshes (driver)
 * - Redirects to Welcome (no session)
 */
@Composable
fun SessionResumeScreen(
    onNavigateToHome: () -> Unit,
    onNavigateToWelcome: () -> Unit,
    onNavigateToProfileSetup: (destination: String) -> Unit = {},
    viewModel: SessionResumeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Handle navigation
    LaunchedEffect(uiState.navigateTo) {
        when (uiState.navigateTo) {
            "home" -> onNavigateToHome()
            "welcome" -> onNavigateToWelcome()
            null -> {}
            else -> onNavigateToProfileSetup(uiState.navigateTo!!)
        }
    }

    // Show biometric prompt when needed
    LaunchedEffect(uiState.needsBiometric) {
        if (uiState.needsBiometric) {
            val activity = context as? FragmentActivity
            if (activity != null && BiometricPromptHelper.canAuthenticate(context)) {
                BiometricPromptHelper.showPrompt(
                    activity = activity,
                    onSuccess = { viewModel.onBiometricSuccess() },
                    onError = { viewModel.onBiometricFailed() }
                )
            } else {
                // Device doesn't support biometric — skip and refresh directly
                viewModel.onBiometricSuccess()
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (uiState.isNetworkError) {
            // Network error state — show retry UI
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Connection Failed",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Could not reach the server. Please check your internet connection and try again.",
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = { viewModel.retryRefresh() }) {
                    Text("Retry")
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = { viewModel.onBiometricFailed() }) {
                    Text("Log out")
                }
            }
        } else {
            // Normal loading state
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Wheels On Go",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Welcome back",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(32.dp))

                if (uiState.isChecking) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(48.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}
