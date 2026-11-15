package com.cinepulse.app.data

data class MovieCardItem(
    val id: String,
    val title: String,
    val url: String,
    val path: String,
    val poster: String,
    val previewImage: String = "",
    val description: String = "",
    val country: String = "",
    val sportGenre: String = "",
    val quality: String = "HD",
    val views: String = "",
    val language: String = "Multi Audio",
    val typeBadge: String = "MOVIE",
    val timeAgo: String = "Recent",
    val episodePill: String = "",
    val isPinned: Boolean = false,
    val isAdult: Boolean = false,
    val folder: String? = null,
    val rating: String = "",
    val hypeBadge: String = "",
    val seasonNumber: Int? = null,
    val active: Boolean = false
)

data class StreamSource(
    val id: String,
    val quality: Int,
    val qualityLabel: String,
    val audio: String,
    val audioLanguages: List<String>,
    val provider: String,
    val url: String,
    val downloadUrl: String,
    val type: String,
    val name: String,
    val screenshot: String = ""
)

data class EpisodeItem(
    val id: String,
    val label: String,
    val number: Int? = null,
    val rangeStart: Int? = null,
    val rangeEnd: Int? = null,
    val season: Int? = null,
    val kind: String = "episode",
    val sources: List<StreamSource> = emptyList()
)

data class DirectDownloadButton(
    val label: String,
    val url: String,
    val quality: String,
    val size: String
)

data class CastMember(
    val name: String,
    val role: String,
    val photo: String,
    val url: String
)

data class MovieDubOption(
    val id: String,
    val label: String,
    val path: String,
    val active: Boolean = false
)

data class MovieReviewItem(
    val id: String = "",
    val author: String,
    val rating: String,
    val content: String,
    val date: String
)

data class MovieDetailData(
    val title: String,
    val url: String,
    val poster: String,
    val backdrop: String = "",
    val qualityNote: String = "",
    val typeBadge: String = "MOVIE",
    val language: String = "Original Audio",
    val quality: String = "WEB-DL",
    val genre: String = "",
    val resolution: String = "",
    val releaseDate: String = "",
    val storyline: String = "",
    val youtubeTrailerId: String = "",
    val screenshots: List<String> = emptyList(),
    val episodes: List<EpisodeItem> = emptyList(),
    val downloadButtons: List<DirectDownloadButton> = emptyList(),
    val cast: List<CastMember> = emptyList(),
    val relatedSeasons: List<MovieCardItem> = emptyList(),
    val dubs: List<MovieDubOption> = emptyList(),
    val reviews: List<MovieReviewItem> = emptyList(),
    val uploadedBy: String = "",
    val recommendedRating: String = ""
)

data class WatchProgressItem(
    val movie: MovieCardItem,
    val episodeId: String = "",
    val episodeIdx: Int = 0,
    val episodeLabel: String = "",
    val quality: Int = 720,
    val audio: String = "",
    val updatedAt: Long = System.currentTimeMillis(),
    val progressSeconds: Int = 0,
    val durationSeconds: Int = 0
)

data class CategoryOption(
    val label: String,
    val bnLabel: String,
    val path: String,
    val group: String = "zone",
    val isAdult: Boolean = false
)

data class LiveSportTeam(
    val id: String,
    val name: String,
    val abbreviation: String,
    val avatar: String,
    val score: String,
    val cricketScoreText: String = ""
)

data class LiveSportPlaySource(
    val title: String,
    val path: String
)

data class LiveSportMatch(
    val id: String,
    val sportType: String,
    val league: String,
    val matchRound: String,
    val status: String,
    val matchState: String,
    val isLive: Boolean,
    val startTimeMs: Long,
    val timeDesc: String,
    val matchResult: String,
    val team1: LiveSportTeam,
    val team2: LiveSportTeam,
    val playPath: String,
    val playSource: List<LiveSportPlaySource>,
    val detailUrl: String
)

data class MovieBoxQuickCategory(
    val id: String,
    val title: String,
    val bnTitle: String,
    val image: String,
    val path: String
)

data class MovieBoxComingSoonItem(
    val id: String,
    val title: String,
    val releaseDate: String,
    val releaseBadge: String,
    val bookedCount: Int,
    val poster: String,
    val path: String,
    val genre: String,
    val country: String
)

data class MovieBoxHomeShelf(
    val id: String,
    val title: String,
    val bnTitle: String,
    val categoryPath: String,
    val badge: String = "",
    val items: List<MovieCardItem>
)

data class MovieBoxHomePayload(
    val ok: Boolean = false,
    val banners: List<MovieCardItem> = emptyList(),
    val liveSports: List<LiveSportMatch> = emptyList(),
    val quickCategories: List<MovieBoxQuickCategory> = emptyList(),
    val comingSoon: List<MovieBoxComingSoonItem> = emptyList(),
    val sections: List<MovieBoxHomeShelf> = emptyList()
)

data class GlobalMovieNotification(
    val id: String,
    val category: String,
    val badgeText: String,
    val headlineBn: String,
    val subtitleBn: String,
    val movie: MovieCardItem,
    val createdAt: Long,
    val ratingScore: Double = 8.0
)

data class UserMovieRequest(
    val id: String,
    val title: String,
    val type: String,
    val language: String,
    val notes: String,
    val status: String,
    val createdAt: Long
)

data class UserAccountSession(
    val userId: String,
    val username: String,
    val isGuest: Boolean,
    val token: String,
    val watchlist: List<MovieCardItem> = emptyList(),
    val continueWatching: List<WatchProgressItem> = emptyList()
)

data class SubtitleTrackOption(
    val id: String,
    val label: String,
    val langCode: String,
    val url: String,
    val isBengaliNative: Boolean = false
)

data class SubtitleCue(
    val startMs: Long,
    val endMs: Long,
    val originalText: String,
    val banglaText: String = ""
)
