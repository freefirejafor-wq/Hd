package com.cinepulse.moviebox.model

data class TrialSummary(
    val clientName: String = "",
    val plan: String = "",
    val remainingRequests: Int = 0,
    val maxRequests: Int = 0,
    val usedRequests: Int = 0,
    val expiresAt: String = "",
    val active: Boolean = true,
)

data class CategoryItem(
    val label: String,
    val bnLabel: String,
    val path: String,
    val group: String,
    val isAdult: Boolean = false,
)

data class BannerItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val image: String,
    val path: String,
    val badge: String,
)

data class LiveSportItem(
    val id: String,
    val title: String,
    val league: String,
    val teamA: String,
    val teamB: String,
    val teamALogo: String,
    val teamBLogo: String,
    val score: String,
    val startTime: String,
    val sportType: String,
    val badge: String,
    val liveUrl: String,
)

data class MovieCard(
    val id: String,
    val title: String,
    val path: String,
    val poster: String,
    val quality: String,
    val rating: String,
    val language: String,
    val typeBadge: String,
    val genre: String = "",
    val country: String = "",
    val releaseYear: String = "",
    val isAdult: Boolean = false,
)

data class HomeSection(
    val id: String,
    val title: String,
    val badge: String,
    val categoryPath: String,
    val items: List<MovieCard>,
)

data class ComingSoonItem(
    val id: String,
    val title: String,
    val releaseBadge: String,
    val poster: String,
    val path: String,
    val genre: String,
)

data class HomePayload(
    val trial: TrialSummary,
    val categories: List<CategoryItem>,
    val banners: List<BannerItem>,
    val liveSports: List<LiveSportItem>,
    val hotSearches: List<String>,
    val sections: List<HomeSection>,
    val allOfficialSections: List<HomeSection>,
    val trending: List<MovieCard>,
    val comingSoon: List<ComingSoonItem>,
)

data class CatalogPayload(
    val trial: TrialSummary,
    val path: String,
    val page: Int,
    val maxPage: Int,
    val items: List<MovieCard>,
)

data class DubOption(
    val id: String,
    val label: String,
    val lanCode: String,
    val path: String,
    val active: Boolean,
)

data class EpisodeItem(
    val season: Int,
    val number: Int,
    val title: String,
)

data class DetailPayload(
    val trial: TrialSummary,
    val subjectId: String,
    val detailPath: String,
    val title: String,
    val poster: String,
    val description: String,
    val rating: String,
    val releaseYear: String,
    val country: String,
    val genre: String,
    val language: String,
    val typeBadge: String,
    val seasons: List<Int>,
    val episodes: List<EpisodeItem>,
    val dubs: List<DubOption>,
    val relatedMovies: List<MovieCard>,
)

data class VideoSource(
    val id: String,
    val url: String,
    val downloadUrl: String,
    val type: String,
    val quality: Int,
    val qualityLabel: String,
    val audio: String,
    val sizeLabel: String,
)

data class SubtitleTrack(
    val id: String,
    val lan: String,
    val lanName: String,
    val url: String,
)

data class StreamPayload(
    val trial: TrialSummary,
    val subjectId: String,
    val detailPath: String,
    val title: String,
    val activeAudio: String,
    val season: Int,
    val episode: Int,
    val embedPlayerUrl: String,
    val availableDubs: List<DubOption>,
    val sources: List<VideoSource>,
    val subtitles: List<SubtitleTrack>,
)

data class DownloadRecord(
    val downloadId: Long,
    val title: String,
    val poster: String,
    val quality: String,
    val audio: String,
    val path: String,
    val addedAt: Long,
)
