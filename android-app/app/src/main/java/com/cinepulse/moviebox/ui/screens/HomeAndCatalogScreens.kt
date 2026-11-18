package com.cinepulse.moviebox.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cinepulse.moviebox.model.*
import com.cinepulse.moviebox.ui.components.ComingSoonPosterCard
import com.cinepulse.moviebox.ui.components.HeroBannerPager
import com.cinepulse.moviebox.ui.components.LiveSportMatchCard
import com.cinepulse.moviebox.ui.components.MoviePosterCard
import com.cinepulse.moviebox.ui.theme.MbColors

@Composable
fun ApiKeyGateScreen(
    initialBaseUrl: String,
    initialApiKey: String,
    loading: Boolean,
    errorMessage: String?,
    onConnect: (baseUrl: String, apiKey: String) -> Unit,
) {
    val clipboard = LocalClipboardManager.current
    var baseUrl by remember { mutableStateOf(initialBaseUrl) }
    var apiKey by remember { mutableStateOf(initialApiKey) }

    fun applySmartPaste(raw: String) {
        val keyMatch = Regex("cp_tr1_[A-Za-z0-9_.-]+").find(raw)
        apiKey = keyMatch?.value ?: raw.trim()
        val urlMatch = Regex("https?://[^\\s\"'<>]+/api/trial").find(raw)
        if (urlMatch != null) {
            baseUrl = urlMatch.value
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background)
            .padding(22.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(MbColors.Surface)
                .border(1.dp, MbColors.SurfaceBorder, RoundedCornerShape(18.dp))
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MbColors.MintGreen),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color(0xFF061B11),
                        modifier = Modifier.size(28.dp),
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        text = "MovieBox Trial",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Paste Trial Key or Credentials Message",
                        color = MbColors.TextSecondary,
                        fontSize = 12.sp,
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("API Key (cp_tr1_...)", color = MbColors.TextSecondary, fontSize = 12.sp)
                Text(
                    text = "Paste Key",
                    color = MbColors.MintGreen,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable {
                            clipboard.getText()?.text?.let { applySmartPaste(it) }
                        }
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = apiKey,
                onValueChange = { applySmartPaste(it) },
                placeholder = { Text("Paste cp_tr1_... or trial message", color = MbColors.TextMuted) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MbColors.MintGreen,
                    unfocusedBorderColor = MbColors.SurfaceBorder,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
            )

            Spacer(Modifier.height(12.dp))
            Text("Server Base URL", color = MbColors.TextSecondary, fontSize = 12.sp)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = baseUrl,
                onValueChange = { baseUrl = it },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MbColors.MintGreen,
                    unfocusedBorderColor = MbColors.SurfaceBorder,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
            )

            if (!errorMessage.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0x33E50914))
                        .border(1.dp, MbColors.HotRed, RoundedCornerShape(10.dp))
                        .padding(10.dp),
                ) {
                    Text(
                        text = errorMessage,
                        color = Color(0xFFFFB4B8),
                        fontSize = 12.sp,
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            Button(
                onClick = { onConnect(baseUrl.trim(), apiKey.trim()) },
                enabled = !loading && apiKey.trim().isNotEmpty(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MbColors.MintGreen,
                    contentColor = Color(0xFF041D11),
                ),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color(0xFF041D11),
                        strokeWidth = 2.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Verifying...", fontWeight = FontWeight.Bold)
                } else {
                    Text("Connect & Launch App", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }
        }
    }
}

@Composable
fun HomeScreen(
    home: HomePayload?,
    loading: Boolean,
    error: String?,
    onRefresh: () -> Unit,
    onOpenSearch: (String) -> Unit,
    onOpenCategory: (path: String, title: String) -> Unit,
    onOpenDetail: (MovieCard) -> Unit,
) {
    val context = LocalContext.current
    var selectedFilterChip by remember { mutableStateOf("Cinema") }
    val topChannels = remember {
        listOf(
            "Trending" to "/mostwatch/7d",
            "Movies" to "/web/movie",
            "TV Series" to "/web/tv-series",
            "Anime" to "/anime",
            "Hindi Dub" to "/language/hindi-dubbed",
            "Bangla" to "/language/bangla",
            "Bollywood" to "/bollywood",
            "South Indian" to "/southIndian",
            "18+ Midnight" to "/adult18plus",
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background),
    ) {
        // MovieBox Top Search Bar (Exact Screenshot #2)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(MbColors.MintGreen),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "CinePulse",
                    tint = Color(0xFF051C11),
                    modifier = Modifier.size(22.dp),
                )
            }
            Spacer(Modifier.width(10.dp))
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MbColors.SurfaceElevated)
                    .clickable { onOpenSearch("") }
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = MbColors.TextSecondary,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = home?.hotSearches?.firstOrNull() ?: "Search movies, anime, Overflow...",
                    color = MbColors.TextSecondary,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "Search",
                    color = MbColors.MintGreen,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        // Scrollable Channel Tabs Strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            topChannels.forEachIndexed { idx, (label, path) ->
                Text(
                    text = label,
                    color = if (idx == 0) Color.White else MbColors.TextSecondary,
                    fontSize = if (idx == 0) 16.sp else 14.sp,
                    fontWeight = if (idx == 0) FontWeight.Bold else FontWeight.Medium,
                    modifier = Modifier
                        .clickable { onOpenCategory(path, label) }
                        .padding(vertical = 4.dp),
                )
            }
        }

        if (loading && home == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MbColors.MintGreen)
            }
            return
        }

        if (error != null && home == null) {
            Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(error, color = Color(0xFFFFA5AA), fontSize = 13.sp)
                    Spacer(Modifier.height(10.dp))
                    Button(
                        onClick = onRefresh,
                        colors = ButtonDefaults.buttonColors(containerColor = MbColors.MintGreen),
                    ) {
                        Text("Retry", color = Color(0xFF041D11), fontWeight = FontWeight.Bold)
                    }
                }
            }
            return
        }

        val payload = home ?: return
        val combinedSections = remember(payload) {
            val map = LinkedHashMap<String, HomeSection>()
            (payload.sections + payload.allOfficialSections).forEach { s ->
                val key = s.title.lowercase().trim()
                if (!map.containsKey(key) && s.items.isNotEmpty()) {
                    map[key] = s
                }
            }
            map.values.toList()
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            if (payload.banners.isNotEmpty()) {
                item {
                    HeroBannerPager(
                        banners = payload.banners,
                        onBannerClick = { b ->
                            onOpenDetail(
                                MovieCard(
                                    id = b.id,
                                    title = b.title,
                                    path = b.path,
                                    poster = b.image,
                                    quality = b.badge,
                                    rating = "",
                                    language = "",
                                    typeBadge = "MOVIE",
                                )
                            )
                        },
                    )
                }
            }

            if (payload.liveSports.isNotEmpty()) {
                item {
                    Column {
                        SectionTitleRow("Live", showAll = false, onAll = {})
                        Spacer(Modifier.height(8.dp))
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(payload.liveSports, key = { it.id }) { sp ->
                                LiveSportMatchCard(
                                    sport = sp,
                                    onWatchClick = {
                                        if (sp.liveUrl.startsWith("http")) {
                                            runCatching {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(sp.liveUrl)))
                                            }
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }

            if (payload.trending.isNotEmpty()) {
                item {
                    Column {
                        SectionTitleRow(
                            title = "Trending Movies",
                            showAll = true,
                            onAll = { onOpenCategory("/mostwatch/7d", "Trending Movies") },
                        )
                        Spacer(Modifier.height(8.dp))
                        val filterChips = listOf("Cinema", "Hindi Dubbed", "New Bengali", "Bollywood")
                        Row(
                            modifier = Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            filterChips.forEach { chip ->
                                val active = chip == selectedFilterChip
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (active) MbColors.SurfaceElevated else Color.Transparent)
                                        .border(
                                            1.dp,
                                            if (active) MbColors.SurfaceBorder else Color.Transparent,
                                            RoundedCornerShape(8.dp),
                                        )
                                        .clickable {
                                            selectedFilterChip = chip
                                            when (chip) {
                                                "Hindi Dubbed" -> onOpenCategory("/language/hindi-dubbed", "Hindi Dubbed")
                                                "New Bengali" -> onOpenCategory("/language/bangla", "Bangla Movies")
                                                "Bollywood" -> onOpenCategory("/bollywood", "Bollywood")
                                            }
                                        }
                                        .padding(horizontal = 12.dp, vertical = 6.dp),
                                ) {
                                    Text(
                                        text = chip,
                                        color = if (active) Color.White else MbColors.TextSecondary,
                                        fontSize = 13.sp,
                                        fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            itemsIndexed(payload.trending.take(15)) { idx, movie ->
                                MoviePosterCard(
                                    item = movie,
                                    rankNumber = if (idx < 10) idx + 1 else null,
                                    onClick = { onOpenDetail(movie) },
                                )
                            }
                        }
                    }
                }
            }

            if (payload.comingSoon.isNotEmpty()) {
                item {
                    Column {
                        SectionTitleRow(
                            title = "Coming Soon",
                            showAll = true,
                            onAll = { onOpenCategory("/upcoming", "Coming Soon") },
                        )
                        Spacer(Modifier.height(8.dp))
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(payload.comingSoon, key = { it.id }) { cs ->
                                ComingSoonPosterCard(
                                    item = cs,
                                    onClick = {
                                        onOpenDetail(
                                            MovieCard(
                                                id = cs.id,
                                                title = cs.title,
                                                path = cs.path,
                                                poster = cs.poster,
                                                quality = "Soon",
                                                rating = "",
                                                language = "",
                                                typeBadge = "MOVIE",
                                            )
                                        )
                                    },
                                )
                            }
                        }
                    }
                }
            }

            items(combinedSections, key = { it.id + it.title }) { sec ->
                Column {
                    SectionTitleRow(
                        title = sec.title,
                        showAll = true,
                        onAll = { onOpenCategory(sec.categoryPath.ifBlank { "/" }, sec.title) },
                    )
                    Spacer(Modifier.height(8.dp))
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(sec.items, key = { "${sec.id}-${it.id}-${it.path}" }) { item ->
                            MoviePosterCard(item = item, onClick = { onOpenDetail(item) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitleRow(
    title: String,
    showAll: Boolean,
    onAll: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            color = Color.White,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
        )
        if (showAll) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onAll() },
            ) {
                Text("All", color = MbColors.TextSecondary, fontSize = 13.sp)
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MbColors.TextSecondary,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

@Composable
fun SearchScreen(
    initialQuery: String,
    hotSearches: List<String>,
    results: List<MovieCard>,
    loading: Boolean,
    error: String?,
    onQuerySubmit: (String) -> Unit,
    onBack: () -> Unit,
    onOpenDetail: (MovieCard) -> Unit,
) {
    var query by remember { mutableStateOf(initialQuery) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(42.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MbColors.SurfaceElevated)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.Search, contentDescription = null, tint = MbColors.TextSecondary, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    cursorBrush = SolidColor(MbColors.MintGreen),
                    textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = {
                        if (query.trim().isNotEmpty()) onQuerySubmit(query.trim())
                    }),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (query.isEmpty()) {
                            Text("Search MovieBox (e.g. Overflow, Squid Game)", color = MbColors.TextMuted, fontSize = 13.sp)
                        }
                        inner()
                    },
                )
                if (query.isNotEmpty()) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear",
                        tint = MbColors.TextSecondary,
                        modifier = Modifier.size(18.dp).clickable { query = "" },
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Search",
                color = MbColors.MintGreen,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { if (query.trim().isNotEmpty()) onQuerySubmit(query.trim()) }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            )
        }

        if (hotSearches.isNotEmpty()) {
            Text(
                text = "Hot Searches",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
            )
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                hotSearches.forEach { kw ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(MbColors.SurfaceElevated)
                            .clickable {
                                query = kw
                                onQuerySubmit(kw)
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text(kw, color = MbColors.TextPrimary, fontSize = 12.sp)
                    }
                }
            }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MbColors.MintGreen)
            }
            error != null -> Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                Text(error, color = Color(0xFFFFA5AA), fontSize = 13.sp)
            }
            results.isEmpty() && query.isNotBlank() -> Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Text("Press Search to load results from MovieBox.", color = MbColors.TextSecondary, fontSize = 13.sp)
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                items(results, key = { it.id + it.path }) { item ->
                    MoviePosterCard(item = item, onClick = { onOpenDetail(item) }, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
fun CategoriesCatalogScreen(
    categories: List<CategoryItem>,
    activePath: String,
    activeTitle: String,
    page: Int,
    items: List<MovieCard>,
    loading: Boolean,
    error: String?,
    onSelectCategory: (path: String, title: String, page: Int) -> Unit,
    onOpenDetail: (MovieCard) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(activeTitle, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("${categories.size} Categories · Page $page", color = MbColors.TextSecondary, fontSize = 11.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = { if (page > 1) onSelectCategory(activePath, activeTitle, page - 1) },
                    enabled = page > 1 && !loading,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Text("Prev", color = Color.White, fontSize = 12.sp)
                }
                Button(
                    onClick = { onSelectCategory(activePath, activeTitle, page + 1) },
                    enabled = !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = MbColors.MintGreen),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                ) {
                    Text("Next", color = Color(0xFF041D11), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // All 77 categories horizontal selector
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            categories.forEach { cat ->
                val selected = cat.path == activePath
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            when {
                                selected -> MbColors.MintGreen
                                cat.isAdult -> Color(0x33E50914)
                                else -> MbColors.SurfaceElevated
                            }
                        )
                        .border(
                            1.dp,
                            if (cat.isAdult && !selected) MbColors.HotRed else Color.Transparent,
                            RoundedCornerShape(16.dp),
                        )
                        .clickable { onSelectCategory(cat.path, cat.label, 1) }
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                ) {
                    Text(
                        text = cat.label,
                        color = if (selected) Color(0xFF041D11) else Color.White,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MbColors.MintGreen)
            }
            error != null -> Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                Text(error, color = Color(0xFFFFA5AA), fontSize = 13.sp)
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 96.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                items(items, key = { it.id + it.path }) { item ->
                    MoviePosterCard(item = item, onClick = { onOpenDetail(item) }, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
fun DownloadsAndListScreen(
    downloads: List<DownloadRecord>,
    myList: List<MovieCard>,
    onOpenDetail: (MovieCard) -> Unit,
) {
    var tab by remember { mutableIntStateOf(0) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background)
            .padding(top = 12.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            listOf("Downloads (${downloads.size})", "My List (${myList.size})").forEachIndexed { i, title ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (tab == i) MbColors.MintGreen else MbColors.SurfaceElevated)
                        .clickable { tab = i }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Text(
                        text = title,
                        color = if (tab == i) Color(0xFF041D11) else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        if (tab == 0) {
            if (downloads.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No downloads yet. Open any movie and tap Download!", color = MbColors.TextSecondary, fontSize = 13.sp)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(start = 14.dp, end = 14.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(downloads, key = { it.downloadId }) { d ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(MbColors.Surface)
                                .clickable {
                                    onOpenDetail(
                                        MovieCard(
                                            id = d.path,
                                            title = d.title,
                                            path = d.path,
                                            poster = d.poster,
                                            quality = d.quality,
                                            rating = "",
                                            language = d.audio,
                                            typeBadge = "MOVIE",
                                        )
                                    )
                                }
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AsyncImage(
                                model = d.poster,
                                contentDescription = d.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(width = 56.dp, height = 76.dp).clip(RoundedCornerShape(8.dp)),
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(d.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Spacer(Modifier.height(4.dp))
                                Text("${d.quality} · ${d.audio}", color = MbColors.MintGreen, fontSize = 12.sp)
                                Text("Saved to Android Downloads (ID #${d.downloadId})", color = MbColors.TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        } else {
            if (myList.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tap Add to List on any title to save it here.", color = MbColors.TextSecondary, fontSize = 13.sp)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 96.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(myList, key = { it.path }) { item ->
                        MoviePosterCard(item = item, onClick = { onOpenDetail(item) }, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@Composable
fun MeProfileScreen(
    trial: TrialSummary,
    baseUrl: String,
    apiKey: String,
    onSwitchKey: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MbColors.Background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(MbColors.MintGreen),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF041D11), modifier = Modifier.size(30.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    text = trial.clientName.ifBlank { "MovieBox HD User" },
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text("Unlimited Free Streaming · All 77+ Categories", color = MbColors.MintGreen, fontSize = 12.sp)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MbColors.Surface)
                .border(1.dp, MbColors.SurfaceBorder, RoundedCornerShape(14.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("App Status", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text("Status: Connected & Unlimited", color = MbColors.MintGreen, fontSize = 13.sp)
            Text("Features: Hindi Dub + Original Audio, 18+ Midnight, Live Sports, HD Downloads", color = MbColors.TextSecondary, fontSize = 12.sp)
            Text("Server: $baseUrl", color = MbColors.TextMuted, fontSize = 11.sp)
        }

        Button(
            onClick = onSwitchKey,
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MbColors.SurfaceElevated),
        ) {
            Text("Optional: Custom Server / Trial Key", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
