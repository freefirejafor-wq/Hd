package com.cinepulse.app.ui

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cinepulse.app.data.*
import com.cinepulse.app.network.CinePulseApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray

enum class MainTab { HOME_BROWSE, EXPLORE, DOWNLOADS, ME }

class CinePulseViewModel(application: Application) : AndroidViewModel(application) {
    val api = CinePulseApi()
    private val store = UserPrefsStore(application, api)

    var activeTab by mutableStateOf(MainTab.HOME_BROWSE)
    var isLoadingHome by mutableStateOf(true)
    var homePayload by mutableStateOf(MovieBoxHomePayload())
    var categories by mutableStateOf<List<CategoryOption>>(CinePulseCatalogData.ALL_CATEGORIES)

    // Primary Catalog Grid & Category State (1:1 Website)
    var currentCategory by mutableStateOf(CinePulseCatalogData.ALL_CATEGORIES.first())
    var currentPage by mutableIntStateOf(1)
    var maxPage by mutableIntStateOf(520)
    var rawCatalogItems by mutableStateOf<List<MovieCardItem>>(emptyList())
    var isLoadingCatalog by mutableStateOf(false)
    var activeNodeId by mutableStateOf(store.getActiveNodeId())

    // Filters & Sorting
    var audioFilter by mutableStateOf("ALL") // ALL, BANGLA, HINDI, DUAL, SUB
    var qualityFilter by mutableStateOf("ALL") // ALL, 4K, 1080P, WEBDL, HDTC
    var sortBy by mutableStateOf("HOT_HYPE") // HOT_HYPE, LATEST, RATING, VIEWS, TITLE

    // Search Header & Results State
    var isSearchActive by mutableStateOf(false)
    var searchQuery by mutableStateOf("")
    var submittedSearch by mutableStateOf("")
    var searchTabFilter by mutableStateOf("ALL") // ALL, MOVIE_SERIES, SHORT_TV, MUSIC
    var recentSearches by mutableStateOf(store.getRecentSearches())
    var suggestItems by mutableStateOf<List<MovieCardItem>>(emptyList())
    var searchResults by mutableStateOf<List<MovieCardItem>>(emptyList())
    var isSearching by mutableStateOf(false)
    private var searchJob: Job? = null

    // Coming Soon Reminders
    var bookedComingSoonIds by mutableStateOf(store.getBookedComingSoonIds())

    // User Isolation & Auth State
    var currentUser by mutableStateOf<UserAccountSession?>(null)
    var watchlist by mutableStateOf<List<MovieCardItem>>(emptyList())
    var continueWatching by mutableStateOf<List<WatchProgressItem>>(emptyList())
    var selectedWatchlistFolder by mutableStateOf("all")
    var authBusy by mutableStateOf(false)
    var authError by mutableStateOf("")
    var authSuccessMsg by mutableStateOf("")

    // Last 24h Uploads, Notifications & Requests Modal
    var notifications by mutableStateOf<List<GlobalMovieNotification>>(emptyList())
    var last24hItems by mutableStateOf<List<MovieCardItem>>(emptyList())
    var isRefreshing24h by mutableStateOf(false)
    var requests by mutableStateOf<List<UserMovieRequest>>(emptyList())
    var showRequestModal by mutableStateOf(false)
    var requestInitialTab by mutableStateOf("UPLOADS_24H") // UPLOADS_24H | REQUEST_FORM
    var requestPrefillTitle by mutableStateOf("")
    var requestPrefillType by mutableStateOf("MOVIE")
    var requestBusy by mutableStateOf(false)
    var requestFeedback by mutableStateOf("")

    // Active Player / Detail Movie & Player Preferences
    var selectedMovie by mutableStateOf<MovieCardItem?>(null)
    var preferredQuality by mutableIntStateOf(store.getPreferredQuality())
    var autoBanglaSubDefault by mutableStateOf(store.getAutoBanglaSubDefault())
    var soundBoostPct by mutableIntStateOf(store.getSoundBoostPct())
    var brightnessPct by mutableIntStateOf(store.getBrightnessPct())
    var autoNextEp by mutableStateOf(store.getAutoNextEp())

    private var syncJob: Job? = null

    init {
        bootstrapSessionAndFeed()
    }

    private fun bootstrapSessionAndFeed() {
        viewModelScope.launch {
            val saved = store.getSavedUserSession()
            if (saved != null) {
                api.userToken = saved.token
                currentUser = saved
                watchlist = store.loadWatchlist(saved.userId)
                continueWatching = store.loadContinueWatching(saved.userId)
                val remote = runCatching { api.fetchUserMe() }.getOrNull()
                if (remote != null) {
                    applyUserSession(remote, mergeWithLocal = false)
                }
            } else {
                val (guest, _) = runCatching { api.authUser("guest") }.getOrNull() ?: (null to "")
                if (guest != null) {
                    applyUserSession(guest, mergeWithLocal = false)
                }
            }
        }

        viewModelScope.launch {
            isLoadingHome = true
            runCatching {
                val cats = api.fetchCategories()
                if (cats.size >= 15) categories = cats
            }
            runCatching {
                val home = api.fetchMbHome()
                homePayload = home
            }
            isLoadingHome = false
        }

        viewModelScope.launch {
            loadCatalogInternal(currentCategory.path, 1, "", refresh = false)
            refreshLast24hAndRequests()
        }
    }

    fun refreshLast24hAndRequests() {
        viewModelScope.launch {
            isRefreshing24h = true
            val notifs = runCatching { api.fetchNotifications() }.getOrDefault(emptyList())
            notifications = notifs
            val freshCatalog = runCatching { api.fetchCatalog("/", 1, "", activeNodeId, refresh = true).first }.getOrDefault(emptyList())
            val merged = (notifs.map { it.movie } + freshCatalog).distinctBy { it.path }.take(40)
            if (merged.isNotEmpty()) last24hItems = merged
            requests = runCatching { api.fetchRequests() }.getOrDefault(requests)
            isRefreshing24h = false
        }
    }

    private fun applyUserSession(session: UserAccountSession, mergeWithLocal: Boolean, carryWatchlist: List<MovieCardItem> = emptyList(), carryHistory: List<WatchProgressItem> = emptyList()) {
        api.userToken = session.token
        store.saveUserSession(session)
        currentUser = session
        val localWl = store.loadWatchlist(session.userId)
        val localCw = store.loadContinueWatching(session.userId)
        val baseWl = if (session.watchlist.isNotEmpty() || !mergeWithLocal) session.watchlist else localWl
        val baseCw = if (session.continueWatching.isNotEmpty() || !mergeWithLocal) session.continueWatching else localCw
        val finalWl = (baseWl + carryWatchlist).distinctBy { it.path }
        val finalCw = (baseCw + carryHistory).distinctBy { it.movie.path }
        watchlist = finalWl
        continueWatching = finalCw
        store.saveWatchlist(session.userId, finalWl)
        store.saveContinueWatching(session.userId, finalCw)
        if (carryWatchlist.isNotEmpty() || carryHistory.isNotEmpty()) {
            scheduleServerStateSync()
        }
    }

    fun authenticate(mode: String, username: String, pin: String, carryGuestData: Boolean = true) {
        viewModelScope.launch {
            authBusy = true
            authError = ""
            authSuccessMsg = ""
            val oldWl = if (carryGuestData && mode == "register") watchlist else emptyList()
            val oldCw = if (carryGuestData && mode == "register") continueWatching else emptyList()
            val (session, err) = api.authUser(mode, username.trim(), pin.trim())
            if (session != null) {
                applyUserSession(session, mergeWithLocal = false, carryWatchlist = oldWl, carryHistory = oldCw)
                authSuccessMsg = if (mode == "register") "নতুন অ্যাকাউন্ট তৈরি হয়েছে: @${session.username}" else "স্বাগতম @${session.username}!"
            } else {
                authError = err.ifEmpty { "সার্ভারে লগইন করা যায়নি" }
            }
            authBusy = false
        }
    }

    fun logoutToNewGuest() {
        viewModelScope.launch {
            authBusy = true
            authError = ""
            authSuccessMsg = ""
            store.clearUserSession()
            api.userToken = ""
            watchlist = emptyList()
            continueWatching = emptyList()
            val (guest, _) = runCatching { api.authUser("guest") }.getOrNull() ?: (null to "")
            if (guest != null) {
                applyUserSession(guest, mergeWithLocal = false)
            } else {
                currentUser = null
            }
            authBusy = false
        }
    }

    fun selectCategory(cat: CategoryOption) {
        currentCategory = cat
        activeTab = MainTab.HOME_BROWSE
        isSearchActive = false
        searchQuery = ""
        submittedSearch = ""
        audioFilter = "ALL"
        qualityFilter = "ALL"
        viewModelScope.launch {
            loadCatalogInternal(cat.path, 1, "", refresh = false)
        }
    }

    fun selectCategoryByPath(path: String) {
        val found = CinePulseCatalogData.findCategory(path)
        selectCategory(found)
    }

    fun changePage(page: Int) {
        val target = page.coerceIn(1, maxPage.coerceAtLeast(1))
        viewModelScope.launch {
            loadCatalogInternal(currentCategory.path, target, submittedSearch, refresh = false)
        }
    }

    fun switchServerNode(nodeId: String) {
        if (activeNodeId == nodeId) return
        activeNodeId = nodeId
        store.setActiveNodeId(nodeId)
        viewModelScope.launch {
            loadCatalogInternal(currentCategory.path, 1, submittedSearch, refresh = true)
        }
    }

    private suspend fun loadCatalogInternal(path: String, page: Int, query: String, refresh: Boolean) {
        isLoadingCatalog = true
        val (items, maxP) = runCatching {
            api.fetchCatalog(path, page, query, activeNodeId, refresh)
        }.getOrDefault(emptyList<MovieCardItem>() to 1)
        rawCatalogItems = items
        currentPage = page
        maxPage = maxP.coerceAtLeast(page)
        if (last24hItems.isEmpty() && items.isNotEmpty()) {
            last24hItems = items.take(30)
        }
        isLoadingCatalog = false
    }

    fun filteredBrowseItems(): List<MovieCardItem> {
        val base = rawCatalogItems.filter { item ->
            val langUp = "${item.language} ${item.title}".uppercase()
            val audioOk = when (audioFilter) {
                "BANGLA" -> langUp.contains("BANGLA") || langUp.contains("BENGALI")
                "HINDI" -> langUp.contains("HINDI")
                "DUAL" -> langUp.contains("DUAL") || langUp.contains("MULTI")
                "SUB" -> langUp.contains("ANIME") || langUp.contains("SUB") || langUp.contains("JAP") || langUp.contains("KOR") || item.typeBadge == "ANIME"
                else -> true
            }
            val qUp = "${item.quality} ${item.title}".uppercase()
            val qualityOk = when (qualityFilter) {
                "4K" -> qUp.contains("4K") || qUp.contains("2160")
                "1080P" -> qUp.contains("1080") || qUp.contains("FHD")
                "WEBDL" -> qUp.contains("WEB")
                "HDTC" -> qUp.contains("HDTC") || qUp.contains("CAM")
                else -> true
            }
            audioOk && qualityOk
        }

        return when (sortBy) {
            "RATING" -> base.sortedByDescending { it.rating.toDoubleOrNull() ?: 8.0 }
            "VIEWS" -> base.sortedByDescending { parseViewsScore(it.views) }
            "TITLE" -> base.sortedBy { it.title.lowercase() }
            else -> base
        }
    }

    private fun parseViewsScore(v: String): Double {
        val clean = v.trim().uppercase()
        val num = clean.replace(Regex("[^0-9.]"), "").toDoubleOrNull() ?: 0.0
        return when {
            clean.contains("M") -> num * 1_000_000
            clean.contains("K") -> num * 1_000
            else -> num
        }
    }

    fun top10ThisWeekItems(): List<MovieCardItem> {
        val shelfItems = homePayload.sections.firstOrNull()?.items.orEmpty()
        val combined = (shelfItems + rawCatalogItems + CinePulseCatalogData.TOP_10_FALLBACK).distinctBy { it.path }
        return combined.take(10)
    }

    fun onSearchQueryChanged(q: String) {
        searchQuery = q
        searchJob?.cancel()
        if (q.trim().length < 2) {
            suggestItems = emptyList()
            if (q.isBlank()) searchResults = emptyList()
            return
        }
        searchJob = viewModelScope.launch {
            delay(250)
            suggestItems = runCatching { api.fetchSuggest(q.trim(), activeNodeId) }.getOrDefault(emptyList())
        }
    }

    fun submitSearch(q: String = searchQuery) {
        val clean = q.trim()
        if (clean.isEmpty()) return
        searchQuery = clean
        submittedSearch = clean
        saveRecentSearch(clean)
        viewModelScope.launch {
            isSearching = true
            val (items, _) = runCatching { api.fetchCatalog("/", 1, clean, activeNodeId) }.getOrDefault(emptyList<MovieCardItem>() to 1)
            val suggested = if (items.isEmpty()) runCatching { api.fetchSuggest(clean, activeNodeId) }.getOrDefault(emptyList()) else items
            searchResults = suggested
            isSearching = false
        }
    }

    fun openSearchWithActor(actorName: String) {
        selectedMovie = null
        activeTab = MainTab.HOME_BROWSE
        isSearchActive = true
        submitSearch(actorName)
    }

    fun closeSearchMode() {
        isSearchActive = false
        searchQuery = ""
        submittedSearch = ""
        suggestItems = emptyList()
        searchResults = emptyList()
        searchTabFilter = "ALL"
    }

    fun saveRecentSearch(term: String) {
        val clean = term.trim()
        if (clean.isEmpty()) return
        val next = (listOf(clean) + recentSearches.filterNot { it.equals(clean, ignoreCase = true) }).take(10)
        recentSearches = next
        store.saveRecentSearches(next)
    }

    fun clearRecentSearches() {
        recentSearches = emptyList()
        store.saveRecentSearches(emptyList())
    }

    fun searchFilteredPool(): List<MovieCardItem> {
        val activeQ = searchQuery.trim().ifEmpty { submittedSearch.trim() }.lowercase()
        val pool = if (activeQ.isNotEmpty()) {
            val localMatches = (rawCatalogItems + homePayload.sections.flatMap { it.items }).filter {
                "${it.title} ${it.language} ${it.sportGenre}".lowercase().contains(activeQ)
            }
            (suggestItems + searchResults + localMatches).distinctBy { it.path }
        } else {
            (rawCatalogItems.take(24) + CinePulseCatalogData.TOP_10_FALLBACK).distinctBy { it.path }
        }

        return pool.filter { item ->
            val t = "${item.title} ${item.typeBadge} ${item.episodePill}".lowercase()
            when (searchTabFilter) {
                "MOVIE_SERIES" -> true
                "SHORT_TV" -> t.contains("short") || t.contains("drama") || t.contains("ep") || t.contains("series") || t.contains("s0")
                "MUSIC" -> t.contains("music") || t.contains("song") || t.contains("concert") || t.contains("musical")
                else -> true
            }
        }
    }

    fun toggleBookComingSoon(id: String) {
        val next = if (bookedComingSoonIds.contains(id)) bookedComingSoonIds - id else bookedComingSoonIds + id
        bookedComingSoonIds = next
        store.saveBookedComingSoonIds(next)
    }

    fun openMovie(movie: MovieCardItem) {
        selectedMovie = movie
    }

    fun openLiveSportMatch(match: LiveSportMatch) {
        val targetPath = match.playPath.ifEmpty { match.detailUrl }
        if (targetPath.isEmpty()) return
        selectedMovie = MovieCardItem(
            id = match.id,
            title = "${match.team1.name} vs ${match.team2.name}",
            url = targetPath,
            path = targetPath,
            poster = match.team1.avatar.ifEmpty { match.team2.avatar },
            quality = "LIVE HD",
            language = match.league,
            typeBadge = "LIVE",
            timeAgo = match.timeDesc
        )
    }

    fun closeMovie() {
        selectedMovie = null
    }

    fun isInWatchlist(movie: MovieCardItem): Boolean =
        watchlist.any { it.path == movie.path || it.url == movie.url }

    fun toggleWatchlist(movie: MovieCardItem, folder: String = "favorites") {
        val uid = currentUser?.userId ?: "guest"
        val exists = isInWatchlist(movie)
        val next = if (exists) {
            watchlist.filterNot { it.path == movie.path || it.url == movie.url }
        } else {
            listOf(movie.copy(folder = folder)) + watchlist
        }
        watchlist = next
        store.saveWatchlist(uid, next)
        scheduleServerStateSync()
    }

    fun getSavedProgress(moviePath: String): WatchProgressItem? =
        continueWatching.firstOrNull { it.movie.path == moviePath || it.movie.url == moviePath }

    fun recordWatchProgress(
        movie: MovieCardItem,
        episode: EpisodeItem?,
        episodeIdx: Int,
        source: StreamSource?,
        seconds: Int,
        durationSec: Int
    ) {
        val uid = currentUser?.userId ?: "guest"
        val existing = continueWatching.firstOrNull { it.movie.path == movie.path || it.movie.url == movie.url }
        val safeSeconds = if (seconds >= 4) seconds else (existing?.progressSeconds ?: 0)
        val safeDur = if (durationSec > 0) durationSec else (existing?.durationSeconds ?: 0)
        val entry = WatchProgressItem(
            movie = movie,
            episodeId = episode?.id ?: existing?.episodeId ?: "",
            episodeIdx = episodeIdx,
            episodeLabel = episode?.label ?: existing?.episodeLabel ?: "",
            quality = source?.quality ?: existing?.quality ?: 720,
            audio = source?.audio ?: existing?.audio ?: "",
            updatedAt = System.currentTimeMillis(),
            progressSeconds = safeSeconds,
            durationSeconds = safeDur
        )
        val next = (listOf(entry) + continueWatching.filterNot {
            it.movie.path == movie.path || it.movie.url == movie.url
        }).take(30)
        continueWatching = next
        store.saveContinueWatching(uid, next)
        scheduleServerStateSync()
    }

    fun removeFromContinueWatching(moviePath: String) {
        val uid = currentUser?.userId ?: "guest"
        val next = continueWatching.filterNot { it.movie.path == moviePath || it.movie.url == moviePath }
        continueWatching = next
        store.saveContinueWatching(uid, next)
        scheduleServerStateSync()
    }

    fun clearWatchHistory() {
        val uid = currentUser?.userId ?: "guest"
        continueWatching = emptyList()
        store.saveContinueWatching(uid, emptyList())
        scheduleServerStateSync()
    }

    fun exportWatchlistJson(): String {
        val arr = JSONArray()
        watchlist.forEach { arr.put(api.movieCardToJson(it)) }
        return arr.toString(2)
    }

    private fun scheduleServerStateSync() {
        syncJob?.cancel()
        syncJob = viewModelScope.launch {
            delay(1200)
            runCatching { api.syncUserState(watchlist, continueWatching) }
        }
    }

    fun updatePreferredQuality(q: Int) {
        preferredQuality = q
        store.setPreferredQuality(q)
    }

    fun updateAutoBanglaSubDefault(enabled: Boolean) {
        autoBanglaSubDefault = enabled
        store.setAutoBanglaSubDefault(enabled)
    }

    fun updateSoundBoostPct(pct: Int) {
        val clamped = pct.coerceIn(0, 400)
        soundBoostPct = clamped
        store.setSoundBoostPct(clamped)
    }

    fun updateBrightnessPct(pct: Int) {
        val clamped = pct.coerceIn(20, 160)
        brightnessPct = clamped
        store.setBrightnessPct(clamped)
    }

    fun updateAutoNextEp(enabled: Boolean) {
        autoNextEp = enabled
        store.setAutoNextEp(enabled)
    }

    fun getCustomReviewsForMovie(key: String): List<MovieReviewItem> = store.getReviewsForMovie(key)

    fun addCustomReviewForMovie(key: String, author: String, stars: Int, text: String): List<MovieReviewItem> {
        val item = MovieReviewItem(
            id = "rev-${System.currentTimeMillis()}",
            author = author.trim().ifEmpty { "CinePulse Viewer" },
            rating = stars.toString(),
            content = text.trim(),
            date = "Just now"
        )
        return store.addReviewForMovie(key, item)
    }

    fun openRequestModal(initialTab: String = "UPLOADS_24H", title: String = "", type: String = "MOVIE") {
        requestInitialTab = initialTab
        requestPrefillTitle = title
        requestPrefillType = type
        requestFeedback = ""
        showRequestModal = true
    }

    fun submitRequest(title: String, type: String, language: String, notes: String) {
        if (title.isBlank()) return
        viewModelScope.launch {
            requestBusy = true
            requestFeedback = ""
            val (ok, err) = api.submitMovieRequest(title.trim(), type, language, notes.trim())
            if (ok) {
                requestFeedback = "আপনার রিকোয়েস্ট সফলভাবে যুক্ত হয়েছে!"
                requests = runCatching { api.fetchRequests() }.getOrDefault(requests)
            } else {
                requestFeedback = err.ifEmpty { "রিকোয়েস্ট পাঠানো যায়নি" }
            }
            requestBusy = false
        }
    }
}
