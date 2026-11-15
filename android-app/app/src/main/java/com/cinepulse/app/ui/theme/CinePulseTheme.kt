package com.cinepulse.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object CineColors {
    val Background = Color(0xFF050505)
    val HeaderBg = Color(0xFF0D0F12)
    val Surface = Color(0xFF0A0A0A)
    val SurfaceCard = Color(0xFF121212)
    val SurfaceCardAlt = Color(0xFF16181E)
    val SurfaceElevated = Color(0xFF1B1D21)
    val SurfaceSearch = Color(0xFF22252B)
    val RedPrimary = Color(0xFFDC2626)
    val RedBright = Color(0xFFEF4444)
    val RedDark = Color(0xFF7F1D1D)
    val AccentGreen = Color(0xFF00E68A)
    val AccentTeal = Color(0xFF12D6DF)
    val Gold = Color(0xFFFBBF24)
    val TextPrimary = Color(0xFFF8FAFC)
    val TextSecondary = Color(0xFF9CA3AF)
    val BorderSubtle = Color(0x14FFFFFF)
    val BorderStrong = Color(0x26FFFFFF)
}

private val DarkScheme = darkColorScheme(
    primary = CineColors.RedPrimary,
    onPrimary = Color.White,
    secondary = CineColors.AccentGreen,
    onSecondary = Color.Black,
    background = CineColors.Background,
    onBackground = CineColors.TextPrimary,
    surface = CineColors.Surface,
    onSurface = CineColors.TextPrimary,
    surfaceVariant = CineColors.SurfaceCard,
    onSurfaceVariant = CineColors.TextSecondary,
    outline = CineColors.BorderSubtle
)

@Composable
fun CinePulseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkScheme,
        content = content
    )
}
