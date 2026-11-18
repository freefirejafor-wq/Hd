package com.cinepulse.moviebox.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.cinepulse.moviebox.model.BannerItem
import com.cinepulse.moviebox.model.ComingSoonItem
import com.cinepulse.moviebox.model.LiveSportItem
import com.cinepulse.moviebox.model.MovieCard
import com.cinepulse.moviebox.ui.theme.MbColors

fun resolveShortLanguageBadge(item: MovieCard): String {
    val t = item.title
    return when {
        t.contains("[Hindi]", true) || item.language.contains("HINDI DUBBED", true) -> "Hindi"
        t.contains("[Bangla]", true) || t.contains("[Bengali]", true) || item.language.contains("BANGLA", true) -> "Bangla"
        item.language.contains("HINDI", true) -> "Hindi"
        item.language.contains("PUNJABI", true) -> "Punjabi"
        item.language.contains("TAMIL", true) -> "Tamil"
        item.language.contains("TELUGU", true) -> "Telugu"
        item.isAdult -> "18+"
        item.quality.isNotBlank() -> item.quality.replace(" Full HD", "", true).trim()
        else -> ""
    }
}

@Composable
fun MoviePosterCard(
    item: MovieCard,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    rankNumber: Int? = null,
) {
    val badge = resolveShortLanguageBadge(item)
    Column(
        modifier = modifier
            .width(118.dp)
            .clickable { onClick() },
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.68f)
                .clip(RoundedCornerShape(10.dp))
                .background(MbColors.SurfaceElevated),
        ) {
            AsyncImage(
                model = item.poster,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color(0xCC0B0C10))
                        )
                    ),
            )
            if (badge.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(
                            if (badge == "18+") Color(0xD9E50914) else Color(0xB8000000)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = badge,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            if (rankNumber != null) {
                Text(
                    text = rankNumber.toString(),
                    color = Color(0xCCFFFFFF),
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(end = 6.dp),
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = item.title,
            color = MbColors.TextPrimary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun HeroBannerPager(
    banners: List<BannerItem>,
    onBannerClick: (BannerItem) -> Unit,
) {
    if (banners.isEmpty()) return
    val state = rememberPagerState(pageCount = { banners.size })
    Column {
        HorizontalPager(
            state = state,
            contentPadding = PaddingValues(start = 12.dp, end = 42.dp),
            pageSpacing = 10.dp,
        ) { idx ->
            val b = banners[idx]
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MbColors.SurfaceElevated)
                    .clickable { onBannerClick(b) },
            ) {
                AsyncImage(
                    model = b.image,
                    contentDescription = b.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0x11000000), Color(0x44000000), Color(0xEE121318))
                            )
                        ),
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(
                        model = b.image,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .width(48.dp)
                            .height(66.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(8.dp)),
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = b.title,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = b.subtitle.ifBlank { b.badge },
                            color = MbColors.TextSecondary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(MbColors.MintGreen),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Play",
                            tint = Color(0xFF061B11),
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LiveSportMatchCard(
    sport: LiveSportItem,
    onWatchClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(245.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF1A2536), Color(0xFF1D202A))
                )
            )
            .border(1.dp, MbColors.SurfaceBorder, RoundedCornerShape(14.dp))
            .clickable { onWatchClick() }
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(MbColors.HotRed)
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text(
                    text = sport.badge.ifBlank { "LIVE" },
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.width(6.dp))
            Text(
                text = sport.league.ifBlank { sport.title },
                color = MbColors.TextSecondary,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (sport.teamALogo.isNotBlank()) {
                    AsyncImage(
                        model = sport.teamALogo,
                        contentDescription = sport.teamA,
                        modifier = Modifier.size(30.dp).clip(CircleShape),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = sport.teamA.ifBlank { "Team A" },
                    color = Color.White,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 6.dp),
            ) {
                Text(
                    text = sport.score.ifBlank { "VS" },
                    color = MbColors.MintGreen,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                if (sport.startTime.isNotBlank()) {
                    Text(
                        text = sport.startTime,
                        color = MbColors.TextSecondary,
                        fontSize = 10.sp,
                    )
                }
            }
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (sport.teamBLogo.isNotBlank()) {
                    AsyncImage(
                        model = sport.teamBLogo,
                        contentDescription = sport.teamB,
                        modifier = Modifier.size(30.dp).clip(CircleShape),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = sport.teamB.ifBlank { "Team B" },
                    color = Color.White,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MbColors.MintGreenDark)
                .padding(vertical = 7.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    text = "Watch Live",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
fun ComingSoonPosterCard(
    item: ComingSoonItem,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(114.dp)
            .clickable { onClick() },
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.68f)
                .clip(RoundedCornerShape(10.dp))
                .background(MbColors.SurfaceElevated),
        ) {
            AsyncImage(
                model = item.poster,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(Color(0xCC1CE783))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text(
                    text = item.releaseBadge,
                    color = Color(0xFF041D11),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Spacer(Modifier.height(5.dp))
        Text(
            text = item.title,
            color = MbColors.TextPrimary,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
