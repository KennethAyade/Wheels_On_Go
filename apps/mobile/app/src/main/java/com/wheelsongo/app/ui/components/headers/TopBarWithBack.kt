package com.wheelsongo.app.ui.components.headers

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.wheelsongo.app.ui.theme.WheelsOnGoTheme

/**
 * Top app bar with back arrow
 * Used on screens that need navigation back
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopBarWithBack(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    CenterAlignedTopAppBar(
        title = {
            if (title.isNotEmpty()) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
            titleContentColor = MaterialTheme.colorScheme.onSurface
        ),
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
    )
}

@Preview(showBackground = true)
@Composable
private fun TopBarWithBackPreview() {
    WheelsOnGoTheme {
        TopBarWithBack(
            title = "Document Upload",
            onBack = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TopBarWithBackNoTitlePreview() {
    WheelsOnGoTheme {
        TopBarWithBack(
            title = "",
            onBack = {}
        )
    }
}
