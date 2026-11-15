package com.cinepulse.app.data

object CinePulseCatalogData {
    val ALL_CATEGORIES: List<CategoryOption> = listOf(
        // Featured Zones
        CategoryOption("Home", "হোম পেইজ (CinePulse)", "/", "zone"),
        CategoryOption("Trending", "সবচেয়ে জনপ্রিয় (Trending)", "/mostwatch/7d", "zone"),
        CategoryOption("Movie", "সকল পূর্ণদৈর্ঘ্য মুভি", "/type/movies", "zone"),
        CategoryOption("TV Show", "টিভি শো ও ওয়েব সিরিজ", "/type/series", "zone"),
        CategoryOption("Animation", "অ্যানিমেশন ও অ্যানিমে", "/anime", "zone"),
        CategoryOption("Trending Drama", "ট্রেন্ডিং ড্রামা সিরিজ", "/category/trending-drama", "zone"),
        CategoryOption("Trending in Indian Cinema", "ইন্ডিয়ান সিনেমা ট্রেন্ডিং", "/category/indian-cinema", "zone"),
        CategoryOption("Trending Bengali Movies", "ট্রেন্ডিং বাংলা মুভি ও নাটক", "/language/bangla", "zone"),
        CategoryOption("🔥Hot Short TV", "হট শর্ট টিভি রিলস", "/category/short-tv", "zone"),
        CategoryOption("Asian Drama", "কোরিয়ান ও এশিয়ান ড্রামা", "/drama", "zone"),
        CategoryOption("Western TV", "ওয়েস্টার্ন ও হলিউড টিভি শো", "/category/western-tv", "zone"),
        CategoryOption("Anime in Hindi", "হিন্দি ডাবিং অ্যানিমে", "/category/anime-hindi", "zone"),
        CategoryOption("Popular Anime", "সেরা জনপ্রিয় অ্যানিমে", "/genre/animation", "zone"),
        CategoryOption("Indian Drama", "ইন্ডিয়ান ড্রামা ও সিরিয়াল", "/category/indian-drama", "zone"),
        CategoryOption("Ongoing Series", "চলমান নতুন এপিসোড", "/ongoing", "zone"),
        CategoryOption("Coming Soon", "আপকামিং নতুন মুভি", "/upcoming", "zone"),
        CategoryOption("Midnight 18+ Zone", "মিডনাইট ১৮+ আনসেন্সরড", "/adult18plus", "zone", isAdult = true),

        // Languages & Audio Dubs
        CategoryOption("Trending Bengali", "বাংলা মুভি ও নাটক", "/language/bangla", "language"),
        CategoryOption("Bangla Dubbed", "বাংলা ডাবিং (Bengali Dub)", "/language/bangla-dubbed", "language"),
        CategoryOption("Bollywood Movie", "বলিউড হিন্দি মুভি", "/bollywood", "language"),
        CategoryOption("Hindi Original", "হিন্দি অরিজিনাল", "/language/hindi", "language"),
        CategoryOption("Hindi Dubbed", "হিন্দি ডাবিং (Hindi Dub)", "/language/hindi-dubbed", "language"),
        CategoryOption("South Indian Movie", "সাউথ ইন্ডিয়ান ব্লকবাস্টার", "/southIndian", "language"),
        CategoryOption("Hollywood Movie", "হলিউড ইংলিশ মুভি", "/language/english", "language"),
        CategoryOption("Dual Audio", "ডুয়াল অডিও (Multi Audio)", "/language/dual-audio", "language"),
        CategoryOption("Top Punjabi Movies", "সেরা পাঞ্জাবি মুভি", "/language/punjabi", "language"),
        CategoryOption("Korean (K-Drama)", "কোরিয়ান ভাষা", "/language/korean", "language"),
        CategoryOption("Tamil", "তামিল মুভি", "/language/tamil", "language"),
        CategoryOption("Telugu", "তেলেগু মুভি", "/language/telugu", "language"),
        CategoryOption("Malayalam", "মালায়ালাম মুভি", "/language/malayalam", "language"),
        CategoryOption("Kannada", "কন্নড় মুভি", "/language/kannada", "language"),
        CategoryOption("Japanese", "জাপানিজ অ্যানিমে/মুভি", "/language/japanese", "language"),
        CategoryOption("Chinese (C-Drama)", "চায়নিজ মুভি/ড্রামা", "/language/chinese", "language"),
        CategoryOption("Turkish Drama", "তুর্কি সিরিজ", "/language/turkish", "language"),
        CategoryOption("Arabic Drama", "আরবি ড্রামা ও সিরিজ", "/category/arabic-drama", "language"),
        CategoryOption("Indonesian", "ইন্দোনেশিয়ান", "/language/indonesian", "language"),
        CategoryOption("Spanish", "স্প্যানিশ সিরিজ", "/language/spanish", "language"),
        CategoryOption("French", "ফরাসি মুভি (French)", "/language/french", "language"),
        CategoryOption("Portuguese", "পর্তুগিজ মুভি", "/language/portuguese", "language"),
        CategoryOption("Italian", "ইতালিয়ান মুভি", "/language/italian", "language"),

        // Movie & Anime Genres
        CategoryOption("Action", "অ্যাকশন", "/genre/action", "genre"),
        CategoryOption("Thriller", "থ্রিলার ও সাসপেন্স", "/genre/thriller", "genre"),
        CategoryOption("Horror", "হরর ও ভৌতিক", "/genre/horror", "genre"),
        CategoryOption("Romance", "রোমান্টিক", "/genre/romance", "genre"),
        CategoryOption("Comedy", "কমেডি ও হাসির", "/genre/comedy", "genre"),
        CategoryOption("Crime", "ক্রাইম ও গ্যাংস্টার", "/genre/crime", "genre"),
        CategoryOption("Sci-Fi", "সায়েন্স ফিকশন", "/genre/sci-fi", "genre"),
        CategoryOption("Adventure", "অ্যাডভেঞ্চার", "/genre/adventure", "genre"),
        CategoryOption("Fantasy", "ফ্যান্টাসি ও ম্যাজিক", "/genre/fantasy", "genre"),
        CategoryOption("Superhero", "সুপারহিরো মুভি", "/genre/superhero", "genre"),
        CategoryOption("Survival", "সারভাইভাল থ্রিলার", "/genre/survival", "genre"),
        CategoryOption("Suspense", "সাসপেন্স মিস্ট্রি", "/genre/suspense", "genre"),
        CategoryOption("Mystery", "রহস্য (Mystery)", "/genre/mystery", "genre"),
        CategoryOption("Drama Genre", "ড্রামা ও ইমোশনাল", "/genre/drama", "genre"),
        CategoryOption("Family", "ফ্যামিলি মুভি", "/genre/family", "genre"),
        CategoryOption("Historical", "ঐতিহাসিক (Historical)", "/genre/historical", "genre"),
        CategoryOption("War", "যুদ্ধ (War)", "/genre/war", "genre"),
        CategoryOption("Documentary", "ডকুমেন্টারি", "/genre/documentary", "genre"),
        CategoryOption("Biographical", "জীবনী (Biographical)", "/genre/biographical", "genre"),
        CategoryOption("Music", "মিউজিক্যাল ও গান", "/genre/music", "genre"),

        // Curated Franchises & Collections
        CategoryOption("All Collections", "সব মুভি কালেকশন", "/collections", "collection"),
        CategoryOption("Marvel MCU", "মার্ভেল সিনেমাটিক ইউনিভার্স", "/collection/mcu-marvel-cinematic-universe", "collection"),
        CategoryOption("DC Universe", "ডিসি ইউনিভার্স (DCEU)", "/collection/dc-universe-dceu-dcu", "collection"),
        CategoryOption("Best Bangla Dubbed", "সেরা বাংলা ডাবিং মুভি", "/collection/best-bangla-dubbed-movies", "collection"),
        CategoryOption("Top Hindi Dubbed Action", "সেরা হিন্দি ডাবিং অ্যাকশন", "/collection/top-rated-hindi-dubbed-action", "collection"),
        CategoryOption("Bangla Web Series", "জনপ্রিয় বাংলা ওয়েব সিরিজ", "/collection/bangla-web-series", "collection"),
        CategoryOption("Korean Drama Must Watch", "সেরা কোরিয়ান ড্রামা", "/collection/korean-drama-must-watch", "collection"),
        CategoryOption("South Indian Blockbusters", "সাউথ ব্লকবাস্টার কালেকশন", "/collection/south-indian-blockbusters", "collection"),
        CategoryOption("Horror Night Collection", "হরর নাইট কালেকশন", "/collection/horror-night", "collection"),
        CategoryOption("Family Animation", "ফ্যামিলি অ্যানিমেশন কালেকশন", "/collection/family-animation", "collection"),
        CategoryOption("Thriller & Mystery", "সেরা থ্রিলার কালেকশন", "/collection/thriller-mystery", "collection")
    )

    fun findCategory(path: String): CategoryOption =
        ALL_CATEGORIES.firstOrNull { it.path == path }
            ?: CategoryOption(path.removePrefix("/").ifEmpty { "Home" }, "ক্যাটালগ", path, "zone")

    val TOP_NAV_TABS: List<Pair<String, CategoryOption>> = listOf(
        "Home" to findCategory("/"),
        "Trending" to findCategory("/mostwatch/7d"),
        "Movie" to findCategory("/type/movies"),
        "TV Show" to findCategory("/type/series"),
        "Anime" to findCategory("/anime"),
        "Trending Bengali" to findCategory("/language/bangla"),
        "Bollywood" to findCategory("/bollywood"),
        "South Indian" to findCategory("/southIndian"),
        "Hollywood" to findCategory("/language/english"),
        "Anime in Hindi" to findCategory("/category/anime-hindi"),
        "Asian Drama" to findCategory("/drama"),
        "🔥Hot Short TV" to findCategory("/category/short-tv"),
        "Western TV" to findCategory("/category/western-tv"),
        "Midnight 18+" to findCategory("/adult18plus"),
        "Live Sports" to CategoryOption("Live Sports", "লাইভ স্পোর্টস", "/sports", "zone")
    )

    val TOP_10_FALLBACK: List<MovieCardItem> = listOf(
        MovieCardItem(
            id = "mb-4608692759619327304",
            title = "Bonolota Express (2026) Full HD",
            url = "/mb/4608692759619327304/bonolota-express-U4SuhvqRru5",
            path = "/mb/4608692759619327304/bonolota-express-U4SuhvqRru5",
            poster = "https://pbcdnw.aoneroom.com/image/2026/05/25/a01630f72534b75d2cce5300a6f062f2.jpg",
            quality = "1080p HD",
            views = "1.15M",
            rating = "9.0",
            language = "BANGLA",
            typeBadge = "MOVIE",
            timeAgo = "2 hours ago",
            episodePill = "★ 9.0",
            isPinned = true
        ),
        MovieCardItem(
            id = "mb-8892033410571586424",
            title = "Rakky (2026) Full HD",
            url = "/mb/8892033410571586424/rakky-e1h1rGEBRAa",
            path = "/mb/8892033410571586424/rakky-e1h1rGEBRAa",
            poster = "https://pbcdnw.aoneroom.com/image/2026/09/04/8b7f02b20caac3486f23749744c0853d.jpg",
            quality = "1080p HD",
            views = "920K",
            rating = "9.3",
            language = "HINDI",
            typeBadge = "MOVIE",
            timeAgo = "3 hours ago",
            episodePill = "★ 9.3",
            isPinned = true
        ),
        MovieCardItem(
            id = "mb-9195305329129668952",
            title = "Immortal [Hindi] (2026)",
            url = "/mb/9195305329129668952/immortal-hindi-6T0YySWAgXa",
            path = "/mb/9195305329129668952/immortal-hindi-6T0YySWAgXa",
            poster = "https://pbcdnw.aoneroom.com/image/2026/11/02/83e4156836daf107b627e93f8a89a5a4.jpg",
            quality = "1080p HD",
            views = "845K",
            rating = "8.5",
            language = "HINDI DUBBED",
            typeBadge = "MOVIE",
            timeAgo = "4 hours ago",
            episodePill = "★ 8.5",
            isPinned = true
        ),
        MovieCardItem(
            id = "mb-7074418260741445832",
            title = "Extraordinary Attorney Woo (2022)",
            url = "/mb/7074418260741445832/extraordinary-attorney-woo-english-Uev4xGsUAq8",
            path = "/mb/7074418260741445832/extraordinary-attorney-woo-english-Uev4xGsUAq8",
            poster = "https://pbcdnw.aoneroom.com/image/2026/01/26/2c9bdba03be15aff773899a1ee0cdd06.jpg",
            quality = "1080p HD",
            views = "880K",
            rating = "8.9",
            language = "KOREAN",
            typeBadge = "SERIES",
            timeAgo = "11 hours ago",
            episodePill = "S01 Complete",
            isPinned = true
        )
    )

    fun formatShortLanguage(lang: String): String {
        val up = lang.uppercase()
        return when {
            up.contains("BANGLA") || up.contains("BENGALI") -> "Bengali"
            up.contains("HINDI") -> "Hindi"
            up.contains("TAMIL") -> "Tamil"
            up.contains("TELUGU") -> "Telugu"
            up.contains("JAP") -> "Anime"
            up.contains("KOR") -> "Korean"
            up.contains("DUAL") || up.contains("MULTI") -> "Dual Audio"
            else -> "English"
        }
    }
}
