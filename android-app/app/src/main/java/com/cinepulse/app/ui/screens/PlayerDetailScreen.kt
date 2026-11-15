package com.cinepulse.app.ui.screens

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.media.AudioManager
import android.media.audiofx.LoudnessEnhancer
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.cinepulse.app.data.*
import com.cinepulse.app.network.SecurityShield
import com.cinepulse.app.network.SubtitleEngine
import com.cinepulse.app.ui.CinePulseViewModel
import com.cinepulse.app.ui.theme.CineColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import kotlin.math.abs

@OptIn(UnstableApi::class)
@Composable
fun PlayerDetailScreen(
    movie: MovieCardItem,
    vm: CinePulseViewModel,
    isInPipMode: Boolean,
    onPipEligibilityChanged: (Boolean) -> Unit,
    onRequestEnterPip: () -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val view = LocalView.current
    val scope = rememberCoroutineScope()

    var activeMovie by remember(movie.path) { mutableStateOf(movie) }
    var retryTrigger by remember(movie.path) { mutableIntStateOf(0) }
    var detail by remember(movie.path) { mutableStateOf<MovieDetailData?>(null) }
    var isLoadingDetail by remember(movie.path) { mutableStateOf(true) }
    var detailError by remember(movie.path) { mutableStateOf("") }

    // Episode & Source Selection
    var selectedEpIdx by remember(movie.path) { mutableIntStateOf(0) }
    var selectedSourceIdx by remember(movie.path) { mutableIntStateOf(0) }
    var selectedSeasonFilter by remember(movie.path) { mutableStateOf<Int?>(null) }
    var pendingResumeSeekMs by remember(movie.path) { mutableLongStateOf(0L) }
    var didEnrichRetry by remember(movie.path) { mutableStateOf(false) }

    // Inline Panels & Modals (1:1 Website)
    var showSoundBoostBar by remember { mutableStateOf(false) }
    var showSubSyncPanel by remember { mutableStateOf(false) }
    var showQualityBar by remember { mutableStateOf(false) }
    var showDubDropdown by remember { mutableStateOf(false) }
    var showSeasonDropdown by remember { mutableStateOf(false) }
    var showAllEpisodesModal by remember { mutableStateOf(false) }
    var showDownloadSheet by remember { mutableStateOf(false) }
    var showSettingsDrawer by remember { mutableStateOf(false) }
    var lightboxImage by remember { mutableStateOf<String?>(null) }
    var copiedShare by remember { mutableStateOf(false) }

    // Bottom Tab State: "forYou" | "infoCast" | "reviews"
    var bottomTab by remember(movie.path) { mutableStateOf("forYou") }

    // Reviews State
    val reviewKey = activeMovie.path.ifEmpty { activeMovie.title }
    var customReviews by remember(reviewKey) { mutableStateOf(vm.getCustomReviewsForMovie(reviewKey)) }
    var userStars by remember { mutableIntStateOf(5) }
    var reviewAuthor by remember { mutableStateOf("") }
    var reviewText by remember { mutableStateOf("") }

    // Playback State
    var isPlaying by remember { mutableStateOf(false) }
    var isBuffering by remember { mutableStateOf(true) }
    var hasFirstFrame by remember(movie.path) { mutableStateOf(false) }
    var playerErrorText by remember { mutableStateOf("") }
    var currentPosMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }

    // Controls & Modes
    var showControls by remember { mutableStateOf(true) }
    var isLocked by remember { mutableStateOf(false) }
    var isFullscreen by remember { mutableStateOf(false) }
    var resizeMode by remember { mutableIntStateOf(AspectRatioFrameLayout.RESIZE_MODE_FIT) }
    var playbackSpeed by remember { mutableFloatStateOf(1.0f) }
    var soundBoostPct by remember { mutableIntStateOf(vm.soundBoostPct) }
    var brightnessPct by remember { mutableIntStateOf(vm.brightnessPct) }
    var is2xHold by remember { mutableStateOf(false) }
    var gestureHudText by remember { mutableStateOf("") }

    // Subtitles State
    var availableSubs by remember(movie.path) { mutableStateOf<List<SubtitleTrackOption>>(emptyList()) }
    var activeSubTrack by remember(movie.path) { mutableStateOf<SubtitleTrackOption?>(null) }
    var subCues by remember(movie.path) { mutableStateOf<List<SubtitleCue>>(emptyList()) }
    var subEnabled by remember(movie.path) { mutableStateOf(vm.autoBanglaSubDefault) }
    var isTranslatingSub by remember { mutableStateOf(false) }

    // Build OkHttpClient enforcing Chrome UA + Security Shield headers
    val streamHttpClient = remember {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(35, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .addInterceptor { chain ->
                val orig = chain.request()
                val reqBuilder = orig.newBuilder()
                    .header("User-Agent", SecurityShield.ANDROID_CHROME_UA)
                if (orig.url.host.contains("playlive.zeroo.click", ignoreCase = true)) {
                    val relPath = orig.url.encodedPath + (orig.url.encodedQuery?.let { "?$it" } ?: "")
                    SecurityShield.buildSecurityHeaders(relPath).forEach { (k, v) -> reqBuilder.header(k, v) }
                }
                chain.proceed(reqBuilder.build())
            }
            .build()
    }

    val exoPlayer = remember {
        val dataSourceFactory = OkHttpDataSource.Factory(streamHttpClient)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(12_000, 50_000, 1_200, 2_500)
            .build()
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
            .setLoadControl(loadControl)
            .build()
            .apply {
                playWhenReady = true
            }
    }

    var loudnessEnhancer by remember { mutableStateOf<LoudnessEnhancer?>(null) }
    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    val maxSystemVol = remember { audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1) }

    fun applySoundBoost(pct: Int, sessionId: Int = exoPlayer.audioSessionId) {
        val clamped = pct.coerceIn(0, 400)
        soundBoostPct = clamped
        vm.updateSoundBoostPct(clamped)

        // Apply base 0..100% smoothly via ExoPlayer volume, and 101..400% via LoudnessEnhancer
        exoPlayer.volume = (clamped / 100f).coerceIn(0f, 1f)
        if (clamped >= 100) {
            val minTargetVol = (maxSystemVol * 0.7f).toInt().coerceAtLeast(1)
            val currVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            if (clamped > 100 && currVol < minTargetVol) {
                runCatching { audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxSystemVol, 0) }
            }
        }
        if (sessionId != C.AUDIO_SESSION_ID_UNSET && sessionId != 0) {
            runCatching {
                if (loudnessEnhancer == null) {
                    loudnessEnhancer = LoudnessEnhancer(sessionId)
                }
                val gainMb = ((clamped - 100) * 18).coerceIn(0, 5400)
                loudnessEnhancer?.setTargetGain(gainMb)
                loudnessEnhancer?.enabled = gainMb > 0
            }
        }
    }

    fun applyBrightness(pct: Int) {
        val clamped = pct.coerceIn(20, 160)
        brightnessPct = clamped
        vm.updateBrightnessPct(clamped)
        activity?.window?.let { w ->
            val lp = w.attributes
            lp.screenBrightness = (clamped / 100f).coerceIn(0.08f, 1.0f)
            w.attributes = lp
        }
    }

    val activeEpisode = detail?.episodes?.getOrNull(selectedEpIdx)
    val activeSource = activeEpisode?.sources?.getOrNull(selectedSourceIdx)

    fun flushProgress() {
        val d = detail ?: return
        val posSec = (exoPlayer.currentPosition / 1000L).toInt()
        val durSec = (exoPlayer.duration.coerceAtLeast(0L) / 1000L).toInt()
        if (posSec >= 4 || durSec > 0) {
            vm.recordWatchProgress(
                movie = activeMovie.copy(title = d.title.ifEmpty { activeMovie.title }, poster = d.poster.ifEmpty { activeMovie.poster }),
                episode = activeEpisode,
                episodeIdx = selectedEpIdx,
                source = activeSource,
                seconds = posSec,
                durationSec = durSec
            )
        }
    }

    // Load Movie Details
    LaunchedEffect(activeMovie.path, retryTrigger, vm.activeNodeId) {
        isLoadingDetail = true
        detailError = ""
        didEnrichRetry = false
        hasFirstFrame = false
        val fetched = runCatching {
            vm.api.fetchDetails(activeMovie.path, activeMovie.title, vm.activeNodeId, enrich = false)
        }.getOrNull()
        if (fetched == null) {
            detailError = "সার্ভার থেকে ভিডিওর তথ্য পাওয়া যায়নি।"
            isLoadingDetail = false
            return@LaunchedEffect
        }
        detail = fetched
        isLoadingDetail = false

        val saved = vm.getSavedProgress(activeMovie.path)
        var targetEpIdx = 0
        if (saved != null && fetched.episodes.isNotEmpty()) {
            val idxById = if (saved.episodeId.isNotEmpty()) fetched.episodes.indexOfFirst { it.id == saved.episodeId } else -1
            targetEpIdx = when {
                idxById >= 0 -> idxById
                saved.episodeIdx in fetched.episodes.indices -> saved.episodeIdx
                else -> 0
            }
            if (saved.progressSeconds >= 4) pendingResumeSeekMs = saved.progressSeconds * 1000L
        }
        selectedEpIdx = targetEpIdx
        val ep = fetched.episodes.getOrNull(targetEpIdx)
        selectedSeasonFilter = ep?.season
        val targetQ = saved?.quality ?: vm.preferredQuality
        val sources = ep?.sources.orEmpty()
        val bestIdx = sources.indexOfFirst { it.quality == targetQ }.let { if (it >= 0) it else 0 }
        selectedSourceIdx = bestIdx
    }

    // Load MediaItem whenever activeSource URL changes
    LaunchedEffect(activeSource?.url) {
        val src = activeSource ?: return@LaunchedEffect
        val streamUrl = SecurityShield.cloakStreamUrl(src.url)
        if (streamUrl.isEmpty()) return@LaunchedEffect

        playerErrorText = ""
        isBuffering = true
        exoPlayer.stop()
        exoPlayer.clearMediaItems()
        exoPlayer.setMediaItem(MediaItem.fromUri(streamUrl))
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true
    }

    // Auto-Load Captions & Bangla Subtitle Translation per Episode
    LaunchedEffect(activeMovie.path, selectedEpIdx, detail?.title) {
        val d = detail ?: return@LaunchedEffect
        val ep = d.episodes.getOrNull(selectedEpIdx) ?: return@LaunchedEffect
        val se = ep.season ?: 1
        val epNum = ep.number ?: (selectedEpIdx + 1)
        val tracks = runCatching { vm.api.fetchCaptions(activeMovie.path, se, epNum) }.getOrDefault(emptyList())
        availableSubs = tracks
        if (tracks.isNotEmpty() && subEnabled) {
            val picked = tracks.firstOrNull { it.isBengaliNative }
                ?: tracks.firstOrNull { it.langCode.startsWith("en", true) }
                ?: tracks.first()
            activeSubTrack = picked
            val rawSrt = runCatching { vm.api.fetchSubtitleText(picked.url) }.getOrDefault("")
            val parsed = SubtitleEngine.parseSrtOrVtt(rawSrt)
            subCues = if (picked.isBengaliNative || parsed.isEmpty()) {
                parsed
            } else {
                isTranslatingSub = true
                val tr = SubtitleEngine.translateBatchToBangla(vm.api.httpClient, parsed, exoPlayer.currentPosition)
                isTranslatingSub = false
                tr
            }
        } else {
            activeSubTrack = null
            subCues = emptyList()
        }
    }

    // ExoPlayer Listener + Failover + Auto-Next Ep
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) {
                    hasFirstFrame = true
                    durationMs = exoPlayer.duration.coerceAtLeast(0L)
                    if (pendingResumeSeekMs > 0L) {
                        val safeSeek = if (durationMs > 0L) pendingResumeSeekMs.coerceAtMost(durationMs - 2000L).coerceAtLeast(0L) else pendingResumeSeekMs
                        exoPlayer.seekTo(safeSeek)
                        pendingResumeSeekMs = 0L
                    }
                    applySoundBoost(soundBoostPct, exoPlayer.audioSessionId)
                } else if (playbackState == Player.STATE_ENDED && vm.autoNextEp) {
                    val eps = detail?.episodes.orEmpty()
                    if (selectedEpIdx + 1 < eps.size) {
                        flushProgress()
                        pendingResumeSeekMs = 0L
                        selectedEpIdx += 1
                        selectedSourceIdx = 0
                    }
                }
            }

            override fun onRenderedFirstFrame() {
                hasFirstFrame = true
                isBuffering = false
            }

            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
                onPipEligibilityChanged(playing)
                if (!playing) flushProgress()
            }

            override fun onAudioSessionIdChanged(audioSessionId: Int) {
                applySoundBoost(soundBoostPct, audioSessionId)
            }

            override fun onPlayerError(error: PlaybackException) {
                val sources = activeEpisode?.sources.orEmpty()
                if (selectedSourceIdx + 1 < sources.size) {
                    selectedSourceIdx += 1
                    playerErrorText = "অন্য সার্ভারে সুইচ করা হচ্ছে..."
                } else if (!didEnrichRetry) {
                    didEnrichRetry = true
                    playerErrorText = "নতুন লিংক খোঁজা হচ্ছে..."
                    scope.launch {
                        val enriched = runCatching {
                            vm.api.fetchDetails(activeMovie.path, activeMovie.title, vm.activeNodeId, enrich = true)
                        }.getOrNull()
                        if (enriched != null && enriched.episodes.isNotEmpty()) {
                            detail = enriched
                            selectedSourceIdx = 0
                        } else {
                            playerErrorText = "ভিডিও প্লে ব্যর্থ হয়েছে। অন্য সার্ভার বা এপিসোড চেষ্টা করুন।"
                            isBuffering = false
                        }
                    }
                } else {
                    playerErrorText = "সার্ভার কানেক্ট করা যায়নি (${error.errorCodeName})।"
                    isBuffering = false
                }
            }
        }
        exoPlayer.addListener(listener)
        applyBrightness(brightnessPct)
        onDispose {
            flushProgress()
            onPipEligibilityChanged(false)
            exoPlayer.removeListener(listener)
            runCatching { loudnessEnhancer?.release() }
            exoPlayer.release()
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            activity?.window?.let { w ->
                val lp = w.attributes
                lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                w.attributes = lp
                WindowCompat.getInsetsController(w, view).show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    // Periodic Progress Ticker & Subtitle Batch Translator
    LaunchedEffect(exoPlayer, isPlaying) {
        var tick = 0
        while (true) {
            currentPosMs = exoPlayer.currentPosition.coerceAtLeast(0L)
            durationMs = exoPlayer.duration.coerceAtLeast(0L)
            if (isPlaying && tick % 6 == 0) {
                flushProgress()
                val trk = activeSubTrack
                if (subEnabled && trk != null && !trk.isBengaliNative && subCues.isNotEmpty() && !isTranslatingSub) {
                    val needsMore = subCues.any { it.banglaText.isEmpty() && it.endMs >= currentPosMs && it.startMs <= (currentPosMs + 60_000L) }
                    if (needsMore) {
                        isTranslatingSub = true
                        subCues = SubtitleEngine.translateBatchToBangla(vm.api.httpClient, subCues, currentPosMs)
                        isTranslatingSub = false
                    }
                }
            }
            tick++
            delay(500)
        }
    }

    LaunchedEffect(showControls, isPlaying, isLocked, showSettingsDrawer) {
        if (showControls && isPlaying && !isLocked && !showSettingsDrawer) {
            delay(3500)
            showControls = false
        }
    }

    LaunchedEffect(isFullscreen) {
        val w = activity?.window ?: return@LaunchedEffect
        val controller = WindowCompat.getInsetsController(w, view)
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        if (isFullscreen) {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }

    BackHandler {
        when {
            lightboxImage != null -> lightboxImage = null
            showAllEpisodesModal -> showAllEpisodesModal = false
            showDownloadSheet -> showDownloadSheet = false
            showSettingsDrawer -> showSettingsDrawer = false
            isFullscreen -> isFullscreen = false
            else -> {
                flushProgress()
                onClose()
            }
        }
    }

    val activeSubLine = remember(subCues, currentPosMs, subEnabled) {
        if (!subEnabled || subCues.isEmpty()) "" else SubtitleEngine.findCueAtTime(subCues, currentPosMs)
    }

    val horizontalEpListState = rememberLazyListState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineColors.Background)
            .let { if (!isFullscreen && !isInPipMode) it.statusBarsPadding() else it }
    ) {
        // TOP NAVBAR LOCKED ABOVE 16:9 PLAYER (Exact match to Screenshot)
        if (!isFullscreen && !isInPipMode) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0A0A0A))
                    .padding(horizontal = 10.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF151515))
                            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable {
                                flushProgress()
                                onClose()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.ChevronLeft, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(22.dp))
                    }

                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(RoundedCornerShape(7.dp))
                                .background(CineColors.RedPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        }
                        Text("CINE", color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                        Text("PULSE", color = CineColors.RedPrimary, fontWeight = FontWeight.Black, fontSize = 14.sp)
                    }
                }

                val inWl = vm.isInWatchlist(activeMovie)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TopIconBtn(
                        icon = Icons.Filled.PlaylistAdd,
                        active = inWl,
                        onClick = {
                            vm.toggleWatchlist(
                                activeMovie.copy(
                                    title = detail?.title ?: activeMovie.title,
                                    poster = detail?.poster?.ifEmpty { activeMovie.poster } ?: activeMovie.poster
                                )
                            )
                        }
                    )
                    TopIconBtn(
                        icon = Icons.Filled.Share,
                        active = false,
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "CinePulse-এ দেখুন: ${detail?.title ?: activeMovie.title}\n${SecurityShield.BASE_URL}")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Movie"))
                        }
                    )
                    TopIconBtn(
                        icon = Icons.Filled.Settings,
                        active = showSettingsDrawer,
                        onClick = { showSettingsDrawer = !showSettingsDrawer }
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        TopIconBtn(
                            icon = Icons.Filled.PictureInPictureAlt,
                            active = false,
                            onClick = onRequestEnterPip
                        )
                    }
                }
            }
        }

        // 16:9 VIDEO STAGE
        var playerBoxSize by remember { mutableStateOf(IntSize.Zero) }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .let { if (isFullscreen || isInPipMode) it.fillMaxSize() else it.aspectRatio(16f / 9f) }
                .background(Color.Black)
                .onSizeChanged { playerBoxSize = it }
                .pointerInput(isLocked, isInPipMode) {
                    if (isInPipMode) return@pointerInput
                    detectTapGestures(
                        onTap = { showControls = !showControls },
                        onDoubleTap = { offset ->
                            if (isLocked) return@detectTapGestures
                            val isRight = offset.x > playerBoxSize.width / 2f
                            if (isRight) {
                                exoPlayer.seekTo((exoPlayer.currentPosition + 10_000L).coerceAtMost(durationMs.coerceAtLeast(Long.MAX_VALUE)))
                                gestureHudText = "+10s Forward"
                            } else {
                                exoPlayer.seekTo((exoPlayer.currentPosition - 10_000L).coerceAtLeast(0L))
                                gestureHudText = "-10s Rewind"
                            }
                            scope.launch {
                                delay(850)
                                gestureHudText = ""
                            }
                        },
                        onLongPress = {
                            if (isLocked) return@detectLongPress
                            is2xHold = true
                            exoPlayer.playbackParameters = PlaybackParameters(2.0f)
                            gestureHudText = "2.0x Speed Boost"
                        },
                        onPress = {
                            tryAwaitRelease()
                            if (is2xHold) {
                                is2xHold = false
                                exoPlayer.playbackParameters = PlaybackParameters(playbackSpeed)
                                gestureHudText = ""
                            }
                        }
                    )
                }
                .pointerInput(isLocked, isInPipMode) {
                    if (isInPipMode || isLocked) return@pointerInput
                    var dragStartX = 0f
                    var accumY = 0f
                    detectDragGestures(
                        onDragStart = { start ->
                            dragStartX = start.x
                            accumY = 0f
                        },
                        onDragEnd = {
                            scope.launch {
                                delay(700)
                                gestureHudText = ""
                            }
                        },
                        onDrag = { change, dragAmount ->
                            if (abs(dragAmount.y) > abs(dragAmount.x)) {
                                change.consume()
                                accumY += dragAmount.y
                                val isLeftSide = dragStartX <= playerBoxSize.width / 2f
                                if (isLeftSide) {
                                    // Left swipe -> Sound & Ultra Sound Boost (0% to 400%)
                                    val deltaPct = (-dragAmount.y / (playerBoxSize.height.coerceAtLeast(250) * 0.6f)) * 200f
                                    val nextPct = (soundBoostPct + deltaPct).toInt().coerceIn(0, 400)
                                    applySoundBoost(nextPct)
                                    gestureHudText = if (nextPct > 100) "🔥 Ultra Sound Boost $nextPct%" else "🔊 Sound: $nextPct%"
                                } else {
                                    // Right swipe -> Brightness (20% to 160%)
                                    val deltaB = (-dragAmount.y / (playerBoxSize.height.coerceAtLeast(250) * 0.7f)) * 100f
                                    val nextB = (brightnessPct + deltaB).toInt().coerceIn(20, 160)
                                    applyBrightness(nextB)
                                    gestureHudText = "☀️ Brightness: $nextB%"
                                }
                            }
                        }
                    )
                }
        ) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        player = exoPlayer
                        this.resizeMode = resizeMode
                    }
                },
                update = { pv ->
                    if (pv.player !== exoPlayer) pv.player = exoPlayer
                    pv.resizeMode = resizeMode
                },
                modifier = Modifier.fillMaxSize()
            )

            // Blurred Poster Placeholder until first video frame arrives (Matches Screenshot!)
            if (!hasFirstFrame) {
                AsyncImage(
                    model = detail?.poster?.ifEmpty { activeMovie.poster } ?: activeMovie.poster,
                    contentDescription = activeMovie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .blur(18.dp)
                        .alpha(0.55f)
                )
            }

            // Subtitle Overlay
            if (activeSubLine.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 14.dp, vertical = if (showControls && !isInPipMode) 48.dp else 10.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Black.copy(alpha = 0.74f))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = activeSubLine,
                        color = Color.White,
                        fontSize = if (isFullscreen) 15.sp else 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // "Starting Stream..." / Error Overlay (Exact Match to Screenshot)
            if (!isInPipMode && (isBuffering || !hasFirstFrame || playerErrorText.isNotEmpty())) {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.Black.copy(alpha = 0.78f))
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (playerErrorText.isEmpty()) {
                        CircularProgressIndicator(color = CineColors.RedPrimary, modifier = Modifier.size(30.dp), strokeWidth = 3.dp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Starting Stream...", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    } else {
                        Icon(Icons.Filled.Warning, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(26.dp))
                        Spacer(modifier = Modifier.height(5.dp))
                        Text(playerErrorText, color = Color.White, fontSize = 11.5.sp, textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    playerErrorText = ""
                                    exoPlayer.prepare()
                                    exoPlayer.playWhenReady = true
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 5.dp)
                            ) {
                                Text("Play Now", fontSize = 11.sp)
                            }
                            if ((activeEpisode?.sources?.size ?: 0) > 1) {
                                OutlinedButton(
                                    onClick = {
                                        val total = activeEpisode?.sources?.size ?: 1
                                        selectedSourceIdx = (selectedSourceIdx + 1) % total
                                    },
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 5.dp)
                                ) {
                                    Text("Switch Server", color = Color.White, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }

            // Gesture Feedback Pill
            if (!isInPipMode && gestureHudText.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 14.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.82f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(gestureHudText, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Single-Row Bottom Video Controls Bar (Exact Website Match)
            AnimatedVisibility(
                visible = showControls && !isInPipMode,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.fillMaxSize()
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    if (isLocked) {
                        IconButton(
                            onClick = { isLocked = false },
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .padding(12.dp)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.72f))
                        ) {
                            Icon(Icons.Filled.LockOpen, contentDescription = "Unlock", tint = Color.White)
                        }
                    } else {
                        if (isFullscreen) {
                            Row(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .fillMaxWidth()
                                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.75f), Color.Transparent)))
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(onClick = { isFullscreen = false }) {
                                    Icon(Icons.Filled.ArrowBack, contentDescription = "Exit Fullscreen", tint = Color.White)
                                }
                                Text(
                                    text = detail?.title ?: activeMovie.title,
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                IconButton(onClick = { isLocked = true }) {
                                    Icon(Icons.Filled.Lock, contentDescription = "Lock", tint = Color.White)
                                }
                                IconButton(onClick = { showSettingsDrawer = true }) {
                                    Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Color.White)
                                }
                            }
                        }

                        // Single-Row Bottom Bar: [Play/Pause] [Scrubber] [00:14/23:40] [PiP] [Fullscreen]
                        Row(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))))
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            IconButton(
                                onClick = { if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play() },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                    contentDescription = "Play/Pause",
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            val totalF = durationMs.coerceAtLeast(1L).toFloat()
                            val sliderVal = (currentPosMs.toFloat() / totalF).coerceIn(0f, 1f)
                            Slider(
                                value = sliderVal,
                                onValueChange = { frac -> exoPlayer.seekTo((frac * totalF).toLong()) },
                                colors = SliderDefaults.colors(
                                    thumbColor = Color.White,
                                    activeTrackColor = CineColors.RedPrimary,
                                    inactiveTrackColor = Color.White.copy(alpha = 0.28f)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(22.dp)
                            )

                            Text(
                                text = "${formatSec((currentPosMs / 1000).toInt())}/${formatSec((durationMs / 1000).toInt())}",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                IconButton(onClick = onRequestEnterPip, modifier = Modifier.size(28.dp)) {
                                    Icon(Icons.Filled.PictureInPictureAlt, contentDescription = "PiP", tint = Color.White, modifier = Modifier.size(17.dp))
                                }
                            }

                            IconButton(onClick = { isFullscreen = !isFullscreen }, modifier = Modifier.size(28.dp)) {
                                Icon(
                                    if (isFullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
                                    contentDescription = "Fullscreen",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // SCROLLABLE LOWER BODY (Portrait mode only, matching User Screenshot 1:1)
        if (!isFullscreen && !isInPipMode) {
            if (isLoadingDetail) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CineColors.RedPrimary)
                }
            } else if (detailError.isNotEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(20.dp)) {
                        Text(detailError, color = CineColors.TextSecondary, textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(onClick = { retryTrigger++ }, colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary)) {
                            Text("আবার লোড করুন")
                        }
                    }
                }
            } else if (detail != null) {
                val d = detail!!
                val displayYear = Regex("(20\\d{2}|19\\d{2})").find("${d.releaseDate} ${d.title}")?.value ?: "2026"
                val displayRating = d.recommendedRating.ifEmpty { activeMovie.rating.ifEmpty { "9.1" } }
                val distinctSeasons = remember(d.episodes) {
                    d.episodes.mapNotNull { it.season }.distinct().sorted().ifEmpty { listOf(1) }
                }
                val isSeriesTitle = d.episodes.size > 1 || activeMovie.typeBadge in listOf("SERIES", "ANIME", "DRAMA") || distinctSeasons.size > 1
                val displayGenre = d.genre.substringBefore(',').trim().ifEmpty { "Cinema" }
                val seasonSummary = if (!isSeriesTitle) "Movie" else "${distinctSeasons.size} ${if (distinctSeasons.size == 1) "season" else "seasons"}"

                val filteredEpisodes = remember(d.episodes, selectedSeasonFilter) {
                    if (selectedSeasonFilter == null || distinctSeasons.size <= 1) {
                        d.episodes.mapIndexed { idx, ep -> idx to ep }
                    } else {
                        d.episodes.mapIndexedNotNull { idx, ep ->
                            if ((ep.season ?: 1) == selectedSeasonFilter) idx to ep else null
                        }
                    }
                }

                val mergedReviews = remember(customReviews, d.reviews) {
                    customReviews + d.reviews
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Title + "Info >" & Single-line metadata
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = d.title,
                                    color = Color.White,
                                    fontSize = 19.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    modifier = Modifier.weight(1f, fill = false)
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable {
                                        bottomTab = if (bottomTab == "infoCast") "forYou" else "infoCast"
                                    }
                                ) {
                                    Text("Info", color = Color(0xFF9CA3AF), fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(16.dp))
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.Tv, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(14.dp))
                                Text("|", color = Color(0xFF4B5563), fontSize = 12.sp)
                                Icon(Icons.Filled.Star, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(14.dp))
                                Text(displayRating, color = CineColors.Gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Text("|", color = Color(0xFF4B5563), fontSize = 12.sp)
                                Text(displayYear, color = Color(0xFF9CA3AF), fontSize = 12.sp)
                                Text("|", color = Color(0xFF4B5563), fontSize = 12.sp)
                                Text(d.language.ifEmpty { activeMovie.language }, color = Color(0xFF9CA3AF), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("|", color = Color(0xFF4B5563), fontSize = 12.sp)
                                Text("$displayGenre | $seasonSummary", color = Color(0xFF9CA3AF), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }

                    // 2. Action Pills Row: [Add to list] [Share] [Download] [Sound Boost] [Subtitles (CC)] [Quality]
                    item {
                        val inWl = vm.isInWatchlist(activeMovie)
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                item {
                                    ActionPill(
                                        icon = Icons.Filled.PlaylistAdd,
                                        label = if (inWl) "Added to list" else "Add to list",
                                        highlighted = inWl,
                                        iconTint = Color.White
                                    ) {
                                        vm.toggleWatchlist(activeMovie.copy(title = d.title, poster = d.poster.ifEmpty { activeMovie.poster }))
                                    }
                                }
                                item {
                                    ActionPill(
                                        icon = if (copiedShare) Icons.Filled.Check else Icons.Filled.Share,
                                        label = if (copiedShare) "Copied" else "Share",
                                        highlighted = false,
                                        iconTint = if (copiedShare) CineColors.AccentGreen else Color.White
                                    ) {
                                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, "CinePulse-এ দেখুন: ${d.title}\n${SecurityShield.BASE_URL}")
                                        }
                                        context.startActivity(Intent.createChooser(shareIntent, "Share Movie"))
                                    }
                                }
                                item {
                                    ActionPill(
                                        icon = Icons.Filled.Download,
                                        label = "Download",
                                        highlighted = false,
                                        iconTint = Color.White
                                    ) {
                                        showDownloadSheet = true
                                    }
                                }
                                item {
                                    ActionPill(
                                        icon = Icons.Filled.VolumeUp,
                                        label = if (soundBoostPct > 100) "Sound Boost: $soundBoostPct%" else "Sound Boost",
                                        highlighted = showSoundBoostBar || soundBoostPct > 100,
                                        highlightEmerald = true,
                                        iconTint = if (soundBoostPct > 100) CineColors.AccentGreen else CineColors.RedPrimary
                                    ) {
                                        showSoundBoostBar = !showSoundBoostBar
                                    }
                                }
                                item {
                                    ActionPill(
                                        icon = Icons.Filled.Subtitles,
                                        label = if (subEnabled) "CC: ${activeSubTrack?.label ?: "বাংলা"}" else "Subtitles (CC)",
                                        highlighted = subEnabled || showSubSyncPanel,
                                        iconTint = CineColors.RedPrimary
                                    ) {
                                        showSubSyncPanel = !showSubSyncPanel
                                        if (!subEnabled) {
                                            subEnabled = true
                                            vm.updateAutoBanglaSubDefault(true)
                                        }
                                    }
                                }
                                item {
                                    ActionPill(
                                        icon = Icons.Filled.AutoAwesome,
                                        label = activeSource?.qualityLabel ?: "${vm.preferredQuality}p",
                                        highlighted = showQualityBar,
                                        iconTint = CineColors.RedPrimary
                                    ) {
                                        showQualityBar = !showQualityBar
                                    }
                                }
                            }

                            // Inline Subtitles Bar (বাংলা | English | Off)
                            if (showSubSyncPanel) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF14161B))
                                        .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(12.dp))
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text("Subtitles:", color = Color(0xFFD1D5DB), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    val tracksToShow = if (availableSubs.isNotEmpty()) availableSubs.take(2) else listOf(
                                        SubtitleTrackOption("bn", "বাংলা", "bn", "", true),
                                        SubtitleTrackOption("en", "English", "en", "", false)
                                    )
                                    tracksToShow.forEach { trk ->
                                        val sel = subEnabled && (activeSubTrack?.id == trk.id || (activeSubTrack == null && trk.langCode == "bn"))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(if (sel) CineColors.RedPrimary else Color(0xFF1F2229))
                                                .clickable {
                                                    subEnabled = true
                                                    vm.updateAutoBanglaSubDefault(true)
                                                    activeSubTrack = trk
                                                    if (trk.url.isNotEmpty()) {
                                                        scope.launch {
                                                            val raw = runCatching { vm.api.fetchSubtitleText(trk.url) }.getOrDefault("")
                                                            val parsed = SubtitleEngine.parseSrtOrVtt(raw)
                                                            subCues = if (trk.isBengaliNative || parsed.isEmpty()) parsed
                                                            else SubtitleEngine.translateBatchToBangla(vm.api.httpClient, parsed, exoPlayer.currentPosition)
                                                        }
                                                    }
                                                }
                                                .padding(horizontal = 12.dp, vertical = 6.dp)
                                        ) {
                                            Text(trk.label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (!subEnabled) CineColors.RedPrimary else Color(0xFF1F2229))
                                            .clickable {
                                                subEnabled = false
                                                vm.updateAutoBanglaSubDefault(false)
                                            }
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text("Off", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            // Inline Ultra Sound Booster Bar (0% to 400%)
                            if (showSoundBoostBar) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF14161B))
                                        .border(1.dp, CineColors.AccentGreen.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                                        .padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Ultra Sound Booster (৪ গুণ পর্যন্ত):", color = Color(0xFFE5E7EB), fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                                        Text("$soundBoostPct%", color = CineColors.AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                                    }
                                    Slider(
                                        value = soundBoostPct.toFloat(),
                                        onValueChange = { applySoundBoost(it.toInt()) },
                                        valueRange = 0f..400f,
                                        colors = SliderDefaults.colors(thumbColor = CineColors.AccentGreen, activeTrackColor = CineColors.AccentGreen)
                                    )
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        items(listOf(100 to "100% Normal", 150 to "150% Clear", 200 to "200% (2x)", 300 to "300% (3x)", 400 to "400% Max 🔥")) { (valPct, lbl) ->
                                            val active = soundBoostPct == valPct
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(
                                                        when {
                                                            active && valPct > 100 -> Color(0xFF059669)
                                                            active -> CineColors.RedPrimary
                                                            else -> Color(0xFF1F2229)
                                                        }
                                                    )
                                                    .clickable { applySoundBoost(valPct) }
                                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Text(lbl, color = Color.White, fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }

                            // Inline Quality Selection Bar
                            if (showQualityBar) {
                                LazyRow(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF14161B))
                                        .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(12.dp))
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    item { Text("Quality:", color = Color(0xFFD1D5DB), fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                                    val sources = activeEpisode?.sources.orEmpty()
                                    itemsIndexed(sources) { idx, s ->
                                        val sel = idx == selectedSourceIdx
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(if (sel) CineColors.RedPrimary else Color(0xFF1F2229))
                                                .clickable {
                                                    pendingResumeSeekMs = exoPlayer.currentPosition
                                                    selectedSourceIdx = idx
                                                    vm.updatePreferredQuality(s.quality)
                                                }
                                                .padding(horizontal = 12.dp, vertical = 6.dp)
                                        ) {
                                            Text("${s.qualityLabel} (${s.name})", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 3. Resources + Verified by CinePulse Official + Audio/Season Dropdowns + Horizontal Episode Strip
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Resources", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                                Text("Verified by CinePulse Official", color = Color(0xFF9CA3AF), fontSize = 11.5.sp)
                            }

                            // Audio/Dub & Season Dropdown Buttons
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                // Left: Audio / Dub Dropdown
                                Box {
                                    val activeDubLbl = d.dubs.firstOrNull { it.active }?.label ?: d.language.ifEmpty { "Original" }
                                    Row(
                                        modifier = Modifier
                                            .height(40.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFF121418))
                                            .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(8.dp))
                                            .clickable { showDubDropdown = true }
                                            .padding(horizontal = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(activeDubLbl, color = Color(0xFFF3F4F6), fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
                                        Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(16.dp))
                                    }
                                    DropdownMenu(expanded = showDubDropdown, onDismissRequest = { showDubDropdown = false }) {
                                        val dubList = if (d.dubs.isNotEmpty()) d.dubs else listOf(MovieDubOption("orig", activeDubLbl, activeMovie.path, true))
                                        dubList.forEach { dub ->
                                            DropdownMenuItem(
                                                text = { Text(dub.label) },
                                                onClick = {
                                                    showDubDropdown = false
                                                    if (dub.path.isNotEmpty() && dub.path != activeMovie.path) {
                                                        flushProgress()
                                                        activeMovie = activeMovie.copy(path = dub.path, url = dub.path, language = dub.label)
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }

                                // Right: Season Dropdown (if series)
                                if (isSeriesTitle || d.relatedSeasons.isNotEmpty()) {
                                    Box {
                                        val sNum = selectedSeasonFilter ?: distinctSeasons.first()
                                        val sLabel = "Season ${sNum.toString().padStart(2, '0')}"
                                        Row(
                                            modifier = Modifier
                                                .height(40.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF121418))
                                                .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(8.dp))
                                                .clickable { showSeasonDropdown = true }
                                                .padding(horizontal = 12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text(sLabel, color = Color(0xFFF3F4F6), fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
                                            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(16.dp))
                                        }
                                        DropdownMenu(expanded = showSeasonDropdown, onDismissRequest = { showSeasonDropdown = false }) {
                                            distinctSeasons.forEach { sn ->
                                                DropdownMenuItem(
                                                    text = { Text("Season ${sn.toString().padStart(2, '0')}") },
                                                    onClick = {
                                                        showSeasonDropdown = false
                                                        selectedSeasonFilter = sn
                                                        val firstIdx = d.episodes.indexOfFirst { (it.season ?: 1) == sn }
                                                        if (firstIdx >= 0) {
                                                            flushProgress()
                                                            pendingResumeSeekMs = 0L
                                                            selectedEpIdx = firstIdx
                                                            selectedSourceIdx = 0
                                                        }
                                                    }
                                                )
                                            }
                                            d.relatedSeasons.filter { it.path != activeMovie.path }.forEach { rs ->
                                                DropdownMenuItem(
                                                    text = { Text(rs.title.ifEmpty { "Season ${rs.seasonNumber ?: 2}" }) },
                                                    onClick = {
                                                        showSeasonDropdown = false
                                                        flushProgress()
                                                        pendingResumeSeekMs = 0L
                                                        activeMovie = rs
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Episode Strip + 100-Ep Quick-Jump Ranges (when > 40 eps)
                            if (filteredEpisodes.size > 1 || isSeriesTitle) {
                                if (filteredEpisodes.size > 40) {
                                    val ranges = filteredEpisodes.chunked(100)
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        item { Text("Episodes (${filteredEpisodes.size}):", color = Color(0xFF9CA3AF), fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp)) }
                                        itemsIndexed(ranges) { rIdx, group ->
                                            val startN = rIdx * 100 + 1
                                            val endN = startN + group.size - 1
                                            val inRange = selectedEpIdx in (group.first().first)..(group.last().first)
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(if (inRange) CineColors.RedPrimary.copy(alpha = 0.25f) else Color(0xFF16181D))
                                                    .border(1.dp, if (inRange) CineColors.RedPrimary else CineColors.BorderSubtle, RoundedCornerShape(8.dp))
                                                    .clickable {
                                                        val firstEpIdx = group.first().first
                                                        flushProgress()
                                                        pendingResumeSeekMs = 0L
                                                        selectedEpIdx = firstEpIdx
                                                        selectedSourceIdx = 0
                                                        scope.launch { horizontalEpListState.animateScrollToItem(rIdx * 100) }
                                                    }
                                                    .padding(horizontal = 9.dp, vertical = 5.dp)
                                            ) {
                                                Text("$startN-$endN", color = if (inRange) CineColors.RedBright else Color(0xFFD1D5DB), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    // Pinned [ All ] Button
                                    Box(
                                        modifier = Modifier
                                            .size(width = 54.dp, height = 48.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(CineColors.SurfaceElevated)
                                            .clickable { showAllEpisodesModal = true },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("All", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                    }

                                    LazyRow(
                                        state = horizontalEpListState,
                                        modifier = Modifier.weight(1f),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        items(filteredEpisodes, key = { it.second.id + it.first }) { (origIdx, ep) ->
                                            val isSelected = origIdx == selectedEpIdx
                                            val numStr = ep.number?.toString()
                                                ?: Regex("\\d+").find(ep.label)?.value
                                                ?: (origIdx + 1).toString().padStart(2, '0')
                                            Box(
                                                modifier = Modifier
                                                    .widthIn(min = 54.dp)
                                                    .height(48.dp)
                                                    .clip(RoundedCornerShape(12.dp))
                                                    .background(
                                                        if (isSelected) Brush.horizontalGradient(listOf(CineColors.RedPrimary.copy(alpha = 0.32f), CineColors.RedDark.copy(alpha = 0.38f)))
                                                        else SolidColor(CineColors.SurfaceElevated)
                                                    )
                                                    .border(
                                                        1.dp,
                                                        if (isSelected) CineColors.RedPrimary else Color.Transparent,
                                                        RoundedCornerShape(12.dp)
                                                    )
                                                    .clickable {
                                                        flushProgress()
                                                        pendingResumeSeekMs = 0L
                                                        selectedEpIdx = origIdx
                                                        selectedSourceIdx = 0
                                                    }
                                                    .padding(horizontal = 12.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = numStr,
                                                    color = if (isSelected) CineColors.RedBright else Color(0xFFE5E7EB),
                                                    fontSize = 14.sp,
                                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 4. Bottom 3 Navigation Tabs: "For you" | "Info & Cast" | "Reviews ★"
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(24.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                listOf(
                                    "forYou" to "For you",
                                    "infoCast" to "Info & Cast",
                                    "reviews" to "Reviews"
                                ).forEach { (id, label) ->
                                    val active = bottomTab == id
                                    Column(
                                        horizontalAlignment = Alignment.Start,
                                        modifier = Modifier.clickable { bottomTab = id }
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                            Text(
                                                text = label,
                                                color = if (active) Color.White else Color(0xFF9CA3AF),
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.ExtraBold
                                            )
                                            if (id == "reviews") {
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(6.dp))
                                                        .background(Color.White.copy(alpha = 0.1f))
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text("★ $displayRating", color = CineColors.Gold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .width(44.dp)
                                                .height(3.dp)
                                                .clip(CircleShape)
                                                .background(if (active) Color.White else Color.Transparent)
                                        )
                                    }
                                }
                            }
                            HorizontalDivider(color = CineColors.BorderSubtle)
                        }
                    }

                    // 5. TAB CONTENT
                    when (bottomTab) {
                        "forYou" -> {
                            val relPool = (d.relatedSeasons + vm.rawCatalogItems + vm.top10ThisWeekItems())
                                .filter { it.path != activeMovie.path }
                                .distinctBy { it.path }
                                .take(12)
                            val chunked = relPool.chunked(3)
                            itemsIndexed(chunked, key = { i, _ -> "fy-$i" }) { _, row ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    row.forEach { rel ->
                                        val sLang = CinePulseCatalogData.formatShortLanguage(rel.language)
                                        Column(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color(0xFF16181C))
                                                .clickable {
                                                    flushProgress()
                                                    pendingResumeSeekMs = 0L
                                                    activeMovie = rel
                                                }
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .aspectRatio(2f / 3f)
                                                    .background(Color(0xFF101216))
                                            ) {
                                                AsyncImage(
                                                    model = rel.poster,
                                                    contentDescription = rel.title,
                                                    contentScale = ContentScale.Crop,
                                                    modifier = Modifier.fillMaxSize()
                                                )
                                                Box(
                                                    modifier = Modifier
                                                        .align(Alignment.TopEnd)
                                                        .padding(5.dp)
                                                        .clip(RoundedCornerShape(4.dp))
                                                        .background(Color.Black.copy(alpha = 0.65f))
                                                        .padding(horizontal = 5.dp, vertical = 2.dp)
                                                ) {
                                                    Text(sLang, color = Color.White, fontSize = 9.5.sp, fontWeight = FontWeight.Medium)
                                                }
                                            }
                                            Text(
                                                text = rel.title,
                                                color = Color(0xFFF3F4F6),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Medium,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 7.dp)
                                            )
                                        }
                                    }
                                    repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                                }
                            }
                        }

                        "infoCast" -> {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(Color(0xFF121418))
                                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(14.dp))
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Synopsis, Cast & Stills", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                        Text("Back to For You", color = CineColors.RedBright, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { bottomTab = "forYou" })
                                    }
                                    Text(
                                        text = d.storyline.ifEmpty { "${d.title} ($displayYear) — Stream in Full HD on CinePulse." },
                                        color = Color(0xFFD1D5DB),
                                        fontSize = 12.sp,
                                        lineHeight = 18.sp
                                    )
                                    if (d.cast.isNotEmpty()) {
                                        Text("CAST & CREW (Tap to search actor)", color = Color(0xFF9CA3AF), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            items(d.cast) { c ->
                                                Column(
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    modifier = Modifier
                                                        .width(70.dp)
                                                        .clickable {
                                                            flushProgress()
                                                            vm.openSearchWithActor(c.name)
                                                        }
                                                ) {
                                                    AsyncImage(
                                                        model = c.photo,
                                                        contentDescription = c.name,
                                                        contentScale = ContentScale.Crop,
                                                        modifier = Modifier
                                                            .size(56.dp)
                                                            .clip(CircleShape)
                                                            .background(CineColors.SurfaceElevated)
                                                    )
                                                    Spacer(modifier = Modifier.height(4.dp))
                                                    Text(c.name, color = Color.White, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                    if (c.role.isNotEmpty()) {
                                                        Text(c.role, color = Color(0xFF9CA3AF), fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (d.screenshots.isNotEmpty()) {
                                        Text("HD SCREENSHOTS", color = Color(0xFF9CA3AF), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        d.screenshots.chunked(2).forEach { pair ->
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                pair.forEach { ss ->
                                                    AsyncImage(
                                                        model = ss,
                                                        contentDescription = "Screenshot",
                                                        contentScale = ContentScale.Crop,
                                                        modifier = Modifier
                                                            .weight(1f)
                                                            .aspectRatio(16f / 9f)
                                                            .clip(RoundedCornerShape(8.dp))
                                                            .clickable { lightboxImage = ss }
                                                    )
                                                }
                                                if (pair.size == 1) Spacer(modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        "reviews" -> {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(Color(0xFF121418))
                                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(14.dp))
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column {
                                            Text("Audience Reviews & Rating ★ $displayRating/10", color = Color.White, fontSize = 13.5.sp, fontWeight = FontWeight.Bold)
                                            Text("এই মুভি বা সিরিজটি আপনার কেমন লেগেছে জানান", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                                        }
                                        Text(
                                            text = "Report Link",
                                            color = CineColors.RedBright,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.clickable {
                                                onClose()
                                                vm.openRequestModal("REQUEST_FORM", d.title, "BROKEN_LINK")
                                            }
                                        )
                                    }

                                    // Post Review Box
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Color(0xFF181B20))
                                            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(12.dp))
                                            .padding(10.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text("আপনার রেটিং:", color = Color(0xFFD1D5DB), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                (1..5).forEach { s ->
                                                    Icon(
                                                        Icons.Filled.Star,
                                                        contentDescription = null,
                                                        tint = if (s <= userStars) CineColors.Gold else Color(0xFF4B5563),
                                                        modifier = Modifier
                                                            .size(22.dp)
                                                            .clickable { userStars = s }
                                                    )
                                                }
                                            }
                                        }
                                        OutlinedTextField(
                                            value = reviewAuthor,
                                            onValueChange = { reviewAuthor = it },
                                            label = { Text("আপনার নাম (ঐচ্ছিক)") },
                                            singleLine = true,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        OutlinedTextField(
                                            value = reviewText,
                                            onValueChange = { reviewText = it },
                                            label = { Text("মুভিটি কেমন লাগলো লিখুন...") },
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        Button(
                                            onClick = {
                                                if (reviewText.isNotBlank()) {
                                                    customReviews = vm.addCustomReviewForMovie(reviewKey, reviewAuthor, userStars, reviewText)
                                                    reviewText = ""
                                                    Toast.makeText(context, "আপনার রিভিউ যুক্ত হয়েছে!", Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("Post Review", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    // Reviews List
                                    mergedReviews.forEach { rev ->
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color(0xFF181B20))
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text(rev.author, color = Color(0xFFF3F4F6), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                Text("★ ${rev.rating} · ${rev.date}", color = CineColors.Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Text(rev.content, color = Color(0xFFD1D5DB), fontSize = 12.sp, lineHeight = 17.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ALL EPISODES MODAL (With Search + Sort 1->Last / Last->1)
    if (showAllEpisodesModal && detail != null) {
        val d = detail!!
        var epSearch by remember { mutableStateOf("") }
        var reverseOrder by remember { mutableStateOf(false) }
        val modalEps = remember(d.episodes, selectedSeasonFilter, epSearch, reverseOrder) {
            val base = d.episodes.mapIndexedNotNull { idx, ep ->
                if (selectedSeasonFilter != null && ep.season != null && ep.season != selectedSeasonFilter) null
                else idx to ep
            }.filter { (_, ep) ->
                epSearch.isBlank() || ep.label.contains(epSearch, ignoreCase = true) || ep.number?.toString()?.contains(epSearch) == true
            }
            if (reverseOrder) base.reversed() else base
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f))
                .clickable { showAllEpisodesModal = false }
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .fillMaxHeight(0.84f)
                    .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                    .background(Color(0xFF121418))
                    .clickable(enabled = false) {}
                    .navigationBarsPadding()
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("All Episodes (${modalEps.size})", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(CineColors.SurfaceElevated)
                                .clickable { reverseOrder = !reverseOrder }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(if (reverseOrder) "Last → 1" else "1 → Last", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        IconButton(onClick = { showAllEpisodesModal = false }) {
                            Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
                        }
                    }
                }
                OutlinedTextField(
                    value = epSearch,
                    onValueChange = { epSearch = it },
                    placeholder = { Text("Search episode number...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.weight(1f)) {
                    val rows = modalEps.chunked(4)
                    itemsIndexed(rows) { _, row ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { (origIdx, ep) ->
                                val sel = origIdx == selectedEpIdx
                                val numStr = ep.number?.toString() ?: Regex("\\d+").find(ep.label)?.value ?: "${origIdx + 1}"
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(44.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (sel) CineColors.RedPrimary else CineColors.SurfaceElevated)
                                        .clickable {
                                            flushProgress()
                                            pendingResumeSeekMs = 0L
                                            selectedEpIdx = origIdx
                                            selectedSourceIdx = 0
                                            showAllEpisodesModal = false
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(numStr, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                }
                            }
                            repeat(4 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                        }
                    }
                }
            }
        }
    }

    // DOWNLOAD SHEET MODAL
    if (showDownloadSheet && detail != null) {
        val d = detail!!
        val srcs = activeEpisode?.sources.orEmpty()
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.8f))
                .clickable { showDownloadSheet = false }
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                    .background(Color(0xFF121418))
                    .clickable(enabled = false) {}
                    .navigationBarsPadding()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("ডাউনলোড করুন (MP4/HD)", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                    IconButton(onClick = { showDownloadSheet = false }) { Icon(Icons.Filled.Close, contentDescription = null, tint = Color.White) }
                }
                d.downloadButtons.forEach { dl ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(CineColors.SurfaceCardAlt)
                            .clickable {
                                enqueueAndroidDownload(context, dl.url, "${d.title} ${dl.quality}")
                                showDownloadSheet = false
                            }
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("${dl.label} · ${dl.quality}", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            if (dl.size.isNotEmpty()) Text(dl.size, color = Color(0xFF9CA3AF), fontSize = 11.sp)
                        }
                        Icon(Icons.Filled.Download, contentDescription = null, tint = CineColors.AccentGreen)
                    }
                }
                srcs.forEach { s ->
                    val dlUrl = s.downloadUrl.ifEmpty { s.url }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(CineColors.SurfaceCardAlt)
                            .clickable {
                                enqueueAndroidDownload(context, dlUrl, "${d.title} ${s.qualityLabel}")
                                showDownloadSheet = false
                            }
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Download ${s.qualityLabel} • ${s.name}", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text("${s.audio} • ${s.provider}", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                        }
                        Icon(Icons.Filled.Download, contentDescription = null, tint = CineColors.RedBright)
                    }
                }
            }
        }
    }

    // FULL WEBSITE SETTINGS DRAWER (Right / Bottom Drawer)
    if (showSettingsDrawer) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.78f))
                .clickable { showSettingsDrawer = false }
        ) {
            LazyColumn(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .fillMaxHeight(0.82f)
                    .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                    .background(Color(0xFF121418))
                    .clickable(enabled = false) {}
                    .navigationBarsPadding()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Player Settings & Controls", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                        IconButton(onClick = { showSettingsDrawer = false }) { Icon(Icons.Filled.Close, contentDescription = null, tint = Color.White) }
                    }
                }

                // Quality / Server Switcher
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Video Quality & Server", color = Color(0xFF9CA3AF), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        activeEpisode?.sources.orEmpty().forEachIndexed { idx, s ->
                            val sel = idx == selectedSourceIdx
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (sel) CineColors.RedPrimary.copy(alpha = 0.22f) else CineColors.SurfaceCardAlt)
                                    .border(1.dp, if (sel) CineColors.RedPrimary else CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                                    .clickable {
                                        pendingResumeSeekMs = exoPlayer.currentPosition
                                        selectedSourceIdx = idx
                                        vm.updatePreferredQuality(s.quality)
                                    }
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("${s.qualityLabel} • ${s.name} (${s.audio})", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                if (sel) Icon(Icons.Filled.Check, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // Ultra Sound Boost 0-400%
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Ultra Sound Boost (সাউন্ড বুস্ট)", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text("$soundBoostPct%", color = CineColors.AccentGreen, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                        }
                        Slider(
                            value = soundBoostPct.toFloat(),
                            onValueChange = { applySoundBoost(it.toInt()) },
                            valueRange = 0f..400f,
                            colors = SliderDefaults.colors(thumbColor = CineColors.AccentGreen, activeTrackColor = CineColors.AccentGreen)
                        )
                    }
                }

                // Brightness 20-160%
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Brightness (ব্রাইটনেস)", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text("$brightnessPct%", color = CineColors.Gold, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                        }
                        Slider(
                            value = brightnessPct.toFloat(),
                            onValueChange = { applyBrightness(it.toInt()) },
                            valueRange = 20f..160f,
                            colors = SliderDefaults.colors(thumbColor = CineColors.Gold, activeTrackColor = CineColors.Gold)
                        )
                    }
                }

                // Playback Speed & Aspect Ratio Fit
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Playback Speed", color = Color(0xFF9CA3AF), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(0.5f, 1.0f, 1.25f, 1.5f, 2.0f).forEach { sp ->
                                val sel = playbackSpeed == sp
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (sel) CineColors.RedPrimary else CineColors.SurfaceElevated)
                                        .clickable {
                                            playbackSpeed = sp
                                            exoPlayer.playbackParameters = PlaybackParameters(sp)
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("${sp}x", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Text("Screen Fit & Rotation", color = Color(0xFF9CA3AF), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(
                                AspectRatioFrameLayout.RESIZE_MODE_FIT to "Contain",
                                AspectRatioFrameLayout.RESIZE_MODE_ZOOM to "Cover",
                                AspectRatioFrameLayout.RESIZE_MODE_FILL to "Fill"
                            ).forEach { (mode, lbl) ->
                                val sel = resizeMode == mode
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (sel) CineColors.RedPrimary else CineColors.SurfaceElevated)
                                        .clickable { resizeMode = mode }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(lbl, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CineColors.SurfaceElevated)
                                    .clickable {
                                        isFullscreen = !isFullscreen
                                        showSettingsDrawer = false
                                    }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(if (isFullscreen) "Portrait" else "Landscape", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Auto-Next Ep & Lock toggles
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Auto-Next Episode (অটো নেক্সট)", color = Color.White, fontSize = 13.sp)
                            Switch(checked = vm.autoNextEp, onCheckedChange = { vm.updateAutoNextEp(it) })
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Lock Screen Touch Controls", color = Color.White, fontSize = 13.sp)
                            Switch(checked = isLocked, onCheckedChange = {
                                isLocked = it
                                showSettingsDrawer = false
                            })
                        }
                    }
                }
            }
        }
    }

    // HD Screenshot Fullscreen Lightbox
    if (lightboxImage != null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.95f))
                .clickable { lightboxImage = null },
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = lightboxImage,
                contentDescription = "Screenshot",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            )
            IconButton(
                onClick = { lightboxImage = null },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(12.dp)
            ) {
                Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
            }
        }
    }
}

@Composable
private fun TopIconBtn(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    active: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (active) CineColors.RedPrimary else Color(0xFF151515))
            .border(1.dp, if (active) CineColors.RedPrimary else CineColors.BorderSubtle, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(17.dp))
    }
}

@Composable
private fun ActionPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    highlighted: Boolean,
    highlightEmerald: Boolean = false,
    iconTint: Color,
    onClick: () -> Unit
) {
    val bg = when {
        highlighted && highlightEmerald -> Color(0xFF059669).copy(alpha = 0.25f)
        highlighted -> CineColors.RedPrimary.copy(alpha = 0.25f)
        else -> CineColors.SurfaceElevated
    }
    val borderColor = when {
        highlighted && highlightEmerald -> CineColors.AccentGreen
        highlighted -> CineColors.RedPrimary
        else -> Color.Transparent
    }
    Row(
        modifier = Modifier
            .height(36.dp)
            .clip(CircleShape)
            .background(bg)
            .border(1.dp, borderColor, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(icon, contentDescription = label, tint = iconTint, modifier = Modifier.size(16.dp))
        Text(label, color = Color(0xFFE5E7EB), fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)
    }
}

private fun enqueueAndroidDownload(context: Context, rawUrl: String, title: String) {
    runCatching {
        val fullUrl = SecurityShield.cloakStreamUrl(rawUrl)
        val uri = Uri.parse(fullUrl)
        val safeName = title.replace(Regex("[^a-zA-Z0-9._\\- ]"), "_").trim().ifEmpty { "CinePulse_Video" }
        val req = DownloadManager.Request(uri)
            .setTitle(title)
            .setDescription("CinePulse ডাউনলোড হচ্ছে...")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "$safeName.mp4")
            .addRequestHeader("User-Agent", SecurityShield.ANDROID_CHROME_UA)
            .addRequestHeader("Referer", "${SecurityShield.BASE_URL}/")
        val relPath = (uri.encodedPath ?: "/") + (uri.encodedQuery?.let { "?$it" } ?: "")
        SecurityShield.buildSecurityHeaders(relPath).forEach { (k, v) ->
            if (!k.equals("User-Agent", true) && !k.equals("Referer", true)) {
                req.addRequestHeader(k, v)
            }
        }
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        dm.enqueue(req)
        Toast.makeText(context, "ডাউনলোড শুরু হয়েছে (Notification Bar দেখুন)", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, "ডাউনলোড শুরু করা যায়নি", Toast.LENGTH_SHORT).show()
    }
}
