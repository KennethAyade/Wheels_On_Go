package com.wheelsongo.app.ui.screens.welcome

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wheelsongo.app.R
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.buttons.WheelsOutlinedButton
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary

/**
 * Welcome screen - the app's entry point
 * Shows logo and role selection buttons (Driver/User)
 */
@Composable
fun WelcomeScreen(
    onLoginAsDriver: () -> Unit,
    onLoginAsUser: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // App logo
            Image(
                painter = painterResource(id = R.drawable.logo),
                contentDescription = "Wheels On Go Logo",
                modifier = Modifier.size(160.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // App Name - "WHEELS" in green
            Text(
                text = "WHEELS",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                ),
                color = MaterialTheme.colorScheme.primary
            )

            // "ON GO" subtitle
            Text(
                text = "ON GO",
                style = MaterialTheme.typography.titleMedium.copy(
                    letterSpacing = 4.sp
                ),
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Welcome text
            Text(
                text = "Welcome to Wheels on Go App",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Tagline
            Text(
                text = "Rides that are right for you",
                style = MaterialTheme.typography.bodyLarge,
                color = WheelsOnGoTextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.weight(1f))

            // Login as Driver button (outlined)
            WheelsOutlinedButton(
                text = "Login as Driver",
                onClick = onLoginAsDriver
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Login as User button (filled)
            PrimaryButton(
                text = "Login as User",
                onClick = onLoginAsUser
            )

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun WelcomeScreenPreview() {
    WheelsOnGoTheme {
        WelcomeScreen(
            onLoginAsDriver = {},
            onLoginAsUser = {}
        )
    }
}
