package com.wheelsongo.app.ui.screens.location

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.wheelsongo.app.R
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.buttons.WheelsOutlinedButton
import com.wheelsongo.app.ui.components.headers.TopBarWithBack
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Location confirmation screen
 * Asks user if they are in Metro Manila service area
 */
@Composable
fun LocationConfirmScreen(
    onBack: () -> Unit,
    onConfirmMetroManila: () -> Unit,
    onNotInMetroManila: () -> Unit,
    modifier: Modifier = Modifier
) {
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
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // Map pin illustration
            Image(
                painter = painterResource(id = R.drawable.ic_map_pin_illustration),
                contentDescription = "Location illustration",
                modifier = Modifier.size(180.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Title
            Text(
                text = "Are you in Metro Manila?",
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Subtitle
            Text(
                text = "Our services are currently available\nin Metro Manila area only",
                style = MaterialTheme.typography.bodyMedium,
                color = WheelsOnGoTextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.weight(1f))

            // Yes, I'm here button (primary)
            PrimaryButton(
                text = "Yes, I'm here",
                onClick = onConfirmMetroManila
            )

            Spacer(modifier = Modifier.height(12.dp))

            // No button (outlined)
            WheelsOutlinedButton(
                text = "No",
                onClick = onNotInMetroManila
            )

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun LocationConfirmScreenPreview() {
    WheelsOnGoTheme {
        LocationConfirmScreen(
            onBack = {},
            onConfirmMetroManila = {},
            onNotInMetroManila = {}
        )
    }
}
