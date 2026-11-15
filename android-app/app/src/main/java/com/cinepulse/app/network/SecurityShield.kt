package com.cinepulse.app.network

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.nio.charset.StandardCharsets

object SecurityShield {
    const val BASE_URL = "https://playlive.zeroo.click"
    const val ANDROID_CHROME_UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"

    private const val SHIELD_SECRET = "CP_SHIELD_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF"
    private const val CLOAK_KEY = "CP_CLOAK_v4_7x9M2pL5qW8zR1vK4jH6nB3tY0fD"

    fun computeShieldSignature(pathAndQuery: String, timestampStr: String): String {
        val cleanPath = (pathAndQuery.ifEmpty { "/" }).substringBefore('#')
        val raw = "$timestampStr::$cleanPath::$SHIELD_SECRET"
        var h1 = 0x811c9dc5.toInt()
        var h2 = 0x01000193
        for (i in raw.indices) {
            val c = raw[i].code
            h1 = (h1 xor c) * 16777619
            h2 = (h2 xor (c + (i and 0xff))) * 2246822507.toInt()
        }
        val p1 = h1.toUInt().toString(16).padStart(8, '0')
        val p2 = h2.toUInt().toString(16).padStart(8, '0')
        return p1 + p2
    }

    fun encodeCloakToken(plainText: String): String {
        if (plainText.isEmpty()) return ""
        return try {
            val utf8Bytes = plainText.toByteArray(StandardCharsets.UTF_8)
            val len = utf8Bytes.size
            var nonce = 0x5a3c
            for (i in 0 until len) {
                val b = utf8Bytes[i].toInt() and 0xff
                nonce = ((nonce shl 5) - nonce + b) and 0xffff
            }
            val out = ByteArray(len + 2)
            out[0] = ((nonce ushr 8) and 0xff).toByte()
            out[1] = (nonce and 0xff).toByte()

            var state = (0x811c9dc5.toInt() xor nonce)
            for (i in CLOAK_KEY.indices) {
                state = (state xor CLOAK_KEY[i].code) * 1664525 + 1013904223
            }
            for (i in 0 until len) {
                state = state * 1664525 + 1013904223
                val kChar = CLOAK_KEY[i % CLOAK_KEY.length].code
                val mask = ((state ushr 16) xor kChar xor (i and 0xff)) and 0xff
                out[i + 2] = ((utf8Bytes[i].toInt() and 0xff) xor mask).toByte()
            }
            Base64.encodeToString(out, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        } catch (_: Exception) {
            ""
        }
    }

    fun decodeCloakToken(token: String): String {
        if (token.isEmpty()) return ""
        return try {
            val raw = Base64.decode(token.trim(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            if (raw.size <= 2) return ""
            val nonce = (((raw[0].toInt() and 0xff) shl 8) or (raw[1].toInt() and 0xff)) and 0xffff
            val len = raw.size - 2
            val out = ByteArray(len)
            var state = (0x811c9dc5.toInt() xor nonce)
            for (i in CLOAK_KEY.indices) {
                state = (state xor CLOAK_KEY[i].code) * 1664525 + 1013904223
            }
            for (i in 0 until len) {
                state = state * 1664525 + 1013904223
                val kChar = CLOAK_KEY[i % CLOAK_KEY.length].code
                val mask = ((state ushr 16) xor kChar xor (i and 0xff)) and 0xff
                out[i] = ((raw[i + 2].toInt() and 0xff) xor mask).toByte()
            }
            String(out, StandardCharsets.UTF_8)
        } catch (_: Exception) {
            ""
        }
    }

    fun cloakApiPath(relUrl: String): String {
        if (relUrl.startsWith("/_s/")) return relUrl
        return "/_s/g?k=${encodeCloakToken(relUrl)}"
    }

    fun cloakStreamUrl(streamUrl: String): String {
        if (streamUrl.isEmpty()) return ""
        if (streamUrl.startsWith("/_s/v.mp4")) return "$BASE_URL$streamUrl"
        if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) return streamUrl
        if (
            streamUrl.startsWith("/api/mb-stream") ||
            streamUrl.startsWith("/api/mb-ep-stream") ||
            streamUrl.startsWith("/api/go")
        ) {
            return "$BASE_URL/_s/v.mp4?k=${encodeCloakToken(streamUrl)}"
        }
        return if (streamUrl.startsWith("/")) "$BASE_URL$streamUrl" else streamUrl
    }

    fun buildSecurityHeaders(relEndpointUrl: String): Map<String, String> {
        var pathAndQuery = relEndpointUrl
        try {
            val uri = URI(if (relEndpointUrl.startsWith("http")) relEndpointUrl else "$BASE_URL$relEndpointUrl")
            val rawPath = uri.rawPath ?: "/"
            val rawQuery = uri.rawQuery?.let { "?$it" } ?: ""
            pathAndQuery = rawPath + rawQuery
            if ((rawPath == "/_s/g" || rawPath == "/_s/v.mp4") && rawQuery.contains("k=")) {
                val kVal = rawQuery.substringAfter("k=").substringBefore('&')
                val uncloaked = decodeCloakToken(kVal)
                if (uncloaked.isNotEmpty()) pathAndQuery = uncloaked
            }
        } catch (_: Exception) {
            // keep relEndpointUrl
        }
        val ts = System.currentTimeMillis().toString()
        val sig = computeShieldSignature(pathAndQuery, ts)
        return mapOf(
            "User-Agent" to ANDROID_CHROME_UA,
            "Referer" to "$BASE_URL/",
            "Origin" to BASE_URL,
            "X-CP-Ts" to ts,
            "X-CP-Sig" to sig,
            "X-CP-Client" to "cp-web-v4"
        )
    }

    fun decryptApiPayload(nonce: String, encodedBase64: String): JSONObject {
        val cipherBytes = Base64.decode(encodedBase64, Base64.DEFAULT)
        val plainBytes = ByteArray(cipherBytes.size)
        val keyBytes = "$SHIELD_SECRET::$nonce".toByteArray(StandardCharsets.UTF_8)
        val kLen = keyBytes.size
        var state = 0x5a3c9e17
        for (i in 0 until kLen) {
            state = (state xor (keyBytes[i].toInt() and 0xff)) * 1664525 + 1013904223
        }
        for (i in cipherBytes.indices) {
            state = state * 1664525 + 1013904223
            val mask = ((state ushr 16) xor (keyBytes[i % kLen].toInt() and 0xff) xor (i and 0xff)) and 0xff
            plainBytes[i] = ((cipherBytes[i].toInt() and 0xff) xor mask).toByte()
        }
        val jsonText = String(plainBytes, StandardCharsets.UTF_8)
        return cloakPayloadObject(JSONObject(jsonText))
    }

    fun unwrapSecureJson(rawJsonText: String): JSONObject {
        val obj = JSONObject(rawJsonText)
        return if (obj.optInt("_s", 0) == 1 && obj.has("d") && obj.has("n")) {
            decryptApiPayload(obj.getString("n"), obj.getString("d"))
        } else {
            cloakPayloadObject(obj)
        }
    }

    private fun cloakPayloadObject(obj: JSONObject): JSONObject {
        val keys = obj.keys()
        val copyKeys = mutableListOf<String>()
        while (keys.hasNext()) copyKeys.add(keys.next())
        for (k in copyKeys) {
            val v = obj.opt(k)
            when (v) {
                is String -> obj.put(k, transformStringValue(v))
                is JSONObject -> obj.put(k, cloakPayloadObject(v))
                is JSONArray -> obj.put(k, cloakPayloadArray(v))
            }
        }
        return obj
    }

    private fun cloakPayloadArray(arr: JSONArray): JSONArray {
        for (i in 0 until arr.length()) {
            val v = arr.opt(i)
            when (v) {
                is String -> arr.put(i, transformStringValue(v))
                is JSONObject -> arr.put(i, cloakPayloadObject(v))
                is JSONArray -> arr.put(i, cloakPayloadArray(v))
            }
        }
        return arr
    }

    private fun transformStringValue(valStr: String): String {
        if (
            valStr.startsWith("/api/mb-stream") ||
            valStr.startsWith("/api/mb-ep-stream") ||
            valStr.startsWith("/api/go")
        ) {
            return "/_s/v.mp4?k=${encodeCloakToken(valStr)}"
        }
        if (valStr.startsWith("/api/mb-subtitle-srt")) {
            return "/_s/g?k=${encodeCloakToken(valStr)}"
        }
        return valStr
    }
}
