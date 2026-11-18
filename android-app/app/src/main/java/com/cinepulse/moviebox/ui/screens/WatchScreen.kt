package com.cinepulse.moviebox.ui.screens

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.automirrored.filled.PlaylistAddCheck
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.cinepulse.moviebox.model.*
import com.cinepulse.moviebox.ui.components.MoviePosterCard
import com.cinepulse.moviebox.ui.theme.MbColors

@OptIn(UnstableApi::class)
@Composable
fun WatchDetailScreen(
    detail: DetailPayload?,
    stream: StreamPayload?,
    loadingDetail: Boolean,
    loadingStream: Boolean,
    error: String?,
    isInMyList: Boolean,
    onBack: () -> Unit,
    onSelectEpisode: (season: Int, episode: Int) -> Unit,
    onSelectDub: (DubOption) -> Unit,
    onToggleMyList: () -> Unit,
    onDownloadClick: (VideoSource) -> Unit,
    onOpenRelated: (MovieCard) -> Unit,
) {
    val context = LocalContext.current
    val activity = context as? Activity

    var isFullscreen by remember { mutableStateOf(false) }
    var selectedQualitySource by remember(stream) {
        mutableStateOf(
            stream?.sources?.firstOrNull { it.audio.contains("hindi", true) }
                ?: stream?.sources?.firstOrNull()
        )
    }
    var selectedSubtitle by remember(stream) {
        mutableStateOf(stream?.subtitles?.firstOrNull())
    }
    var showDubMenu by remember { mutableStateOf(false) }
    var showSubMenu by remember { mutableStateOf(false) }
    var showQualityMenu by remember { mutableStateOf(false) }
    var showInfoDialog by remember { mutableStateOf(false) }
    var activeSeason by remember(detail) {
        mutableIntStateOf(detail?.seasons?.firstOrNull() ?: 1)
    }
    var bottomTab by remember { mutableIntStateOf(0) }

    val player = remember {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("ExoPlayerLib/2.19.1")
            .setAllowCrossProtocolRedirects(true)
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
            .build()
    }

    DisposableEffect(Unit) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            player.release()
        }
    }

    LaunchedEffect(selectedQualitySource?.url, selectedSubtitle?.url) {
        val videoUrl = selectedQualitySource?.url ?: return@LaunchedEffect
        val builder = MediaItem.Builder().setUri(videoUrl)
        val sub = selectedSubtitle
        if (sub != null && sub.url.isNotBlank()) {
            val subConfig = MediaItem.SubtitleConfiguration.Builder(Uri.parse(sub.url))
                .setMimeType(MimeTypes.APPLICATION_SUBRIP)
                .setLanguage(sub.lan.ifBlank { "en" })
                .setLabel(sub.lanName)
                .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                .build()
            builder.setSubtitleConfigurations(listOf(subConfig))
        }
        player.setMediaItem(builder.build())
        player.prepare()
        player.playWhenReady = true
    }

    if (isFullscreen) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        this.player = player
                        useController = true
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )
            IconButton(
                onClick = {
                    isFullscreen = false
                    activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp),
            ) {
                Icon(Icons.Default.FullscreenExit, contentDescription = "Exit Fullscreen", tint = Color.White)
            }
        }
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top 16:9 ExoPlayer Box (Exact Screenshot #1)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .background(Color.Black),
            ) {
                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            this.player = player
                            useController = true
                            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                            layoutParams = FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT,
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                )
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                        .background(Color(0x66000000), RoundedCornerShape(20.dp)),
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                IconButton(
                    onClick = {
                        isFullscreen = true
                        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color(0x66000000), RoundedCornerShape(20.dp)),
                ) {
                    Icon(Icons.Default.Fullscreen, contentDescription = "Fullscreen", tint = Color.White)
                }
                if (loadingStream) {
                    CircularProgressIndicator(
                        color = MbColors.MintGreen,
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
            }

            if (loadingDetail && detail == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MbColors.MintGreen)
                }
                return@Column
            }

            if (error != null && detail == null) {
                Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                    Text(error, color = Color(0xFFFFA5AA), fontSize = 13.sp)
                }
                return@Column
            }

            val det = detail ?: return@Column
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 92.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = det.title,
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = "Info >",
                            color = MbColors.TextSecondary,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .clickable { showInfoDialog = true }
                                .padding(start = 8.dp),
                        )
                    }
                    Spacer(Modifier.height(5.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (det.rating.isNotBlank()) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = MbColors.GoldStar,
                                modifier = Modifier.size(14.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = det.rating,
                                color = MbColors.GoldStar,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("  |  ", color = MbColors.TextMuted, fontSize = 12.sp)
                        }
                        val metaParts = listOfNotNull(
                            det.releaseYear.takeIf { it.isNotBlank() },
                            det.country.takeIf { it.isNotBlank() },
                            det.genre.takeIf { it.isNotBlank() },
                        )
                        Text(
                            text = metaParts.joinToString("  |  "),
                            color = MbColors.TextSecondary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                // Action Pill Buttons (Add to list / Share / Download / Quality / Subtitles)
                item {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        ActionPill(
                            icon = if (isInMyList) Icons.AutoMirrored.Filled.PlaylistAddCheck else Icons.AutoMirrored.Filled.PlaylistAdd,
                            label = if (isInMyList) "Saved" else "Add to list",
                            onClick = onToggleMyList,
                        )
                        ActionPill(
                            icon = Icons.Default.Share,
                            label = "Share",
                            onClick = {
                                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                    putExtra(Intent.EXTRA_TEXT, "Watch ${det.title} on MovieBox!")
                                    type = "text/plain"
                                }
                                context.startActivity(Intent.createChooser(sendIntent, "Share Title"))
                            },
                        )
                        ActionPill(
                            icon = Icons.Default.Download,
                            label = "Download",
                            onClick = { selectedQualitySource?.let(onDownloadClick) },
                        )
                        Box {
                            ActionPill(
                                icon = Icons.Default.HighQuality,
                                label = selectedQualitySource?.let { "${it.quality}p" } ?: "Quality",
                                onClick = { showQualityMenu = true },
                            )
                            DropdownMenu(
                                expanded = showQualityMenu,
                                onDismissRequest = { showQualityMenu = false },
                            ) {
                                (stream?.sources ?: emptyList()).forEach { s ->
                                    DropdownMenuItem(
                                        text = { Text("${s.quality}p · ${s.audio}") },
                                        onClick = {
                                            selectedQualitySource = s
                                            showQualityMenu = false
                                        },
                                    )
                                }
                            }
                        }
                        if (!stream?.subtitles.isNullOrEmpty()) {
                            Box {
                                ActionPill(
                                    icon = Icons.Default.Subtitles,
                                    label = selectedSubtitle?.lanName ?: "Subtitles",
                                    onClick = { showSubMenu = true },
                                )
                                DropdownMenu(
                                    expanded = showSubMenu,
                                    onDismissRequest = { showSubMenu = false },
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Off") },
                                        onClick = {
                                            selectedSubtitle = null
                                            showSubMenu = false
                                        },
                                    )
                                    stream?.subtitles?.forEach { sub ->
                                        DropdownMenuItem(
                                            text = { Text(sub.lanName) },
                                            onClick = {
                                                selectedSubtitle = sub
                                                showSubMenu = false
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Resources & Hindi dub Dropdown (Exact Screenshot #1)
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Resources", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.width(8.dp))
                            Text("Official Direct Stream", color = MbColors.TextSecondary, fontSize = 12.sp)
                        }
                        val dubOptions = remember(stream, det) {
                            val list = stream?.availableDubs?.ifEmpty { det.dubs } ?: det.dubs
                            list
                        }
                        Box {
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MbColors.SurfaceElevated)
                                    .border(1.dp, MbColors.SurfaceBorder, RoundedCornerShape(8.dp))
                                    .clickable { showDubMenu = true }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = selectedQualitySource?.audio ?: stream?.activeAudio ?: "Original Audio",
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                )
                                Spacer(Modifier.width(6.dp))
                                Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                            DropdownMenu(
                                expanded = showDubMenu,
                                onDismissRequest = { showDubMenu = false },
                            ) {
                                // Instant switch among already-loaded Hindi/Original audio MP4 sources
                                val distinctAudios = (stream?.sources ?: emptyList()).map { it.audio }.distinct()
                                distinctAudios.forEach { aud ->
                                    DropdownMenuItem(
                                        text = { Text("⚡ $aud") },
                                        onClick = {
                                            selectedQualitySource = stream?.sources?.firstOrNull { it.audio == aud }
                                            showDubMenu = false
                                        },
                                    )
                                }
                                dubOptions.forEach { dub ->
                                    DropdownMenuItem(
                                        text = { Text(dub.label) },
                                        onClick = {
                                            showDubMenu = false
                                            onSelectDub(dub)
                                        },
                                    )
                                }
                            }
                        }

                        // Full-width Teal-Slate Resource Bar matching Screenshot #1
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(MbColors.TealResource)
                                .clickable {
                                    selectedQualitySource?.let { src ->
                                        player.seekTo(0)
                                        player.play()
                                    }
                                }
                                .padding(vertical = 13.dp, horizontal = 14.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "${det.title} (${selectedQualitySource?.quality ?: 480}p · ${selectedQualitySource?.audio ?: "MP4"})",
                                color = MbColors.MintGreen,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }

                // Seasons & Episodes if Series
                if (det.episodes.isNotEmpty()) {
                    item {
                        val seasonList = det.seasons.ifEmpty {
                            det.episodes.map { it.season }.filter { it > 0 }.distinct().sorted()
                        }
                        if (seasonList.isNotEmpty()) {
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                seasonList.forEach { s ->
                                    val active = s == activeSeason
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (active) MbColors.MintGreen else MbColors.SurfaceElevated)
                                            .clickable { activeSeason = s }
                                            .padding(horizontal = 12.dp, vertical = 6.dp),
                                    ) {
                                        Text(
                                            text = "Season $s",
                                            color = if (active) Color(0xFF041D11) else Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                        val eps = det.episodes.filter { it.season == activeSeason || it.season == 0 }
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            eps.forEach { ep ->
                                val isCur = stream?.episode == ep.number && (stream.season == ep.season || ep.season == 0)
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isCur) MbColors.MintGreen else MbColors.SurfaceElevated)
                                        .border(1.dp, if (isCur) MbColors.MintGreen else MbColors.SurfaceBorder, RoundedCornerShape(8.dp))
                                        .clickable { onSelectEpisode(ep.season.coerceAtLeast(1), ep.number.coerceAtLeast(1)) }
                                        .padding(horizontal = 14.dp, vertical = 9.dp),
                                ) {
                                    Text(
                                        text = "E${ep.number}",
                                        color = if (isCur) Color(0xFF041D11) else Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }

                // For you / Info Tab Bar (Exact Screenshot #1)
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                        listOf("For you", "Details").forEachIndexed { idx, lbl ->
                            Column(modifier = Modifier.clickable { bottomTab = idx }) {
                                Text(
                                    text = lbl,
                                    color = if (bottomTab == idx) Color.White else MbColors.TextSecondary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                Spacer(Modifier.height(4.dp))
                                Box(
                                    modifier = Modifier
                                        .width(26.dp)
                                        .height(3.dp)
                                        .background(if (bottomTab == idx) Color.White else Color.Transparent),
                                )
                            }
                        }
                    }
                }

                if (bottomTab == 0) {
                    val rows = det.relatedMovies.chunked(3)
                    items(rows.size) { rIdx ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            rows[rIdx].forEach { rel ->
                                Box(modifier = Modifier.weight(1f)) {
                                    MoviePosterCard(
                                        item = rel,
                                        onClick = { onOpenRelated(rel) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                }
                            }
                            repeat(3 - rows[rIdx].size) {
                                Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    item {
                        Text(
                            text = det.description.ifBlank { "No description available." },
                            color = MbColors.TextSecondary,
                            fontSize = 13.sp,
                            lineHeight = 20.sp,
                        )
                    }
                }
            }
        }

        // Floating Bright Mint Download Pill Button (Exact Screenshot #1)
        Button(
            onClick = { selectedQualitySource?.let(onDownloadClick) },
            enabled = selectedQualitySource != null,
            shape = RoundedCornerShape(26.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MbColors.MintGreen,
                contentColor = Color(0xFF041D11),
            ),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 18.dp)
                .height(48.dp),
        ) {
            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Download", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }

    if (showInfoDialog && detail != null) {
        AlertDialog(
            onDismissRequest = { showInfoDialog = false },
            containerColor = MbColors.Surface,
            title = { Text(detail.title, color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    detail.description.ifBlank { "${detail.genre} · ${detail.country} · ${detail.releaseYear}" },
                    color = MbColors.TextSecondary,
                    fontSize = 13.sp,
                )
            },
            confirmButton = {
                TextButton(onClick = { showInfoDialog = false }) {
                    Text("Close", color = MbColors.MintGreen)
                }
            },
        )
    }
}

@Composable
private fun ActionPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(MbColors.SurfaceElevated)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}
