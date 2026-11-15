package com.cinepulse.app.network

import com.cinepulse.app.data.SubtitleCue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.net.URLEncoder

object SubtitleEngine {

    fun parseSrtOrVtt(rawText: String): List<SubtitleCue> {
        val clean = rawText.replace("\r\n", "\n").replace("\r", "\n").trim()
        if (clean.isEmpty()) return emptyList()
        val blocks = clean.split(Regex("\n{2,}"))
        val cues = mutableListOf<SubtitleCue>()
        val timeRegex = Regex("""(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})""")

        for (block in blocks) {
            val lines = block.lines().map { it.trim() }.filter { it.isNotEmpty() }
            val timeIdx = lines.indexOfFirst { timeRegex.containsMatchIn(it) }
            if (timeIdx == -1) continue
            val m = timeRegex.find(lines[timeIdx]) ?: continue
            val startMs = parseTimeMs(m.groupValues[1], m.groupValues[2], m.groupValues[3], m.groupValues[4])
            val endMs = parseTimeMs(m.groupValues[5], m.groupValues[6], m.groupValues[7], m.groupValues[8])
            val text = lines.drop(timeIdx + 1)
                .joinToString("\n")
                .replace(Regex("<[^>]+>"), "")
                .trim()
            if (text.isNotEmpty() && endMs > startMs) {
                cues.add(SubtitleCue(startMs = startMs, endMs = endMs, originalText = text))
            }
        }
        return cues
    }

    private fun parseTimeMs(hPart: String, mPart: String, sPart: String, msPart: String): Long {
        val h = hPart.replace(":", "").toLongOrNull() ?: 0L
        val m = mPart.toLongOrNull() ?: 0L
        val s = sPart.toLongOrNull() ?: 0L
        val ms = msPart.toLongOrNull() ?: 0L
        return ((h * 3600L) + (m * 60L) + s) * 1000L + ms
    }

    fun findCueAtTime(cues: List<SubtitleCue>, positionMs: Long): String {
        if (cues.isEmpty()) return ""
        var lo = 0
        var hi = cues.lastIndex
        while (lo <= hi) {
            val mid = (lo + hi) ushr 1
            val c = cues[mid]
            when {
                positionMs < c.startMs -> hi = mid - 1
                positionMs > c.endMs -> lo = mid + 1
                else -> return c.banglaText.ifEmpty { c.originalText }
            }
        }
        return ""
    }

    suspend fun translateBatchToBangla(
        client: OkHttpClient,
        cues: List<SubtitleCue>,
        centerMs: Long
    ): List<SubtitleCue> = withContext(Dispatchers.IO) {
        if (cues.isEmpty()) return@withContext cues
        val targetIndices = cues.indices.filter { idx ->
            val c = cues[idx]
            c.banglaText.isEmpty() && c.endMs >= (centerMs - 20_000L) && c.startMs <= (centerMs + 180_000L)
        }.take(24)

        if (targetIndices.isEmpty()) return@withContext cues
        val joined = targetIndices.joinToString("\n|||\n") { cues[it].originalText.replace("\n", " ") }
        return@withContext try {
            val encoded = URLEncoder.encode(joined, "UTF-8")
            val url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=bn&dt=t&q=$encoded"
            val req = Request.Builder()
                .url(url)
                .header("User-Agent", SecurityShield.ANDROID_CHROME_UA)
                .build()
            val body = client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return@use ""
                resp.body?.string() ?: ""
            }
            if (body.isEmpty()) return@withContext cues
            val root = JSONArray(body)
            val segments = root.optJSONArray(0) ?: return@withContext cues
            val sb = StringBuilder()
            for (i in 0 until segments.length()) {
                val seg = segments.optJSONArray(i)
                val part = seg?.optString(0) ?: ""
                sb.append(part)
            }
            val translatedLines = sb.toString().split(Regex("""\s*\|\|\|\s*"""))
            val updated = cues.toMutableList()
            targetIndices.forEachIndexed { pos, cueIdx ->
                val bn = translatedLines.getOrNull(pos)?.trim().orEmpty()
                if (bn.isNotEmpty()) {
                    updated[cueIdx] = updated[cueIdx].copy(banglaText = bn)
                }
            }
            updated
        } catch (_: Exception) {
            cues
        }
    }
}
