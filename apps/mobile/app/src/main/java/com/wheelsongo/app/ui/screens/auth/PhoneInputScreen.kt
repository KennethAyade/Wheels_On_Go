package com.wheelsongo.app.ui.screens.auth

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import com.wheelsongo.app.ui.components.headers.AppHeader
import com.wheelsongo.app.ui.components.inputs.PhoneNumberField
import com.wheelsongo.app.ui.theme.WheelsOnGoTextSecondary
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Phone input screen
 * User enters their phone number to receive OTP
 */
@Composable
fun PhoneInputScreen(
    role: String,
    onBack: () -> Unit,
    onNext: (phoneNumber: String, verificationId: String?) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PhoneInputViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val activity = LocalContext.current as? Activity

    Scaffold(
        topBar = {
            AppHeader(title = "Valet&Go App")
        },
        modifier = modifier
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .imePadding()
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Title
            Text(
                text = "Join us via phone number",
                style = MaterialTheme.typography.headlineMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle
            Text(
                text = "We'll text a code to verify your number",
                style = MaterialTheme.typography.bodyMedium,
                color = WheelsOnGoTextSecondary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Phone Number Field
            PhoneNumberField(
                phoneNumber = uiState.phoneNumber,
                onPhoneNumberChange = viewModel::onPhoneNumberChange,
                countryCode = uiState.countryCode,
                countryFlag = uiState.countryFlag,
                onCountryCodeClick = {
                    // TODO: Show country picker dialog if needed
                },
                isError = uiState.errorMessage != null,
                errorMessage = uiState.errorMessage,
                onClear = if (uiState.phoneNumber.isNotEmpty()) {
                    { viewModel.onClearPhoneNumber() }
                } else null
            )

            Spacer(modifier = Modifier.weight(1f))

            // Next Button
            PrimaryButton(
                text = "Next",
                onClick = {
                    viewModel.requestOtp(role, activity) { phoneNumber, verificationId ->
                        onNext(phoneNumber, verificationId)
                    }
                },
                enabled = uiState.isValid,
                isLoading = uiState.isLoading
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun PhoneInputScreenPreview() {
    WheelsOnGoTheme {
        PhoneInputScreen(
            role = "RIDER",
            onBack = {},
            onNext = { _, _ -> }
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun PhoneInputScreenDriverPreview() {
    WheelsOnGoTheme {
        PhoneInputScreen(
            role = "DRIVER",
            onBack = {},
            onNext = { _, _ -> }
        )
    }
}
