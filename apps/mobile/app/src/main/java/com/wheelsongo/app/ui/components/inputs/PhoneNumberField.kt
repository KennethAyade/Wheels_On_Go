package com.wheelsongo.app.ui.components.inputs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.wheelsongo.app.ui.theme.WheelsOnGoBorder
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Phone number input field with country code picker
 * Shows Philippine flag and +63 by default
 */
@Composable
fun PhoneNumberField(
    phoneNumber: String,
    onPhoneNumberChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    countryCode: String = "+63",
    countryFlag: String = "🇵🇭",
    onCountryCodeClick: () -> Unit = {},
    isError: Boolean = false,
    errorMessage: String? = null,
    onClear: (() -> Unit)? = null
) {
    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(12.dp))
                .border(
                    BorderStroke(
                        width = 1.dp,
                        color = if (isError) {
                            MaterialTheme.colorScheme.error
                        } else {
                            WheelsOnGoBorder
                        }
                    ),
                    RoundedCornerShape(12.dp)
                )
                .background(MaterialTheme.colorScheme.surface),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Country Code Section
            Row(
                modifier = Modifier
                    .clickable(onClick = onCountryCodeClick)
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Flag emoji
                Text(
                    text = countryFlag,
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.width(4.dp))
                // Dropdown indicator
                Text(
                    text = "▼",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(8.dp))
                // Country code
                Text(
                    text = countryCode,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Vertical Divider
            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(32.dp)
                    .background(WheelsOnGoBorder)
            )

            // Phone Number Input
            BasicTextField(
                value = phoneNumber,
                onValueChange = { newValue ->
                    // Only allow digits and limit to 10 characters
                    val filtered = newValue.filter { it.isDigit() }.take(10)
                    onPhoneNumberChange(filtered)
                },
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                textStyle = MaterialTheme.typography.bodyLarge.copy(
                    color = MaterialTheme.colorScheme.onSurface
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone
                ),
                singleLine = true,
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                decorationBox = { innerTextField ->
                    Box {
                        if (phoneNumber.isEmpty()) {
                            Text(
                                text = "9XX XXX XXXX",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                            )
                        }
                        innerTextField()
                    }
                }
            )

            // Clear button
            if (phoneNumber.isNotEmpty() && onClear != null) {
                IconButton(
                    onClick = onClear,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        // Error message
        if (isError && errorMessage != null) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(start = 16.dp, top = 4.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun PhoneNumberFieldEmptyPreview() {
    WheelsOnGoTheme {
        PhoneNumberField(
            phoneNumber = "",
            onPhoneNumberChange = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PhoneNumberFieldFilledPreview() {
    WheelsOnGoTheme {
        PhoneNumberField(
            phoneNumber = "9761337834",
            onPhoneNumberChange = {},
            onClear = {},
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PhoneNumberFieldErrorPreview() {
    WheelsOnGoTheme {
        PhoneNumberField(
            phoneNumber = "123",
            onPhoneNumberChange = {},
            isError = true,
            errorMessage = "Please enter a valid phone number",
            modifier = Modifier.padding(16.dp)
        )
    }
}
