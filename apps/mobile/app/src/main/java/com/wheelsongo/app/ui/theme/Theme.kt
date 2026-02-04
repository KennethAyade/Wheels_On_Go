package com.wheelsongo.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Wheels On Go Light Color Scheme
 * Uses brand colors defined in Color.kt
 */
private val WheelsOnGoLightColorScheme = lightColorScheme(
    // Primary colors
    primary = WheelsOnGoPrimary,
    onPrimary = WheelsOnGoTextOnPrimary,
    primaryContainer = WheelsOnGoPrimaryContainer,
    onPrimaryContainer = WheelsOnGoPrimaryDark,

    // Secondary colors (using primary for consistency)
    secondary = WheelsOnGoPrimary,
    onSecondary = WheelsOnGoTextOnPrimary,
    secondaryContainer = WheelsOnGoPrimaryLight,
    onSecondaryContainer = WheelsOnGoPrimaryDark,

    // Tertiary colors
    tertiary = WheelsOnGoInfo,
    onTertiary = WheelsOnGoWhite,

    // Background colors
    background = WheelsOnGoBackground,
    onBackground = WheelsOnGoTextPrimary,

    // Surface colors
    surface = WheelsOnGoSurface,
    onSurface = WheelsOnGoTextPrimary,
    surfaceVariant = WheelsOnGoSurfaceVariant,
    onSurfaceVariant = WheelsOnGoTextSecondary,

    // Error colors
    error = WheelsOnGoError,
    onError = WheelsOnGoWhite,
    errorContainer = WheelsOnGoErrorLight,
    onErrorContainer = WheelsOnGoError,

    // Outline colors
    outline = WheelsOnGoBorder,
    outlineVariant = WheelsOnGoDivider,

    // Inverse colors (for snackbars, etc.)
    inverseSurface = WheelsOnGoTextPrimary,
    inverseOnSurface = WheelsOnGoWhite,
    inversePrimary = WheelsOnGoPrimaryLight,

    // Scrim
    scrim = WheelsOnGoScrim
)

/**
 * Wheels On Go Theme
 * Applies brand colors, typography, and system UI styling
 */
@Composable
fun WheelsOnGoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // Currently only supporting light theme
    val colorScheme = WheelsOnGoLightColorScheme

    // Set status bar color
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            // Make status bar transparent for edge-to-edge design
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            // Use dark icons on light background
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = WheelsOnGoTypography,
        content = content
    )
}
