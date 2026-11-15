package com.cinepulse.app.network

import com.cinepulse.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class CinePulseApi {
    val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    @Volatile
    var userToken: String = ""

    private suspend fun getSecureJson(relPathAndQuery: String): JSONObject = withContext(Dispatchers.IO) {
        val cloaked = SecurityShield.cloakApiPath(relPathAndQuery)
        val headers = SecurityShield.buildSecurityHeaders(relPathAndQuery)
        val reqBuilder = Request.Builder()
            .url("${SecurityShield.BASE_URL}$cloaked")
            .get()
        headers.forEach { (k, v) -> reqBuilder.header(k, v) }
        if (userToken.isNotEmpty()) reqBuilder.header("X-CP-User-Token", userToken)

        httpClient.newCall(reqBuilder.build()).execute().use { resp ->
            val raw = resp.body?.string() ?: "{}"
            SecurityShield.unwrapSecureJson(raw)
        }
    }

    private suspend fun sendSecureJson(
        method: String,
        relPathAndQuery: String,
        bodyObj: JSONObject
    ): JSONObject = withContext(Dispatchers.IO) {
        val cloaked = SecurityShield.cloakApiPath(relPathAndQuery)
        val headers = SecurityShield.buildSecurityHeaders(relPathAndQuery)
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val reqBody = bodyObj.toString().toRequestBody(mediaType)
        val reqBuilder = Request.Builder()
            .url("${SecurityShield.BASE_URL}$cloaked")
            .method(method, reqBody)
        headers.forEach { (k, v) -> reqBuilder.header(k, v) }
        if (userToken.isNotEmpty()) reqBuilder.header("X-CP-User-Token", userToken)

        httpClient.newCall(reqBuilder.build()).execute().use { resp ->
            val raw = resp.body?.string() ?: "{}"
            SecurityShield.unwrapSecureJson(raw)
        }
    }

    suspend fun fetchMbHome(): MovieBoxHomePayload {
        val json = getSecureJson("/api/mb-home")
        val banners = parseMovieCards(json.optJSONArray("banners"))
        val sports = parseLiveSports(json.optJSONArray("liveSports"))
        val quickCats = parseQuickCategories(json.optJSONArray("quickCategories"))
        val comingSoon = parseComingSoon(json.optJSONArray("comingSoon"))
        val sectionsArr = json.optJSONArray("sections") ?: JSONArray()
        val sections = mutableListOf<MovieBoxHomeShelf>()
        for (i in 0 until sectionsArr.length()) {
            val s = sectionsArr.optJSONObject(i) ?: continue
            val items = parseMovieCards(s.optJSONArray("items"))
            if (items.isNotEmpty()) {
                sections.add(
                    MovieBoxHomeShelf(
                        id = s.optString("id", "sec-$i"),
                        title = s.optString("title", "Popular"),
                        bnTitle = s.optString("bnTitle", s.optString("title", "জনপ্রিয়")),
                        categoryPath = s.optString("categoryPath", "/"),
                        badge = s.optString("badge", ""),
                        items = items
                    )
                )
            }
        }
        return MovieBoxHomePayload(
            ok = json.optBoolean("ok", true),
            banners = banners,
            liveSports = sports,
            quickCategories = quickCats,
            comingSoon = comingSoon,
            sections = sections
        )
    }

    suspend fun fetchCategories(): List<CategoryOption> {
        val json = getSecureJson("/api/categories")
        val arr = json.optJSONArray("categories") ?: return defaultCategories()
        val list = mutableListOf<CategoryOption>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            list.add(
                CategoryOption(
                    label = o.optString("label", "Category"),
                    bnLabel = o.optString("bnLabel", o.optString("label", "")),
                    path = o.optString("path", "/"),
                    group = o.optString("group", "zone"),
                    isAdult = o.optBoolean("isAdult", false)
                )
            )
        }
        return if (list.isNotEmpty()) list else defaultCategories()
    }

    suspend fun fetchCatalog(
        path: String,
        page: Int = 1,
        query: String = "",
        nodeId: String = "node-moviebox",
        refresh: Boolean = false
    ): Pair<List<MovieCardItem>, Int> {
        val ep = URLEncoder.encode(path.ifEmpty { "/" }, "UTF-8")
        val eq = URLEncoder.encode(query, "UTF-8")
        val en = URLEncoder.encode(nodeId, "UTF-8")
        val ref = if (refresh) "&refresh=1" else ""
        val json = getSecureJson("/api/catalog?path=$ep&page=$page&q=$eq&node=$en$ref")
        val items = parseMovieCards(json.optJSONArray("items"))
        val maxPage = json.optInt("maxPage", 1).coerceAtLeast(1)
        return items to maxPage
    }

    suspend fun fetchSuggest(query: String, nodeId: String = "node-moviebox"): List<MovieCardItem> {
        if (query.isBlank()) return emptyList()
        val eq = URLEncoder.encode(query.trim(), "UTF-8")
        val en = URLEncoder.encode(nodeId, "UTF-8")
        val json = getSecureJson("/api/suggest?q=$eq&node=$en")
        return parseMovieCards(json.optJSONArray("items"))
    }

    suspend fun fetchDetails(
        path: String,
        title: String = "",
        nodeId: String = "node-moviebox",
        enrich: Boolean = false
    ): MovieDetailData? {
        val ep = URLEncoder.encode(path, "UTF-8")
        val et = URLEncoder.encode(title, "UTF-8")
        val en = URLEncoder.encode(nodeId, "UTF-8")
        val enrichParam = if (enrich) "&enrich=1" else ""
        val json = getSecureJson("/api/details?path=$ep&title=$et&node=$en$enrichParam")
        val d = json.optJSONObject("detail") ?: return null
        return parseMovieDetail(d)
    }

    suspend fun resolveLiveSportStreams(path: String, title: String): List<StreamSource> {
        val detail = fetchDetails(path, title, enrich = false)
        return detail?.episodes?.firstOrNull()?.sources ?: emptyList()
    }

    suspend fun fetchCaptions(rawPath: String, se: Int, ep: Int): List<SubtitleTrackOption> {
        val epPath = URLEncoder.encode(rawPath, "UTF-8")
        val json = getSecureJson("/api/mb-captions?path=$epPath&se=$se&ep=$ep")
        val arr = json.optJSONArray("captions") ?: return emptyList()
        val out = mutableListOf<SubtitleTrackOption>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val url = o.optString("url", "")
            if (url.isNotEmpty()) {
                val lan = o.optString("lanName", o.optString("lan", "English"))
                val code = o.optString("lan", "en")
                out.add(
                    SubtitleTrackOption(
                        id = o.optString("id", "sub-$i"),
                        label = lan,
                        langCode = code,
                        url = url,
                        isBengaliNative = code.startsWith("bn", ignoreCase = true) ||
                            lan.contains("bangla", true) || lan.contains("bengali", true)
                    )
                )
            }
        }
        return out
    }

    suspend fun fetchSubtitleText(rawUrl: String): String = withContext(Dispatchers.IO) {
        val fullUrl = when {
            rawUrl.startsWith("http") -> rawUrl
            rawUrl.startsWith("/_s/") -> "${SecurityShield.BASE_URL}$rawUrl"
            rawUrl.startsWith("/api/") -> "${SecurityShield.BASE_URL}${SecurityShield.cloakApiPath(rawUrl)}"
            else -> "${SecurityShield.BASE_URL}/_s/g?k=${SecurityShield.encodeCloakToken("/api/mb-subtitle-srt?url=${URLEncoder.encode(rawUrl, "UTF-8")}")}"
        }
        val req = Request.Builder()
            .url(fullUrl)
            .header("User-Agent", SecurityShield.ANDROID_CHROME_UA)
            .header("Referer", "${SecurityShield.BASE_URL}/")
            .build()
        httpClient.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) "" else resp.body?.string() ?: ""
        }
    }

    suspend fun fetchNotifications(): List<GlobalMovieNotification> {
        val json = getSecureJson("/api/notifications")
        val arr = json.optJSONArray("notifications") ?: return emptyList()
        val out = mutableListOf<GlobalMovieNotification>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val m = parseMovieCard(o.optJSONObject("movie")) ?: continue
            out.add(
                GlobalMovieNotification(
                    id = o.optString("id", "n-$i"),
                    category = o.optString("category", "NEW_UPLOAD"),
                    badgeText = o.optString("badgeText", "NEW"),
                    headlineBn = o.optString("headlineBn", m.title),
                    subtitleBn = o.optString("subtitleBn", ""),
                    movie = m,
                    createdAt = o.optLong("createdAt", System.currentTimeMillis()),
                    ratingScore = o.optDouble("ratingScore", 8.0)
                )
            )
        }
        return out
    }

    suspend fun fetchRequests(): List<UserMovieRequest> {
        val json = getSecureJson("/api/requests")
        val arr = json.optJSONArray("requests") ?: return emptyList()
        val out = mutableListOf<UserMovieRequest>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                UserMovieRequest(
                    id = o.optString("id", "req-$i"),
                    title = o.optString("title", ""),
                    type = o.optString("type", "MOVIE"),
                    language = o.optString("language", "Bangla / Dual Audio"),
                    notes = o.optString("notes", ""),
                    status = o.optString("status", "Queued"),
                    createdAt = o.optLong("createdAt", System.currentTimeMillis())
                )
            )
        }
        return out
    }

    suspend fun submitMovieRequest(title: String, type: String, language: String, notes: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("title", title)
            put("type", type)
            put("language", language)
            put("notes", notes)
        }
        val json = sendSecureJson("POST", "/api/requests", body)
        return json.optBoolean("ok", false) to json.optString("error", "")
    }

    suspend fun authUser(mode: String, username: String = "", pin: String = ""): Pair<UserAccountSession?, String> {
        val body = JSONObject().apply {
            put("mode", mode)
            if (username.isNotEmpty()) put("username", username)
            if (pin.isNotEmpty()) put("pin", pin)
        }
        val json = sendSecureJson("POST", "/api/user/auth", body)
        if (!json.optBoolean("ok", false)) {
            return null to json.optString("error", "লগইন ব্যর্থ হয়েছে")
        }
        val u = json.optJSONObject("user") ?: return null to "অবৈধ সার্ভার রেসপন্স"
        return parseUserSession(u) to ""
    }

    suspend fun fetchUserMe(): UserAccountSession? {
        if (userToken.isEmpty()) return null
        val json = getSecureJson("/api/user/me")
        if (!json.optBoolean("ok", false)) return null
        val u = json.optJSONObject("user") ?: return null
        return parseUserSession(u)
    }

    suspend fun syncUserState(watchlist: List<MovieCardItem>, continueWatching: List<WatchProgressItem>) {
        if (userToken.isEmpty()) return
        val wlArr = JSONArray().apply {
            watchlist.take(200).forEach { put(movieCardToJson(it)) }
        }
        val cwArr = JSONArray().apply {
            continueWatching.take(30).forEach { put(watchProgressToJson(it)) }
        }
        val body = JSONObject().apply {
            put("watchlist", wlArr)
            put("continueWatching", cwArr)
        }
        sendSecureJson("PUT", "/api/user/state", body)
    }

    fun parseUserSession(u: JSONObject): UserAccountSession {
        return UserAccountSession(
            userId = u.optString("userId", ""),
            username = u.optString("username", "Guest"),
            isGuest = u.optBoolean("isGuest", true),
            token = u.optString("token", userToken),
            watchlist = parseMovieCards(u.optJSONArray("watchlist")),
            continueWatching = parseWatchProgressList(u.optJSONArray("continueWatching"))
        )
    }

    fun movieCardToJson(m: MovieCardItem): JSONObject = JSONObject().apply {
        put("id", m.id)
        put("title", m.title)
        put("url", m.url)
        put("path", m.path)
        put("poster", m.poster)
        put("previewImage", m.previewImage)
        put("description", m.description)
        put("country", m.country)
        put("sportGenre", m.sportGenre)
        put("quality", m.quality)
        put("views", m.views)
        put("language", m.language)
        put("typeBadge", m.typeBadge)
        put("timeAgo", m.timeAgo)
        put("episodePill", m.episodePill)
        put("isPinned", m.isPinned)
        put("isAdult", m.isAdult)
        if (m.folder != null) put("folder", m.folder)
        put("rating", m.rating)
        put("hypeBadge", m.hypeBadge)
    }

    fun watchProgressToJson(w: WatchProgressItem): JSONObject = JSONObject().apply {
        put("movie", movieCardToJson(w.movie))
        put("episodeId", w.episodeId)
        put("episodeIdx", w.episodeIdx)
        put("episodeLabel", w.episodeLabel)
        put("quality", w.quality)
        put("audio", w.audio)
        put("updatedAt", w.updatedAt)
        put("progressSeconds", w.progressSeconds)
        put("durationSeconds", w.durationSeconds)
    }

    fun parseWatchProgressList(arr: JSONArray?): List<WatchProgressItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<WatchProgressItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val m = parseMovieCard(o.optJSONObject("movie")) ?: continue
            out.add(
                WatchProgressItem(
                    movie = m,
                    episodeId = o.optString("episodeId", ""),
                    episodeIdx = o.optInt("episodeIdx", 0),
                    episodeLabel = o.optString("episodeLabel", ""),
                    quality = o.optInt("quality", 720),
                    audio = o.optString("audio", ""),
                    updatedAt = o.optLong("updatedAt", System.currentTimeMillis()),
                    progressSeconds = o.optInt("progressSeconds", 0),
                    durationSeconds = o.optInt("durationSeconds", 0)
                )
            )
        }
        return out
    }

    fun parseMovieCards(arr: JSONArray?): List<MovieCardItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<MovieCardItem>()
        for (i in 0 until arr.length()) {
            parseMovieCard(arr.optJSONObject(i))?.let { out.add(it) }
        }
        return out
    }

    fun parseMovieCard(o: JSONObject?): MovieCardItem? {
        if (o == null) return null
        val path = o.optString("path", o.optString("url", ""))
        val title = o.optString("title", "")
        if (path.isEmpty() || title.isEmpty()) return null
        return MovieCardItem(
            id = o.optString("id", path),
            title = title,
            url = o.optString("url", path),
            path = path,
            poster = o.optString("poster", ""),
            previewImage = o.optString("previewImage", ""),
            description = o.optString("description", ""),
            country = o.optString("country", ""),
            sportGenre = o.optString("sportGenre", ""),
            quality = o.optString("quality", "HD"),
            views = o.optString("views", ""),
            language = o.optString("language", "Multi Audio"),
            typeBadge = o.optString("typeBadge", "MOVIE"),
            timeAgo = o.optString("timeAgo", "Recent"),
            episodePill = o.optString("episodePill", ""),
            isPinned = o.optBoolean("isPinned", false),
            isAdult = o.optBoolean("isAdult", false),
            folder = if (o.has("folder") && !o.isNull("folder")) o.optString("folder") else null,
            rating = o.optString("rating", ""),
            hypeBadge = o.optString("hypeBadge", ""),
            seasonNumber = if (o.has("seasonNumber") && !o.isNull("seasonNumber")) o.optInt("seasonNumber") else null,
            active = o.optBoolean("active", false)
        )
    }

    private fun parseQuickCategories(arr: JSONArray?): List<MovieBoxQuickCategory> {
        if (arr == null) return emptyList()
        val out = mutableListOf<MovieBoxQuickCategory>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                MovieBoxQuickCategory(
                    id = o.optString("id", "qc-$i"),
                    title = o.optString("title", ""),
                    bnTitle = o.optString("bnTitle", o.optString("title", "")),
                    image = o.optString("image", ""),
                    path = o.optString("path", "/")
                )
            )
        }
        return out
    }

    private fun parseComingSoon(arr: JSONArray?): List<MovieBoxComingSoonItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<MovieBoxComingSoonItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                MovieBoxComingSoonItem(
                    id = o.optString("id", "cs-$i"),
                    title = o.optString("title", ""),
                    releaseDate = o.optString("releaseDate", ""),
                    releaseBadge = o.optString("releaseBadge", "Soon"),
                    bookedCount = o.optInt("bookedCount", 0),
                    poster = o.optString("poster", ""),
                    path = o.optString("path", ""),
                    genre = o.optString("genre", "Cinema"),
                    country = o.optString("country", "")
                )
            )
        }
        return out
    }

    private fun parseLiveSports(arr: JSONArray?): List<LiveSportMatch> {
        if (arr == null) return emptyList()
        val out = mutableListOf<LiveSportMatch>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val t1 = o.optJSONObject("team1")
            val t2 = o.optJSONObject("team2")
            val psArr = o.optJSONArray("playSource") ?: JSONArray()
            val sources = mutableListOf<LiveSportPlaySource>()
            for (j in 0 until psArr.length()) {
                val p = psArr.optJSONObject(j) ?: continue
                sources.add(LiveSportPlaySource(p.optString("title", "Stream"), p.optString("path", "")))
            }
            out.add(
                LiveSportMatch(
                    id = o.optString("id", "sp-$i"),
                    sportType = o.optString("sportType", "cricket"),
                    league = o.optString("league", "Live Sports"),
                    matchRound = o.optString("matchRound", ""),
                    status = o.optString("status", ""),
                    matchState = o.optString("matchState", "LIVE"),
                    isLive = o.optBoolean("isLive", false),
                    startTimeMs = o.optLong("startTimeMs", 0L),
                    timeDesc = o.optString("timeDesc", ""),
                    matchResult = o.optString("matchResult", ""),
                    team1 = parseTeam(t1, "Team A"),
                    team2 = parseTeam(t2, "Team B"),
                    playPath = o.optString("playPath", o.optString("detailUrl", "")),
                    playSource = sources,
                    detailUrl = o.optString("detailUrl", "")
                )
            )
        }
        return out
    }

    private fun parseTeam(o: JSONObject?, fallback: String): LiveSportTeam {
        if (o == null) return LiveSportTeam("", fallback, fallback.take(3), "", "")
        return LiveSportTeam(
            id = o.optString("id", ""),
            name = o.optString("name", fallback),
            abbreviation = o.optString("abbreviation", fallback.take(3)),
            avatar = o.optString("avatar", ""),
            score = o.optString("score", ""),
            cricketScoreText = o.optString("cricketScoreText", "")
        )
    }

    private fun parseMovieDetail(d: JSONObject): MovieDetailData {
        val epArr = d.optJSONArray("episodes") ?: JSONArray()
        val episodes = mutableListOf<EpisodeItem>()
        for (i in 0 until epArr.length()) {
            val eo = epArr.optJSONObject(i) ?: continue
            val srcArr = eo.optJSONArray("sources") ?: JSONArray()
            val sources = mutableListOf<StreamSource>()
            for (j in 0 until srcArr.length()) {
                val so = srcArr.optJSONObject(j) ?: continue
                val langsArr = so.optJSONArray("audioLanguages") ?: JSONArray()
                val langs = mutableListOf<String>()
                for (k in 0 until langsArr.length()) {
                    langs.add(langsArr.optString(k))
                }
                val rawUrl = so.optString("url", "")
                val rawDl = so.optString("downloadUrl", rawUrl)
                sources.add(
                    StreamSource(
                        id = so.optString("id", "src-$i-$j"),
                        quality = so.optInt("quality", 720),
                        qualityLabel = so.optString("qualityLabel", "${so.optInt("quality", 720)}p"),
                        audio = so.optString("audio", "Original"),
                        audioLanguages = langs,
                        provider = so.optString("provider", "CinePulse Cloud"),
                        url = SecurityShield.cloakStreamUrl(rawUrl),
                        downloadUrl = SecurityShield.cloakStreamUrl(rawDl),
                        type = so.optString("type", "mp4"),
                        name = so.optString("name", "Server ${j + 1}"),
                        screenshot = so.optString("screenshot", "")
                    )
                )
            }
            episodes.add(
                EpisodeItem(
                    id = eo.optString("id", "ep-$i"),
                    label = eo.optString("label", "Episode ${i + 1}"),
                    number = if (eo.isNull("number")) null else eo.optInt("number"),
                    rangeStart = if (eo.isNull("rangeStart")) null else eo.optInt("rangeStart"),
                    rangeEnd = if (eo.isNull("rangeEnd")) null else eo.optInt("rangeEnd"),
                    season = if (eo.isNull("season")) null else eo.optInt("season"),
                    kind = eo.optString("kind", "episode"),
                    sources = sources
                )
            )
        }

        val dubArr = d.optJSONArray("dubs") ?: JSONArray()
        val dubs = mutableListOf<MovieDubOption>()
        for (i in 0 until dubArr.length()) {
            val doObj = dubArr.optJSONObject(i) ?: continue
            dubs.add(
                MovieDubOption(
                    id = doObj.optString("id", "dub-$i"),
                    label = doObj.optString("label", "Original"),
                    path = doObj.optString("path", ""),
                    active = doObj.optBoolean("active", false)
                )
            )
        }

        val dlArr = d.optJSONArray("downloadButtons") ?: JSONArray()
        val downloads = mutableListOf<DirectDownloadButton>()
        for (i in 0 until dlArr.length()) {
            val dlo = dlArr.optJSONObject(i) ?: continue
            downloads.add(
                DirectDownloadButton(
                    label = dlo.optString("label", "Download"),
                    url = SecurityShield.cloakStreamUrl(dlo.optString("url", "")),
                    quality = dlo.optString("quality", "HD"),
                    size = dlo.optString("size", "")
                )
            )
        }

        val castArr = d.optJSONArray("cast") ?: JSONArray()
        val cast = mutableListOf<CastMember>()
        for (i in 0 until castArr.length()) {
            val co = castArr.optJSONObject(i) ?: continue
            cast.add(
                CastMember(
                    name = co.optString("name", ""),
                    role = co.optString("role", ""),
                    photo = co.optString("photo", ""),
                    url = co.optString("url", "")
                )
            )
        }

        val ssArr = d.optJSONArray("screenshots") ?: JSONArray()
        val screenshots = mutableListOf<String>()
        for (i in 0 until ssArr.length()) {
            ssArr.optString(i).takeIf { it.isNotEmpty() }?.let { screenshots.add(it) }
        }

        val revArr = d.optJSONArray("reviews") ?: JSONArray()
        val reviews = mutableListOf<MovieReviewItem>()
        for (i in 0 until revArr.length()) {
            val ro = revArr.optJSONObject(i) ?: continue
            reviews.add(
                MovieReviewItem(
                    id = ro.optString("id", "srv-rev-$i"),
                    author = ro.optString("author", "CinePulse Viewer"),
                    rating = ro.opt("rating")?.toString() ?: "9.0",
                    content = ro.optString("content", ro.optString("text", "")),
                    date = ro.optString("date", ro.optString("createdAt", "Verified Viewer"))
                )
            )
        }

        val scoreObj = d.optJSONObject("communityScore")
        val recRating = if (scoreObj != null && scoreObj.has("recommendedPercent")) {
            String.format("%.1f", scoreObj.optDouble("recommendedPercent", 87.0) / 10.0)
        } else ""

        return MovieDetailData(
            title = d.optString("title", "CinePulse"),
            url = d.optString("url", ""),
            poster = d.optString("poster", ""),
            backdrop = d.optString("backdrop", ""),
            qualityNote = d.optString("qualityNote", ""),
            typeBadge = d.optString("typeBadge", "MOVIE"),
            language = d.optString("language", "Original Audio"),
            quality = d.optString("quality", "WEB-DL"),
            genre = d.optString("genre", ""),
            resolution = d.optString("resolution", ""),
            releaseDate = d.optString("releaseDate", ""),
            storyline = d.optString("storyline", ""),
            youtubeTrailerId = d.optString("youtubeTrailerId", ""),
            screenshots = screenshots,
            episodes = episodes,
            downloadButtons = downloads,
            cast = cast,
            relatedSeasons = parseMovieCards(d.optJSONArray("relatedSeasons")),
            dubs = dubs,
            reviews = reviews,
            uploadedBy = d.optString("uploadedBy", ""),
            recommendedRating = recRating
        )
    }

    private fun defaultCategories(): List<CategoryOption> = listOf(
        CategoryOption("All Movies", "সব মুভি", "/type/movies", "zone"),
        CategoryOption("Web Series", "ওয়েব সিরিজ", "/type/series", "zone"),
        CategoryOption("Bangla", "বাংলা মুভি ও নাটক", "/language/bangla", "language"),
        CategoryOption("Bollywood", "বলিউড হিন্দি", "/bollywood", "language"),
        CategoryOption("South Indian", "সাউথ ইন্ডিয়ান ডাবড", "/southIndian", "language"),
        CategoryOption("Hollywood", "হলিউড ইংলিশ", "/language/english", "language"),
        CategoryOption("Anime", "অ্যানিমে", "/anime", "genre"),
        CategoryOption("K-Drama", "কে-ড্রামা", "/drama", "genre")
    )
}
