package com.wheelsongo.app.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Navigation drawer content for the app.
 * Shows user info, role-specific menu items, and logout.
 */
@Composable
fun AppDrawer(
    userRole: String?,
    phoneNumber: String?,
    onMyDocuments: () -> Unit = {},
    onLogout: () -> Unit
) {
    ModalDrawerSheet {
        Spacer(modifier = Modifier.height(24.dp))

        // Header
        Text(
            text = "Wheels On Go",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 24.dp)
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Phone number
        if (phoneNumber != null) {
            Text(
                text = phoneNumber,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }

        // Role chip
        if (userRole != null) {
            Text(
                text = userRole,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(8.dp))

        // My Documents — only for drivers
        if (userRole == "DRIVER") {
            NavigationDrawerItem(
                icon = { Icon(Icons.Default.Description, contentDescription = null) },
                label = { Text("My Documents") },
                selected = false,
                onClick = onMyDocuments,
                modifier = Modifier.padding(horizontal = 12.dp)
            )
        }

        // Logout
        NavigationDrawerItem(
            icon = { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null) },
            label = { Text("Logout") },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(horizontal = 12.dp)
        )
    }
}
