package com.cinepulse.moviebox

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cinepulse.moviebox.model.*
import com.cinepulse.moviebox.network.CinePulseApi
import com.cinepulse.moviebox.network.TrialLockedException
import com.cinepulse.moviebox.ui.screens.*
import com.cinepulse.moviebox.ui.theme.CinePulseMovieBoxTheme
import com.cinepulse.moviebox.ui.theme.MbColors
import kotlinx.coroutines.launch

private enum class MainTab {
    HOME, CATEGORIES, SHORTS, DOWNLOADS, ME
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CinePulseMovieBoxTheme {
                CinePulseAppRoot()
            }
        }
    }
}

@Composable
private fun CinePulseAppRoot() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("cinepulse_mb_prefs", Context.MODE_PRIVATE) }
    val api = remember { CinePulseApi() }
    val scope = rememberCoroutineScope()

    var baseUrl by remember {
        mutableStateOf(
            prefs.getString("base_url", "https://hd-w0l1.onrender.com/api/app")
                ?: "https://hd-w0l1.onrender.com/api/app"
        )
    }
    var apiKey by remember { mutableStateOf(prefs.getString("api_key", "") ?: "") }
    var isConnected by remember { mutableStateOf(true) }
    var gateLoading by remember { mutableStateOf(false) }
    var gateError by remember { mutableStateOf<String?>(null) }

    var activeTab by remember { mutableStateOf(MainTab.HOME) }
    var trialSummary by remember { mutableStateOf(TrialSummary()) }
    var categories by remember { mutableStateOf<List<CategoryItem>>(emptyList()) }

    var homePayload by remember { mutableStateOf<HomePayload?>(null) }
    var homeLoading by remember { mutableStateOf(false) }
    var homeError by remember { mutableStateOf<String?>(null) }

    var showSearch by remember { mutableStateOf(false) }
    var searchInitialQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<MovieCard>>(emptyList()) }
    var searchLoading by remember { mutableStateOf(false) }
    var searchError by remember { mutableStateOf<String?>(null) }

    var catalogPath by remember { mutableStateOf("/mostwatch/7d") }
    var catalogTitle by remember { mutableStateOf("Trending") }
    var catalogPage by remember { mutableIntStateOf(1) }
    var catalogItems by remember { mutableStateOf<List<MovieCard>>(emptyList()) }
    var catalogLoading by remember { mutableStateOf(false) }
    var catalogError by remember { mutableStateOf<String?>(null) }

    var shortsItems by remember { mutableStateOf<List<MovieCard>>(emptyList()) }
    var shortsPage by remember { mutableIntStateOf(1) }
    var shortsLoading by remember { mutableStateOf(false) }
    var shortsError by remember { mutableStateOf<String?>(null) }

    var watchCard by remember { mutableStateOf<MovieCard?>(null) }
    var detailPayload by remember { mutableStateOf<DetailPayload?>(null) }
    var streamPayload by remember { mutableStateOf<StreamPayload?>(null) }
    var detailLoading by remember { mutableStateOf(false) }
    var streamLoading by remember { mutableStateOf(false) }
    var detailError by remember { mutableStateOf<String?>(null) }

    val downloads = remember { mutableStateListOf<DownloadRecord>() }
    val myList = remember { mutableStateListOf<MovieCard>() }

    fun handleLockError(e: Throwable): Boolean {
        if (e is TrialLockedException) {
            isConnected = false
            watchCard = null
            showSearch = false
            gateError = e.message ?: "API Key paused, expired, or quota exhausted."
            return true
        }
        return false
    }

    fun loadHome() {
        scope.launch {
            homeLoading = true
            homeError = null
            try {
                val res = api.fetchHome(baseUrl, apiKey)
                homePayload = res
                trialSummary = res.trial
                if (res.categories.isNotEmpty()) categories = res.categories
            } catch (e: Throwable) {
                if (!handleLockError(e)) homeError = e.message ?: "Failed to load home"
            } finally {
                homeLoading = false
            }
        }
    }

    fun loadCatalog(path: String, title: String, page: Int) {
        catalogPath = path
        catalogTitle = title
        catalogPage = page
        activeTab = MainTab.CATEGORIES
        scope.launch {
            catalogLoading = true
            catalogError = null
            try {
                val res = api.fetchCatalog(baseUrl, apiKey, path, page)
                catalogItems = res.items
                trialSummary = res.trial
            } catch (e: Throwable) {
                if (!handleLockError(e)) catalogError = e.message ?: "Failed to load category"
            } finally {
                catalogLoading = false
            }
        }
    }

    fun loadShorts(page: Int) {
        shortsPage = page
        scope.launch {
            shortsLoading = true
            shortsError = null
            try {
                val res = api.fetchCatalog(baseUrl, apiKey, "/category/short-tv", page)
                shortsItems = res.items
                trialSummary = res.trial
            } catch (e: Throwable) {
                if (!handleLockError(e)) shortsError = e.message ?: "Failed to load Shorts"
            } finally {
                shortsLoading = false
            }
        }
    }

    fun performSearch(q: String) {
        scope.launch {
            searchLoading = true
            searchError = null
            try {
                val res = api.search(baseUrl, apiKey, q, 1)
                searchResults = res.items
                trialSummary = res.trial
            } catch (e: Throwable) {
                if (!handleLockError(e)) searchError = e.message ?: "Search failed"
            } finally {
                searchLoading = false
            }
        }
    }

    fun openDetail(card: MovieCard) {
        watchCard = card
        detailPayload = null
        streamPayload = null
        detailError = null
        scope.launch {
            detailLoading = true
            streamLoading = true
            try {
                val det = api.fetchDetails(baseUrl, apiKey, card.path)
                detailPayload = det
                trialSummary = det.trial
                detailLoading = false

                val firstEp = det.episodes.firstOrNull()
                val initSe = if (det.typeBadge.equals("MOVIE", true) && det.episodes.isEmpty()) 0 else (firstEp?.season?.coerceAtLeast(1) ?: 1)
                val initEp = if (det.typeBadge.equals("MOVIE", true) && det.episodes.isEmpty()) 0 else (firstEp?.number?.coerceAtLeast(1) ?: 1)
                val st = api.fetchStream(baseUrl, apiKey, card.path, initSe, initEp, det.title)
                streamPayload = st
                trialSummary = st.trial
            } catch (e: Throwable) {
                if (!handleLockError(e)) detailError = e.message ?: "Failed to load title"
            } finally {
                detailLoading = false
                streamLoading = false
            }
        }
    }

    fun startAndroidDownload(src: VideoSource) {
        val det = detailPayload ?: return
        val url = src.downloadUrl.ifBlank { src.url }
        try {
            val safeName = det.title.replace(Regex("[^a-zA-Z0-9._ -]+"), "_").take(45)
            val fileName = "${safeName}_${src.quality}p_${src.audio.replace(" ", "_")}.mp4"
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val req = DownloadManager.Request(Uri.parse(url))
                .setTitle("${det.title} (${src.quality}p)")
                .setDescription(src.audio)
                .addRequestHeader("User-Agent", "ExoPlayerLib/2.19.1")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            try {
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            } catch (_: SecurityException) {
                req.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName)
            }
            val id = dm.enqueue(req)
            downloads.add(
                0,
                DownloadRecord(
                    downloadId = id,
                    title = det.title,
                    poster = det.poster,
                    quality = "${src.quality}p",
                    audio = src.audio,
                    path = watchCard?.path ?: "",
                    addedAt = System.currentTimeMillis(),
                ),
            )
            Toast.makeText(context, "Downloading ${det.title} (${src.quality}p)...", Toast.LENGTH_SHORT).show()
        } catch (e: Throwable) {
            Toast.makeText(context, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(isConnected) {
        if (isConnected && homePayload == null) {
            loadHome()
        }
    }

    if (!isConnected) {
        ApiKeyGateScreen(
            initialBaseUrl = baseUrl,
            initialApiKey = apiKey,
            loading = gateLoading,
            errorMessage = gateError,
            onConnect = { newUrl, newKey ->
                scope.launch {
                    gateLoading = true
                    gateError = null
                    try {
                        val (summary, cats) = api.verifyKey(newUrl, newKey)
                        baseUrl = newUrl
                        apiKey = newKey
                        trialSummary = summary
                        categories = cats
                        prefs.edit()
                            .putString("base_url", newUrl)
                            .putString("api_key", newKey)
                            .apply()
                        homePayload = null
                        isConnected = true
                    } catch (e: Throwable) {
                        gateError = e.message ?: "Could not verify API Key"
                    } finally {
                        gateLoading = false
                    }
                }
            },
        )
        return
    }

    if (watchCard != null) {
        BackHandler { watchCard = null }
        val curCard = watchCard!!
        WatchDetailScreen(
            detail = detailPayload,
            stream = streamPayload,
            loadingDetail = detailLoading,
            loadingStream = streamLoading,
            error = detailError,
            isInMyList = myList.any { it.path == curCard.path },
            onBack = { watchCard = null },
            onSelectEpisode = { se, ep ->
                val det = detailPayload ?: return@WatchDetailScreen
                scope.launch {
                    streamLoading = true
                    try {
                        val st = api.fetchStream(baseUrl, apiKey, curCard.path, se, ep, det.title)
                        streamPayload = st
                        trialSummary = st.trial
                    } catch (e: Throwable) {
                        if (!handleLockError(e)) {
                            Toast.makeText(context, e.message ?: "Episode error", Toast.LENGTH_SHORT).show()
                        }
                    } finally {
                        streamLoading = false
                    }
                }
            },
            onSelectDub = { dub ->
                val det = detailPayload ?: return@WatchDetailScreen
                val se = streamPayload?.season ?: 0
                val ep = streamPayload?.episode ?: 0
                scope.launch {
                    streamLoading = true
                    try {
                        val targetPath = dub.path.ifBlank { curCard.path }
                        val st = api.fetchStream(baseUrl, apiKey, targetPath, se, ep, det.title, dub.label)
                        streamPayload = st
                        trialSummary = st.trial
                    } catch (e: Throwable) {
                        if (!handleLockError(e)) {
                            Toast.makeText(context, e.message ?: "Audio switch error", Toast.LENGTH_SHORT).show()
                        }
                    } finally {
                        streamLoading = false
                    }
                }
            },
            onToggleMyList = {
                val idx = myList.indexOfFirst { it.path == curCard.path }
                if (idx >= 0) myList.removeAt(idx) else myList.add(0, curCard)
            },
            onDownloadClick = { src -> startAndroidDownload(src) },
            onOpenRelated = { rel -> openDetail(rel) },
        )
        return
    }

    if (showSearch) {
        BackHandler { showSearch = false }
        SearchScreen(
            initialQuery = searchInitialQuery,
            hotSearches = homePayload?.hotSearches ?: emptyList(),
            results = searchResults,
            loading = searchLoading,
            error = searchError,
            onQuerySubmit = { q -> performSearch(q) },
            onBack = { showSearch = false },
            onOpenDetail = { card -> openDetail(card) },
        )
        return
    }

    Scaffold(
        containerColor = MbColors.Background,
        bottomBar = {
            MovieBoxBottomBar(
                activeTab = activeTab,
                onSelect = { tab ->
                    activeTab = tab
                    if (tab == MainTab.CATEGORIES && catalogItems.isEmpty()) {
                        loadCatalog(catalogPath, catalogTitle, 1)
                    } else if (tab == MainTab.SHORTS && shortsItems.isEmpty()) {
                        loadShorts(1)
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (activeTab) {
                MainTab.HOME -> HomeScreen(
                    home = homePayload,
                    loading = homeLoading,
                    error = homeError,
                    onRefresh = { loadHome() },
                    onOpenSearch = { initQ ->
                        searchInitialQuery = initQ
                        showSearch = true
                    },
                    onOpenCategory = { path, title -> loadCatalog(path, title, 1) },
                    onOpenDetail = { card -> openDetail(card) },
                )

                MainTab.CATEGORIES -> CategoriesCatalogScreen(
                    categories = categories.ifEmpty { homePayload?.categories ?: emptyList() },
                    activePath = catalogPath,
                    activeTitle = catalogTitle,
                    page = catalogPage,
                    items = catalogItems,
                    loading = catalogLoading,
                    error = catalogError,
                    onSelectCategory = { p, t, pg -> loadCatalog(p, t, pg) },
                    onOpenDetail = { card -> openDetail(card) },
                )

                MainTab.SHORTS -> CategoriesCatalogScreen(
                    categories = listOf(CategoryItem("Hot Short TV", "শর্ট টিভি", "/category/short-tv", "zone")),
                    activePath = "/category/short-tv",
                    activeTitle = "🔥 Hot Short TV",
                    page = shortsPage,
                    items = shortsItems,
                    loading = shortsLoading,
                    error = shortsError,
                    onSelectCategory = { _, _, pg -> loadShorts(pg) },
                    onOpenDetail = { card -> openDetail(card) },
                )

                MainTab.DOWNLOADS -> DownloadsAndListScreen(
                    downloads = downloads,
                    myList = myList,
                    onOpenDetail = { card -> openDetail(card) },
                )

                MainTab.ME -> MeProfileScreen(
                    trial = trialSummary,
                    baseUrl = baseUrl,
                    apiKey = apiKey,
                    onSwitchKey = {
                        isConnected = false
                        gateError = null
                    },
                )
            }
        }
    }
}

@Composable
private fun MovieBoxBottomBar(
    activeTab: MainTab,
    onSelect: (MainTab) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF15171E))
            .navigationBarsPadding(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround,
        ) {
            BottomNavSlot(
                icon = Icons.Default.Home,
                label = "Home",
                active = activeTab == MainTab.HOME,
                onClick = { onSelect(MainTab.HOME) },
            )
            BottomNavSlot(
                icon = Icons.Default.GridView,
                label = "Explore",
                badge = "HOT",
                active = activeTab == MainTab.CATEGORIES,
                onClick = { onSelect(MainTab.CATEGORIES) },
            )
            // Center Circular Shorts Button (Exact Screenshot #2)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable { onSelect(MainTab.SHORTS) }
                    .padding(horizontal = 8.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(MbColors.MintGreen, MbColors.CyanAccent)
                            )
                        )
                        .border(2.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Shorts",
                        tint = Color(0xFF051C11),
                        modifier = Modifier.size(24.dp),
                    )
                }
                Text(
                    text = "Shorts",
                    color = if (activeTab == MainTab.SHORTS) MbColors.MintGreen else Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            BottomNavSlot(
                icon = Icons.Default.Download,
                label = "Downloads",
                active = activeTab == MainTab.DOWNLOADS,
                onClick = { onSelect(MainTab.DOWNLOADS) },
            )
            BottomNavSlot(
                icon = Icons.Default.Person,
                label = "Me",
                active = activeTab == MainTab.ME,
                onClick = { onSelect(MainTab.ME) },
            )
        }
    }
}

@Composable
private fun BottomNavSlot(
    icon: ImageVector,
    label: String,
    active: Boolean,
    badge: String? = null,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        Box {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (active) MbColors.MintGreen else MbColors.TextSecondary,
                modifier = Modifier.size(22.dp),
            )
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 10.dp, y = (-3).dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(MbColors.HotRed)
                        .padding(horizontal = 3.dp),
                ) {
                    Text(badge, color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(Modifier.height(2.dp))
        Text(
            text = label,
            color = if (active) MbColors.MintGreen else MbColors.TextSecondary,
            fontSize = 10.sp,
            fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
        )
    }
}
