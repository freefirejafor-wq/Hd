package com.cinepulse.app.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cinepulse.app.data.CinePulseCatalogData
import com.cinepulse.app.data.MovieCardItem
import com.cinepulse.app.ui.CinePulseViewModel
import com.cinepulse.app.ui.MainTab
import com.cinepulse.app.ui.components.LiveSportMatchCard
import com.cinepulse.app.ui.components.WebsitePosterCard
import com.cinepulse.app.ui.components.WebsiteSearchResultRow
import com.cinepulse.app.ui.theme.CineColors
import kotlinx.coroutines.delay
import kotlin.math.max
import kotlin.math.min

@Composable
fun WebsiteBrowseScreen(vm: CinePulseViewModel) {
    // SEARCH ACTIVE MODE
    if (vm.isSearchActive) {
        val rows = vm.searchFilteredPool()
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(CineColors.Background),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (vm.searchQuery.isBlank() && vm.submittedSearch.isBlank() && vm.recentSearches.isNotEmpty()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Recent Searches", color = Color(0xFFD1D5DB), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                text = "Clear",
                                color = Color(0xFF9CA3AF),
                                fontSize = 11.sp,
                                modifier = Modifier.clickable { vm.clearRecentSearches() }
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(vm.recentSearches) { term ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFF1C1F26))
                                        .clickable { vm.submitSearch(term) }
                                        .padding(horizontal = 12.dp, vertical = 7.dp)
                                ) {
                                    Text(term, color = Color(0xFFE5E7EB), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = CineColors.BorderSubtle)
                    }
                }
            }

            if (vm.isSearching) {
                item {
                    Row(
                        modifier = Modifier.padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Text("Searching CinePulse HD...", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                    }
                }
            }

            if (rows.isEmpty() && !vm.isSearching) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Filled.Movie, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(40.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No results found for \"${vm.searchQuery.ifEmpty { vm.submittedSearch }}\"",
                            color = Color(0xFFD1D5DB),
                            fontSize = 13.sp
                        )
                    }
                }
            } else {
                itemsIndexed(rows.take(48), key = { i, m -> "sr-${m.path}-$i" }) { idx, item ->
                    WebsiteSearchResultRow(movie = item, idx = idx) {
                        if (vm.searchQuery.isNotBlank()) vm.saveRecentSearch(vm.searchQuery)
                        vm.openMovie(item)
                    }
                    HorizontalDivider(color = Color.White.copy(alpha = 0.04f))
                }
            }
        }
        return
    }

    // NORMAL HOME / CATEGORY BROWSE VIEW
    val home = vm.homePayload
    val heroSlides = remember(home.banners, vm.rawCatalogItems) {
        (home.banners + vm.rawCatalogItems).distinctBy { it.path }.take(8)
    }
    var heroSlideIdx by remember { mutableIntStateOf(0) }
    LaunchedEffect(heroSlides.size) {
        if (heroSlides.size > 1) {
            while (true) {
                delay(4800)
                heroSlideIdx = (heroSlideIdx + 1) % heroSlides.size
            }
        }
    }

    val displayedItems = vm.filteredBrowseItems()
    var jumpInput by remember(vm.currentPage) { mutableStateOf("") }
    var showQualityMenu by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CineColors.Background),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 10.dp, bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        // 1. SPOTLIGHT HERO + PROTRUDING MINI CARDS STRIP (Page 1 only)
        if (vm.submittedSearch.isEmpty() && vm.currentPage == 1 && heroSlides.isNotEmpty()) {
            val safeIdx = heroSlideIdx % heroSlides.size
            val spotlight = heroSlides[safeIdx]
            item {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 10f)
                            .clip(RoundedCornerShape(18.dp))
                            .background(CineColors.Surface)
                            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(18.dp))
                            .clickable { vm.openMovie(spotlight) }
                    ) {
                        AsyncImage(
                            model = spotlight.previewImage.ifEmpty { spotlight.poster },
                            contentDescription = spotlight.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        // Top-left Spotlight badge + Dot Indicators
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.Black.copy(alpha = 0.65f))
                                    .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 9.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = if (vm.currentCategory.path == "/") "🔥 Spotlight" else vm.currentCategory.label.uppercase(),
                                    color = CineColors.AccentGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Row(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.5f))
                                    .padding(horizontal = 8.dp, vertical = 5.dp),
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                heroSlides.forEachIndexed { dotIdx, _ ->
                                    Box(
                                        modifier = Modifier
                                            .height(6.dp)
                                            .width(if (dotIdx == safeIdx) 18.dp else 6.dp)
                                            .clip(CircleShape)
                                            .background(if (dotIdx == safeIdx) CineColors.AccentGreen else Color.White.copy(alpha = 0.4f))
                                            .clickable { heroSlideIdx = dotIdx }
                                    )
                                }
                            }
                        }

                        // Bottom gradient fade
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .fillMaxHeight(0.6f)
                                .background(
                                    Brush.verticalGradient(
                                        listOf(Color.Transparent, CineColors.Background.copy(alpha = 0.72f), CineColors.Background)
                                    )
                                )
                        )

                        // Title & Meta
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(start = 14.dp, end = 14.dp, bottom = 30.dp)
                        ) {
                            Text(
                                text = spotlight.title,
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                if (spotlight.rating.isNotEmpty()) {
                                    Icon(Icons.Filled.Star, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(12.dp))
                                    Text(spotlight.rating, color = CineColors.Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Text("•", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                                }
                                Text(CinePulseCatalogData.formatShortLanguage(spotlight.language), color = CineColors.AccentGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                if (spotlight.quality.isNotEmpty()) {
                                    Text("•", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color.White.copy(alpha = 0.16f))
                                            .padding(horizontal = 5.dp, vertical = 1.dp)
                                    ) {
                                        Text(spotlight.quality, color = Color.White, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    // Overlapping Mini Cards Strip (-22dp pull up)
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .offset(y = (-22).dp),
                        contentPadding = PaddingValues(horizontal = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        itemsIndexed(heroSlides) { idx, card ->
                            val isCurrent = idx == safeIdx
                            val yearStr = Regex("(20\\d{2}|19\\d{2})").find(card.title)?.value ?: "2026"
                            val isSeries = card.typeBadge == "SERIES" || card.typeBadge == "DRAMA" || card.episodePill.isNotEmpty()
                            val genreLabel = if (card.typeBadge == "ANIME") "Anime" else if (isSeries) "Series" else "Cinema"
                            Row(
                                modifier = Modifier
                                    .width(196.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isCurrent) Color(0xFF1E232C) else Color(0xFF181A20))
                                    .border(
                                        1.dp,
                                        if (isCurrent) CineColors.AccentGreen.copy(alpha = 0.8f) else CineColors.BorderSubtle,
                                        RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        heroSlideIdx = idx
                                        vm.openMovie(card)
                                    }
                                    .padding(horizontal = 9.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                AsyncImage(
                                    model = card.poster,
                                    contentDescription = card.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(width = 38.dp, height = 52.dp)
                                        .clip(RoundedCornerShape(7.dp))
                                        .background(CineColors.Surface)
                                        .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(7.dp))
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = card.title,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                        Icon(
                                            if (isSeries) Icons.Filled.Tv else Icons.Filled.Movie,
                                            contentDescription = null,
                                            tint = Color(0xFF9CA3AF),
                                            modifier = Modifier.size(10.dp)
                                        )
                                        Text("| $yearStr | $genreLabel", color = Color(0xFF9CA3AF), fontSize = 9.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(Brush.horizontalGradient(listOf(CineColors.AccentGreen, CineColors.AccentTeal))),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color(0xFF050505), modifier = Modifier.size(15.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. HOME OFFICIAL SHELVES (When on "/" Page 1)
        if (vm.submittedSearch.isEmpty() && vm.currentPage == 1 && vm.currentCategory.path == "/") {
            // 2a. Categories Visual Strip
            if (home.quickCategories.isNotEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.Layers, contentDescription = null, tint = CineColors.AccentGreen, modifier = Modifier.size(16.dp))
                                Text("Categories", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                                Text("· ক্যাটাগরি সমূহ", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.clickable { vm.activeTab = MainTab.EXPLORE }
                            ) {
                                Text("All Categories", color = CineColors.AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = CineColors.AccentGreen, modifier = Modifier.size(16.dp))
                            }
                        }
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(home.quickCategories.filter { it.id != "qc-sports" }, key = { it.id }) { qc ->
                                Box(
                                    modifier = Modifier
                                        .size(width = 128.dp, height = 60.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF14171D))
                                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(12.dp))
                                        .clickable { vm.selectCategoryByPath(qc.path) }
                                ) {
                                    AsyncImage(
                                        model = qc.image,
                                        contentDescription = qc.title,
                                        contentScale = ContentScale.Crop,
                                        alpha = 0.38f,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(Brush.horizontalGradient(listOf(Color(0xF20C0E12), Color(0xB30C0E12), Color.Transparent)))
                                    )
                                    Column(
                                        modifier = Modifier
                                            .align(Alignment.CenterStart)
                                            .padding(horizontal = 10.dp)
                                    ) {
                                        Text(qc.title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(qc.bnTitle, color = Color(0xFFD1D5DB), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2b. Continue Watching Strip (if user has watch history)
            if (vm.continueWatching.isNotEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(modifier = Modifier.size(width = 4.dp, height = 14.dp).clip(CircleShape).background(CineColors.RedPrimary))
                                Text("Continue Watching", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                                Text("· যেখান থেকে শেষ করেছেন", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            }
                            Text(
                                text = "See all >",
                                color = CineColors.RedBright,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable { vm.activeTab = MainTab.DOWNLOADS }
                            )
                        }
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            items(vm.continueWatching.take(12), key = { "cw-${it.movie.path}" }) { cw ->
                                val ratio = if (cw.durationSeconds > 0) cw.progressSeconds.toFloat() / cw.durationSeconds.toFloat() else 0.35f
                                val epPrefix = if (cw.episodeLabel.isNotEmpty()) "${cw.episodeLabel} · " else ""
                                val lbl = "${epPrefix}Resume ${formatSec(cw.progressSeconds)}"
                                WebsitePosterCard(
                                    movie = cw.movie,
                                    onClick = { vm.openMovie(cw.movie) },
                                    modifier = Modifier.width(106.dp),
                                    progressRatio = ratio,
                                    resumeLabel = lbl
                                )
                            }
                        }
                    }
                }
            }

            // 2c. Coming Soon Shelf with Remind / Booked Toggle
            if (home.comingSoon.isNotEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Filled.CalendarMonth, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(16.dp))
                                Text("Coming Soon", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                                Text("· আপকামিং রিলিজ", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.clickable { vm.selectCategoryByPath("/upcoming") }
                            ) {
                                Text("More", color = CineColors.AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = CineColors.AccentGreen, modifier = Modifier.size(16.dp))
                            }
                        }

                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(home.comingSoon, key = { it.id }) { item ->
                                val isBooked = vm.bookedComingSoonIds.contains(item.id)
                                val displayCount = item.bookedCount + if (isBooked) 1 else 0
                                Column(
                                    modifier = Modifier
                                        .width(106.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFF111318))
                                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFF181B22))
                                            .padding(horizontal = 7.dp, vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(item.releaseBadge, color = CineColors.AccentGreen, fontSize = 9.5.sp, fontWeight = FontWeight.ExtraBold)
                                        Text("$displayCount", color = Color(0xFF9CA3AF), fontSize = 9.sp)
                                    }
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clickable {
                                                vm.isSearchActive = true
                                                vm.submitSearch(item.title)
                                            }
                                    ) {
                                        AsyncImage(
                                            model = item.poster,
                                            contentDescription = item.title,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.BottomCenter)
                                                .fillMaxWidth()
                                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))))
                                                .padding(5.dp)
                                        ) {
                                            Text(item.country.ifEmpty { item.genre }, color = Color(0xFFD1D5DB), fontSize = 9.sp, maxLines = 1)
                                        }
                                    }
                                    Text(
                                        text = item.title,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                    )
                                    Box(
                                        modifier = Modifier
                                            .padding(horizontal = 6.dp, vertical = 5.dp)
                                            .fillMaxWidth()
                                            .height(25.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isBooked) CineColors.AccentGreen.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.08f))
                                            .border(
                                                1.dp,
                                                if (isBooked) CineColors.AccentGreen.copy(alpha = 0.45f) else CineColors.BorderSubtle,
                                                RoundedCornerShape(6.dp)
                                            )
                                            .clickable { vm.toggleBookComingSoon(item.id) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                            Icon(Icons.Filled.NotificationsActive, contentDescription = null, tint = if (isBooked) CineColors.AccentGreen else Color.White, modifier = Modifier.size(11.dp))
                                            Text(if (isBooked) "Booked ✓" else "Remind", color = if (isBooked) CineColors.AccentGreen else Color.White, fontSize = 9.5.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2d. Official Horizontal Shelves (Trending Drama, Bengali, Bollywood, South, Anime, etc.)
            items(home.sections, key = { it.id }) { shelf ->
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(modifier = Modifier.size(width = 4.dp, height = 14.dp).clip(CircleShape).background(CineColors.AccentGreen))
                            Text(shelf.title, color = Color.White, fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            if (shelf.badge.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(CineColors.AccentGreen.copy(alpha = 0.16f))
                                        .border(1.dp, CineColors.AccentGreen.copy(alpha = 0.35f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 5.dp, vertical = 1.dp)
                                ) {
                                    Text(shelf.badge, color = CineColors.AccentGreen, fontSize = 8.5.sp, fontWeight = FontWeight.ExtraBold)
                                }
                            }
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { vm.selectCategoryByPath(shelf.categoryPath) }
                        ) {
                            Text("More", color = Color(0xFFD1D5DB), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(15.dp))
                        }
                    }

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        itemsIndexed(shelf.items, key = { i, m -> "${shelf.id}-${m.path}-$i" }) { _, item ->
                            WebsitePosterCard(
                                movie = item,
                                isSaved = vm.isInWatchlist(item),
                                onToggleSave = { vm.toggleWatchlist(item) },
                                onClick = { vm.openMovie(item) },
                                modifier = Modifier.width(102.dp)
                            )
                        }
                    }
                }
            }
        }

        // 3. LIVE SPORTS CARDS (When Live Sports Tab is selected)
        if (vm.currentCategory.path == "/sports" && home.liveSports.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("🏏⚽ Live Cricket & Football Matches", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                    home.liveSports.forEach { match ->
                        LiveSportMatchCard(
                            match = match,
                            onClick = { vm.openLiveSportMatch(match) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        // 4. PRIMARY CATALOG FILTER HEADER + 3-COLUMN POSTER GRID
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CineColors.Surface)
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(16.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Filled.LocalFireDepartment, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(18.dp))
                        Text(
                            text = if (vm.submittedSearch.isNotEmpty()) "সার্চ ফলাফল: \"${vm.submittedSearch}\"" else "${vm.currentCategory.label} · ${vm.currentCategory.bnLabel}",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text("Page ${vm.currentPage}/${vm.maxPage}", color = CineColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                // Audio Filter Chips
                val audioOptions = listOf(
                    "ALL" to "All Audio",
                    "BANGLA" to "Bengali",
                    "HINDI" to "Hindi",
                    "DUAL" to "Dual Audio",
                    "SUB" to "Anime / Sub"
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(audioOptions) { (id, lbl) ->
                        val active = vm.audioFilter == id
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (active) CineColors.RedPrimary else Color(0xFF141414))
                                .border(1.dp, if (active) CineColors.RedPrimary else CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                                .clickable { vm.audioFilter = id }
                                .padding(horizontal = 11.dp, vertical = 6.dp)
                        ) {
                            Text(lbl, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Quality & Sort Dropdown Selectors
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box {
                        val qLabel = when (vm.qualityFilter) {
                            "4K" -> "4K UHD"
                            "1080P" -> "1080p FHD"
                            "WEBDL" -> "WEB-DL"
                            "HDTC" -> "HDTC"
                            else -> "All Quality"
                        }
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF141414))
                                .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(10.dp))
                                .clickable { showQualityMenu = true }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Filled.Tune, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(13.dp))
                            Text(qLabel, color = Color(0xFFE5E7EB), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(14.dp))
                        }
                        DropdownMenu(expanded = showQualityMenu, onDismissRequest = { showQualityMenu = false }) {
                            listOf("ALL" to "All Quality", "4K" to "4K UHD", "1080P" to "1080p FHD", "WEBDL" to "WEB-DL", "HDTC" to "HDTC").forEach { (id, lbl) ->
                                DropdownMenuItem(text = { Text(lbl) }, onClick = {
                                    vm.qualityFilter = id
                                    showQualityMenu = false
                                })
                            }
                        }
                    }

                    Box {
                        val sLabel = when (vm.sortBy) {
                            "LATEST" -> "Latest Upload"
                            "RATING" -> "Top Rated"
                            "VIEWS" -> "Most Popular"
                            "TITLE" -> "A–Z"
                            else -> "Hot & New"
                        }
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF141414))
                                .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(10.dp))
                                .clickable { showSortMenu = true }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(sLabel, color = Color(0xFFE5E7EB), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Color(0xFF9CA3AF), modifier = Modifier.size(14.dp))
                        }
                        DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                            listOf("HOT_HYPE" to "Hot & New", "LATEST" to "Latest Upload", "RATING" to "Top Rated", "VIEWS" to "Most Popular", "TITLE" to "A–Z").forEach { (id, lbl) ->
                                DropdownMenuItem(text = { Text(lbl) }, onClick = {
                                    vm.sortBy = id
                                    showSortMenu = false
                                })
                            }
                        }
                    }
                }
            }
        }

        if (vm.isLoadingCatalog) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF101010))
                        .padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(color = CineColors.RedBright, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("লোড হচ্ছে (Page ${vm.currentPage})...", color = Color(0xFFD1D5DB), fontSize = 12.sp)
                }
            }
        }

        if (displayedItems.isEmpty() && !vm.isLoadingCatalog) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(CineColors.Surface)
                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(18.dp))
                        .padding(26.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Filled.Movie, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(34.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("কোনো মুভি বা সিরিজ পাওয়া যায়নি", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            vm.audioFilter = "ALL"
                            vm.qualityFilter = "ALL"
                            vm.sortBy = "HOT_HYPE"
                            vm.selectCategory(CinePulseCatalogData.ALL_CATEGORIES.first())
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                        shape = CircleShape
                    ) {
                        Text("Reset Filters", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        } else {
            val chunked = displayedItems.chunked(3)
            itemsIndexed(chunked, key = { i, _ -> "grid-row-$i-${vm.currentPage}-${vm.currentCategory.path}" }) { _, rowItems ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    rowItems.forEach { movie ->
                        WebsitePosterCard(
                            movie = movie,
                            isSaved = vm.isInWatchlist(movie),
                            onToggleSave = { vm.toggleWatchlist(movie) },
                            onClick = { vm.openMovie(movie) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    repeat(3 - rowItems.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        // 5. TOP 10 THIS WEEK RAIL (Page 1)
        if (vm.submittedSearch.isEmpty() && vm.currentPage == 1) {
            val top10 = vm.top10ThisWeekItems()
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Filled.EmojiEvents, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(16.dp))
                            Text("TOP 10 THIS WEEK · সেরা ১০ হিট", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { vm.selectCategoryByPath("/mostwatch/7d") }
                        ) {
                            Text("Most Watched", color = CineColors.RedBright, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(15.dp))
                        }
                    }

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        itemsIndexed(top10, key = { i, m -> "top10-${m.path}-$i" }) { idx, m ->
                            WebsitePosterCard(
                                movie = m,
                                rankBadge = "#${idx + 1}",
                                onClick = { vm.openMovie(m) },
                                modifier = Modifier.width(108.dp)
                            )
                        }
                    }
                }
            }
        }

        // 6. BOTTOM 520-PAGE PAGINATION BAR
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CineColors.Surface)
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(16.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val prevEnabled = vm.currentPage > 1
                    Box(
                        modifier = Modifier
                            .height(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (prevEnabled) Color(0xFF141414) else Color(0xFF0D0D0D))
                            .clickable(enabled = prevEnabled) { vm.changePage(vm.currentPage - 1) }
                            .padding(horizontal = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Prev", color = if (prevEnabled) Color.White else Color(0xFF4B5563), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(6.dp))

                    val start = max(1, min(vm.currentPage - 2, vm.maxPage - 4))
                    (0 until 5).forEach { offset ->
                        val p = start + offset
                        if (p in 1..vm.maxPage) {
                            val active = p == vm.currentPage
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (active) CineColors.RedPrimary else Color(0xFF141414))
                                    .clickable { vm.changePage(p) },
                                contentAlignment = Alignment.Center
                            ) {
                                Text("$p", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(5.dp))
                        }
                    }

                    val nextEnabled = vm.currentPage < vm.maxPage
                    Box(
                        modifier = Modifier
                            .height(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (nextEnabled) Color(0xFF141414) else Color(0xFF0D0D0D))
                            .clickable(enabled = nextEnabled) { vm.changePage(vm.currentPage + 1) }
                            .padding(horizontal = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Next", color = if (nextEnabled) Color.White else Color(0xFF4B5563), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = jumpInput,
                        onValueChange = { s -> jumpInput = s.filter { it.isDigit() } },
                        placeholder = { Text("Page (1-${vm.maxPage})", fontSize = 11.sp, color = Color(0xFF9CA3AF)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Go),
                        keyboardActions = KeyboardActions(onGo = {
                            jumpInput.toIntOrNull()?.let { vm.changePage(it) }
                        }),
                        modifier = Modifier.width(140.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { jumpInput.toIntOrNull()?.let { vm.changePage(it) } },
                        colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.height(44.dp)
                    ) {
                        Text("Go", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun WebsiteExploreScreen(vm: CinePulseViewModel) {
    val sections = listOf(
        "zone" to "Featured Zones",
        "language" to "Languages & Audio Dubs",
        "genre" to "Movie & Anime Genres",
        "collection" to "Curated Franchises & Collections"
    )
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CineColors.Background),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(CineColors.Surface)
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(18.dp))
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Explore All 55+ Categories & Zones", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                    Text("যেকোনো ক্যাটাগরিতে ট্যাপ করে ৫২০+ পেজের সব মুভি ও সিরিজ দেখুন", color = Color(0xFF9CA3AF), fontSize = 11.sp)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CineColors.RedPrimary)
                        .clickable { vm.activeTab = MainTab.HOME_BROWSE }
                        .padding(horizontal = 12.dp, vertical = 7.dp)
                ) {
                    Text("Back Home", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }

        sections.forEach { (groupKey, groupTitle) ->
            val groupItems = vm.categories.filter { it.group == groupKey }
            if (groupItems.isNotEmpty()) {
                item {
                    Text(groupTitle, color = CineColors.RedBright, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                }
                val rows = groupItems.chunked(2)
                itemsIndexed(rows, key = { i, _ -> "exp-$groupKey-$i" }) { _, pair ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        pair.forEach { cat ->
                            val selected = vm.currentCategory.path == cat.path
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(if (selected) CineColors.RedDark.copy(alpha = 0.45f) else CineColors.SurfaceCard)
                                    .border(1.dp, if (selected) CineColors.RedPrimary else CineColors.BorderSubtle, RoundedCornerShape(14.dp))
                                    .clickable { vm.selectCategory(cat) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp)
                            ) {
                                Text(cat.label, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(cat.bnLabel, color = Color(0xFF9CA3AF), fontSize = 10.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        if (pair.size == 1) Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun WebsiteDownloadsScreen(vm: CinePulseViewModel) {
    val context = LocalContext.current
    val folders = listOf(
        "all" to "All (${vm.watchlist.size})",
        "favorites" to "Favorites (${vm.watchlist.count { (it.folder ?: "favorites") == "favorites" }})",
        "watch_later" to "Watch Later (${vm.watchlist.count { it.folder == "watch_later" }})",
        "anime_series" to "Series & Anime (${vm.watchlist.count { it.folder == "anime_series" }})"
    )
    val filteredList = remember(vm.watchlist, vm.selectedWatchlistFolder) {
        if (vm.selectedWatchlistFolder == "all") vm.watchlist
        else vm.watchlist.filter { (it.folder ?: "favorites") == vm.selectedWatchlistFolder }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CineColors.Background),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(CineColors.Surface)
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(18.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("My List & Saved Downloads (${vm.watchlist.size})", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                        Text(
                            text = "শুধুমাত্র আপনার ব্যক্তিগত সেভ করা মুভি ও হিস্ট্রি",
                            color = Color(0xFF9CA3AF),
                            fontSize = 11.sp
                        )
                    }
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color(0xFF141414))
                            .border(1.dp, CineColors.BorderStrong, CircleShape)
                            .clickable {
                                val json = vm.exportWatchlistJson()
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, json)
                                }
                                context.startActivity(Intent.createChooser(intent, "Backup CinePulse List"))
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Filled.Download, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(13.dp))
                            Text("Backup", color = Color(0xFFE5E7EB), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(folders) { (id, lbl) ->
                        val active = vm.selectedWatchlistFolder == id
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(if (active) CineColors.RedPrimary else Color(0xFF141414))
                                .clickable { vm.selectedWatchlistFolder = id }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(lbl, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        if (filteredList.isEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 36.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Filled.Bookmark, contentDescription = null, tint = Color(0xFF6B7280), modifier = Modifier.size(34.dp))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("No movies saved in this folder yet", color = Color(0xFFD1D5DB), fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { vm.activeTab = MainTab.HOME_BROWSE },
                        colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                        shape = CircleShape
                    ) {
                        Text("Discover Movies", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        } else {
            val chunked = filteredList.chunked(3)
            itemsIndexed(chunked, key = { i, _ -> "dl-row-$i" }) { _, row ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { m ->
                        WebsitePosterCard(
                            movie = m,
                            isSaved = true,
                            onToggleSave = { vm.toggleWatchlist(m) },
                            onClick = { vm.openMovie(m) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                }
            }
        }

        if (vm.continueWatching.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Recent Watch History (${vm.continueWatching.size})", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { vm.clearWatchHistory() }
                    ) {
                        Icon(Icons.Filled.Delete, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Clear", color = CineColors.RedBright, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            val cwRows = vm.continueWatching.chunked(3)
            itemsIndexed(cwRows, key = { i, _ -> "dl-cw-$i" }) { _, row ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { cw ->
                        val ratio = if (cw.durationSeconds > 0) cw.progressSeconds.toFloat() / cw.durationSeconds.toFloat() else 0.4f
                        WebsitePosterCard(
                            movie = cw.movie,
                            onClick = { vm.openMovie(cw.movie) },
                            modifier = Modifier.weight(1f),
                            progressRatio = ratio,
                            resumeLabel = "${cw.episodeLabel.ifEmpty { "Movie" }} · ${formatSec(cw.progressSeconds)}"
                        )
                    }
                    repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
fun WebsiteMeScreen(vm: CinePulseViewModel) {
    val context = LocalContext.current
    var authPanelOpen by remember { mutableStateOf(false) }
    var authMode by remember { mutableStateOf("register") }
    var usernameInput by remember { mutableStateOf("") }
    var pinInput by remember { mutableStateOf("") }
    var carryGuestData by remember { mutableStateOf(true) }
    var showSettingsPanel by remember { mutableStateOf(false) }

    val user = vm.currentUser

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C0D11))
            .statusBarsPadding(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top User Header Bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Brush.horizontalGradient(listOf(CineColors.RedPrimary, CineColors.RedBright))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (user?.username ?: "G").firstOrNull()?.uppercase() ?: "G",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp
                        )
                    }
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = if (user == null || user.isGuest) (user?.username ?: "Guest") else "@${user.username}",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(CineColors.AccentGreen.copy(alpha = 0.16f))
                                    .border(1.dp, CineColors.AccentGreen.copy(alpha = 0.35f), RoundedCornerShape(5.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = if (user == null || user.isGuest) "Private Guest" else "Synced Account",
                                    color = CineColors.AccentGreen,
                                    fontSize = 9.5.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Text("আপনার ওয়াচলিস্ট ও রিজিউম টাইম সম্পূর্ণ আলাদা সুরক্ষিত", color = Color(0xFF9CA3AF), fontSize = 10.5.sp)
                    }
                }
                IconButton(onClick = { showSettingsPanel = !showSettingsPanel }) {
                    Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Color(0xFFE5E7EB))
                }
            }
        }

        // Personal Account & Sync Card
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CineColors.SurfaceCardAlt)
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(16.dp))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Filled.VerifiedUser, contentDescription = null, tint = CineColors.AccentGreen, modifier = Modifier.size(16.dp))
                        Text(
                            text = if (user == null || user.isGuest) "আলাদা ইউজার অ্যাকাউন্ট" else "অ্যাকাউন্ট সক্রিয়: @${user.username}",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (user == null || user.isGuest) CineColors.RedPrimary else CineColors.SurfaceSearch)
                                .clickable { authPanelOpen = !authPanelOpen }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = if (authPanelOpen) "বন্ধ করুন" else if (user == null || user.isGuest) "লগইন / খুলুন" else "অন্য অ্যাকাউন্ট",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        if (user != null && !user.isGuest) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CineColors.RedDark.copy(alpha = 0.6f))
                                    .clickable { vm.logoutToNewGuest() }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text("লগআউট", color = Color(0xFFFCA5A5), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                if (vm.authSuccessMsg.isNotEmpty()) {
                    Text(vm.authSuccessMsg, color = CineColors.AccentGreen, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
                }
                if (vm.authError.isNotEmpty()) {
                    Text(vm.authError, color = CineColors.RedBright, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
                }

                if (authPanelOpen) {
                    HorizontalDivider(color = CineColors.BorderSubtle)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("register" to "নতুন অ্যাকাউন্ট খুলুন", "login" to "আগের অ্যাকাউন্টে লগইন").forEach { (m, t) ->
                            val sel = authMode == m
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (sel) CineColors.RedPrimary else Color(0xFF0E1015))
                                    .clickable { authMode = m }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(t, color = if (sel) Color.White else Color(0xFF9CA3AF), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    OutlinedTextField(
                        value = usernameInput,
                        onValueChange = { usernameInput = it },
                        label = { Text("আপনার নাম / ইউজারনেম") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = pinInput,
                        onValueChange = { pinInput = it },
                        label = { Text("গোপন পিন (কমপক্ষে ৪ অক্ষর)") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (authMode == "register" && (vm.watchlist.isNotEmpty() || vm.continueWatching.isNotEmpty())) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = carryGuestData, onCheckedChange = { carryGuestData = it })
                            Text("বর্তমান গেস্ট ওয়াচলিস্ট নতুন অ্যাকাউন্টে সেভ করুন", color = Color(0xFFD1D5DB), fontSize = 11.sp)
                        }
                    }
                    Button(
                        onClick = { vm.authenticate(authMode, usernameInput, pinInput, carryGuestData) },
                        enabled = !vm.authBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            if (vm.authBusy) "অপেক্ষা করুন..."
                            else if (authMode == "register") "ব্যক্তিগত অ্যাকাউন্ট তৈরি করুন"
                            else "লগইন করে আমার ওয়াচলিস্ট আনুন",
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                }
            }
        }

        // MovieBox Style Card Group: 16:10 Watch History + My List + Last 24h Updates + Settings/Node
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CineColors.SurfaceCardAlt)
            ) {
                // Watch History Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { vm.activeTab = MainTab.DOWNLOADS }
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Filled.History, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(20.dp))
                        Text("Watch History", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF))
                }

                // Horizontal 16:10 Landscape Cards with #00E68A -> #12D6DF Progress Bar
                val historyCards = if (vm.continueWatching.isNotEmpty()) {
                    vm.continueWatching.map { entry ->
                        val pct = if (entry.durationSeconds > 0 && entry.progressSeconds > 0) {
                            ((entry.progressSeconds.toFloat() / entry.durationSeconds.toFloat()) * 100f).toInt().coerceIn(14, 98)
                        } else 42
                        entry.movie to pct
                    }
                } else {
                    vm.top10ThisWeekItems().take(5).mapIndexed { i, m -> m to listOf(45, 22, 65, 30, 80)[i % 5] }
                }

                LazyRow(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    itemsIndexed(historyCards, key = { i, pair -> "me-hist-${pair.first.path}-$i" }) { _, (m, pct) ->
                        val isSeries = m.typeBadge == "SERIES" || m.typeBadge == "DRAMA" || m.typeBadge == "ANIME" || m.episodePill.isNotEmpty()
                        Column(
                            modifier = Modifier
                                .width(134.dp)
                                .clickable { vm.openMovie(m) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(16f / 10f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFF0E1015))
                            ) {
                                AsyncImage(
                                    model = m.poster,
                                    contentDescription = m.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                                Box(
                                    modifier = Modifier
                                        .padding(6.dp)
                                        .size(20.dp)
                                        .clip(RoundedCornerShape(5.dp))
                                        .background(Color.White.copy(alpha = 0.9f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        if (isSeries) Icons.Filled.Tv else Icons.Filled.Movie,
                                        contentDescription = null,
                                        tint = Color(0xFF0C0D11),
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomCenter)
                                        .fillMaxWidth()
                                        .height(4.dp)
                                        .background(Color.Black.copy(alpha = 0.55f))
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxHeight()
                                            .fillMaxWidth(pct / 100f)
                                            .background(Brush.horizontalGradient(listOf(CineColors.AccentGreen, CineColors.AccentTeal)))
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(5.dp))
                            Text(m.title, color = Color(0xFFD1D5DB), fontSize = 11.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.05f))

                // Row: My List
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { vm.activeTab = MainTab.DOWNLOADS }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Filled.Bookmark, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(20.dp))
                        Text("My List", color = Color(0xFFF3F4F6), fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${vm.watchlist.size}", color = Color(0xFF9CA3AF), fontSize = 13.sp)
                        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF))
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.05f))

                // Row: New Uploads · Last 24h
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { vm.openRequestModal("UPLOADS_24H") }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Filled.Notifications, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(20.dp))
                        Text("New Uploads · Last 24h", color = Color(0xFFF3F4F6), fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color(0xFFE53935))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text("${vm.last24hItems.size}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF))
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.05f))

                // Row: Movie Request / Report Broken Link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { vm.openRequestModal("REQUEST_FORM") }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Filled.PostAdd, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(20.dp))
                        Text("মুভি রিকোয়েস্ট ও লিংক রিপোর্ট", color = Color(0xFFF3F4F6), fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF))
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.05f))

                // Row: Player Settings & Server Node
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showSettingsPanel = !showSettingsPanel }
                        .padding(horizontal = 16.dp, vertical = 15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Filled.Settings, contentDescription = null, tint = Color(0xFFD1D5DB), modifier = Modifier.size(20.dp))
                        Text("Player Settings & Server Node", color = Color(0xFFF3F4F6), fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFF9CA3AF))
                }
            }
        }

        // Expandable Settings & Server Node Card
        if (showSettingsPanel) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(CineColors.SurfaceCardAlt)
                        .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(16.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("সার্ভার নোড ও প্লেয়ার সেটিংস", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    listOf(
                        "node-moviebox" to "CinePulse HD (Official Global 4K/1080p Server)",
                        "node-mlbd" to "CinePulse Bangla & South Hub (Natok / Cartoon / Bangla)"
                    ).forEach { (id, lbl) ->
                        val active = vm.activeNodeId == id
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (active) CineColors.AccentGreen.copy(alpha = 0.2f) else Color(0xFF0C0E14))
                                .border(1.dp, if (active) CineColors.AccentGreen else CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                                .clickable {
                                    vm.switchServerNode(id)
                                    Toast.makeText(context, "সার্ভার পরিবর্তন করা হয়েছে", Toast.LENGTH_SHORT).show()
                                }
                                .padding(horizontal = 12.dp, vertical = 9.dp)
                        ) {
                            Text(lbl, color = if (active) CineColors.AccentGreen else Color.White, fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Text("ডিফল্ট কোয়ালিটি", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(480, 720, 1080).forEach { q ->
                            val sel = vm.preferredQuality == q
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (sel) CineColors.RedPrimary else CineColors.SurfaceElevated)
                                    .clickable { vm.updatePreferredQuality(q) }
                                    .padding(horizontal = 14.dp, vertical = 7.dp)
                            ) {
                                Text("${q}p", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("অটো বাংলা সাবটাইটেল অন", color = Color.White, fontSize = 13.sp)
                        Switch(checked = vm.autoBanglaSubDefault, onCheckedChange = { vm.updateAutoBanglaSubDefault(it) })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("অটো-নেক্সট এপিসোড", color = Color.White, fontSize = 13.sp)
                        Switch(checked = vm.autoNextEp, onCheckedChange = { vm.updateAutoNextEp(it) })
                    }
                }
            }
        }
    }
}

@Composable
fun Last24hAndRequestModal(vm: CinePulseViewModel) {
    var activeTab by remember(vm.showRequestModal) { mutableStateOf(vm.requestInitialTab) }
    var reqTitle by remember(vm.showRequestModal, vm.requestPrefillTitle) { mutableStateOf(vm.requestPrefillTitle) }
    var reqType by remember(vm.showRequestModal, vm.requestPrefillType) { mutableStateOf(vm.requestPrefillType) }
    var reqLang by remember { mutableStateOf("Bangla Dubbed / Dual Audio") }
    var reqNotes by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f))
            .clickable { vm.showRequestModal = false }
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.86f)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(Color(0xFF111319))
                .border(1.dp, CineColors.BorderStrong, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .clickable(enabled = false) {}
                .navigationBarsPadding()
                .padding(horizontal = 14.dp, vertical = 14.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.AccessTime, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(18.dp))
                    Text(
                        text = if (activeTab == "UPLOADS_24H") "Last 24h · নতুন আপলোড" else "মুভি রিকোয়েস্ট ও রিপোর্ট",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CineColors.RedPrimary)
                            .padding(horizontal = 7.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (activeTab == "UPLOADS_24H") "${vm.last24hItems.size}" else "${vm.requests.size}",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (activeTab == "UPLOADS_24H") {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(CineColors.RedPrimary)
                                .clickable { vm.refreshLast24hAndRequests() }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(if (vm.isRefreshing24h) "লোড..." else "রিফ্রেশ", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                    IconButton(onClick = { vm.showRequestModal = false }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 2 Tabs Switcher
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("UPLOADS_24H" to "Last 24h নতুন আপলোড", "REQUEST_FORM" to "মুভি রিকোয়েস্ট / রিপোর্ট").forEach { (id, lbl) ->
                    val sel = activeTab == id
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (sel) CineColors.RedPrimary else Color(0xFF171A22))
                            .border(1.dp, if (sel) CineColors.RedBright else CineColors.BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { activeTab = id }
                            .padding(vertical = 9.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(lbl, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (activeTab == "UPLOADS_24H") {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    itemsIndexed(vm.last24hItems, key = { i, m -> "u24-${m.path}-$i" }) { _, m ->
                        val isMb = m.path.isEmpty() || m.path.startsWith("/mb/")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    vm.showRequestModal = false
                                    vm.openMovie(m)
                                }
                                .padding(vertical = 6.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            AsyncImage(
                                model = m.poster,
                                contentDescription = m.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(width = 42.dp, height = 58.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CineColors.SurfaceCardAlt)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(if (isMb) Color(0xFF059669) else Color(0xFF0284C7))
                                            .padding(horizontal = 5.dp, vertical = 1.dp)
                                    ) {
                                        Text(if (isMb) "CinePulse HD" else "Bangla Hub", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
                                    }
                                    Text(m.timeAgo.ifEmpty { "Recent" }, color = CineColors.AccentGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(m.title, color = Color.White, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    text = "${if (m.episodePill.isNotEmpty()) "${m.episodePill} · " else ""}${m.quality} · ${m.language}",
                                    color = Color(0xFF9CA3AF),
                                    fontSize = 10.sp,
                                    maxLines = 1
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(CineColors.RedPrimary.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = CineColors.RedBright, modifier = Modifier.size(16.dp))
                            }
                        }
                        HorizontalDivider(color = Color.White.copy(alpha = 0.05f))
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF161922))
                                .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(14.dp))
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("MOVIE" to "Movie", "SERIES" to "Series", "ANIME" to "Anime", "BROKEN_LINK" to "Broken Link").forEach { (id, lbl) ->
                                    val sel = reqType == id
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (sel) CineColors.RedPrimary else Color(0xFF0E1017))
                                            .clickable { reqType = id }
                                            .padding(vertical = 7.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(lbl, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                    }
                                }
                            }
                            OutlinedTextField(
                                value = reqTitle,
                                onValueChange = { reqTitle = it },
                                label = { Text("মুভি / সিরিজের নাম (Title & Year)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = reqLang,
                                onValueChange = { reqLang = it },
                                label = { Text("পছন্দের অডিও / ভাষা") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = reqNotes,
                                onValueChange = { reqNotes = it },
                                label = { Text("অতিরিক্ত নোট (ঐচ্ছিক)") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            if (vm.requestFeedback.isNotEmpty()) {
                                Text(vm.requestFeedback, color = CineColors.AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Button(
                                onClick = {
                                    vm.submitRequest(reqTitle, reqType, reqLang, reqNotes)
                                    reqTitle = ""
                                    reqNotes = ""
                                },
                                enabled = !vm.requestBusy && reqTitle.isNotBlank(),
                                colors = ButtonDefaults.buttonColors(containerColor = CineColors.RedPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = if (vm.requestBusy) "সাবমিট হচ্ছে..." else if (reqType == "BROKEN_LINK") "লিংক রিপোর্ট পাঠান" else "মুভি রিকোয়েস্ট পাঠান",
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }

                    if (vm.requests.isNotEmpty()) {
                        item {
                            Text("সাম্প্রতিক ইউজার রিকোয়েস্ট ও স্ট্যাটাস (${vm.requests.size})", color = Color(0xFFD1D5DB), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                        }
                        items(vm.requests, key = { it.id }) { req ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFF161922))
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(Color.White.copy(alpha = 0.12f))
                                                .padding(horizontal = 5.dp, vertical = 1.dp)
                                        ) {
                                            Text(req.type, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                        }
                                        Text(req.title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                    Text("${req.language} ${if (req.notes.isNotEmpty()) "• ${req.notes}" else ""}", color = Color(0xFF9CA3AF), fontSize = 10.sp, maxLines = 1)
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(Color(0xFF1D4ED8).copy(alpha = 0.25f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(req.status, color = Color(0xFF93C5FD), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fun formatSec(totalSec: Int): String {
    val s = totalSec.coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) String.format("%d:%02d:%02d", h, m, sec) else String.format("%02d:%02d", m, sec)
}
