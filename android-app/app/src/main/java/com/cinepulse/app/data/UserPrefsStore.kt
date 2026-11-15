package com.cinepulse.app.data

import android.content.Context
import android.content.SharedPreferences
import com.cinepulse.app.network.CinePulseApi
import org.json.JSONArray
import org.json.JSONObject

class UserPrefsStore(context: Context, private val api: CinePulseApi) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("cinepulse_prefs_v4", Context.MODE_PRIVATE)

    fun getSavedUserSession(): UserAccountSession? {
        val uid = prefs.getString("user_id", "") ?: ""
        val token = prefs.getString("user_token", "") ?: ""
        val username = prefs.getString("user_name", "") ?: ""
        if (uid.isEmpty() || token.isEmpty()) return null
        return UserAccountSession(
            userId = uid,
            username = username.ifEmpty { "User" },
            isGuest = prefs.getBoolean("user_is_guest", true),
            token = token
        )
    }

    fun saveUserSession(session: UserAccountSession) {
        prefs.edit()
            .putString("user_id", session.userId)
            .putString("user_name", session.username)
            .putString("user_token", session.token)
            .putBoolean("user_is_guest", session.isGuest)
            .apply()
    }

    fun clearUserSession() {
        prefs.edit()
            .remove("user_id")
            .remove("user_name")
            .remove("user_token")
            .remove("user_is_guest")
            .apply()
    }

    fun loadWatchlist(userId: String): List<MovieCardItem> {
        val key = "cp_watchlist_u_$userId"
        val raw = prefs.getString(key, "[]") ?: "[]"
        return try {
            api.parseMovieCards(JSONArray(raw))
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveWatchlist(userId: String, items: List<MovieCardItem>) {
        val arr = JSONArray()
        items.take(200).forEach { arr.put(api.movieCardToJson(it)) }
        prefs.edit().putString("cp_watchlist_u_$userId", arr.toString()).apply()
    }

    fun loadContinueWatching(userId: String): List<WatchProgressItem> {
        val key = "cp_continue_u_$userId"
        val raw = prefs.getString(key, "[]") ?: "[]"
        return try {
            api.parseWatchProgressList(JSONArray(raw))
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveContinueWatching(userId: String, items: List<WatchProgressItem>) {
        val arr = JSONArray()
        items.take(30).forEach { arr.put(api.watchProgressToJson(it)) }
        prefs.edit().putString("cp_continue_u_$userId", arr.toString()).apply()
    }

    fun getPreferredQuality(): Int = prefs.getInt("pref_quality", 480)
    fun setPreferredQuality(q: Int) = prefs.edit().putInt("pref_quality", q).apply()

    fun getAutoBanglaSubDefault(): Boolean = prefs.getBoolean("pref_auto_bn_sub", false)
    fun setAutoBanglaSubDefault(enabled: Boolean) = prefs.edit().putBoolean("pref_auto_bn_sub", enabled).apply()

    fun getActiveNodeId(): String = prefs.getString("active_node_id", "node-moviebox") ?: "node-moviebox"
    fun setActiveNodeId(nodeId: String) = prefs.edit().putString("active_node_id", nodeId).apply()

    fun getSoundBoostPct(): Int = prefs.getInt("sound_boost_pct", 100).coerceIn(0, 400)
    fun setSoundBoostPct(pct: Int) = prefs.edit().putInt("sound_boost_pct", pct.coerceIn(0, 400)).apply()

    fun getBrightnessPct(): Int = prefs.getInt("brightness_pct", 100).coerceIn(20, 160)
    fun setBrightnessPct(pct: Int) = prefs.edit().putInt("brightness_pct", pct.coerceIn(20, 160)).apply()

    fun getAutoNextEp(): Boolean = prefs.getBoolean("auto_next_ep", true)
    fun setAutoNextEp(enabled: Boolean) = prefs.edit().putBoolean("auto_next_ep", enabled).apply()

    fun getRecentSearches(): List<String> {
        val raw = prefs.getString("recent_searches", "") ?: ""
        if (raw.isEmpty()) return listOf("Tower of God [Hindi]", "Bohurupi", "Mirzapur", "One Piece")
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
        } catch (_: Exception) {
            listOf("Tower of God [Hindi]", "Bohurupi", "Mirzapur")
        }
    }

    fun saveRecentSearches(terms: List<String>) {
        val arr = JSONArray()
        terms.take(12).forEach { arr.put(it) }
        prefs.edit().putString("recent_searches", arr.toString()).apply()
    }

    fun getBookedComingSoonIds(): Set<String> {
        return prefs.getStringSet("booked_coming_soon", emptySet()) ?: emptySet()
    }

    fun saveBookedComingSoonIds(ids: Set<String>) {
        prefs.edit().putStringSet("booked_coming_soon", ids).apply()
    }

    fun getReviewsForMovie(key: String): List<MovieReviewItem> {
        val raw = prefs.getString("custom_reviews_v1", "{}") ?: "{}"
        return try {
            val root = JSONObject(raw)
            val arr = root.optJSONArray(key) ?: return emptyList()
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                MovieReviewItem(
                    id = o.optString("id", "rev-$i"),
                    author = o.optString("author", "CinePulse Viewer"),
                    rating = o.optString("rating", "5"),
                    content = o.optString("content", ""),
                    date = o.optString("date", "Just now")
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun addReviewForMovie(key: String, item: MovieReviewItem): List<MovieReviewItem> {
        val raw = prefs.getString("custom_reviews_v1", "{}") ?: "{}"
        val root = try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
        val existing = getReviewsForMovie(key)
        val updated = listOf(item) + existing
        val arr = JSONArray()
        updated.take(40).forEach { r ->
            arr.put(JSONObject().apply {
                put("id", r.id)
                put("author", r.author)
                put("rating", r.rating)
                put("content", r.content)
                put("date", r.date)
            })
        }
        root.put(key, arr)
        prefs.edit().putString("custom_reviews_v1", root.toString()).apply()
        return updated
    }
}
