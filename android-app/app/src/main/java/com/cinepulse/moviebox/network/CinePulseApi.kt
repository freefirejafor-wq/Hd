package com.cinepulse.moviebox.network

import com.cinepulse.moviebox.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class TrialLockedException(message: String) : Exception(message)

class CinePulseApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .build()

    private fun enc(v: String): String = URLEncoder.encode(v, "UTF-8")

    private fun cleanBase(baseUrl: String): String =
        baseUrl.trim().trimEnd('/').let {
            when {
                it.endsWith("/api/app") || it.endsWith("/api/trial") -> it
                else -> "$it/api/app"
            }
        }

    private suspend fun getJson(baseUrl: String, apiKey: String, pathAndQuery: String): JSONObject =
        withContext(Dispatchers.IO) {
            val url = "${cleanBase(baseUrl)}$pathAndQuery"
            val reqBuilder = Request.Builder()
                .url(url)
                .header("User-Agent", "CinePulseBox/1.0 (Android)")
                .header("Accept", "application/json")
            if (apiKey.trim().isNotEmpty()) {
                reqBuilder.header("X-API-Key", apiKey.trim())
            }
            val req = reqBuilder.build()

            client.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                val json = try {
                    JSONObject(raw)
                } catch (_: Exception) {
                    JSONObject()
                }
                if (res.code == 401 || res.code == 403) {
                    val msg = json.optString("error", "API Key paused, expired, or quota exhausted (${res.code}).")
                    throw TrialLockedException(msg)
                }
                if (!res.isSuccessful || !json.optBoolean("ok", true)) {
                    throw Exception(json.optString("error", "Request failed (HTTP ${res.code})"))
                }
                json
            }
        }

    private fun parseTrial(obj: JSONObject?): TrialSummary {
        if (obj == null) return TrialSummary()
        return TrialSummary(
            clientName = obj.optString("clientName", ""),
            plan = obj.optString("plan", ""),
            remainingRequests = obj.optInt("remainingRequests", 0),
            maxRequests = obj.optInt("maxRequests", 0),
            usedRequests = obj.optInt("usedRequests", 0),
            expiresAt = obj.optString("expiresAt", ""),
            active = obj.optBoolean("active", true),
        )
    }

    private fun parseCard(o: JSONObject?): MovieCard? {
        if (o == null) return null
        val title = o.optString("title", "").trim()
        val path = o.optString("path", "").trim()
        if (title.isEmpty() || path.isEmpty()) return null
        return MovieCard(
            id = o.optString("id", path),
            title = title,
            path = path,
            poster = o.optString("poster", o.optString("previewImage", "")),
            quality = o.optString("quality", "HD"),
            rating = o.optString("rating", ""),
            language = o.optString("language", ""),
            typeBadge = o.optString("typeBadge", "MOVIE"),
            genre = o.optString("genre", o.optString("sportGenre", "")),
            country = o.optString("country", ""),
            releaseYear = o.optString("releaseYear", ""),
            isAdult = o.optBoolean("isAdult", false),
        )
    }

    private fun parseCards(arr: JSONArray?): List<MovieCard> {
        if (arr == null) return emptyList()
        val list = ArrayList<MovieCard>(arr.length())
        for (i in 0 until arr.length()) {
            parseCard(arr.optJSONObject(i))?.let { list.add(it) }
        }
        return list
    }

    private fun parseCategories(arr: JSONArray?): List<CategoryItem> {
        if (arr == null) return emptyList()
        val list = ArrayList<CategoryItem>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val path = o.optString("path", "")
            val label = o.optString("label", "")
            if (path.isNotEmpty() && label.isNotEmpty()) {
                list.add(
                    CategoryItem(
                        label = label,
                        bnLabel = o.optString("bnLabel", label),
                        path = path,
                        group = o.optString("group", "zone"),
                        isAdult = o.optBoolean("isAdult", false) || path.contains("adult18", true) || path.contains("midnight", true),
                    )
                )
            }
        }
        return list
    }

    suspend fun verifyKey(baseUrl: String, apiKey: String): Pair<TrialSummary, List<CategoryItem>> {
        val j = getJson(baseUrl, apiKey, "/categories")
        return parseTrial(j.optJSONObject("trial")) to parseCategories(j.optJSONArray("categories"))
    }

    suspend fun fetchHome(baseUrl: String, apiKey: String): HomePayload {
        val j = getJson(baseUrl, apiKey, "/home")
        val bannersArr = j.optJSONArray("banners")
        val banners = buildList {
            if (bannersArr != null) {
                for (i in 0 until bannersArr.length()) {
                    val o = bannersArr.optJSONObject(i) ?: continue
                    val path = o.optString("path", "")
                    if (path.isNotEmpty()) {
                        add(
                            BannerItem(
                                id = o.optString("id", "$i"),
                                title = o.optString("title", ""),
                                subtitle = o.optString("subtitle", ""),
                                image = o.optString("image", o.optString("poster", "")),
                                path = path,
                                badge = o.optString("badge", "FEATURED"),
                            )
                        )
                    }
                }
            }
        }

        val sportsArr = j.optJSONArray("liveSports")
        val sports = buildList {
            if (sportsArr != null) {
                for (i in 0 until sportsArr.length()) {
                    val o = sportsArr.optJSONObject(i) ?: continue
                    add(
                        LiveSportItem(
                            id = o.optString("id", "$i"),
                            title = o.optString("title", "Live Match"),
                            league = o.optString("league", o.optString("sportType", "Sports")),
                            teamA = o.optString("teamA", ""),
                            teamB = o.optString("teamB", ""),
                            teamALogo = o.optString("teamALogo", ""),
                            teamBLogo = o.optString("teamBLogo", ""),
                            score = o.optString("score", ""),
                            startTime = o.optString("startTime", ""),
                            sportType = o.optString("sportType", "football"),
                            badge = o.optString("badge", "LIVE"),
                            liveUrl = o.optString("liveUrl", ""),
                        )
                    )
                }
            }
        }

        val hotArr = j.optJSONArray("hotSearches")
        val hotSearches = buildList {
            if (hotArr != null) {
                for (i in 0 until hotArr.length()) {
                    val kw = hotArr.optString(i, "").trim()
                    if (kw.isNotEmpty()) add(kw)
                }
            }
        }

        fun parseSections(arr: JSONArray?): List<HomeSection> {
            if (arr == null) return emptyList()
            val out = mutableListOf<HomeSection>()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val title = o.optString("title", "").trim()
                val items = parseCards(o.optJSONArray("items"))
                if (title.isNotEmpty() && items.isNotEmpty()) {
                    out.add(
                        HomeSection(
                            id = o.optString("id", "sec-$i"),
                            title = title,
                            badge = o.optString("badge", "COLLECTION"),
                            categoryPath = o.optString("categoryPath", "/"),
                            items = items,
                        )
                    )
                }
            }
            return out
        }

        val comingArr = j.optJSONArray("comingSoon")
        val comingSoon = buildList {
            if (comingArr != null) {
                for (i in 0 until comingArr.length()) {
                    val o = comingArr.optJSONObject(i) ?: continue
                    val path = o.optString("path", "")
                    if (path.isNotEmpty()) {
                        add(
                            ComingSoonItem(
                                id = o.optString("id", "$i"),
                                title = o.optString("title", ""),
                                releaseBadge = o.optString("releaseBadge", "Soon"),
                                poster = o.optString("poster", ""),
                                path = path,
                                genre = o.optString("genre", ""),
                            )
                        )
                    }
                }
            }
        }

        return HomePayload(
            trial = parseTrial(j.optJSONObject("trial")),
            categories = parseCategories(j.optJSONArray("categories")),
            banners = banners,
            liveSports = sports,
            hotSearches = hotSearches,
            sections = parseSections(j.optJSONArray("sections")),
            allOfficialSections = parseSections(j.optJSONArray("allOfficialSections")),
            trending = parseCards(j.optJSONArray("trending")),
            comingSoon = comingSoon,
        )
    }

    suspend fun search(baseUrl: String, apiKey: String, query: String, page: Int = 1): CatalogPayload {
        val j = getJson(baseUrl, apiKey, "/search?q=${enc(query)}&page=$page")
        return CatalogPayload(
            trial = parseTrial(j.optJSONObject("trial")),
            path = "/search",
            page = j.optInt("page", page),
            maxPage = 20,
            items = parseCards(j.optJSONArray("items")),
        )
    }

    suspend fun fetchCatalog(baseUrl: String, apiKey: String, path: String, page: Int = 1): CatalogPayload {
        val j = getJson(baseUrl, apiKey, "/catalog?path=${enc(path)}&page=$page")
        return CatalogPayload(
            trial = parseTrial(j.optJSONObject("trial")),
            path = path,
            page = j.optInt("page", page),
            maxPage = j.optInt("maxPage", 50),
            items = parseCards(j.optJSONArray("items")),
        )
    }

    suspend fun fetchDetails(baseUrl: String, apiKey: String, path: String): DetailPayload {
        val j = getJson(baseUrl, apiKey, "/details?path=${enc(path)}")
        val d = j.optJSONObject("detail") ?: JSONObject()

        val seasonsArr = j.optJSONArray("seasons")
        val seasons = buildList {
            if (seasonsArr != null) {
                for (i in 0 until seasonsArr.length()) {
                    val s = seasonsArr.optInt(i, 0)
                    if (s > 0) add(s)
                }
            }
        }

        val epArr = d.optJSONArray("episodes")
        val episodes = buildList {
            if (epArr != null) {
                for (i in 0 until epArr.length()) {
                    val o = epArr.optJSONObject(i) ?: continue
                    add(
                        EpisodeItem(
                            season = o.optInt("season", 0),
                            number = o.optInt("number", 0),
                            title = o.optString("title", ""),
                        )
                    )
                }
            }
        }

        val dubArr = d.optJSONArray("dubs")
        val dubs = buildList {
            if (dubArr != null) {
                for (i in 0 until dubArr.length()) {
                    val o = dubArr.optJSONObject(i) ?: continue
                    val sid = o.optString("subjectId", "")
                    val lbl = o.optString("lanName", "")
                    if (sid.isNotEmpty() && lbl.isNotEmpty()) {
                        add(
                            DubOption(
                                id = sid,
                                label = lbl,
                                lanCode = o.optString("lanCode", ""),
                                path = o.optString("path", ""),
                                active = sid == j.optString("subjectId", ""),
                            )
                        )
                    }
                }
            }
        }

        return DetailPayload(
            trial = parseTrial(j.optJSONObject("trial")),
            subjectId = j.optString("subjectId", ""),
            detailPath = j.optString("detailPath", "movie"),
            title = d.optString("title", "Title"),
            poster = d.optString("poster", ""),
            description = d.optString("description", ""),
            rating = d.optString("rating", ""),
            releaseYear = d.optString("releaseYear", ""),
            country = d.optString("country", ""),
            genre = d.optString("genre", ""),
            language = d.optString("language", ""),
            typeBadge = d.optString("typeBadge", "MOVIE"),
            seasons = seasons,
            episodes = episodes,
            dubs = dubs,
            relatedMovies = parseCards(j.optJSONArray("relatedMovies")),
        )
    }

    suspend fun fetchStream(
        baseUrl: String,
        apiKey: String,
        path: String,
        se: Int,
        ep: Int,
        title: String,
        lang: String? = null,
    ): StreamPayload {
        val langParam = if (!lang.isNullOrBlank()) "&lang=${enc(lang)}" else ""
        val j = getJson(baseUrl, apiKey, "/stream?path=${enc(path)}&se=$se&ep=$ep&title=${enc(title)}$langParam")

        val dubArr = j.optJSONArray("availableDubs")
        val dubs = buildList {
            if (dubArr != null) {
                for (i in 0 until dubArr.length()) {
                    val o = dubArr.optJSONObject(i) ?: continue
                    val sid = o.optString("id", "")
                    val lbl = o.optString("label", "")
                    val sepEnd = o.optString("streamEndpoint", "")
                    val extractedPath = try {
                        val m = Regex("path=([^&]+)").find(sepEnd)?.groupValues?.getOrNull(1)
                        if (!m.isNullOrBlank()) java.net.URLDecoder.decode(m, "UTF-8") else ""
                    } catch (_: Exception) {
                        ""
                    }
                    if (sid.isNotEmpty() && lbl.isNotEmpty()) {
                        add(
                            DubOption(
                                id = sid,
                                label = lbl,
                                lanCode = o.optString("lanCode", ""),
                                path = extractedPath.ifBlank { "/mb/$sid/movie" },
                                active = o.optBoolean("active", false),
                            )
                        )
                    }
                }
            }
        }

        val srcArr = j.optJSONArray("sources")
        val sources = buildList {
            if (srcArr != null) {
                for (i in 0 until srcArr.length()) {
                    val o = srcArr.optJSONObject(i) ?: continue
                    val type = o.optString("type", "mp4")
                    val url = o.optString("url", "")
                    if (url.isNotEmpty() && !type.equals("iframe", true)) {
                        add(
                            VideoSource(
                                id = o.optString("id", "$i"),
                                url = url,
                                downloadUrl = o.optString("downloadUrl", url),
                                type = type,
                                quality = o.optInt("quality", 480),
                                qualityLabel = o.optString("qualityLabel", "${o.optInt("quality", 480)}p"),
                                audio = o.optString("audio", "Original Audio"),
                                sizeLabel = o.optString("sizeLabel", ""),
                            )
                        )
                    }
                }
            }
        }

        val subArr = j.optJSONArray("subtitles")
        val subtitles = buildList {
            if (subArr != null) {
                for (i in 0 until subArr.length()) {
                    val o = subArr.optJSONObject(i) ?: continue
                    val u = o.optString("url", "")
                    if (u.isNotEmpty()) {
                        add(
                            SubtitleTrack(
                                id = o.optString("id", "$i"),
                                lan = o.optString("lan", "en"),
                                lanName = o.optString("lanName", "English"),
                                url = u,
                            )
                        )
                    }
                }
            }
        }

        return StreamPayload(
            trial = parseTrial(j.optJSONObject("trial")),
            subjectId = j.optString("subjectId", ""),
            detailPath = j.optString("detailPath", ""),
            title = j.optString("title", title),
            activeAudio = j.optString("activeAudio", "Original Audio"),
            season = j.optInt("season", se),
            episode = j.optInt("episode", ep),
            embedPlayerUrl = j.optString("embedPlayerUrl", ""),
            availableDubs = dubs,
            sources = sources,
            subtitles = subtitles,
        )
    }
}
