package com.wheelsongo.app.ui.components.inputs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.wheelsongo.app.ui.theme.WheelsOnGoBorder
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * OTP input field showing dots for each digit
 * Displays filled dots for entered digits, empty dots for remaining
 */
@Composable
fun OtpInputField(
    otpValue: String,
    modifier: Modifier = Modifier,
    otpLength: Int = 6,
    isError: Boolean = false
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(otpLength) { index ->
            val isFilled = index < otpValue.length
            OtpDot(
                isFilled = isFilled,
                isError = isError
            )
        }
    }
}

@Composable
private fun OtpDot(
    isFilled: Boolean,
    isError: Boolean
) {
    val backgroundColor = when {
        isError -> MaterialTheme.colorScheme.error
        isFilled -> MaterialTheme.colorScheme.onSurface
        else -> MaterialTheme.colorScheme.surface
    }

    val borderColor = when {
        isError -> MaterialTheme.colorScheme.error
        isFilled -> MaterialTheme.colorScheme.onSurface
        else -> WheelsOnGoBorder
    }

    Box(
        modifier = Modifier
            .size(16.dp)
            .clip(CircleShape)
            .background(backgroundColor)
            .border(
                width = 2.dp,
                color = borderColor,
                shape = CircleShape
            )
    )
}

@Preview(showBackground = true)
@Composable
private fun OtpInputFieldEmptyPreview() {
    WheelsOnGoTheme {
        OtpInputField(
            otpValue = "",
            modifier = Modifier.padding(24.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun OtpInputFieldPartialPreview() {
    WheelsOnGoTheme {
        OtpInputField(
            otpValue = "123",
            modifier = Modifier.padding(24.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun OtpInputFieldFullPreview() {
    WheelsOnGoTheme {
        OtpInputField(
            otpValue = "123456",
            modifier = Modifier.padding(24.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun OtpInputFieldErrorPreview() {
    WheelsOnGoTheme {
        OtpInputField(
            otpValue = "123456",
            isError = true,
            modifier = Modifier.padding(24.dp)
        )
    }
}
