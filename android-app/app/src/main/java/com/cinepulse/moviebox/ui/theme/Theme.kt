package com.cinepulse.moviebox.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object MbColors {
    val Background = Color(0xFF121318)
    val Surface = Color(0xFF1B1D24)
    val SurfaceElevated = Color(0xFF232630)
    val SurfaceBorder = Color(0xFF2E3240)
    val MintGreen = Color(0xFF1CE783)
    val MintGreenDark = Color(0xFF0E9F58)
    val TealResource = Color(0xFF1E4C56)
    val CyanAccent = Color(0xFF00C4FF)
    val TextPrimary = Color(0xFFFFFFFF)
    val TextSecondary = Color(0xFF9AA1B2)
    val TextMuted = Color(0xFF6B7280)
    val HotRed = Color(0xFFE50914)
    val GoldStar = Color(0xFFF5B400)
}

private val MbDarkScheme = darkColorScheme(
    primary = MbColors.MintGreen,
    onPrimary = Color(0xFF061A10),
    secondary = MbColors.CyanAccent,
    background = MbColors.Background,
    surface = MbColors.Surface,
    surfaceVariant = MbColors.SurfaceElevated,
    onBackground = MbColors.TextPrimary,
    onSurface = MbColors.TextPrimary,
    onSurfaceVariant = MbColors.TextSecondary,
    error = MbColors.HotRed,
)

@Composable
fun CinePulseMovieBoxTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MbDarkScheme,
        content = content,
    )
}
