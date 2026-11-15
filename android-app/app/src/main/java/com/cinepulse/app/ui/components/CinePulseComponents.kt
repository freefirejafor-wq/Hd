package com.cinepulse.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cinepulse.app.data.CinePulseCatalogData
import com.cinepulse.app.data.LiveSportMatch
import com.cinepulse.app.data.MovieCardItem
import com.cinepulse.app.ui.CinePulseViewModel
import com.cinepulse.app.ui.MainTab
import com.cinepulse.app.ui.theme.CineColors

@Composable
fun WebsiteHomeHeader(vm: CinePulseViewModel) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(CineColors.HeaderBg.copy(alpha = 0.96f))
            .statusBarsPadding()
    ) {
        if (vm.isSearchActive) {
            // MOVIEBOX-STYLE SEARCH HEADER + CATEGORY TABS
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    IconButton(
                        onClick = { vm.closeSearchMode() },
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(
                            Icons.Filled.ChevronLeft,
                            contentDescription = "Back",
                            tint = Color(0xFFE5E7EB),
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CineColors.SurfaceSearch)
                            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Filled.Search,
                            contentDescription = null,
                            tint = Color(0xFFD1D5DB),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                            if (vm.searchQuery.isEmpty()) {
                                Text(
                                    text = "Tower of God [Hindi] বা মুভি খুঁজুন...",
                                    color = Color(0xFF9CA3AF),
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            BasicTextField(
                                value = vm.searchQuery,
                                onValueChange = { vm.onSearchQueryChanged(it) },
                                singleLine = true,
                                textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                                cursorBrush = SolidColor(CineColors.RedBright),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { vm.submitSearch() }),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (vm.searchQuery.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF9CA3AF))
                                    .clickable {
                                        vm.searchQuery = ""
                                        vm.submittedSearch = ""
                                        vm.suggestItems = emptyList()
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Clear",
                                    tint = Color(0xFF121418),
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = { vm.submitSearch() },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Filled.Search,
                            contentDescription = "Search",
                            tint = CineColors.RedBright,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // 4 Search Filter Tabs: All | Movie/Series | ShortTV | Music
                val tabs = listOf(
                    "ALL" to "All",
                    "MOVIE_SERIES" to "Movie/Series",
                    "SHORT_TV" to "ShortTV",
                    "MUSIC" to "Music"
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(22.dp)
                ) {
                    tabs.forEach { (id, label) ->
                        val active = vm.searchTabFilter == id
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clickable { vm.searchTabFilter = id }
                                .padding(top = 4.dp)
                        ) {
                            Text(
                                text = label,
                                color = if (active) Color.White else Color(0xFF9CA3AF),
                                fontSize = 13.sp,
                                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .width(24.dp)
                                    .height(3.dp)
                                    .clip(CircleShape)
                                    .background(if (active) Color.White else Color.Transparent)
                            )
                        }
                    }
                }
            }
        } else {
            // DEFAULT HOME HEADER (Brand Button + Search Pill + Horizontal Category Strip)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 9.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Brand Square Button
                    Row(
                        modifier = Modifier
                            .height(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CineColors.SurfaceCard)
                            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(12.dp))
                            .clickable { vm.selectCategory(CinePulseCatalogData.ALL_CATEGORIES.first()) }
                            .padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(RoundedCornerShape(7.dp))
                                .background(CineColors.RedPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Filled.PlayArrow,
                                contentDescription = "CinePulse",
                                tint = Color.White,
                                modifier = Modifier.size(15.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("CINE", color = Color.White, fontWeight = FontWeight.Black, fontSize = 13.sp)
                        Text("PULSE", color = CineColors.RedPrimary, fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }

                    // Search Pill Trigger
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .clip(CircleShape)
                            .background(CineColors.SurfaceCard)
                            .border(1.dp, CineColors.BorderStrong, CircleShape)
                            .clickable {
                                vm.activeTab = MainTab.HOME_BROWSE
                                vm.isSearchActive = true
                            }
                            .padding(start = 12.dp, end = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Filled.Search,
                            contentDescription = null,
                            tint = CineColors.RedBright,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "মুভি বা সিরিজ খুঁজুন...",
                            color = Color(0xFF9CA3AF),
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Box(
                            modifier = Modifier
                                .size(width = 36.dp, height = 32.dp)
                                .clip(CircleShape)
                                .background(CineColors.RedPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Filled.Search,
                                contentDescription = "Search",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                // Horizontal TOP_NAV_TABS Strip
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(horizontal = 2.dp)
                ) {
                    items(CinePulseCatalogData.TOP_NAV_TABS) { (label, cat) ->
                        val isActive = vm.activeTab == MainTab.HOME_BROWSE &&
                            vm.currentCategory.path == cat.path &&
                            vm.submittedSearch.isEmpty()
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clickable { vm.selectCategory(cat) }
                                .padding(top = 2.dp)
                        ) {
                            Text(
                                text = label,
                                color = if (isActive) Color.White else Color(0xFF9CA3AF),
                                fontSize = 13.sp,
                                fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.SemiBold,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .width(20.dp)
                                    .height(3.dp)
                                    .clip(CircleShape)
                                    .background(if (isActive) CineColors.AccentGreen else Color.Transparent)
                            )
                        }
                    }
                }
            }
        }
        HorizontalDivider(color = CineColors.BorderSubtle, thickness = 1.dp)
    }
}

@Composable
fun WebsiteBottomNavBar(
    activeTab: MainTab,
    currentCategoryPath: String,
    spotlightPoster: String,
    onSelectHome: () -> Unit,
    onSelectExplore: () -> Unit,
    onSelect18PlusHub: () -> Unit,
    onSelectDownloads: () -> Unit,
    onSelectMe: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(CineColors.Surface.copy(alpha = 0.96f))
            .navigationBarsPadding()
    ) {
        HorizontalDivider(color = CineColors.BorderSubtle, thickness = 1.dp, modifier = Modifier.align(Alignment.TopCenter))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. Home
            val homeSel = activeTab == MainTab.HOME_BROWSE && currentCategoryPath != "/adult18plus"
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(onClick = onSelectHome),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Filled.Home,
                    contentDescription = "Home",
                    tint = if (homeSel) CineColors.RedBright else Color(0xFF9CA3AF),
                    modifier = Modifier.size(21.dp)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Home",
                    color = if (homeSel) CineColors.RedBright else Color(0xFF9CA3AF),
                    fontSize = 10.sp,
                    fontWeight = if (homeSel) FontWeight.Bold else FontWeight.Medium
                )
            }

            // 2. Explore (With Red HOT Badge)
            val expSel = activeTab == MainTab.EXPLORE
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(onClick = onSelectExplore),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box {
                    Icon(
                        Icons.Filled.MenuBook,
                        contentDescription = "Explore",
                        tint = if (expSel) CineColors.RedBright else Color(0xFF9CA3AF),
                        modifier = Modifier.size(21.dp)
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 14.dp, y = (-5).dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(CineColors.RedPrimary)
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text("HOT", color = Color.White, fontSize = 7.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Explore",
                    color = if (expSel) CineColors.RedBright else Color(0xFF9CA3AF),
                    fontSize = 10.sp,
                    fontWeight = if (expSel) FontWeight.Bold else FontWeight.Medium
                )
            }

            // 3. Center Elevated Circular Poster Button ("18+ Hub")
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(onClick = onSelect18PlusHub),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .offset(y = (-10).dp)
                        .size(54.dp)
                        .shadow(10.dp, CircleShape, ambientColor = CineColors.RedPrimary, spotColor = CineColors.RedPrimary)
                        .clip(CircleShape)
                        .background(Brush.tr(listOf(CineColors.RedDark, CineColors.RedPrimary, CineColors.RedBright)))
                        .padding(2.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                            .background(CineColors.SurfaceCard),
                        contentAlignment = Alignment.Center
                    ) {
                        if (spotlightPoster.isNotEmpty()) {
                            AsyncImage(
                                model = spotlightPoster,
                                contentDescription = "18+ Hub",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                                alpha = 0.75f
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.35f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(CineColors.RedPrimary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                            }
                        }
                    }
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 3.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.9f))
                        .border(1.dp, CineColors.RedPrimary.copy(alpha = 0.5f), CircleShape)
                        .padding(horizontal = 6.dp, vertical = 1.dp)
                ) {
                    Text("18+ Hub", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
                }
            }

            // 4. Downloads
            val dlSel = activeTab == MainTab.DOWNLOADS
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(onClick = onSelectDownloads),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Filled.Download,
                    contentDescription = "Downloads",
                    tint = if (dlSel) CineColors.RedBright else Color(0xFF9CA3AF),
                    modifier = Modifier.size(21.dp)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Downloads",
                    color = if (dlSel) CineColors.RedBright else Color(0xFF9CA3AF),
                    fontSize = 10.sp,
                    fontWeight = if (dlSel) FontWeight.Bold else FontWeight.Medium
                )
            }

            // 5. Me (Turns AccentGreen when active)
            val meSel = activeTab == MainTab.ME
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(onClick = onSelectMe),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = "Me",
                        tint = if (meSel) CineColors.AccentGreen else Color(0xFF9CA3AF),
                        modifier = Modifier.size(21.dp)
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 3.dp, y = (-1).dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE53935))
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Me",
                    color = if (meSel) CineColors.AccentGreen else Color(0xFF9CA3AF),
                    fontSize = 10.sp,
                    fontWeight = if (meSel) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}

private fun Brush.Companion.tr(colors: List<Color>): Brush =
    linearGradient(colors = colors)

@Composable
fun WebsitePosterCard(
    movie: MovieCardItem,
    isSaved: Boolean = false,
    onToggleSave: (() -> Unit)? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    rankBadge: String? = null,
    progressRatio: Float? = null,
    resumeLabel: String? = null
) {
    val shortLang = CinePulseCatalogData.formatShortLanguage(movie.language)
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(CineColors.Surface)
            .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .background(CineColors.Background)
        ) {
            AsyncImage(
                model = movie.poster,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Top-Left: either #Rank Badge or Bookmark Button
            if (!rankBadge.isNullOrEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(5.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(CineColors.RedPrimary)
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                ) {
                    Text(rankBadge, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Black)
                }
            } else if (onToggleSave != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(5.dp)
                        .size(21.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isSaved) CineColors.RedPrimary else Color.Black.copy(alpha = 0.62f))
                        .clickable { onToggleSave() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isSaved) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                        contentDescription = "Save",
                        tint = Color.White,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }

            // Top-Right: Short Language Tag
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(5.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(Color.Black.copy(alpha = 0.75f))
                    .border(1.dp, CineColors.BorderSubtle, RoundedCornerShape(5.dp))
                    .padding(horizontal = 5.dp, vertical = 2.dp)
            ) {
                Text(shortLang, color = Color.White, fontSize = 8.5.sp, fontWeight = FontWeight.Bold)
            }

            // Bottom Scrim: Episode/Quality + Star Rating
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f), Color.Black.copy(alpha = 0.95f))
                        )
                    )
                    .padding(horizontal = 6.dp, vertical = 5.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = movie.episodePill.ifEmpty { movie.quality.ifEmpty { "HD" } },
                        color = CineColors.RedBright,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(9.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = movie.rating.ifEmpty { "9.0" },
                            color = CineColors.Gold,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            if (progressRatio != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(Color.White.copy(alpha = 0.25f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressRatio.coerceIn(0.06f, 1f))
                            .background(Brush.horizontalGradient(listOf(CineColors.AccentGreen, CineColors.AccentTeal)))
                    )
                }
            }
        }

        Column(modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp)) {
            Text(
                text = movie.title,
                color = Color(0xFFF3F4F6),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (!resumeLabel.isNullOrEmpty()) {
                Text(
                    text = resumeLabel,
                    color = CineColors.AccentGreen,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                Text(
                    text = movie.timeAgo.ifEmpty { "Recent" },
                    color = Color(0xFFFCD34D).copy(alpha = 0.9f),
                    fontSize = 9.5.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun WebsiteSearchResultRow(
    movie: MovieCardItem,
    idx: Int,
    onClick: () -> Unit
) {
    val shortLang = CinePulseCatalogData.formatShortLanguage(movie.language)
    val yearMatch = Regex("(20\\d{2}|19\\d{2})").find(movie.title)?.value ?: "2026"
    val isSeries = movie.typeBadge == "SERIES" || movie.typeBadge == "ANIME" || movie.typeBadge == "DRAMA" || movie.episodePill.isNotEmpty()
    val genreLabel = movie.sportGenre.substringBefore(',').trim().ifEmpty {
        if (movie.typeBadge == "ANIME") "Anime" else if (isSeries) "Drama" else "Movie"
    }
    val regionLabel = movie.country.ifEmpty {
        when (shortLang) {
            "Bengali" -> "Bangladesh"
            "Korean" -> "Korea"
            "Anime" -> "Japan"
            else -> "India"
        }
    }
    val ratingVal = movie.rating.ifEmpty { String.format("%.1f", 7.3 + ((idx * 3) % 16) / 10.0) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(width = 62.dp, height = 84.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(CineColors.SurfaceCardAlt)
        ) {
            AsyncImage(
                model = movie.poster,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.65f))
                    .padding(vertical = 2.dp, horizontal = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = shortLang,
                    color = Color(0xFFF3F4F6),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    textAlign = TextAlign.Center
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = movie.title,
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Icon(
                    imageVector = if (isSeries) Icons.Filled.Tv else Icons.Filled.Movie,
                    contentDescription = null,
                    tint = Color(0xFFD1D5DB),
                    modifier = Modifier.size(13.dp)
                )
                Text("|", color = Color(0xFF4B5563), fontSize = 11.sp)
                Icon(Icons.Filled.Star, contentDescription = null, tint = CineColors.Gold, modifier = Modifier.size(13.dp))
                Text(ratingVal, color = CineColors.Gold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Text("|", color = Color(0xFF4B5563), fontSize = 11.sp)
                Text(yearMatch, color = CineColors.TextSecondary, fontSize = 11.sp)
                Text("|", color = Color(0xFF4B5563), fontSize = 11.sp)
                Text(
                    text = "$regionLabel | $genreLabel",
                    color = CineColors.TextSecondary,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(Color(0xFFD1D5DB)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = "Play", tint = Color(0xFF0F1115), modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
fun LiveSportMatchCard(
    match: LiveSportMatch,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(CineColors.SurfaceCard)
            .border(1.dp, if (match.isLive) CineColors.RedPrimary.copy(alpha = 0.6f) else CineColors.BorderSubtle, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${match.sportType.uppercase()} • ${match.league}",
                color = CineColors.TextSecondary,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(5.dp))
                    .background(if (match.isLive) CineColors.RedPrimary else CineColors.SurfaceElevated)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = if (match.isLive) "LIVE" else match.matchState,
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TeamBadge(match.team1.name, match.team1.avatar, Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 8.dp)) {
                val scoreLine = if (match.team1.score.isNotEmpty() || match.team2.score.isNotEmpty()) {
                    "${match.team1.score.ifEmpty { "0" }} - ${match.team2.score.ifEmpty { "0" }}"
                } else "VS"
                Text(scoreLine, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                if (match.timeDesc.isNotEmpty()) {
                    Text(match.timeDesc, color = CineColors.TextSecondary, fontSize = 10.sp)
                }
            }
            TeamBadge(match.team2.name, match.team2.avatar, Modifier.weight(1f))
        }

        if (match.team1.cricketScoreText.isNotEmpty() || match.team2.cricketScoreText.isNotEmpty()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "${match.team1.abbreviation}: ${match.team1.cricketScoreText}   |   ${match.team2.abbreviation}: ${match.team2.cricketScoreText}",
                color = CineColors.AccentGreen,
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun TeamBadge(name: String, avatar: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        if (avatar.isNotEmpty()) {
            AsyncImage(
                model = avatar,
                contentDescription = name,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(CineColors.SurfaceElevated),
                contentScale = ContentScale.Crop
            )
        } else {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(CineColors.SurfaceElevated),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.SportsSoccer, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = name,
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
