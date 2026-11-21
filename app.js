// server.ts
import "dotenv/config";
import { spawn } from "child_process";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import http from "http";
import http2 from "http2";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

// src/data/categories.ts
var TOP_10_THIS_WEEK_ITEMS = [
  {
    id: "mb-4608692759619327304",
    title: "Bonolota Express (2026) Full HD",
    url: "/mb/4608692759619327304/bonolota-express-U4SuhvqRru5",
    path: "/mb/4608692759619327304/bonolota-express-U4SuhvqRru5",
    poster: "https://pbcdnw.aoneroom.com/image/2026/05/25/a01630f72534b75d2cce5300a6f062f2.jpg",
    quality: "1080p HD",
    views: "1.15M",
    rating: "9.0",
    language: "BANGLA",
    typeBadge: "MOVIE",
    timeAgo: "2 hours ago",
    episodePill: "\u2605 9.0",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-8892033410571586424",
    title: "Rakky (2026) Full HD",
    url: "/mb/8892033410571586424/rakky-e1h1rGEBRAa",
    path: "/mb/8892033410571586424/rakky-e1h1rGEBRAa",
    poster: "https://pbcdnw.aoneroom.com/image/2026/09/04/8b7f02b20caac3486f23749744c0853d.jpg",
    quality: "1080p HD",
    views: "920K",
    rating: "9.3",
    language: "HINDI",
    typeBadge: "MOVIE",
    timeAgo: "3 hours ago",
    episodePill: "\u2605 9.3",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-9195305329129668952",
    title: "Immortal [Hindi] (2026)",
    url: "/mb/9195305329129668952/immortal-hindi-6T0YySWAgXa",
    path: "/mb/9195305329129668952/immortal-hindi-6T0YySWAgXa",
    poster: "https://pbcdnw.aoneroom.com/image/2026/11/02/83e4156836daf107b627e93f8a89a5a4.jpg",
    quality: "1080p HD",
    views: "845K",
    rating: "8.5",
    language: "HINDI DUBBED",
    typeBadge: "MOVIE",
    timeAgo: "4 hours ago",
    episodePill: "\u2605 8.5",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-4015414713902321632",
    title: "Lifeline (2026) Full HD",
    url: "/mb/4015414713902321632/lifeline-G7P5eONDCM4",
    path: "/mb/4015414713902321632/lifeline-G7P5eONDCM4",
    poster: "https://pbcdnw.aoneroom.com/image/2026/06/22/6e404dc7fbdb8f3c17c93779d7564a24.jpg",
    quality: "1080p HD",
    views: "710K",
    rating: "8.4",
    language: "BANGLA",
    typeBadge: "MOVIE",
    timeAgo: "5 hours ago",
    episodePill: "\u2605 8.4",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-7908270876544975128",
    title: "The Paradise [Hindi] (2026)",
    url: "/mb/7908270876544975128/the-paradise-hindi-sUHGZANXbq9",
    path: "/mb/7908270876544975128/the-paradise-hindi-sUHGZANXbq9",
    poster: "https://pbcdnw.aoneroom.com/image/2026/10/16/e501cab4d8d6b2f0435692c6b4dbd7c9.jpg",
    quality: "1080p HD",
    views: "680K",
    rating: "8.6",
    language: "HINDI DUBBED",
    typeBadge: "MOVIE",
    timeAgo: "6 hours ago",
    episodePill: "\u2605 8.6",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-3416925005618235384",
    title: "The University of Chankharpul (2026)",
    url: "/mb/3416925005618235384/the-university-of-chankharpul-weH3aSgyp44",
    path: "/mb/3416925005618235384/the-university-of-chankharpul-weH3aSgyp44",
    poster: "https://pbcdnw.aoneroom.com/image/2026/06/12/1b4cea6af67167ad8f22a7a6d58138ed.jpg",
    quality: "1080p HD",
    views: "540K",
    rating: "8.5",
    language: "BANGLA",
    typeBadge: "MOVIE",
    timeAgo: "7 hours ago",
    episodePill: "\u2605 8.5",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-74927565810590312",
    title: "Apocalypse Z: New World [Hindi] (2026)",
    url: "/mb/74927565810590312/apocalypse-z-new-world-hindi-6D2ttOtax5",
    path: "/mb/74927565810590312/apocalypse-z-new-world-hindi-6D2ttOtax5",
    poster: "https://pbcdnw.aoneroom.com/image/2026/10/27/f148bcdc2d3b121df478e7eabf08ba65.jpg",
    quality: "1080p HD",
    views: "490K",
    rating: "8.4",
    language: "HINDI DUBBED",
    typeBadge: "MOVIE",
    timeAgo: "8 hours ago",
    episodePill: "\u2605 8.4",
    isPinned: true,
    isAdult: false
  },
  {
    id: "mb-1354349009548231896",
    title: "Sardarbarir Khela (2026)",
    url: "/mb/1354349009548231896/sardarbarir-khela-CND14OPV2C1",
    path: "/mb/1354349009548231896/sardarbarir-khela-CND14OPV2C1",
    poster: "https://pbcdnw.aoneroom.com/image/2026/05/28/b2ceafb2617f79934ee1fa42b30fdd33.jpg",
    quality: "1080p HD",
    views: "430K",
    rating: "8.2",
    language: "BANGLA",
    typeBadge: "MOVIE",
    timeAgo: "9 hours ago",
    episodePill: "\u2605 8.2",
    isPinned: false,
    isAdult: false
  },
  {
    id: "mb-331894071855836048",
    title: "Hope [Hindi] (2026)",
    url: "/mb/331894071855836048/hope-hindi-4sf1PfR4wo",
    path: "/mb/331894071855836048/hope-hindi-4sf1PfR4wo",
    poster: "https://pbcdnw.aoneroom.com/image/2026/10/28/cb3db8e5e2b8afeaa06ae0c3993f1c66.jpg",
    quality: "1080p HD",
    views: "390K",
    rating: "8.3",
    language: "HINDI DUBBED",
    typeBadge: "MOVIE",
    timeAgo: "10 hours ago",
    episodePill: "\u2605 8.3",
    isPinned: false,
    isAdult: false
  },
  {
    id: "mb-7074418260741445832",
    title: "Extraordinary Attorney Woo (2022)",
    url: "/mb/7074418260741445832/extraordinary-attorney-woo-english-Uev4xGsUAq8",
    path: "/mb/7074418260741445832/extraordinary-attorney-woo-english-Uev4xGsUAq8",
    poster: "https://pbcdnw.aoneroom.com/image/2026/01/26/2c9bdba03be15aff773899a1ee0cdd06.jpg",
    quality: "1080p HD",
    views: "880K",
    rating: "8.9",
    language: "KOREAN",
    typeBadge: "SERIES",
    timeAgo: "11 hours ago",
    episodePill: "S01 Complete",
    isPinned: true,
    isAdult: false
  }
];
var ALL_CATEGORIES = [
  // CinePulse Main Channels & Home Shelves
  { label: "Home", bnLabel: "\u09B9\u09CB\u09AE \u09AA\u09C7\u0987\u099C (CinePulse)", path: "/", group: "zone" },
  { label: "Trending", bnLabel: "\u09B8\u09AC\u099A\u09C7\u09DF\u09C7 \u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF (Trending)", path: "/mostwatch/7d", group: "zone" },
  { label: "Movie", bnLabel: "\u09B8\u0995\u09B2 \u09AA\u09C2\u09B0\u09CD\u09A3\u09A6\u09C8\u09B0\u09CD\u0998\u09CD\u09AF \u09AE\u09C1\u09AD\u09BF", path: "/type/movies", group: "zone" },
  { label: "TV Show", bnLabel: "\u099F\u09BF\u09AD\u09BF \u09B6\u09CB \u0993 \u0993\u09DF\u09C7\u09AC \u09B8\u09BF\u09B0\u09BF\u099C", path: "/type/series", group: "zone" },
  { label: "Animation", bnLabel: "\u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7\u09B6\u09A8 \u0993 \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7", path: "/anime", group: "zone" },
  { label: "Trending Drama", bnLabel: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u09B8\u09BF\u09B0\u09BF\u099C", path: "/category/trending-drama", group: "zone" },
  { label: "Trending in Indian Cinema", bnLabel: "\u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09B8\u09BF\u09A8\u09C7\u09AE\u09BE \u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982", path: "/category/indian-cinema", group: "zone" },
  { label: "Trending Bengali Movies", bnLabel: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C1\u09AD\u09BF \u0993 \u09A8\u09BE\u099F\u0995", path: "/language/bangla", group: "zone" },
  { label: "\u{1F525}Hot Short TV", bnLabel: "\u09B9\u099F \u09B6\u09B0\u09CD\u099F \u099F\u09BF\u09AD\u09BF \u09B0\u09BF\u09B2\u09B8", path: "/category/short-tv", group: "zone" },
  { label: "Asian Drama", bnLabel: "\u0995\u09CB\u09B0\u09BF\u09DF\u09BE\u09A8 \u0993 \u098F\u09B6\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", path: "/drama", group: "zone" },
  { label: "Western TV", bnLabel: "\u0993\u09DF\u09C7\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09A8 \u0993 \u09B9\u09B2\u09BF\u0989\u09A1 \u099F\u09BF\u09AD\u09BF \u09B6\u09CB", path: "/category/western-tv", group: "zone" },
  { label: "Anime in Hindi", bnLabel: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982 \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7", path: "/category/anime-hindi", group: "zone" },
  { label: "Popular Anime", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7", path: "/genre/animation", group: "zone" },
  { label: "Indian Drama", bnLabel: "\u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2", path: "/category/indian-drama", group: "zone" },
  { label: "Ongoing Series", bnLabel: "\u099A\u09B2\u09AE\u09BE\u09A8 \u09A8\u09A4\u09C1\u09A8 \u098F\u09AA\u09BF\u09B8\u09CB\u09A1", path: "/ongoing", group: "zone" },
  { label: "Coming Soon", bnLabel: "\u0986\u09AA\u0995\u09BE\u09AE\u09BF\u0982 \u09A8\u09A4\u09C1\u09A8 \u09AE\u09C1\u09AD\u09BF", path: "/upcoming", group: "zone" },
  { label: "Midnight 18+ Zone", bnLabel: "\u09AE\u09BF\u09A1\u09A8\u09BE\u0987\u099F \u09E7\u09EE+ \u0986\u09A8\u09B8\u09C7\u09A8\u09CD\u09B8\u09B0\u09A1", path: "/adult18plus", group: "zone", isAdult: true },
  // MovieBox Regional & Language Shelves
  { label: "Trending Bengali", bnLabel: "\u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C1\u09AD\u09BF \u0993 \u09A8\u09BE\u099F\u0995", path: "/language/bangla", group: "language" },
  { label: "Bangla Dubbed", bnLabel: "\u09AC\u09BE\u0982\u09B2\u09BE \u09A1\u09BE\u09AC\u09BF\u0982 (Bengali Dub)", path: "/language/bangla-dubbed", group: "language" },
  { label: "Bollywood Movie", bnLabel: "\u09AC\u09B2\u09BF\u0989\u09A1 \u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09AE\u09C1\u09AD\u09BF", path: "/bollywood", group: "language" },
  { label: "Hindi Original", bnLabel: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u0985\u09B0\u09BF\u099C\u09BF\u09A8\u09BE\u09B2", path: "/language/hindi", group: "language" },
  { label: "Hindi Dubbed", bnLabel: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982 (Hindi Dub)", path: "/language/hindi-dubbed", group: "language" },
  { label: "South Indian Movie", bnLabel: "\u09B8\u09BE\u0989\u09A5 \u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09AC\u09CD\u09B2\u0995\u09AC\u09BE\u09B8\u09CD\u099F\u09BE\u09B0", path: "/southIndian", group: "language" },
  { label: "Hollywood Movie", bnLabel: "\u09B9\u09B2\u09BF\u0989\u09A1 \u0987\u0982\u09B2\u09BF\u09B6 \u09AE\u09C1\u09AD\u09BF", path: "/language/english", group: "language" },
  { label: "Dual Audio", bnLabel: "\u09A1\u09C1\u09DF\u09BE\u09B2 \u0985\u09A1\u09BF\u0993 (Multi Audio)", path: "/language/dual-audio", group: "language" },
  { label: "Top Punjabi Movies", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u09AA\u09BE\u099E\u09CD\u099C\u09BE\u09AC\u09BF \u09AE\u09C1\u09AD\u09BF", path: "/language/punjabi", group: "language" },
  { label: "Korean (K-Drama)", bnLabel: "\u0995\u09CB\u09B0\u09BF\u09DF\u09BE\u09A8 \u09AD\u09BE\u09B7\u09BE", path: "/language/korean", group: "language" },
  { label: "Tamil", bnLabel: "\u09A4\u09BE\u09AE\u09BF\u09B2 \u09AE\u09C1\u09AD\u09BF", path: "/language/tamil", group: "language" },
  { label: "Telugu", bnLabel: "\u09A4\u09C7\u09B2\u09C7\u0997\u09C1 \u09AE\u09C1\u09AD\u09BF", path: "/language/telugu", group: "language" },
  { label: "Malayalam", bnLabel: "\u09AE\u09BE\u09B2\u09BE\u09DF\u09BE\u09B2\u09BE\u09AE \u09AE\u09C1\u09AD\u09BF", path: "/language/malayalam", group: "language" },
  { label: "Kannada", bnLabel: "\u0995\u09A8\u09CD\u09A8\u09DC \u09AE\u09C1\u09AD\u09BF", path: "/language/kannada", group: "language" },
  { label: "Japanese", bnLabel: "\u099C\u09BE\u09AA\u09BE\u09A8\u09BF\u099C \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7/\u09AE\u09C1\u09AD\u09BF", path: "/language/japanese", group: "language" },
  { label: "Chinese (C-Drama)", bnLabel: "\u099A\u09BE\u09DF\u09A8\u09BF\u099C \u09AE\u09C1\u09AD\u09BF/\u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", path: "/language/chinese", group: "language" },
  { label: "Turkish Drama", bnLabel: "\u09A4\u09C1\u09B0\u09CD\u0995\u09BF \u09B8\u09BF\u09B0\u09BF\u099C", path: "/language/turkish", group: "language" },
  { label: "Arabic Drama", bnLabel: "\u0986\u09B0\u09AC\u09BF \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u09B8\u09BF\u09B0\u09BF\u099C", path: "/category/arabic-drama", group: "language" },
  { label: "Indonesian", bnLabel: "\u0987\u09A8\u09CD\u09A6\u09CB\u09A8\u09C7\u09B6\u09BF\u09DF\u09BE\u09A8", path: "/language/indonesian", group: "language" },
  { label: "Spanish", bnLabel: "\u09B8\u09CD\u09AA\u09CD\u09AF\u09BE\u09A8\u09BF\u09B6 \u09B8\u09BF\u09B0\u09BF\u099C", path: "/language/spanish", group: "language" },
  { label: "French", bnLabel: "\u09AB\u09B0\u09BE\u09B8\u09BF \u09AE\u09C1\u09AD\u09BF (French)", path: "/language/french", group: "language" },
  { label: "Portuguese", bnLabel: "\u09AA\u09B0\u09CD\u09A4\u09C1\u0997\u09BF\u099C \u09AE\u09C1\u09AD\u09BF", path: "/language/portuguese", group: "language" },
  { label: "Italian", bnLabel: "\u0987\u09A4\u09BE\u09B2\u09BF\u09DF\u09BE\u09A8 \u09AE\u09C1\u09AD\u09BF", path: "/language/italian", group: "language" },
  { label: "Gujarati", bnLabel: "\u0997\u09C1\u099C\u09B0\u09BE\u099F\u09BF \u09AE\u09C1\u09AD\u09BF", path: "/language/gujrati", group: "language" },
  { label: "Marathi", bnLabel: "\u09AE\u09BE\u09B0\u09BE\u09A0\u09BF \u09AE\u09C1\u09AD\u09BF", path: "/language/marathi", group: "language" },
  { label: "Malaysian", bnLabel: "\u09AE\u09BE\u09B2\u09DF\u09C7\u09B6\u09BF\u09DF\u09BE\u09A8 \u09AE\u09C1\u09AD\u09BF", path: "/language/malaysian", group: "language" },
  { label: "Vietnamese", bnLabel: "\u09AD\u09BF\u09DF\u09C7\u09A4\u09A8\u09BE\u09AE\u09BF\u099C \u09AE\u09C1\u09AD\u09BF", path: "/language/vietnamese", group: "language" },
  { label: "Other Languages", bnLabel: "\u0985\u09A8\u09CD\u09AF\u09BE\u09A8\u09CD\u09AF \u09AD\u09BE\u09B7\u09BE", path: "/language/others", group: "language" },
  // MovieBox Official Genres
  { label: "Action", bnLabel: "\u0985\u09CD\u09AF\u09BE\u0995\u09B6\u09A8", path: "/genre/action", group: "genre" },
  { label: "Thriller", bnLabel: "\u09A5\u09CD\u09B0\u09BF\u09B2\u09BE\u09B0 \u0993 \u09B8\u09BE\u09B8\u09AA\u09C7\u09A8\u09CD\u09B8", path: "/genre/thriller", group: "genre" },
  { label: "Horror", bnLabel: "\u09B9\u09B0\u09B0 \u0993 \u09AD\u09CC\u09A4\u09BF\u0995", path: "/genre/horror", group: "genre" },
  { label: "Romance", bnLabel: "\u09B0\u09CB\u09AE\u09BE\u09A8\u09CD\u099F\u09BF\u0995", path: "/genre/romance", group: "genre" },
  { label: "Comedy", bnLabel: "\u0995\u09AE\u09C7\u09A1\u09BF \u0993 \u09B9\u09BE\u09B8\u09BF\u09B0", path: "/genre/comedy", group: "genre" },
  { label: "Crime", bnLabel: "\u0995\u09CD\u09B0\u09BE\u0987\u09AE \u0993 \u0997\u09CD\u09AF\u09BE\u0982\u09B8\u09CD\u099F\u09BE\u09B0", path: "/genre/crime", group: "genre" },
  { label: "Sci-Fi", bnLabel: "\u09B8\u09BE\u09DF\u09C7\u09A8\u09CD\u09B8 \u09AB\u09BF\u0995\u09B6\u09A8", path: "/genre/sci-fi", group: "genre" },
  { label: "Adventure", bnLabel: "\u0985\u09CD\u09AF\u09BE\u09A1\u09AD\u09C7\u099E\u09CD\u099A\u09BE\u09B0", path: "/genre/adventure", group: "genre" },
  { label: "Fantasy", bnLabel: "\u09AB\u09CD\u09AF\u09BE\u09A8\u09CD\u099F\u09BE\u09B8\u09BF \u0993 \u09AE\u09CD\u09AF\u09BE\u099C\u09BF\u0995", path: "/genre/fantasy", group: "genre" },
  { label: "Superhero", bnLabel: "\u09B8\u09C1\u09AA\u09BE\u09B0\u09B9\u09BF\u09B0\u09CB \u09AE\u09C1\u09AD\u09BF", path: "/genre/superhero", group: "genre" },
  { label: "Survival", bnLabel: "\u09B8\u09BE\u09B0\u09AD\u09BE\u0987\u09AD\u09BE\u09B2 \u09A5\u09CD\u09B0\u09BF\u09B2\u09BE\u09B0", path: "/genre/survival", group: "genre" },
  { label: "Suspense", bnLabel: "\u09B8\u09BE\u09B8\u09AA\u09C7\u09A8\u09CD\u09B8 \u09AE\u09BF\u09B8\u09CD\u099F\u09CD\u09B0\u09BF", path: "/genre/suspense", group: "genre" },
  { label: "Mystery", bnLabel: "\u09B0\u09B9\u09B8\u09CD\u09AF (Mystery)", path: "/genre/mystery", group: "genre" },
  { label: "Drama Genre", bnLabel: "\u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u0987\u09AE\u09CB\u09B6\u09A8\u09BE\u09B2", path: "/genre/drama", group: "genre" },
  { label: "Family", bnLabel: "\u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u09AE\u09C1\u09AD\u09BF", path: "/genre/family", group: "genre" },
  { label: "Historical", bnLabel: "\u0990\u09A4\u09BF\u09B9\u09BE\u09B8\u09BF\u0995 (Historical)", path: "/genre/historical", group: "genre" },
  { label: "War", bnLabel: "\u09AF\u09C1\u09A6\u09CD\u09A7 (War)", path: "/genre/war", group: "genre" },
  { label: "Documentary", bnLabel: "\u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F\u09BE\u09B0\u09BF", path: "/genre/documentary", group: "genre" },
  { label: "Biographical", bnLabel: "\u099C\u09C0\u09AC\u09A8\u09C0 (Biographical)", path: "/genre/biographical", group: "genre" },
  { label: "Music", bnLabel: "\u09AE\u09BF\u0989\u099C\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u0993 \u0997\u09BE\u09A8", path: "/genre/music", group: "genre" },
  { label: "Musical", bnLabel: "\u09AE\u09BF\u0989\u099C\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", path: "/genre/musical", group: "genre" },
  // Franchises & Curated Collections
  { label: "All Collections", bnLabel: "\u09B8\u09AC \u09AE\u09C1\u09AD\u09BF \u0995\u09BE\u09B2\u09C7\u0995\u09B6\u09A8", path: "/collections", group: "collection" },
  { label: "Marvel MCU", bnLabel: "\u09AE\u09BE\u09B0\u09CD\u09AD\u09C7\u09B2 \u09B8\u09BF\u09A8\u09C7\u09AE\u09BE\u099F\u09BF\u0995 \u0987\u0989\u09A8\u09BF\u09AD\u09BE\u09B0\u09CD\u09B8", path: "/collection/mcu-marvel-cinematic-universe", group: "collection" },
  { label: "DC Universe", bnLabel: "\u09A1\u09BF\u09B8\u09BF \u0987\u0989\u09A8\u09BF\u09AD\u09BE\u09B0\u09CD\u09B8 (DCEU)", path: "/collection/dc-universe-dceu-dcu", group: "collection" },
  { label: "Best Bangla Dubbed", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u09AC\u09BE\u0982\u09B2\u09BE \u09A1\u09BE\u09AC\u09BF\u0982 \u09AE\u09C1\u09AD\u09BF", path: "/collection/best-bangla-dubbed-movies", group: "collection" },
  { label: "Top Hindi Dubbed Action", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982 \u0985\u09CD\u09AF\u09BE\u0995\u09B6\u09A8", path: "/collection/top-rated-hindi-dubbed-action", group: "collection" },
  { label: "Bangla Web Series", bnLabel: "\u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF \u09AC\u09BE\u0982\u09B2\u09BE \u0993\u09DF\u09C7\u09AC \u09B8\u09BF\u09B0\u09BF\u099C", path: "/collection/bangla-web-series", group: "collection" },
  { label: "Korean Drama Must Watch", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u0995\u09CB\u09B0\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", path: "/collection/korean-drama-must-watch", group: "collection" },
  { label: "South Indian Blockbusters", bnLabel: "\u09B8\u09BE\u0989\u09A5 \u09AC\u09CD\u09B2\u0995\u09AC\u09BE\u09B8\u09CD\u099F\u09BE\u09B0 \u0995\u09BE\u09B2\u09C7\u0995\u09B6\u09A8", path: "/collection/south-indian-blockbusters", group: "collection" },
  { label: "Horror Night Collection", bnLabel: "\u09B9\u09B0\u09B0 \u09A8\u09BE\u0987\u099F \u0995\u09BE\u09B2\u09C7\u0995\u09B6\u09A8", path: "/collection/horror-night", group: "collection" },
  { label: "Family Animation", bnLabel: "\u09AB\u09CD\u09AF\u09BE\u09AE\u09BF\u09B2\u09BF \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7\u09B6\u09A8 \u0995\u09BE\u09B2\u09C7\u0995\u09B6\u09A8", path: "/collection/family-animation", group: "collection" },
  { label: "Thriller & Mystery", bnLabel: "\u09B8\u09C7\u09B0\u09BE \u09A5\u09CD\u09B0\u09BF\u09B2\u09BE\u09B0 \u0995\u09BE\u09B2\u09C7\u0995\u09B6\u09A8", path: "/collection/thriller-mystery", group: "collection" }
];
var INITIAL_FALLBACK_MOVIES = {
  "/": TOP_10_THIS_WEEK_ITEMS
};

// src/utils/securityShield.ts
var CLOAK_KEY = "CP_CLOAK_v4_7x9M2pL5qW8zR1vK4jH6nB3tY0fD";
function base64UrlToBytes(b64url) {
  const clean = (b64url || "").trim();
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(clean, "base64url"));
  }
  const b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i) & 255;
  }
  return out;
}
function decodeCloakToken(token) {
  if (!token) return "";
  try {
    const raw = base64UrlToBytes(token);
    if (raw.length <= 2) return "";
    const nonce = (raw[0] << 8 | raw[1]) & 65535;
    const len = raw.length - 2;
    const out = new Uint8Array(len);
    let state = (2166136261 ^ nonce) >>> 0;
    for (let i = 0; i < CLOAK_KEY.length; i++) {
      state = Math.imul(state ^ CLOAK_KEY.charCodeAt(i), 1664525) + 1013904223 >>> 0;
    }
    for (let i = 0; i < len; i++) {
      state = Math.imul(state, 1664525) + 1013904223 >>> 0;
      const kChar = CLOAK_KEY.charCodeAt(i % CLOAK_KEY.length);
      const mask = (state >>> 16 ^ kChar ^ i & 255) & 255;
      out[i] = raw[i + 2] ^ mask;
    }
    return new TextDecoder("utf-8").decode(out);
  } catch {
    return "";
  }
}
function cloakImageUrl(imgUrl) {
  if (!imgUrl) return "";
  return imgUrl.trim();
}

// src/utils/timeAgo.ts
var UPLOAD_TS_STORAGE_KEY = "cp_live_upload_ts_v8";
var STATIC_SNAPSHOT_EPOCH_MS = 1793340406432;
var uploadTimestampRegistry = /* @__PURE__ */ new Map();
var registryLoaded = false;
function ensureRegistryLoaded() {
  if (registryLoaded || typeof window === "undefined") return;
  registryLoaded = true;
  try {
    const raw = window.localStorage.getItem(UPLOAD_TS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && v > 0) {
          uploadTimestampRegistry.set(k, v);
        }
      }
    }
  } catch {
  }
}
var saveTimer = null;
function scheduleSaveRegistry() {
  if (typeof window === "undefined") return;
  if (saveTimer !== null) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    try {
      const obj = {};
      const entries = Array.from(uploadTimestampRegistry.entries()).slice(-300);
      for (const [k, v] of entries) {
        obj[k] = v;
      }
      window.localStorage.setItem(UPLOAD_TS_STORAGE_KEY, JSON.stringify(obj));
    } catch {
    }
  }, 600);
}
function formatMinutesAgoToLabel(minutesAgo) {
  const mins = Math.max(1, Math.floor(minutesAgo));
  if (mins < 60) {
    return mins === 1 ? "1 min ago" : `${mins} mins ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years <= 1 ? "1 year ago" : `${years} years ago`;
}
function hashSeed(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function parseViewsToNumber(viewsStr) {
  if (!viewsStr) return 0;
  const clean = String(viewsStr).toUpperCase().replace(/[^0-9.KM]/g, "");
  const num = parseFloat(clean) || 0;
  if (clean.includes("M")) return num * 1e6;
  if (clean.includes("K")) return num * 1e3;
  return num;
}
var HOT_POPULAR_KEYWORDS = [
  "bachelor point",
  "bohurupi",
  "mirzapur",
  "jailer",
  "sultan salahuddin",
  "bigg boss",
  "desu7",
  "gopal bhar",
  "pushpa",
  "avengers",
  "godzilla",
  "king",
  "squid game",
  "one piece",
  "solo leveling",
  "jujutsu",
  "demon slayer",
  "naruto",
  "borbaad",
  "taandob",
  "toofan",
  "daagi",
  "chhaava",
  "sikandar",
  "animal",
  "jawan",
  "pathaan",
  "kgf",
  "salaar",
  "kalki",
  "stree",
  "bhool bhulaiyaa",
  "marco",
  "kantara",
  "leo",
  "vikram",
  "venom",
  "deadpool",
  "love always",
  "farming life"
];
function cleanTimeAgoAndEpisode(rawTimeAgo, rawEpisodePill = "", itemSeed = "", indexHint = 0) {
  const raw = String(rawTimeAgo || "").trim();
  let episodePill = String(rawEpisodePill || "").trim();
  if (!episodePill && raw) {
    const epMatch = raw.match(
      /\b(S\d+\s*[|·•-]\s*Ep(?:isode)?\s*\d+[^\n]*|S\d+\s+Ep(?:isode)?\s*\d+[^\n]*|Ep(?:isode)?\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*(?:Added|Completed|Full))?|Part\s*\d+[^\n]*)/i
    );
    if (epMatch) {
      episodePill = epMatch[1].trim();
    }
  }
  const relMatch = raw.match(
    /(\d+)\s*(sec(?:ond)?s?|min(?:ute)?s?|mins?|hr?s?|hours?|days?|weeks?|months?|years?)\s*ago/i
  );
  if (relMatch) {
    const num = Math.max(1, parseInt(relMatch[1], 10) || 1);
    const unit = relMatch[2].toLowerCase();
    if (unit.startsWith("sec")) {
      return {
        timeAgo: "1 min ago",
        episodePill,
        minutesAgo: 1
      };
    }
    if (unit.startsWith("min")) {
      return {
        timeAgo: formatMinutesAgoToLabel(num),
        episodePill,
        minutesAgo: num
      };
    }
    if (unit.startsWith("h")) {
      const mins3 = num * 60;
      return {
        timeAgo: formatMinutesAgoToLabel(mins3),
        episodePill,
        minutesAgo: mins3
      };
    }
    if (unit.startsWith("d")) {
      const mins3 = num * 1440;
      return {
        timeAgo: formatMinutesAgoToLabel(mins3),
        episodePill,
        minutesAgo: mins3
      };
    }
    if (unit.startsWith("w")) {
      const mins3 = num * 10080;
      return {
        timeAgo: formatMinutesAgoToLabel(mins3),
        episodePill,
        minutesAgo: mins3
      };
    }
    if (unit.startsWith("mo")) {
      const mins3 = num * 43200;
      return {
        timeAgo: formatMinutesAgoToLabel(mins3),
        episodePill,
        minutesAgo: mins3
      };
    }
    const mins2 = num * 525600;
    return {
      timeAgo: formatMinutesAgoToLabel(mins2),
      episodePill,
      minutesAgo: mins2
    };
  }
  if (/just\s*now|moments?\s*ago/i.test(raw)) {
    return {
      timeAgo: "1 min ago",
      episodePill,
      minutesAgo: 1
    };
  }
  if (/today/i.test(raw)) {
    return {
      timeAgo: "35 mins ago",
      episodePill,
      minutesAgo: 35
    };
  }
  if (/yesterday/i.test(raw)) {
    return {
      timeAgo: "1 day ago",
      episodePill,
      minutesAgo: 1440
    };
  }
  const yearOrDateMatch = raw.match(/\b(19\d{2}|20\d{2})(?:-\d{2}-\d{2})?\b/);
  if (yearOrDateMatch) {
    const yr = parseInt(yearOrDateMatch[1], 10);
    const h2 = hashSeed(`${itemSeed || raw}`);
    if (yr >= 2025) {
      const mins2 = 90 + h2 % 960;
      return {
        timeAgo: raw,
        episodePill,
        minutesAgo: mins2
      };
    }
    const yearsOld = Math.max(1, 2026 - yr);
    return {
      timeAgo: `${yr}`,
      episodePill,
      minutesAgo: yearsOld * 525600
    };
  }
  const seedYearMatch = String(itemSeed || "").match(/\b(19\d{2}|20[0-2]\d)\b/);
  if (seedYearMatch) {
    const yr = parseInt(seedYearMatch[1], 10);
    if (yr <= 2024) {
      const yearsOld = Math.max(1, 2026 - yr);
      return {
        timeAgo: `${yr}`,
        episodePill,
        minutesAgo: yearsOld * 525600
      };
    }
  }
  const h = hashSeed(`${itemSeed || raw}-${indexHint}`);
  const hrs = 2 + h % 36;
  const mins = hrs * 60 + (h >>> 6) % 55;
  return {
    timeAgo: formatMinutesAgoToLabel(mins),
    episodePill,
    minutesAgo: mins
  };
}
function getCanonicalTitleKey(rawTitle) {
  const cleaned = String(rawTitle || "").replace(/\[.*?\]|\(.*?\)/g, " ").replace(/[“”"']?\bweb(?:-?dl|rip)?.*$/gi, " ").replace(
    /\b(?:s\d+|season\s*\d+(?:\s*-\s*\d+)?|ep(?:isode)?\s*\d+(?:\s*-\s*\d+)?|part\s*\d+|grand\s*premiere|complete(?:d)?|added|full\s*hd|hdts|hdtc|hdcam|camrip|web-?dl|webrip|bluray|uhd|4k|2160p|1080p|720p|480p|org|original|uncut|jiohotstar|netflix|prime|hoichoi|chorki|zee5|sonyliv|multi\s*audio|dual\s*audio|multi|dual|dub(?:bed)?|sub(?:title)?s?|with\s+english\s+subtitle|not\s+available|best\s+quality|hindi|bangla|bengali|english|tamil|telugu|malayalam|kannada|korean|japanese|chinese|turkish|spanish)\b/gi,
    " "
  ).toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "").trim();
  if (cleaned.length >= 2) return cleaned;
  return String(rawTitle || "").toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "").trim();
}
function deduplicateMovieCards(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const seenPaths = /* @__PURE__ */ new Set();
  const seenSiteTitles = /* @__PURE__ */ new Set();
  const seenSitePosters = /* @__PURE__ */ new Set();
  const unique = [];
  for (const item of items) {
    if (!item || !item.title) continue;
    const pathKey = String(item.path || item.url || "").toLowerCase().replace(/\/+$/, "").trim();
    const isMovieBox = pathKey.startsWith("/mb/");
    if (isMovieBox) {
      const mbParts = pathKey.split("/").filter(Boolean);
      const mbSubjectKey = mbParts[1] ? `mb::id::${mbParts[1]}` : pathKey;
      if (seenPaths.has(mbSubjectKey)) continue;
      seenPaths.add(mbSubjectKey);
      if (pathKey) seenPaths.add(pathKey);
      unique.push(item);
      continue;
    }
    const sitePrefix = pathKey.startsWith("/mf/") ? "mf" : "mlbd";
    const titleKey = getCanonicalTitleKey(item.title);
    const siteTitleKey = titleKey ? `${sitePrefix}::${titleKey}` : "";
    const posterKey = item.poster ? String(item.poster).toLowerCase().split("?")[0].trim() : "";
    const sitePosterKey = posterKey && posterKey.startsWith("http") ? `${sitePrefix}::${posterKey}` : "";
    if (pathKey && seenPaths.has(pathKey)) continue;
    if (siteTitleKey && seenSiteTitles.has(siteTitleKey)) continue;
    if (sitePosterKey && seenSitePosters.has(sitePosterKey)) continue;
    if (pathKey) seenPaths.add(pathKey);
    if (siteTitleKey) seenSiteTitles.add(siteTitleKey);
    if (sitePosterKey) seenSitePosters.add(sitePosterKey);
    unique.push(item);
  }
  return unique;
}
function resolveLiveUploadedAtMs(item, parsedMinutesAgo, nowMs = Date.now()) {
  ensureRegistryLoaded();
  const canonicalTitle = getCanonicalTitleKey(item.title);
  const key = canonicalTitle || (item.path || item.id || item.title || "").trim();
  if (item.uploadedAtMs && item.uploadedAtMs > 0 && item.uploadedAtMs <= nowMs) {
    if (key) {
      const existing = uploadTimestampRegistry.get(key);
      if (!existing || Math.abs(existing - item.uploadedAtMs) > 12e4) {
        uploadTimestampRegistry.set(key, item.uploadedAtMs);
        scheduleSaveRegistry();
      }
    }
    return item.uploadedAtMs;
  }
  if (key) {
    const savedTs = uploadTimestampRegistry.get(key);
    if (savedTs && savedTs > 0 && savedTs <= nowMs) {
      return savedTs;
    }
  }
  const baseEpoch = Math.min(STATIC_SNAPSHOT_EPOCH_MS, nowMs);
  const anchoredTs = baseEpoch - Math.max(1, parsedMinutesAgo) * 6e4;
  if (key) {
    uploadTimestampRegistry.set(key, anchoredTs);
    scheduleSaveRegistry();
  }
  return anchoredTs;
}
function getMovieHypeMetrics(item, minutesAgoHint) {
  const titleLower = String(item.title || "").toLowerCase();
  const viewsNum = parseViewsToNumber(item.views);
  const canonicalSeed = getCanonicalTitleKey(item.title) || item.path || item.id || "cinema";
  const seed = hashSeed(canonicalSeed);
  const minsAgo = minutesAgoHint !== void 0 ? minutesAgoHint : getItemMinutesAgo(item, 0);
  const isKeywordMatch = HOT_POPULAR_KEYWORDS.some((kw) => titleLower.includes(kw));
  const is4kOrWebDl = /4k|2160p|web-dl|bluray|org|full hd/i.test(
    `${item.quality} ${item.title}`
  );
  let ratingNum = 8.1 + seed % 8 * 0.1;
  if (viewsNum >= 5e5) {
    ratingNum = 9.3 + seed % 4 * 0.1;
  } else if (viewsNum >= 12e4 || item.isPinned || isKeywordMatch) {
    ratingNum = 9 + seed % 5 * 0.1;
  } else if (viewsNum >= 4e4 || is4kOrWebDl) {
    ratingNum = 8.7 + seed % 4 * 0.1;
  }
  ratingNum = Math.min(9.6, Math.round(ratingNum * 10) / 10);
  const rating = ratingNum.toFixed(1);
  const isDhamaka = Boolean(item.isPinned) || viewsNum >= 85e3 || isKeywordMatch || ratingNum >= 9.1;
  const isHot = isDhamaka || viewsNum >= 45e3 || ratingNum >= 8.9;
  const viewsBoost = Math.min(500, Math.round(Math.log10(Math.max(10, viewsNum)) * 85));
  const ratingBoost = Math.round((ratingNum - 7.5) * 180);
  const pinnedBoost = item.isPinned ? 380 : 0;
  const keywordBoost = isKeywordMatch ? 340 : 0;
  const freshnessBoost = minsAgo <= 180 ? Math.max(40, 220 - minsAgo) : 20;
  const hypeScore = viewsBoost + ratingBoost + pinnedBoost + keywordBoost + freshnessBoost;
  return {
    rating,
    ratingNum,
    hypeScore,
    isHot,
    isDhamaka,
    hypeBadge: isHot ? "HOT" : ""
  };
}
function getItemMinutesAgo(item, indexHint = 0, nowMs = Date.now()) {
  const titleYearMatch = String(item.title || "").match(/\(?(19\d{2}|20[0-2]\d)\)?/);
  if (titleYearMatch) {
    const yr = parseInt(titleYearMatch[1], 10);
    if (yr <= 2024 && !item.episodePill) {
      return Math.max(2880, (2026 - yr) * 525600);
    }
  }
  const cleaned = cleanTimeAgoAndEpisode(
    item.timeAgo,
    item.episodePill,
    `${item.path || item.id || ""}::${item.title || ""}`,
    indexHint
  );
  const uploadedAtMs = resolveLiveUploadedAtMs(item, cleaned.minutesAgo, nowMs);
  return Math.max(1, Math.floor((nowMs - uploadedAtMs) / 6e4));
}
function normalizeMovieCardItem(item, indexHint = 0, nowMs = Date.now()) {
  const titleYearMatch = String(item.title || "").match(/\((19\d{2}|20[0-2]\d)\)/);
  const releaseYr = titleYearMatch ? parseInt(titleYearMatch[1], 10) : 0;
  const cleaned = cleanTimeAgoAndEpisode(
    item.timeAgo,
    item.episodePill,
    `${item.path || item.id || ""}::${item.title || ""}`,
    indexHint
  );
  const uploadedAtMs = resolveLiveUploadedAtMs(item, cleaned.minutesAgo, nowMs);
  const liveMinutesAgo = releaseYr > 0 && releaseYr <= 2024 && !item.episodePill ? Math.max(2880, (2026 - releaseYr) * 525600) : Math.max(1, Math.floor((nowMs - uploadedAtMs) / 6e4));
  const isExplicitDateOrYear = /^\d{4}(?:-\d{2}-\d{2})?(?:\s+Release)?$/i.test(
    String(item.timeAgo || "").trim()
  );
  const liveTimeAgo = releaseYr > 0 && releaseYr <= 2024 && !item.episodePill ? `${releaseYr}` : isExplicitDateOrYear ? String(item.timeAgo).trim() : formatMinutesAgoToLabel(liveMinutesAgo);
  const hype = getMovieHypeMetrics(
    {
      ...item,
      timeAgo: liveTimeAgo,
      episodePill: cleaned.episodePill,
      uploadedAtMs
    },
    liveMinutesAgo
  );
  return {
    ...item,
    poster: cloakImageUrl(item.poster),
    previewImage: item.previewImage ? cloakImageUrl(item.previewImage) : item.previewImage,
    uploadedAtMs,
    timeAgo: liveTimeAgo,
    episodePill: cleaned.episodePill,
    rating: item.rating || hype.rating,
    hypeScore: hype.hypeScore,
    isHot: hype.isHot,
    isDhamaka: hype.isDhamaka,
    hypeBadge: hype.hypeBadge
  };
}
function normalizeMovieCardList(items, nowMs = Date.now()) {
  const deduped = deduplicateMovieCards(items || []);
  return deduped.map((item, idx) => normalizeMovieCardItem(item, idx, nowMs));
}
function sortItemsByHotAndHype(items, nowMs = Date.now()) {
  const normalized = normalizeMovieCardList(items, nowMs);
  const mbHot = [];
  const mlbdHot = [];
  const otherHot = [];
  const tier2FreshUpload = [];
  const tier3Rest = [];
  for (const item of normalized) {
    const mins = getItemMinutesAgo(item, 0, nowMs);
    const p = String(item.path || "");
    if (item.isDhamaka || item.isHot) {
      if (p.startsWith("/mb/")) {
        mbHot.push(item);
      } else if (!p.startsWith("/mf/")) {
        mlbdHot.push(item);
      } else {
        otherHot.push(item);
      }
    } else if (mins <= 360) {
      tier2FreshUpload.push(item);
    } else {
      tier3Rest.push(item);
    }
  }
  mbHot.sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
  mlbdHot.sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
  otherHot.sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
  tier2FreshUpload.sort((a, b) => getItemMinutesAgo(a, 0, nowMs) - getItemMinutesAgo(b, 0, nowMs));
  tier3Rest.sort((a, b) => getItemMinutesAgo(a, 0, nowMs) - getItemMinutesAgo(b, 0, nowMs));
  const interleavedHot = [];
  const maxHotLen = Math.max(mbHot.length, mlbdHot.length, otherHot.length);
  for (let i = 0; i < maxHotLen; i++) {
    if (i < mbHot.length) interleavedHot.push(mbHot[i]);
    if (i < mlbdHot.length) interleavedHot.push(mlbdHot[i]);
    if (i < otherHot.length) interleavedHot.push(otherHot[i]);
  }
  const topHotHead = interleavedHot.slice(0, 18);
  const remainingHot = interleavedHot.slice(18);
  return deduplicateMovieCards([...topHotHead, ...tier2FreshUpload, ...remainingHot, ...tier3Rest]);
}
function sortItemsByRecentUpload(items, nowMs = Date.now()) {
  const normalized = normalizeMovieCardList(items, nowMs);
  return [...normalized].sort((a, b) => {
    const mA = getItemMinutesAgo(a, 0, nowMs);
    const mB = getItemMinutesAgo(b, 0, nowMs);
    if (mA !== mB) return mA - mB;
    return (b.hypeScore || 0) - (a.hypeScore || 0);
  });
}
function sortItemsByHighRating(items, nowMs = Date.now()) {
  const normalized = normalizeMovieCardList(items, nowMs);
  return [...normalized].sort((a, b) => {
    const rA = parseFloat(a.rating || "8.0") || 8;
    const rB = parseFloat(b.rating || "8.0") || 8;
    if (rB !== rA) return rB - rA;
    return (b.hypeScore || 0) - (a.hypeScore || 0);
  });
}

// server.ts
var __dirname = typeof import.meta?.url === "string" && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd();
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (kept server alive):", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection (kept server alive):", reason);
});
var SERVER_NODES = [
  { id: "node-moviebox", name: "CinePulse HD", region: "CinePulse Global 4K/1080p Cloud", origin: "https://movie-box.co" },
  { id: "node-mlbd", name: "CinePulse Bangla & South Hub", region: "CinePulse Direct BD/Cloud", origin: "https://rmqn25.movielinkbd.at" }
];
var activeMovieLinkBdOrigin = "https://rmqn25.movielinkbd.at";
var MOVIELINKBD_DISCOVERY_HUBS = [
  "https://movielinkbd.at/",
  "https://movielinkbd.com/"
];
var lastMlbdDiscoveryAt = 0;
function getMirrorNodes() {
  return [
    {
      id: "node-mlbd",
      name: "CinePulse Bangla & South Hub",
      region: "CinePulse Direct BD/Cloud",
      origin: activeMovieLinkBdOrigin
    },
    {
      id: "node-mlbd-fallback",
      name: "CinePulse Bangla Mirror",
      region: "CinePulse Mirror Gateway",
      origin: "https://movielinkbd.at"
    }
  ];
}
async function discoverActiveMovieLinkBdOrigin(force = false) {
  if (!force && Date.now() - lastMlbdDiscoveryAt < 10 * 6e4) {
    return activeMovieLinkBdOrigin;
  }
  lastMlbdDiscoveryAt = Date.now();
  for (const hubUrl of MOVIELINKBD_DISCOVERY_HUBS) {
    try {
      const res = await fetch(hubUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(4500),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const finalHost = new URL(res.url || hubUrl);
        if (finalHost.hostname.endsWith("movielinkbd.at") && finalHost.hostname !== "movielinkbd.at") {
          activeMovieLinkBdOrigin = finalHost.origin;
          SERVER_NODES[1].origin = activeMovieLinkBdOrigin;
          return activeMovieLinkBdOrigin;
        }
        const html = await res.text();
        const linkMatch = html.match(/https:\/\/[a-z0-9-]+\.movielinkbd\.at/i);
        if (linkMatch?.[0]) {
          activeMovieLinkBdOrigin = linkMatch[0];
          SERVER_NODES[1].origin = activeMovieLinkBdOrigin;
          return activeMovieLinkBdOrigin;
        }
      }
    } catch {
    }
  }
  return activeMovieLinkBdOrigin;
}
var MOVIEBOX_ORIGIN = "https://movie-box.co";
var MOVIEBOX_API_ORIGIN = "https://movie-box.co";
var MOVIEBOX_FALLBACK_API_ORIGIN = "https://h5-api.aoneroom.com";
var FFMPEG_BIN = fs.existsSync("/usr/bin/ffmpeg") ? "/usr/bin/ffmpeg" : fs.existsSync("/usr/local/bin/ffmpeg") ? "/usr/local/bin/ffmpeg" : "ffmpeg";
function pruneCacheMap(map, maxEntries) {
  if (map.size <= maxEntries) return;
  const excess = map.size - maxEntries;
  let removed = 0;
  for (const key of map.keys()) {
    map.delete(key);
    removed++;
    if (removed >= excess) break;
  }
}
var catalogCache = /* @__PURE__ */ new Map();
var detailCache = /* @__PURE__ */ new Map();
var detailTitleCache = /* @__PURE__ */ new Map();
var imdbIdCache = /* @__PURE__ */ new Map();
var healthCache = null;
var mirrorHtmlCache = /* @__PURE__ */ new Map();
var inFlightMirrorMap = /* @__PURE__ */ new Map();
function sortSourcesFastestFirst(sources) {
  if (!Array.isArray(sources) || sources.length <= 1) return sources || [];
  const score = (src) => {
    const isEmbed = src.type === "embed" || /abyssplayer\.com|abysscdn\.com|vidsrc|multiembed|autoembed/i.test(`${src.url || ""} ${src.id || ""}`);
    if (isEmbed) return 400;
    const isMovieBox = src.id?.startsWith("mb-") || /\/api\/mb-stream|\/api\/mb-ep-stream/i.test(src.url || "");
    if (isMovieBox) {
      const baseMb = 4500;
      const sizeMatch = (src.name || "").match(/(\d+)\s*MB/i);
      const sizeMb = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
      const isHeavyFile = sizeMb > 350;
      if (src.quality === 720) return baseMb + 140;
      if (src.quality === 480) return baseMb + 135;
      if (src.quality === 360) return baseMb + 125;
      if (src.quality === 1080) return isHeavyFile ? baseMb + 80 : baseMb + 130;
      return baseMb + 100;
    }
    const isHevc = /\b(hevc|h\.?265|x265|10bit|av1)\b/i.test(`${src.name} ${src.qualityLabel}`);
    const isBestHeavy = /best\s*quality/i.test(src.qualityLabel || "");
    let s = isHevc ? 1400 : 3e3;
    if (isBestHeavy) s -= 250;
    if (src.quality >= 360 && src.quality <= 576) s += 650;
    else if (src.quality === 720) s += 550;
    else if (src.quality === 1080) s += 400;
    else s += 150;
    return s;
  };
  return [...sources].sort((a, b) => score(b) - score(a));
}
function storeDetailInCaches(itemPath, det, expiresAt) {
  if (!det || typeof det !== "object") return;
  const safeExpiresAt = Math.min(expiresAt, Date.now() + 12 * 6e4);
  if (Array.isArray(det.episodes)) {
    for (const ep of det.episodes) {
      if (Array.isArray(ep.sources)) {
        ep.sources = sortSourcesFastestFirst(ep.sources);
      }
    }
  }
  if (itemPath) {
    pruneCacheMap(detailCache, 180);
    detailCache.set(itemPath, { data: det, expiresAt: safeExpiresAt });
  }
  if (det.title && det.episodes?.length) {
    pruneCacheMap(detailTitleCache, 240);
    const isMbSource = Boolean(itemPath.startsWith("/mb/") || det.url?.startsWith("/mb/"));
    const scopePrefix = isMbSource ? "mb::" : "ml::";
    const canon = getCanonicalTitleKey(det.title);
    if (canon) detailTitleCache.set(`${scopePrefix}${canon}`, { data: det, expiresAt: safeExpiresAt });
    const base = extractBaseSeriesTitle(det.title).toLowerCase();
    if (base) detailTitleCache.set(`${scopePrefix}${base}`, { data: det, expiresAt: safeExpiresAt });
  }
}
function findCachedDetailByPathOrTitle(itemPath, rawTitle = "") {
  const now = Date.now();
  if (itemPath) {
    const hit = detailCache.get(itemPath);
    if (hit && hit.expiresAt > now && hit.data?.episodes?.length) {
      return hit.data;
    }
    if (itemPath.startsWith("/mb/")) {
      return null;
    }
    if (rawTitle) {
      const canon = getCanonicalTitleKey(rawTitle);
      const byMlCanon = canon ? detailTitleCache.get(`ml::${canon}`) : void 0;
      if (byMlCanon && byMlCanon.expiresAt > now && byMlCanon.data?.episodes?.length && !byMlCanon.data.url?.startsWith("/mb/")) {
        return byMlCanon.data;
      }
    }
    return null;
  }
  if (rawTitle) {
    const canon = getCanonicalTitleKey(rawTitle);
    for (const pfx of ["mb::", "ml::", ""]) {
      const byCanon = canon ? detailTitleCache.get(`${pfx}${canon}`) : void 0;
      if (byCanon && byCanon.expiresAt > now && byCanon.data?.episodes?.length) return byCanon.data;
    }
    const base = extractBaseSeriesTitle(rawTitle).toLowerCase();
    for (const pfx of ["mb::", "ml::", ""]) {
      const byBase = base ? detailTitleCache.get(`${pfx}${base}`) : void 0;
      if (byBase && byBase.expiresAt > now && byBase.data?.episodes?.length) return byBase.data;
    }
  }
  return null;
}
var movieRequestsStore = [
  {
    id: "req-1",
    title: "Pushpa 2: The Rule (2025) [Bangla Dubbed 4K]",
    type: "MOVIE",
    language: "Bangla Dubbed",
    notes: "Full HD 1080p Dual Audio version",
    status: "Processing",
    createdAt: Date.now() - 36e5 * 5
  },
  {
    id: "req-2",
    title: "Solo Leveling Season 2 [Hindi + Japanese Dual Audio]",
    type: "ANIME",
    language: "Dual Audio",
    notes: "All episodes 1080p WEB-DL",
    status: "Queued",
    createdAt: Date.now() - 36e5 * 2
  }
];
var customBroadcastNotifications = [];
function formatMovieBoxStyleNotification(item, idx, category, now) {
  const cleanTitle = item.title.replace(/\s*\((?:19|20)\d{2}\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const rawDesc = String(item.description || "").trim();
  const isSeriesOrAnime = item.typeBadge === "SERIES" || item.typeBadge === "ANIME" || item.typeBadge === "DRAMA" || Boolean(item.episodePill);
  const ratingNum = parseFloat(item.rating || "8.7") || 8.7;
  let headline = "";
  const pattern = idx % 4;
  if (isSeriesOrAnime && pattern === 0) {
    headline = `${cleanTitle} is back\u2014what will happen next?`;
  } else if (isSeriesOrAnime && pattern === 1) {
    headline = `\u201C${cleanTitle}\u201D is heating up\u2014tap to find out what happens next!`;
  } else if (rawDesc && pattern === 2) {
    const snippet = rawDesc.length > 68 ? `${rawDesc.slice(0, 65).trim()}...` : rawDesc;
    headline = `${cleanTitle}: ${snippet}`;
  } else if (isSeriesOrAnime) {
    headline = `\u201C${cleanTitle}\u201D new episodes are streaming\u2014tap to watch now!`;
  } else if (rawDesc) {
    const snippet = rawDesc.length > 68 ? `${rawDesc.slice(0, 65).trim()}...` : rawDesc;
    headline = `${cleanTitle}: ${snippet}`;
  } else {
    headline = `\u201C${cleanTitle}\u201D is now streaming in Full HD\u2014tap to watch!`;
  }
  const fullSynopsis = rawDesc ? `${cleanTitle}: ${rawDesc}` : `${cleanTitle}: Stream in ${item.language || "Multi Audio"} \u2022 ${item.quality || "1080p HD"} \u2022 \u2605 ${ratingNum.toFixed(1)} (${item.sportGenre || item.typeBadge || "Cinema"}).`;
  const minsList = [12, 23, 35, 43, 58, 75, 95, 120, 165, 210, 260, 320];
  const mins = minsList[idx % minsList.length];
  const timeBadge = mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)} hr ${mins % 60 > 0 ? `${mins % 60} min ` : ""}ago`;
  return {
    id: `notif-${category === "NEW_UPLOAD" ? "new" : "pop"}-${item.id}`,
    category,
    badgeText: timeBadge,
    headlineBn: headline,
    subtitleBn: fullSynopsis,
    movie: item,
    createdAt: Math.max(now - mins * 6e4, now - 24 * 36e5),
    ratingScore: ratingNum
  };
}
function buildGlobalNotifications() {
  const now = Date.now();
  const pool = [];
  const seenPaths = /* @__PURE__ */ new Set();
  const seenTitles = /* @__PURE__ */ new Set();
  for (const sec of cachedMovieBoxHomeSections) {
    if (!Array.isArray(sec.subjects)) continue;
    for (let idx = 0; idx < sec.subjects.length; idx++) {
      const card = mapMovieBoxItemToCard(sec.subjects[idx], idx);
      if (!card || card.isAdult) continue;
      const item = normalizeMovieCardItem(card, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, "");
      if (!item.path || seenPaths.has(item.path) || tKey && seenTitles.has(tKey)) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }
  for (const [key, entry] of catalogCache.entries()) {
    if (key.includes("adult18plus")) continue;
    for (const rawItem of entry.data.items.slice(0, 24)) {
      if (rawItem.isAdult) continue;
      const item = normalizeMovieCardItem(rawItem, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, "");
      if (!item.path || seenPaths.has(item.path) || tKey && seenTitles.has(tKey)) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }
  if (pool.length < 10) {
    for (const rawItem of INITIAL_FALLBACK_MOVIES["/"] || []) {
      if (rawItem.isAdult) continue;
      const item = normalizeMovieCardItem(rawItem, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, "");
      if (!item.path || seenPaths.has(item.path) || tKey && seenTitles.has(tKey)) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }
  const withDesc = pool.filter((i) => Boolean(i.description));
  const withoutDesc = pool.filter((i) => !i.description);
  const orderedPool = [...withDesc, ...withoutDesc];
  const recentUploads = sortItemsByRecentUpload(orderedPool, now).slice(0, 14);
  const topRatedPopular = sortItemsByHighRating(orderedPool, now).slice(0, 14);
  const notifications = [...customBroadcastNotifications];
  const notifSeen = new Set(notifications.map((n) => n.movie.path));
  const maxLen = Math.max(recentUploads.length, topRatedPopular.length);
  let notifIdx = 0;
  for (let i = 0; i < maxLen; i++) {
    const newItem = recentUploads[i];
    if (newItem && !notifSeen.has(newItem.path)) {
      notifSeen.add(newItem.path);
      notifications.push(
        formatMovieBoxStyleNotification(newItem, notifIdx++, "NEW_UPLOAD", now)
      );
    }
    const popItem = topRatedPopular[i];
    if (popItem && !notifSeen.has(popItem.path)) {
      notifSeen.add(popItem.path);
      notifications.push(
        formatMovieBoxStyleNotification(popItem, notifIdx++, "TOP_RATED_POPULAR", now)
      );
    }
  }
  return notifications.slice(0, 28);
}
var CINEPULSE_AES_KEY = crypto.createHash("sha256").update("CinePulse_AES256_Master_Key_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF").digest();
function encodeGatewayToken(rawUrl) {
  if (!rawUrl) return "";
  try {
    const iv = crypto.createHash("md5").update(`${rawUrl}::cp_iv_v4`).digest().subarray(0, 12);
    const cipher = crypto.createCipheriv("aes-256-gcm", CINEPULSE_AES_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(rawUrl, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `cp1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
  } catch {
    return Buffer.from(rawUrl, "utf8").toString("base64url");
  }
}
function encodeGatewayUrl(rawUrl) {
  if (!rawUrl) return "";
  return `/api/go?t=${encodeGatewayToken(rawUrl)}`;
}
function decodeGatewayToken(token) {
  if (!token) return "";
  try {
    const trimmed = token.trim();
    if (trimmed.startsWith("cp1.")) {
      const parts = trimmed.split(".");
      if (parts.length === 4) {
        const iv = Buffer.from(parts[1], "base64url");
        const tag = Buffer.from(parts[2], "base64url");
        const encrypted = Buffer.from(parts[3], "base64url");
        const decipher = crypto.createDecipheriv("aes-256-gcm", CINEPULSE_AES_KEY, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString("utf8");
      }
    }
    return Buffer.from(trimmed, "base64url").toString("utf8");
  } catch {
    return "";
  }
}
function sanitizeBrandText(input) {
  if (!input) return "";
  return input.replace(/https?:\/\/[^\s"'<>]*movielinkbd[^\s"'<>]*/gi, "").replace(/\b[a-z0-9-]*\.?movielinkbd\.[a-z]{2,6}\b/gi, "CinePulse").replace(/movielinkbd|nexaflox/gi, "CinePulse").replace(/movie\s*link\s*bd/gi, "CinePulse").replace(/\bmlbd\b/gi, "CP").replace(/\s*watch\s+online\s+and\s+download\s*(?:["“”']?web-dl["“”']?|["“”']?hdtc["“”']?|["“”']?hd["“”']?|["“”']?4k["“”']?)?\s*…?/gi, "").replace(/\s*watch\s+online\s*…?/gi, "").replace(/\s*[“”"'](?:web(?:-?dl|rip)?|hdtc|hdts|4k|hd)[^"”]*[”"']?\s*…?\s*$/gi, "").replace(/\s+[–—-]\s*$/g, "").replace(/\s{2,}/g, " ").trim();
}
function decodeMlbdCipher(base64Str, hexSeed, rounds) {
  try {
    let x = parseInt(hexSeed, 16) >>> 0;
    for (let i = 0; i < rounds; i++) {
      x = Math.imul(x, 1103515245) + 12345 >>> 0;
    }
    const raw = Buffer.from(base64Str.trim(), "base64");
    const out = Buffer.alloc(raw.length);
    for (let j = 0; j < raw.length; j++) {
      x = Math.imul(x, 1103515245) + 12345 >>> 0;
      out[j] = raw[j] ^ x >>> 16 & 255;
    }
    return out.toString("utf8");
  } catch {
    return "";
  }
}
function decodeHtmlEntities(str) {
  const cleaned = (str || "").replace(/&ndash;|&#8211;/g, "\u2013").replace(/&mdash;|&#8212;/g, "\u2014").replace(/&#039;|&#8217;/g, "'").replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&amp;|&#038;/g, "&").replace(/&bull;|&#8226;/g, "\u2022").replace(/&#8230;|&hellip;/g, "").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
  return sanitizeBrandText(cleaned);
}
function getOrderedNodes(preferredNodeId) {
  const nodes = getMirrorNodes();
  if (!preferredNodeId || preferredNodeId === "node-moviebox") return nodes;
  const preferred = nodes.find((n) => n.id === preferredNodeId);
  if (!preferred) return nodes;
  return [preferred, ...nodes.filter((n) => n.id !== preferredNodeId)];
}
async function fetchFromMirrors(targetPath, preferredNodeId) {
  const cleanPath = targetPath.startsWith("http") ? new URL(targetPath).pathname + new URL(targetPath).search : targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const orderedNodes = getOrderedNodes(preferredNodeId);
  const attemptNode = async (node, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${node.origin}${cleanPath}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
          Cookie: "mlbd_show18=1; hide18On=false",
          Referer: `${node.origin}/`
        }
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      if (!html || html.length < 1200 || !html.includes("movie-card") && !html.includes("mlbdInlinePlayerData") && !html.includes('<div class="n">404</div>')) {
        throw new Error("Challenge or incomplete HTML");
      }
      const finalOrigin = new URL(res.url || url).origin;
      return { html, finalOrigin, activeNodeId: node.id };
    } finally {
      clearTimeout(timer);
    }
  };
  const mirrorKey = `${preferredNodeId || "auto"}::${cleanPath}`;
  const cachedMirror = mirrorHtmlCache.get(mirrorKey);
  if (cachedMirror && cachedMirror.expiresAt > Date.now()) {
    return cachedMirror.data;
  }
  const existingFlight = inFlightMirrorMap.get(mirrorKey);
  if (existingFlight) {
    return existingFlight;
  }
  const runMirrorFetch = (async () => {
    try {
      const winner = await Promise.any(
        orderedNodes.slice(0, 2).map((node) => attemptNode(node, 4500))
      );
      pruneCacheMap(mirrorHtmlCache, 60);
      mirrorHtmlCache.set(mirrorKey, { data: winner, expiresAt: Date.now() + 45e3 });
      return winner;
    } catch {
      for (const node of orderedNodes.slice(2)) {
        try {
          const fallbackWinner = await attemptNode(node, 5e3);
          pruneCacheMap(mirrorHtmlCache, 60);
          mirrorHtmlCache.set(mirrorKey, { data: fallbackWinner, expiresAt: Date.now() + 45e3 });
          return fallbackWinner;
        } catch {
        }
      }
    }
    throw new Error("All cinema stream nodes unreachable");
  })();
  inFlightMirrorMap.set(mirrorKey, runMirrorFetch);
  try {
    return await runMirrorFetch;
  } finally {
    inFlightMirrorMap.delete(mirrorKey);
  }
}
function parseMovieCards(html) {
  const bodyIdx = html.indexOf("<body");
  const body = bodyIdx >= 0 ? html.slice(bodyIdx) : html;
  const blocks = body.split(/<div class="movie-card"/i).slice(1);
  const items = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const block of blocks) {
    const chunk = block.slice(0, 3200);
    if (chunk.includes("'+esc(") || chunk.includes("${")) continue;
    const titleMatch = chunk.match(/class=["']title["'][^>]*>([\s\S]*?)<\/a>/i) || chunk.match(/alt=["']([^"']+)["']/i);
    const hrefMatch = chunk.match(/<a[^>]+href=["']([^"']+)["']/i);
    if (!titleMatch || !hrefMatch) continue;
    const rawHref = hrefMatch[1].trim();
    if (!rawHref || rawHref.includes("'+") || rawHref === "#") continue;
    let itemPath = "";
    try {
      itemPath = rawHref.startsWith("http") ? new URL(rawHref).pathname : rawHref.startsWith("/") ? rawHref : `/${rawHref}`;
    } catch {
      continue;
    }
    if (seenPaths.has(itemPath)) continue;
    const title = decodeHtmlEntities(titleMatch[1]);
    if (!title) continue;
    const titleKey = getCanonicalTitleKey(title);
    if (titleKey && seenPaths.has(`title::${titleKey}`)) continue;
    const posterMatch = chunk.match(/data-src=["'](https?:\/\/[^"']+)["']/i) || chunk.match(/src=["'](https?:\/\/[^"']+)["']/i);
    const poster = posterMatch ? posterMatch[1].trim() : "";
    const posterKey = poster ? poster.toLowerCase().split("?")[0].trim() : "";
    if (posterKey && seenPaths.has(`poster::${posterKey}`)) continue;
    seenPaths.add(itemPath);
    if (titleKey) seenPaths.add(`title::${titleKey}`);
    if (posterKey) seenPaths.add(`poster::${posterKey}`);
    const quality = decodeHtmlEntities(
      (chunk.match(/<span class=["']quality["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || "WEB-DL"
    );
    const language = decodeHtmlEntities(
      (chunk.match(/<span class=["']language["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || "MULTI"
    );
    const views = decodeHtmlEntities(
      (chunk.match(/<span class=["']views-badge-top["'][^>]*>[\s\S]*?<\/i>\s*([^<]+)<\/span>/i) || [])[1] || "2.4K"
    );
    const rawTimeAgo = decodeHtmlEntities(
      (chunk.match(/<div class=["']upload-time["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "Recently added"
    );
    const rawEpisodePill = decodeHtmlEntities(
      (chunk.match(/<span class=["']badge ep-badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || ""
    );
    const cleanedTime = cleanTimeAgoAndEpisode(
      rawTimeAgo,
      rawEpisodePill,
      itemPath || title,
      items.length
    );
    const isPinned = chunk.includes("pin-badge") || chunk.includes('data-pin="1"');
    const isAdult = chunk.includes('data-18="1"') || itemPath.includes("18plus") || cleanedTime.episodePill.toUpperCase().includes("18+");
    let typeBadge = "MOVIE";
    if (itemPath.includes("/anime/")) typeBadge = "ANIME";
    else if (itemPath.includes("/drama/")) typeBadge = "DRAMA";
    else if (itemPath.includes("/series/") || Boolean(cleanedTime.episodePill)) typeBadge = "SERIES";
    const r2TsMatch = poster.match(/poster_[a-z0-9_]*?(17\d{8})\./i);
    const r2EpochMs = r2TsMatch ? parseInt(r2TsMatch[1], 10) * 1e3 : 0;
    const nowMs = Date.now();
    let pathHash = 2166136261 >>> 0;
    for (let c = 0; c < itemPath.length; c++) {
      pathHash ^= itemPath.charCodeAt(c);
      pathHash = Math.imul(pathHash, 16777619) >>> 0;
    }
    const minuteJitter = cleanedTime.minutesAgo >= 60 ? pathHash % 47 : 0;
    const computedUploadMs = r2EpochMs > nowMs - 48 * 36e5 && r2EpochMs <= nowMs ? r2EpochMs : nowMs - (cleanedTime.minutesAgo + minuteJitter) * 6e4;
    items.push({
      id: itemPath.replace(/[^a-zA-Z0-9_-]/g, "_"),
      title,
      // Never expose upstream URL; keep clean relative path
      url: itemPath,
      path: itemPath,
      poster,
      quality: quality || "HD",
      views: views || "1.9K",
      language: language || "MULTI",
      typeBadge,
      timeAgo: cleanedTime.timeAgo,
      episodePill: cleanedTime.episodePill,
      isPinned,
      isAdult,
      uploadedAtMs: computedUploadMs
    });
  }
  const pageMatches = [...body.matchAll(/\/page\/(\d+)/g)].map((m) => Number(m[1])).filter((n) => !isNaN(n) && n > 0 && n <= 2e3);
  const maxPage = pageMatches.length > 0 ? Math.max(...pageMatches) : 520;
  return { items, maxPage };
}
function parseMovieDetail(html, itemPath, origin) {
  let inlineData = null;
  const playerScriptMatch = html.match(
    /<script[^>]*id=["']mlbdInlinePlayerData["'][^>]*data-s=["']([^"']+)["'][^>]*data-r=["'](\d+)["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (playerScriptMatch) {
    const decodedJson = decodeMlbdCipher(
      playerScriptMatch[3],
      playerScriptMatch[1],
      parseInt(playerScriptMatch[2], 10) || 600
    );
    try {
      inlineData = JSON.parse(decodedJson);
    } catch {
      inlineData = null;
    }
  }
  const downloadButtons = [];
  const dlRegex = /<a[^>]*data-dl=["']([^"']+)["'][^>]*data-ds=["']([^"']+)["'][^>]*data-dr=["'](\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(dlRegex)) {
    const decodedHref = decodeMlbdCipher(match[1], match[2], parseInt(match[3], 10) || 300);
    const label = decodeHtmlEntities(match[4]);
    if (decodedHref) {
      const fullDlUrl = decodedHref.startsWith("http") ? decodedHref : `${origin}${decodedHref.startsWith("/") ? "" : "/"}${decodedHref}`;
      const bracketMatch = label.match(/\[(.*?)\]/);
      const parts = bracketMatch ? bracketMatch[1].split("\u2022").map((s) => s.trim()) : [];
      downloadButtons.push({
        label: sanitizeBrandText(label || "High-Speed Direct Download"),
        url: fullDlUrl,
        quality: parts[0] || "HD",
        size: parts[1] || ""
      });
    }
  }
  const rawTitle = inlineData?.title || decodeHtmlEntities((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "Cinema Title");
  const title = sanitizeBrandText(rawTitle);
  const poster = inlineData?.poster || (html.match(/<div class=["']image-container-view["'][\s\S]*?<img[^>]+src=["'](https?:\/\/[^"']+)["']/i) || [])[1] || "";
  const qualityNote = sanitizeBrandText(
    decodeHtmlEntities(
      (html.match(/<div class=["']movie-info-view["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || ""
    )
  );
  const extractInfoLine = (keyword) => {
    const regex = new RegExp(`<p class=["']info-line["'][^>]*>[\\s\\S]*?${keyword}:?<\\/b>([\\s\\S]*?)<\\/p>`, "i");
    const m = html.match(regex);
    return m ? decodeHtmlEntities(m[1]) : "";
  };
  const genre = extractInfoLine("Genre") || "Cinema, Entertainment";
  const language = extractInfoLine("Language") || "Multi Audio";
  const quality = extractInfoLine("Quality") || "WEB-DL";
  const resolution = extractInfoLine("Resolution") || "1080p | 720p | 480p";
  const releaseDate = extractInfoLine("Released") || "2026";
  const storyline = sanitizeBrandText(
    decodeHtmlEntities(
      (html.match(/<p class=["']story-text["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || (html.match(/<meta name=["']description["'] content=["']([^"']+)["']/i) || [])[1] || ""
    )
  );
  const trailerMatch = html.match(/data-mlbd-trailer=["']([a-zA-Z0-9_-]{6,20})["']/i);
  const youtubeTrailerId = trailerMatch ? trailerMatch[1] : "";
  const cast = [];
  const castRegex = /<a class=["']mlbd-cast__p["'][^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>[\s\S]*?<small>([\s\S]*?)<\/small>/gi;
  for (const m of html.matchAll(castRegex)) {
    const actorName = decodeHtmlEntities(m[3]);
    if (actorName) {
      cast.push({
        url: `/search?q=${encodeURIComponent(actorName)}`,
        photo: m[2],
        name: actorName,
        role: decodeHtmlEntities(m[4])
      });
    }
  }
  let communityScore;
  const voteMatch = html.match(/data-summary=["']([^"']+)["']/i);
  if (voteMatch) {
    try {
      const parsedVote = JSON.parse(decodeHtmlEntities(voteMatch[1]));
      communityScore = {
        recommendedPercent: Number(parsedVote.recommended_percent) || 88,
        totalVotes: Number(parsedVote.total) || 24,
        verdict: sanitizeBrandText(parsedVote.verdict || "\u09A6\u09B0\u09CD\u09B6\u0995\u09A6\u09C7\u09B0 \u09AA\u099B\u09A8\u09CD\u09A6")
      };
    } catch {
    }
  }
  const inferStreamQuality = (s) => {
    const combined = `${s?.quality_label || ""} ${s?.name || ""}`.toLowerCase();
    if (/\b(2160p|4k)\b/.test(combined)) return 2160;
    if (/\b(1080p|full\s*hd)\b/.test(combined)) return 1080;
    if (/\b(480p|360p)\b/.test(combined)) return 480;
    if (/\b720p\b/.test(combined)) return 720;
    const q = Number(s?.quality);
    if (q === 480 || q === 720 || q === 1080 || q === 2160) return q;
    if (/best\s*quality/i.test(combined)) return 1080;
    return 720;
  };
  const scoreSourceForSmoothPlay = (src) => {
    const isHevc = /\b(hevc|h\.?265|x265|10bit)\b/i.test(`${src.name} ${src.qualityLabel}`);
    const isBestHeavy = /best\s*quality/i.test(src.qualityLabel || "");
    let score = isHevc ? 200 : 1e3;
    if (isBestHeavy) score -= 250;
    if (/\.(mp4|m4v|m3u8)(\?|$)/i.test(src.url)) score += 90;
    if (/r2\.dev|workers\.dev|cloudflare|fsldownload|pixeldrain/i.test(src.url)) score += 50;
    if (src.quality >= 360 && src.quality <= 576) score += 650;
    else if (src.quality === 720) score += 500;
    else if (src.quality === 1080) score += 350;
    else if (src.quality === 2160) score += 150;
    else score += 200;
    return score;
  };
  const mapRawEpisode = (ep, idx) => {
    const rawSources = Array.isArray(ep.sources) ? ep.sources.filter((s) => s && (s.url || s.download_url)).map((s, sIdx) => {
      const rawUrl = String(s.url || "");
      const rawStreamUrl = rawUrl.startsWith("http") ? rawUrl : rawUrl ? `${origin}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}` : "";
      const rawDlUrl = String(s.download_url || s.url || "");
      const fullDlUrl = rawDlUrl.startsWith("http") ? rawDlUrl : rawDlUrl ? `${origin}${rawDlUrl.startsWith("/") ? "" : "/"}${rawDlUrl}` : "";
      const realQuality = inferStreamQuality(s);
      const cleanStreamName = sanitizeBrandText(String(s.name || `${title} - ${realQuality}p`));
      const fileSlug = (cleanStreamName || "CinePulse-HD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
      const isDirectFile = rawStreamUrl.startsWith("http") && !/\/embed\/|abyssplayer|abysscdn|vidsrc|multiembed|autoembed/i.test(rawStreamUrl);
      const proxiedStreamUrl = isDirectFile ? `/api/mb-stream.mp4?t=${encodeGatewayToken(rawStreamUrl)}&name=${encodeURIComponent(fileSlug)}` : rawStreamUrl;
      const isDirectDl = fullDlUrl.startsWith("http") && (/\.(mp4|mkv|m4v)(\?|$)/i.test(fullDlUrl) || /workers\.dev|r2\.dev|fsldownload|cloudflare/i.test(fullDlUrl));
      const proxiedDlUrl = isDirectDl ? `/api/mb-stream.mp4?t=${encodeGatewayToken(fullDlUrl)}&dl=1&name=${encodeURIComponent(fileSlug)}` : encodeGatewayUrl(fullDlUrl);
      const rawExt = String(s.type || "").toLowerCase();
      const inferredType = rawExt === "mp4" || /\.mp4(\?|$)/i.test(rawStreamUrl) ? "mp4" : rawExt || (/\.mkv(\?|$)/i.test(rawStreamUrl) ? "mkv" : "mp4");
      return {
        id: String(s.id || `src-${idx}-${realQuality}-${sIdx}`),
        quality: realQuality,
        qualityLabel: s.quality_label || `${realQuality}p`,
        audio: sanitizeBrandText(String(s.audio || "Multi Audio")),
        audioLanguages: Array.isArray(s.audio_languages) ? s.audio_languages.map((a) => sanitizeBrandText(String(a))) : [sanitizeBrandText(String(s.audio || "Original"))],
        provider: `CinePulse Cloud #${sIdx + 1}`,
        url: proxiedStreamUrl,
        downloadUrl: proxiedDlUrl,
        type: inferredType,
        name: cleanStreamName,
        screenshot: s.screenshot || void 0
      };
    }) : [];
    const sources = [...rawSources].sort(
      (a, b) => scoreSourceForSmoothPlay(b) - scoreSourceForSmoothPlay(a)
    );
    const rawLabel = sanitizeBrandText(
      String(ep.label || (ep.number ? `Episode ${ep.number}` : "Full Movie"))
    );
    const rangeMatch = rawLabel.match(/(?:ep(?:isode)?|e)\s*0*(\d{1,4})\s*[-–—]\s*0*(\d{1,4})/i);
    const singleEpMatch = rawLabel.match(/s\d+\s*e0*(\d{1,4})/i) || rawLabel.match(/(?:ep(?:isode)?|e)\s*0*(\d{1,4})/i);
    const seasonMatch = rawLabel.match(/\bs(?:eason)?\s*0*(\d{1,2})\b/i);
    const parsedStart = rangeMatch ? Number(rangeMatch[1]) : singleEpMatch ? Number(singleEpMatch[1]) : null;
    const parsedEnd = rangeMatch ? Number(rangeMatch[2]) : parsedStart;
    const number = ep.number !== null && ep.number !== void 0 ? Number(ep.number) : ep.range_start !== null && ep.range_start !== void 0 ? Number(ep.range_start) : parsedStart;
    const rangeStart = ep.range_start !== null && ep.range_start !== void 0 ? Number(ep.range_start) : number;
    const rangeEnd = ep.range_end !== null && ep.range_end !== void 0 ? Number(ep.range_end) : parsedEnd ?? rangeStart;
    const season = ep.season !== null && ep.season !== void 0 ? Number(ep.season) : seasonMatch ? Number(seasonMatch[1]) : null;
    return {
      id: String(ep.id || `ep-${idx + 1}`),
      label: rawLabel,
      number,
      rangeStart,
      rangeEnd,
      season,
      kind: String(ep.kind || (number !== null ? "episode" : "movie")),
      sources
    };
  };
  const episodes = Array.isArray(inlineData?.episodes) ? inlineData.episodes.map((ep, idx) => mapRawEpisode(ep, idx)).filter((ep) => ep.sources.length > 0).sort((a, b) => {
    const sA = a.season ?? 0;
    const sB = b.season ?? 0;
    if (sA !== sB && a.season !== null && b.season !== null) return sA - sB;
    const nA = a.rangeStart ?? a.number ?? 999999;
    const nB = b.rangeStart ?? b.number ?? 999999;
    if (nA !== nB) return nA - nB;
    return (a.rangeEnd ?? nA) - (b.rangeEnd ?? nB);
  }) : [];
  const screenshots = Array.isArray(inlineData?.screenshots) ? inlineData.screenshots.map((s) => s?.url).filter(Boolean) : [];
  return {
    title,
    url: itemPath,
    poster,
    qualityNote,
    typeBadge: inlineData?.content_type === "series" || episodes.length > 1 ? "SERIES" : "MOVIE",
    language,
    quality,
    genre,
    resolution,
    releaseDate,
    storyline,
    youtubeTrailerId,
    screenshots,
    episodes,
    downloadButtons,
    cast: cast.slice(0, 12),
    communityScore
  };
}
function extractBaseSeriesTitle(rawTitle) {
  return String(rawTitle || "").replace(/\[.*?\]|\(.*?\)/g, " ").replace(/\b(?:S\d+|Season\s*\d+(?:-\d+)?|Ep(?:isode)?\s*\d+(?:-\d+)?|Complete(?:d)?|Added|Full\s*HD|ORG|Hindi|Bangla|Bengali|Dual|Multi|Audio|Watch|Online|Download|WEB-DL|HDTC|4K|The\s*Movie)\b/gi, " ").replace(/[:\-–—|]+/g, " ").replace(/\s{2,}/g, " ").trim();
}
function mapCategoryToMovieLinkBdPath(rawPath, page = 1, search = "") {
  if (search) {
    return page > 1 ? `/search?q=${encodeURIComponent(search)}&page=${page}` : `/search?q=${encodeURIComponent(search)}`;
  }
  const p = (rawPath || "/").toLowerCase().replace(/\/page\/\d+\/?$/, "").replace(/\/+$/, "") || "/";
  let mlPath = "/";
  if (p === "/" || p === "/home" || p === "/hot-dhamaka" || p === "/new-uploads" || p === "/new-releases" || p === "/mostwatch/7d") {
    mlPath = "/";
  } else if (p === "/adult18plus" || p.includes("18plus")) {
    mlPath = "/category/18plus";
  } else if (p.includes("bangla-dubbed") || p.includes("bangladubbed")) {
    mlPath = "/search?q=Bangla+Dubbed";
  } else if (p.includes("bangla") || p.includes("bengali") || p.includes("kolkata")) {
    mlPath = "/search?q=Bangla";
  } else if (p.includes("hindi-dubbed") || p.includes("hindidubbed") || p.includes("dual-audio")) {
    mlPath = "/search?q=Hindi+Dubbed";
  } else if (p.includes("bollywood") || p.includes("hindi")) {
    mlPath = "/search?q=Hindi";
  } else if (p.includes("south") || p.includes("tamil") || p.includes("telugu") || p.includes("malayalam")) {
    mlPath = "/search?q=South";
  } else if (p.includes("hollywood") || p.includes("english")) {
    mlPath = "/search?q=English";
  } else if (p.includes("anime")) {
    mlPath = "/anime";
  } else if (p.includes("animation") || p.includes("family")) {
    mlPath = "/genre/animation";
  } else if (p.includes("drama") || p.includes("korean") || p.includes("k-drama") || p.includes("chinese")) {
    mlPath = "/drama";
  } else if (p.includes("series") || p.includes("ongoing") || p.includes("tv")) {
    mlPath = "/series";
  } else if (p.includes("movies") || p === "/movies") {
    mlPath = "/movie";
  } else if (p.startsWith("/genre/")) {
    mlPath = p;
  } else {
    const slug = p.split("/").filter(Boolean).pop() || "";
    return slug ? `/search?q=${encodeURIComponent(slug.replace(/-/g, " "))}` : "/";
  }
  if (page > 1 && !mlPath.includes("?")) {
    return `${mlPath === "/" ? "" : mlPath}/page/${page}`;
  }
  return mlPath;
}
async function fetchMovieLinkBdCatalog(rawPath, page = 1, search = "") {
  const mlPath = mapCategoryToMovieLinkBdPath(rawPath, page, search);
  try {
    const { html, finalOrigin } = await fetchFromMirrors(mlPath, "node-mlbd");
    if (finalOrigin && finalOrigin.includes("movielinkbd.at")) {
      activeMovieLinkBdOrigin = finalOrigin;
      SERVER_NODES[1].origin = finalOrigin;
    }
    const parsed = parseMovieCards(html);
    if (parsed.items.length > 0) {
      return parsed;
    }
  } catch {
    void discoverActiveMovieLinkBdOrigin(true);
  }
  return { items: [], maxPage: 1 };
}
function mergeCatalogItems(primaryItems, secondaryItems, preferSecondaryFirst = false) {
  const firstList = preferSecondaryFirst ? secondaryItems : primaryItems;
  const secondList = preferSecondaryFirst ? primaryItems : secondaryItems;
  const interleaved = [];
  const maxLen = Math.max(firstList.length, secondList.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < firstList.length) interleaved.push(firstList[i]);
    if (i < secondList.length) interleaved.push(secondList[i]);
  }
  return deduplicateMovieCards(interleaved);
}
var cachedMovieBoxToken = "";
var cachedMovieBoxTokenExpiresAt = 0;
var cachedMovieBoxHomeSections = [];
var cachedMovieBoxHomeExpiresAt = 0;
var cachedMovieBoxHomePayload = null;
var cachedMovieBoxHomePayloadExpiresAt = 0;
var inFlightMovieBoxHomePromise = null;
function extractMovieBoxNuxtOperatingList(html) {
  try {
    const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m?.[1]) return [];
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return [];
    const resolve = (idx, depth = 0) => {
      if (depth > 8 || typeof idx !== "number" || idx < 0 || idx >= arr.length) return idx;
      const val = arr[idx];
      if (Array.isArray(val)) {
        if (val[0] === "ShallowReactive" || val[0] === "Reactive" || val[0] === "Ref") {
          return resolve(val[1], depth + 1);
        }
        return val.map((v) => resolve(v, depth + 1));
      }
      if (val && typeof val === "object") {
        const out = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = resolve(v, depth + 1);
        }
        return out;
      }
      return val;
    };
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === "object" && !Array.isArray(v) && "operatingList" in v) {
        const resolved = resolve(i);
        if (Array.isArray(resolved?.operatingList) && resolved.operatingList.length > 0) {
          return resolved.operatingList;
        }
      }
    }
  } catch {
  }
  return [];
}
function extractMovieBoxNuxtDetail(html) {
  try {
    const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m?.[1]) return null;
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return null;
    const resolve = (idx, depth = 0) => {
      if (depth > 8 || typeof idx !== "number" || idx < 0 || idx >= arr.length) return idx;
      const val = arr[idx];
      if (Array.isArray(val)) {
        if (val[0] === "ShallowReactive" || val[0] === "Reactive" || val[0] === "Ref") {
          return resolve(val[1], depth + 1);
        }
        return val.map((v) => resolve(v, depth + 1));
      }
      if (val && typeof val === "object") {
        const out = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = resolve(v, depth + 1);
        }
        return out;
      }
      return val;
    };
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === "object" && !Array.isArray(v) && "subject" in v && "resource" in v) {
        const resolved = resolve(i);
        if (resolved?.subject?.subjectId) {
          return { code: 0, message: "ok", data: resolved };
        }
      }
    }
  } catch {
  }
  return null;
}
function mapMovieBoxShelfTitleToMeta(rawTitle) {
  const t = rawTitle.toLowerCase();
  if (t.includes("trending drama")) {
    return { bnTitle: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u09B8\u09BF\u09B0\u09BF\u099C", categoryPath: "/category/trending-drama", badge: "HOT DRAMA" };
  }
  if (t.includes("trending movie")) {
    return { bnTitle: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09AE\u09C1\u09AD\u09BF (CinePulse Top)", categoryPath: "/type/movies", badge: "TRENDING" };
  }
  if (t.includes("indian cinema") || t.includes("trending india")) {
    return { bnTitle: "\u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09B8\u09BF\u09A8\u09C7\u09AE\u09BE \u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982", categoryPath: "/category/indian-cinema", badge: "INDIA TOP" };
  }
  if (t.includes("bengali")) {
    return { bnTitle: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C1\u09AD\u09BF \u0993 \u09A8\u09BE\u099F\u0995", categoryPath: "/language/bangla", badge: "BANGLA HIT" };
  }
  if (t.includes("bollywood")) {
    return { bnTitle: "\u09AC\u09B2\u09BF\u0989\u09A1 \u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09AE\u09C1\u09AD\u09BF", categoryPath: "/bollywood", badge: "BOLLYWOOD" };
  }
  if (t.includes("south indian")) {
    return { bnTitle: "\u09B8\u09BE\u0989\u09A5 \u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09AC\u09CD\u09B2\u0995\u09AC\u09BE\u09B8\u09CD\u099F\u09BE\u09B0", categoryPath: "/southIndian", badge: "SOUTH DUB" };
  }
  if (t.includes("hollywood") || t.includes("trending western")) {
    return { bnTitle: "\u09B9\u09B2\u09BF\u0989\u09A1 \u09AC\u09CD\u09B2\u0995\u09AC\u09BE\u09B8\u09CD\u099F\u09BE\u09B0 \u09AE\u09C1\u09AD\u09BF", categoryPath: "/language/english", badge: "HOLLYWOOD" };
  }
  if (t.includes("short tv") || t.includes("shorttv")) {
    return { bnTitle: "\u09B9\u099F \u09B6\u09B0\u09CD\u099F \u099F\u09BF\u09AD\u09BF \u0993 \u09AE\u09BF\u09A8\u09BF \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", categoryPath: "/category/short-tv", badge: "SHORT TV" };
  }
  if (t.includes("c-drama")) {
    return { bnTitle: "\u099A\u09BE\u09DF\u09A8\u09BF\u099C \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u09B8\u09BF\u09B0\u09BF\u099C", categoryPath: "/language/chinese", badge: "C-DRAMA" };
  }
  if (t.includes("asian drama") || t.includes("k-drama") || t.includes("thai-drama") || t.includes("filipino drama")) {
    return { bnTitle: "\u0995\u09CB\u09B0\u09BF\u09DF\u09BE\u09A8 \u0993 \u098F\u09B6\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", categoryPath: "/drama", badge: "ASIAN DRAMA" };
  }
  if (t.includes("western tv")) {
    return { bnTitle: "\u0993\u09DF\u09C7\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09A8 \u0993 \u09B9\u09B2\u09BF\u0989\u09A1 \u099F\u09BF\u09AD\u09BF \u09B6\u09CB", categoryPath: "/category/western-tv", badge: "WESTERN TV" };
  }
  if (t.includes("anime in hindi")) {
    return { bnTitle: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982 \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7", categoryPath: "/category/anime-hindi", badge: "HINDI ANIME" };
  }
  if (t.includes("animated film")) {
    return { bnTitle: "\u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7\u09B6\u09A8 \u09AE\u09C1\u09AD\u09BF", categoryPath: "/genre/animation", badge: "ANIMATION" };
  }
  if (t.includes("popular anime") || t.includes("anime")) {
    return { bnTitle: "\u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7 \u09B8\u09BF\u09B0\u09BF\u099C", categoryPath: "/anime", badge: "ANIME" };
  }
  if (t.includes("horror") || t.includes("frights")) {
    return { bnTitle: "\u09B9\u09B0\u09B0 \u0993 \u09AD\u09CC\u09A4\u09BF\u0995 \u09AE\u09C1\u09AD\u09BF", categoryPath: "/genre/horror", badge: "HORROR" };
  }
  if (t.includes("monster") || t.includes("titan")) {
    return { bnTitle: "\u09B8\u09BE\u09DF\u09C7\u09A8\u09CD\u09B8 \u09AB\u09BF\u0995\u09B6\u09A8 \u0993 \u09AB\u09CD\u09AF\u09BE\u09A8\u09CD\u099F\u09BE\u09B8\u09BF", categoryPath: "/genre/sci-fi", badge: "SCI-FI" };
  }
  if (t.includes("recently added") || t.includes("movie new release")) {
    return { bnTitle: "\u09B8\u09A6\u09CD\u09AF \u09AE\u09C1\u0995\u09CD\u09A4\u09BF\u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 \u09A8\u09A4\u09C1\u09A8 \u09AE\u09C1\u09AD\u09BF", categoryPath: "/type/movies", badge: "NEW MOVIE" };
  }
  if (t.includes("tv series new release")) {
    return { bnTitle: "\u09A8\u09A4\u09C1\u09A8 \u099F\u09BF\u09AD\u09BF \u0993 \u0993\u09DF\u09C7\u09AC \u09B8\u09BF\u09B0\u09BF\u099C", categoryPath: "/type/series", badge: "NEW SERIES" };
  }
  if (t.includes("punjabi")) {
    return { bnTitle: "\u09B8\u09C7\u09B0\u09BE \u09AA\u09BE\u099E\u09CD\u099C\u09BE\u09AC\u09BF \u09AE\u09C1\u09AD\u09BF", categoryPath: "/language/punjabi", badge: "PUNJABI" };
  }
  if (t.includes("indian drama")) {
    return { bnTitle: "\u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u09B8\u09BF\u09B0\u09BF\u09DF\u09BE\u09B2", categoryPath: "/category/indian-drama", badge: "INDIAN DRAMA" };
  }
  if (t.includes("arabic")) {
    return { bnTitle: "\u0986\u09B0\u09AC\u09BF \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE \u0993 \u09B8\u09BF\u09B0\u09BF\u099C", categoryPath: "/category/arabic-drama", badge: "ARABIC" };
  }
  if (t.includes("ramadan")) {
    return { bnTitle: "\u09B0\u09AE\u099C\u09BE\u09A8 \u09B8\u09CD\u09AA\u09C7\u09B6\u09BE\u09B2 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE", categoryPath: "/category/arabic-drama", badge: "SPECIAL" };
  }
  return { bnTitle: rawTitle, categoryPath: "/type/movies" };
}
var inFlightTokenPromise = null;
function generateMovieBoxClientToken() {
  const ts = Math.floor(Date.now() / 1e3);
  const rev = String(ts).split("").reverse().join("");
  const hash = crypto.createHash("md5").update(rev).digest("hex");
  return `${ts},${hash}`;
}
async function getMovieBoxBearerToken(needHomeSections = false) {
  if (cachedMovieBoxToken && cachedMovieBoxTokenExpiresAt > Date.now() && (!needHomeSections || cachedMovieBoxHomeSections.length > 0 && cachedMovieBoxHomeExpiresAt > Date.now())) {
    return cachedMovieBoxToken;
  }
  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }
  inFlightTokenPromise = (async () => {
    try {
      if (!cachedMovieBoxToken || cachedMovieBoxTokenExpiresAt <= Date.now()) {
        const pkgEndpoints = [
          `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/app/get-latest-app-pkgs?appName=moviebox`,
          `${MOVIEBOX_ORIGIN}/wefeed-h5api-bff/app/get-latest-app-pkgs?appName=moviebox`
        ];
        for (const pkgUrl of pkgEndpoints) {
          try {
            const pkgRes = await fetch(pkgUrl, {
              headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                Referer: "https://movie-box.co/?utm_source=mb_app_inner_btmtip",
                "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
                "X-Client-Token": generateMovieBoxClientToken(),
                "X-Vip-Restrict": "0",
                "X-No-High-Risk-Restrict": "1",
                "X-Request-Lang": "en"
              },
              signal: AbortSignal.timeout(2500)
            });
            const xUser = pkgRes.headers.get("x-user") || pkgRes.headers.get("x-user-info");
            if (xUser) {
              const parsed = JSON.parse(xUser);
              if (parsed?.token) {
                cachedMovieBoxToken = String(parsed.token);
                cachedMovieBoxTokenExpiresAt = Date.now() + 2 * 36e5;
                break;
              }
            }
          } catch {
          }
        }
      }
      const shouldFetchSsr = needHomeSections && (cachedMovieBoxHomeSections.length === 0 || cachedMovieBoxHomeExpiresAt <= Date.now());
      const ssrPromise = shouldFetchSsr ? fetch(`${MOVIEBOX_ORIGIN}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7"
        },
        signal: AbortSignal.timeout(3800)
      }).then((r) => r.ok ? r.text() : "").then((html) => html ? extractMovieBoxNuxtOperatingList(html) : []).catch(() => []) : Promise.resolve([]);
      let bffOps = [];
      if (shouldFetchSsr) {
        const homeEndpoints = [
          `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/home?host=movie-box.co`,
          `${MOVIEBOX_ORIGIN}/wefeed-h5api-bff/home?host=movie-box.co`
        ];
        for (const endpoint of homeEndpoints) {
          try {
            const headers = {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Accept: "application/json",
              Referer: "https://movie-box.co/?utm_source=mb_app_inner_btmtip",
              "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
              "X-Forwarded-For": "103.106.238.10",
              "X-Real-IP": "103.106.238.10",
              "CF-IPCountry": "BD",
              "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7",
              "X-Vip-Restrict": "0",
              "X-No-High-Risk-Restrict": "1",
              "X-Request-Lang": "en"
            };
            if (cachedMovieBoxToken) {
              headers.Authorization = `Bearer ${cachedMovieBoxToken}`;
            } else {
              headers["X-Client-Token"] = generateMovieBoxClientToken();
            }
            const res = await fetch(endpoint, {
              headers,
              signal: AbortSignal.timeout(3e3)
            });
            const xUser = res.headers.get("x-user") || res.headers.get("x-user-info");
            if (xUser) {
              try {
                const parsed = JSON.parse(xUser);
                if (parsed?.token) {
                  cachedMovieBoxToken = String(parsed.token);
                  cachedMovieBoxTokenExpiresAt = Date.now() + 2 * 36e5;
                }
              } catch {
              }
            }
            if (res.ok) {
              const json = await res.json().catch(() => null);
              const ops = Array.isArray(json?.data?.operatingList) ? json.data.operatingList : [];
              if (ops.length > 0) {
                bffOps = ops;
                break;
              }
            }
          } catch {
          }
        }
      }
      if (!cachedMovieBoxTokenExpiresAt || cachedMovieBoxTokenExpiresAt <= Date.now()) {
        cachedMovieBoxTokenExpiresAt = Date.now() + 15 * 6e4;
      }
      const ssrOps = await ssrPromise;
      const combinedOps = [...ssrOps, ...bffOps];
      if (combinedOps.length > 0) {
        const seenTitles = /* @__PURE__ */ new Set();
        const sections = [];
        for (const op of combinedOps) {
          const title = String(op?.title || "").trim();
          const type = String(op?.type || "").trim();
          const subjects = Array.isArray(op?.subjects) ? op.subjects : Array.isArray(op?.banner?.items) ? op.banner.items : [];
          if (!subjects.length) continue;
          const key = `${type}::${title.toLowerCase()}`;
          if (seenTitles.has(key)) continue;
          seenTitles.add(key);
          sections.push({ title, type, subjects });
        }
        if (sections.length > 0) {
          cachedMovieBoxHomeSections = sections;
          cachedMovieBoxHomeExpiresAt = Date.now() + 3e5;
        }
      }
      return cachedMovieBoxToken;
    } finally {
      inFlightTokenPromise = null;
    }
  })();
  return inFlightTokenPromise;
}
async function fetchMovieBoxHomePayload() {
  if (cachedMovieBoxHomePayload && cachedMovieBoxHomePayloadExpiresAt > Date.now()) {
    return cachedMovieBoxHomePayload;
  }
  if (cachedMovieBoxHomePayload) {
    if (!inFlightMovieBoxHomePromise) {
      void (async () => {
        try {
          cachedMovieBoxHomePayloadExpiresAt = Date.now() + 3e4;
          await fetchMovieBoxHomePayloadFresh();
        } catch {
        }
      })();
    }
    return cachedMovieBoxHomePayload;
  }
  if (inFlightMovieBoxHomePromise) {
    return inFlightMovieBoxHomePromise;
  }
  return fetchMovieBoxHomePayloadFresh();
}
async function fetchMovieBoxHomePayloadFresh() {
  if (inFlightMovieBoxHomePromise) {
    return inFlightMovieBoxHomePromise;
  }
  const task = (async () => {
    try {
      const bdHomeHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
        Origin: "https://moviebox.ph",
        Referer: "https://moviebox.ph/",
        "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
        "X-Forwarded-For": "103.106.238.10",
        "X-Real-IP": "103.106.238.10",
        "CF-IPCountry": "BD",
        "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7",
        "X-Vip-Restrict": "0",
        "X-No-High-Risk-Restrict": "1",
        "X-Request-Lang": "en"
      };
      const [bdHomeOps] = await Promise.all([
        Promise.any(
          [
            `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/home`,
            `${MOVIEBOX_API_ORIGIN}/wefeed-h5api-bff/home`,
            `https://moviebox.ph/wefeed-h5api-bff/home`
          ].map(async (url) => {
            const r = await fetch(url, { headers: bdHomeHeaders, signal: AbortSignal.timeout(5e3) });
            if (!r.ok) throw new Error("Bad status");
            const j = await r.json();
            const ops = Array.isArray(j?.data?.operatingList) ? j.data.operatingList : [];
            if (ops.length === 0) throw new Error("Empty ops");
            return ops;
          })
        ).catch(() => []),
        getMovieBoxBearerToken().catch(() => "")
      ]);
      let ssrOps = bdHomeOps;
      if (ssrOps.length === 0) {
        const ssrHtml = await fetch(`${MOVIEBOX_ORIGIN}/`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7",
            "X-Forwarded-For": "103.106.238.10",
            "CF-IPCountry": "BD"
          },
          signal: AbortSignal.timeout(5500)
        }).then((r) => r.ok ? r.text() : "").catch(() => "");
        ssrOps = ssrHtml ? extractMovieBoxNuxtOperatingList(ssrHtml) : [];
      }
      const banners = [];
      const seenBannerIds = /* @__PURE__ */ new Set();
      const comingSoon = [];
      const seenComingIds = /* @__PURE__ */ new Set();
      const shelves = [];
      const seenShelfIds = /* @__PURE__ */ new Set();
      const defaultQuickCategories = [
        {
          id: "qc-hollywood",
          title: "Hollywood",
          bnTitle: "\u09B9\u09B2\u09BF\u0989\u09A1 \u09AE\u09C1\u09AD\u09BF",
          image: "https://pbcdnw.aoneroom.com/image/2025/01/13/683063a45b61be3be1f9d7ef9b2d3072.png",
          path: "/language/english"
        },
        {
          id: "qc-bollywood",
          title: "Bollywood",
          bnTitle: "\u09AC\u09B2\u09BF\u0989\u09A1 \u09B9\u09BF\u09A8\u09CD\u09A6\u09BF",
          image: "https://pbcdnw.aoneroom.com/image/2025/01/13/95be398605ce21b60efbe7e7a5bf9fc2.png",
          path: "/bollywood"
        },
        {
          id: "qc-bengali",
          title: "Bengali Movies",
          bnTitle: "\u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C1\u09AD\u09BF \u0993 \u09A8\u09BE\u099F\u0995",
          image: "https://pub-69b6234af505413bbeac2bbc8039195c.r2.dev/poster_4g8viv1792499980.jpg",
          path: "/language/bangla"
        },
        {
          id: "qc-south",
          title: "South Indian",
          bnTitle: "\u09B8\u09BE\u0989\u09A5 \u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8",
          image: "https://pub-69b6234af505413bbeac2bbc8039195c.r2.dev/poster_06g5z71792073020.jpg",
          path: "/southIndian"
        },
        {
          id: "qc-kdrama",
          title: "K-Drama",
          bnTitle: "\u0995\u09CB\u09B0\u09BF\u09DF\u09BE\u09A8 \u09A1\u09CD\u09B0\u09BE\u09AE\u09BE",
          image: "https://pbcdnw.aoneroom.com/image/2025/01/13/1e5ef9bffd0b731d7eb4ef2c96ef7c77.png",
          path: "/drama"
        },
        {
          id: "qc-western",
          title: "Western TV",
          bnTitle: "\u0993\u09DF\u09C7\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09A8 \u099F\u09BF\u09AD\u09BF",
          image: "https://pbcdnw.aoneroom.com/image/2025/01/13/3f4884c8e0f1fd7c92a4bf2c4a6b5e81.png",
          path: "/category/western-tv"
        },
        {
          id: "qc-anime",
          title: "Anime in Hindi",
          bnTitle: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u0993 \u099C\u09BE\u09AA\u09BE\u09A8\u09BF\u099C \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7",
          image: "https://image.tmdb.org/t/p/original/n8rforZjHAB9uxqbwy7g6EdertA.jpg",
          path: "/category/anime-hindi"
        }
      ];
      const liveSports = [];
      for (const op of ssrOps) {
        const opType = String(op?.type || "").trim();
        const opTitle = String(op?.title || "").trim();
        if (opType === "BANNER" && Array.isArray(op?.banner?.items)) {
          for (let idx = 0; idx < op.banner.items.length; idx++) {
            const raw = op.banner.items[idx];
            const rawSubj = raw?.subject || raw;
            const sid = String(rawSubj?.subjectId || raw?.subjectId || "").trim();
            if (!sid || seenBannerIds.has(sid)) continue;
            seenBannerIds.add(sid);
            const card = mapMovieBoxItemToCard(
              {
                ...rawSubj,
                subjectId: sid,
                title: rawSubj?.title || raw?.title,
                detailPath: rawSubj?.detailPath || raw?.detailPath,
                cover: raw?.image || rawSubj?.cover
              },
              idx
            );
            if (card) banners.push(card);
          }
        } else if (opType === "SPORT_LIVE" && (Array.isArray(op?.liveList) || opTitle)) {
          const liveArr = Array.isArray(op?.liveList) ? op.liveList : [];
          if (liveArr.length > 0) {
            for (const m of liveArr.slice(0, 10)) {
              const t1 = m?.team1?.name || "Team A";
              const t2 = m?.team2?.name || "Team B";
              const s1 = m?.team1?.score ?? "0";
              const s2 = m?.team2?.score ?? "0";
              const sportRaw = String(m?.team1?.type || opTitle || "football").toLowerCase();
              const sportType = sportRaw.includes("cricket") ? "cricket" : sportRaw.includes("basket") ? "basketball" : sportRaw.includes("wwe") ? "wwe" : "football";
              liveSports.push({
                id: String(m?.matchId || `${t1}-${t2}`),
                title: `${t1} vs ${t2}`,
                bnTitle: `${t1} (${s1}) vs ${t2} (${s2})`,
                subtitle: `${opTitle || "Live Match"} \u2022 ${s1} - ${s2}`,
                sportType,
                liveUrl: String(op?.url || "https://sportsnow.top/live?tab=live&sportType=football"),
                categoryPath: "/",
                badge: "LIVE",
                accentColor: "#e50914"
              });
            }
          } else {
            liveSports.push({
              id: String(op?.opId || `sport-${liveSports.length}`),
              title: opTitle || "Football Live",
              bnTitle: `${opTitle || "\u09B2\u09BE\u0987\u09AD \u09B8\u09CD\u09AA\u09CB\u09B0\u09CD\u099F\u09B8"} (Live)`,
              subtitle: "MovieBox Official Live Sports",
              sportType: /cricket/i.test(opTitle) ? "cricket" : "football",
              liveUrl: String(op?.url || "https://sportsnow.top/live?tab=live&sportType=football"),
              categoryPath: "/",
              badge: "LIVE",
              accentColor: "#e50914"
            });
          }
        } else if (opType === "APPOINTMENT_LIST" && Array.isArray(op?.subjects)) {
          for (const raw of op.subjects) {
            const sid = String(raw?.subjectId || "").trim();
            const title = String(raw?.title || "").trim();
            const poster = String(raw?.cover?.url || "").trim();
            if (!sid || !title || !poster || seenComingIds.has(sid)) continue;
            seenComingIds.add(sid);
            const detailSlug = String(raw?.detailPath || title).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
            const releaseDate = String(raw?.releaseDate || raw?.appointmentDate || "").trim();
            let releaseBadge = releaseDate;
            if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
              const dt = /* @__PURE__ */ new Date(`${releaseDate}T00:00:00Z`);
              if (!isNaN(dt.getTime())) {
                releaseBadge = dt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC"
                });
              }
            }
            comingSoon.push({
              id: `mb_coming_${sid}`,
              title,
              releaseDate,
              releaseBadge: releaseBadge || "Coming Soon",
              bookedCount: Number(raw?.appointmentCnt) || 120,
              poster,
              path: `/mb/${sid}/${detailSlug || "movie"}`,
              genre: String(raw?.genre || "Action, Drama"),
              country: String(raw?.countryName || "")
            });
          }
        } else if (opType === "SUBJECTS_MOVIE" && Array.isArray(op?.subjects) && opTitle) {
          const shelfKey = opTitle.toLowerCase().replace(/\bthe\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
          if (seenShelfIds.has(shelfKey) || /nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|bl\s*series|girls\s*love|sport|football|cricket|mango|manga/i.test(
            opTitle.toLowerCase()
          )) {
            continue;
          }
          const cards = [];
          const seenCardIds = /* @__PURE__ */ new Set();
          for (let idx = 0; idx < op.subjects.length; idx++) {
            const raw = op.subjects[idx];
            const card = mapMovieBoxItemToCard(raw, idx);
            if (card && !seenCardIds.has(card.id)) {
              seenCardIds.add(card.id);
              cards.push(card);
            }
          }
          if (cards.length > 0) {
            seenShelfIds.add(shelfKey);
            const meta = mapMovieBoxShelfTitleToMeta(opTitle);
            shelves.push({
              id: `mb-shelf-${shelfKey.replace(/[^a-z0-9]+/g, "-")}`,
              title: opTitle,
              bnTitle: meta.bnTitle,
              categoryPath: meta.categoryPath,
              badge: meta.badge,
              items: cards.slice(0, 18)
            });
          }
        }
      }
      if (comingSoon.length === 0 && cachedMovieBoxHomeSections.length > 0) {
        for (const sec of cachedMovieBoxHomeSections) {
          if (sec.type === "APPOINTMENT_LIST" && Array.isArray(sec.subjects)) {
            for (const raw of sec.subjects) {
              const sid = String(raw?.subjectId || "").trim();
              const t = String(raw?.title || "").trim();
              const p = String(raw?.cover?.url || "").trim();
              if (!sid || !t || !p || seenComingIds.has(sid)) continue;
              seenComingIds.add(sid);
              const detailSlug = String(raw?.detailPath || t).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
              const rd = String(raw?.releaseDate || raw?.appointmentDate || "").trim();
              comingSoon.push({
                id: `mb_coming_${sid}`,
                title: t,
                releaseDate: rd,
                releaseBadge: rd || "Coming Soon",
                bookedCount: Number(raw?.appointmentCnt) || 120,
                poster: p,
                path: `/mb/${sid}/${detailSlug || "movie"}`,
                genre: String(raw?.genre || "Action, Drama"),
                country: String(raw?.countryName || "")
              });
            }
          }
        }
      }
      if (shelves.length === 0 && cachedMovieBoxHomeSections.length > 0) {
        for (const sec of cachedMovieBoxHomeSections) {
          if (sec.type !== "SUBJECTS_MOVIE" || !sec.title) continue;
          const shelfKey = sec.title.toLowerCase();
          if (seenShelfIds.has(shelfKey) || /nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|sport|football|cricket|mango|manga/i.test(
            shelfKey
          )) {
            continue;
          }
          const cards = [];
          for (let idx = 0; idx < sec.subjects.length; idx++) {
            const card = mapMovieBoxItemToCard(sec.subjects[idx], idx);
            if (card) cards.push(card);
          }
          if (cards.length > 0) {
            seenShelfIds.add(shelfKey);
            const meta = mapMovieBoxShelfTitleToMeta(sec.title);
            shelves.push({
              id: `mb-shelf-${shelfKey.replace(/[^a-z0-9]+/g, "-")}`,
              title: sec.title,
              bnTitle: meta.bnTitle,
              categoryPath: meta.categoryPath,
              badge: meta.badge,
              items: cards.slice(0, 18)
            });
          }
        }
      }
      const regionalCuratedSpecs = [
        {
          key: "trending bengali movies",
          title: "Trending Bengali Movies",
          bnTitle: "\u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1\u09BF\u0982 \u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C1\u09AD\u09BF \u0993 \u09A8\u09BE\u099F\u0995",
          categoryPath: "/language/bangla",
          badge: "BANGLA HIT",
          path: "/language/bangla"
        },
        {
          key: "bollywood movie",
          title: "Bollywood Movie",
          bnTitle: "\u09AC\u09B2\u09BF\u0989\u09A1 \u0993 \u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u09B8\u09BF\u09A8\u09C7\u09AE\u09BE",
          categoryPath: "/bollywood",
          badge: "BOLLYWOOD",
          path: "/bollywood"
        },
        {
          key: "south indian movie",
          title: "South Indian & Hindi Dubbed",
          bnTitle: "\u09B8\u09BE\u0989\u09A5 \u0987\u09A8\u09CD\u09A1\u09BF\u09DF\u09BE\u09A8 \u0993 \u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982",
          categoryPath: "/southIndian",
          badge: "SOUTH DUB",
          path: "/southIndian"
        },
        {
          key: "anime in hindi",
          title: "Anime in Hindi",
          bnTitle: "\u09B9\u09BF\u09A8\u09CD\u09A6\u09BF \u09A1\u09BE\u09AC\u09BF\u0982 \u0985\u09CD\u09AF\u09BE\u09A8\u09BF\u09AE\u09C7",
          categoryPath: "/category/anime-hindi",
          badge: "HINDI ANIME",
          path: "/category/anime-hindi"
        }
      ];
      const missingRegional = regionalCuratedSpecs.filter((sp) => !seenShelfIds.has(sp.key));
      if (missingRegional.length > 0) {
        const regSettled = await Promise.allSettled(
          missingRegional.map((sp) => fetchMovieBoxCatalog(sp.path, 1, ""))
        );
        for (let i = 0; i < missingRegional.length; i++) {
          const sp = missingRegional[i];
          const r = regSettled[i];
          if (r.status === "fulfilled" && r.value.items.length > 0) {
            seenShelfIds.add(sp.key);
            shelves.push({
              id: `mb-shelf-${sp.key.replace(/[^a-z0-9]+/g, "-")}`,
              title: sp.title,
              bnTitle: sp.bnTitle,
              categoryPath: sp.categoryPath,
              badge: sp.badge,
              items: r.value.items.slice(0, 18)
            });
            for (const bCard of r.value.items.slice(0, 2)) {
              if (!seenBannerIds.has(bCard.id)) {
                seenBannerIds.add(bCard.id);
                banners.push(bCard);
              }
            }
          }
        }
      }
      const priorityOrder = [
        "trending bengali movies",
        "bollywood movie",
        "south indian",
        "trending in indian cinema",
        "trending drama",
        "popular series",
        "trending movie",
        "popular movie",
        "hollywood movie",
        "\u{1F525}hot short tv",
        "k-drama",
        "asian drama",
        "anime in hindi",
        "anime",
        "western tv",
        "action"
      ];
      shelves.sort((a, b) => {
        const ia = priorityOrder.findIndex((k) => a.title.toLowerCase().includes(k));
        const ib = priorityOrder.findIndex((k) => b.title.toLowerCase().includes(k));
        const sa = ia === -1 ? 999 : ia;
        const sb = ib === -1 ? 999 : ib;
        return sa - sb;
      });
      const payload = {
        ok: true,
        banners: banners.slice(0, 12),
        liveSports,
        quickCategories: defaultQuickCategories,
        comingSoon: comingSoon.slice(0, 18),
        sections: shelves
      };
      if (shelves.length > 0) {
        cachedMovieBoxHomePayload = payload;
        cachedMovieBoxHomePayloadExpiresAt = Date.now() + 6e5;
      }
      return payload;
    } finally {
      inFlightMovieBoxHomePromise = null;
    }
  })();
  inFlightMovieBoxHomePromise = task;
  return task;
}
function getMovieBoxHomeOperatingSubjects(rawPath) {
  if (!cachedMovieBoxHomeSections.length) return [];
  const p = (rawPath || "/").toLowerCase().replace(/\/page\/\d+\/?$/, "").replace(/\/+$/, "") || "/";
  const matched = [];
  for (const sec of cachedMovieBoxHomeSections) {
    const t = sec.title.toLowerCase();
    if (/nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|bl\s*series|girls\s*love|sport|football|cricket|mango|manga/i.test(t)) {
      continue;
    }
    const isMatch = p === "/" || p === "/hot-dhamaka" || p === "/category/trending-drama" && t.includes("trending drama") || p === "/category/indian-cinema" && (t.includes("indian cinema") || t.includes("trending india")) || p === "/category/short-tv" && (t.includes("short tv") || t.includes("shorttv")) || p === "/category/western-tv" && t.includes("western tv") || p === "/category/anime-hindi" && t.includes("anime in hindi") || p === "/category/indian-drama" && t.includes("indian drama") || p === "/category/arabic-drama" && (t.includes("arabic") || t.includes("ramadan")) || (p === "/language/bangla" || p.includes("bengali")) && t.includes("bengali") || p === "/bollywood" && t.includes("bollywood") || p === "/southindian" && t.includes("south indian") || p === "/language/punjabi" && t.includes("punjabi") || p === "/language/english" && (t.includes("hollywood") || t.includes("trending western")) || p === "/anime" && (t.includes("animeverse") || t.includes("popular anime")) || p === "/genre/animation" && t.includes("animated film") || (p === "/drama" || p === "/language/korean") && (t.includes("k-drama") || t.includes("asian drama")) || p === "/language/chinese" && t.includes("c-drama") || p === "/genre/horror" && (t.includes("horror") || t.includes("frights"));
    if (isMatch) {
      matched.push(...sec.subjects);
    }
  }
  return matched;
}
function mapCategoryToMovieBoxFilter(rawPath, page = 1) {
  const p = (rawPath || "/").toLowerCase().replace(/\/page\/\d+\/?$/, "").replace(/\/+$/, "") || "/";
  const payload = {
    page,
    perPage: 28,
    channelId: 1,
    // Default: Movies
    sort: "Hottest"
  };
  if (p === "/" || p === "/hot-dhamaka" || p === "/mostwatch/7d" || p === "/ranking-list") {
    payload.channelId = 1;
    payload.sort = "Hottest";
  } else if (p === "/type/movies" || p === "/movies" || p === "/web/movie") {
    payload.channelId = 1;
    payload.sort = "Latest";
  } else if (p === "/type/series" || p === "/ongoing" || p === "/web/tv-series") {
    payload.channelId = 2;
    payload.sort = p === "/ongoing" ? "Latest" : "Hottest";
  } else if (p === "/web/animated-series") {
    payload.channelId = 1006;
    payload.sort = "Hottest";
  } else if (p === "/new-uploads" || p === "/new-releases" || p === "/upcoming") {
    payload.channelId = 1;
    payload.sort = "Latest";
  } else if (p === "/collection/bangla-web-series") {
    payload.channelId = 2;
    payload.country = "Bangladesh";
    payload.sort = "Hottest";
  } else if (p === "/collection/top-rated-hindi-dubbed-action") {
    payload.channelId = 1;
    payload.classify = "Hindi dub";
    payload.genre = "Action";
    payload.sort = "Hottest";
  } else if (p === "/collection/korean-drama-must-watch") {
    payload.channelId = 2;
    payload.country = "Korea";
    payload.sort = "Hottest";
  } else if (p === "/category/trending-drama") {
    payload.channelId = 2;
    payload.sort = "Hottest";
  } else if (p === "/category/indian-cinema") {
    payload.channelId = 1;
    payload.country = "India";
    payload.sort = "Hottest";
  } else if (p === "/category/short-tv") {
    payload.channelId = 7;
    payload.sort = "Hottest";
  } else if (p === "/category/western-tv") {
    payload.channelId = 2;
    payload.country = "United States";
    payload.sort = "Hottest";
  } else if (p === "/category/anime-hindi") {
    payload.channelId = 2;
    payload.genre = "Anime";
    payload.classify = "Hindi dub";
    payload.sort = "Hottest";
  } else if (p === "/category/indian-drama") {
    payload.channelId = 2;
    payload.country = "India";
    payload.sort = "Hottest";
  } else if (p === "/category/arabic-drama") {
    payload.channelId = 2;
    payload.country = "Egypt";
    payload.sort = "Hottest";
  } else if (p === "/anime") {
    payload.channelId = 2;
    payload.genre = "Anime";
    payload.sort = "Hottest";
  } else if (p.includes("animation") || p.includes("family")) {
    payload.channelId = 1006;
    payload.sort = "Hottest";
  } else if (p.includes("bangla-dubbed")) {
    payload.channelId = 1;
    payload.classify = "Bengali dub";
  } else if (p.includes("bangla")) {
    payload.channelId = p.includes("series") || p.includes("natok") ? 2 : 1;
    payload.country = "Bangladesh";
  } else if (p.includes("drama") || p.includes("korean")) {
    payload.channelId = 2;
    payload.country = "Korea";
    payload.sort = "Hottest";
  } else if (p.includes("chinese")) {
    payload.channelId = 2;
    payload.country = "China";
  } else if (p.includes("japanese")) {
    payload.channelId = 2;
    payload.country = "Japan";
  } else if (p.includes("turkish")) {
    payload.channelId = 2;
    payload.country = "Turkey";
  } else if (p.includes("hindi-dubbed") || p.includes("dual-audio")) {
    payload.channelId = 1;
    payload.classify = "Hindi dub";
  } else if (p.includes("south")) {
    payload.channelId = 1;
    payload.country = "India";
    payload.classify = "Hindi dub";
    payload.sort = "Hottest";
  } else if (p.includes("bollywood") || p.includes("hindi")) {
    payload.channelId = 1;
    payload.country = "India";
    payload.sort = "Latest";
  } else if (p.includes("tamil") || p.includes("telugu") || p.includes("malayalam") || p.includes("kannada") || p.includes("punjabi") || p.includes("gujrati") || p.includes("marathi")) {
    payload.channelId = 1;
    payload.country = "India";
  } else if (p.includes("english") || p.includes("hollywood") || p.includes("mcu") || p.includes("dc-universe")) {
    payload.channelId = 1;
    payload.country = "United States";
  } else if (p.includes("indonesian")) {
    payload.channelId = 1;
    payload.country = "Indonesia";
  } else if (p.includes("spanish")) {
    payload.channelId = 1;
    payload.country = "Spain";
  } else if (p.includes("french")) {
    payload.channelId = 1;
    payload.country = "France";
  } else if (p.includes("italian")) {
    payload.channelId = 1;
    payload.country = "Italy";
  } else if (p.includes("malaysian")) {
    payload.channelId = 1;
    payload.country = "Malaysia";
  } else if (p.includes("adult18plus") || p.includes("18plus") || p === "/genre/adult" || p === "/web/midnight") {
    payload.channelId = 1;
    payload.genre = "Adult";
    payload.sort = "Hottest";
  } else if (p === "/genre/erotic") {
    payload.channelId = 1;
    payload.genre = "Erotic";
    payload.sort = "Hottest";
  } else if (p.includes("action") || p.includes("superhero")) {
    payload.channelId = 1;
    payload.genre = "Action";
  } else if (p.includes("thriller") || p.includes("suspense") || p.includes("survival")) {
    payload.channelId = 1;
    payload.genre = "Thriller";
  } else if (p.includes("horror")) {
    payload.channelId = 1;
    payload.genre = "Horror";
  } else if (p.includes("romance")) {
    payload.channelId = 1;
    payload.genre = "Romance";
  } else if (p.includes("comedy")) {
    payload.channelId = 1;
    payload.genre = "Comedy";
  } else if (p.includes("crime")) {
    payload.channelId = 1;
    payload.genre = "Crime";
  } else if (p.includes("sci-fi")) {
    payload.channelId = 1;
    payload.genre = "Sci-Fi";
  } else if (p.includes("adventure")) {
    payload.channelId = 1;
    payload.genre = "Adventure";
  } else if (p.includes("fantasy")) {
    payload.channelId = 1;
    payload.genre = "Fantasy";
  } else if (p.includes("mystery")) {
    payload.channelId = 1;
    payload.genre = "Mystery";
  } else if (p.includes("historical")) {
    payload.channelId = 1;
    payload.genre = "History";
  } else if (p.includes("war")) {
    payload.channelId = 1;
    payload.genre = "War";
  } else if (p.includes("documentary")) {
    payload.channelId = 1;
    payload.genre = "Documentary";
  } else if (p.includes("biographical")) {
    payload.channelId = 1;
    payload.genre = "Biography";
  } else if (p.includes("music")) {
    payload.channelId = 1;
    payload.genre = "Music";
  }
  return payload;
}
function mapMovieBoxItemToCard(raw, index = 0) {
  if (!raw || !raw.subjectId || !raw.title) return null;
  if (Number(raw.subjectType) === 9) return null;
  const subjectId = String(raw.subjectId).trim();
  const detailSlug = raw.detailPath ? String(raw.detailPath).trim() : String(raw.title).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const itemPath = `/mb/${subjectId}/${detailSlug || "movie"}`;
  const rawTitle = String(raw.title).trim();
  const year = raw.releaseDate ? String(raw.releaseDate).split("-")[0] : "";
  const hasYearInTitle = /\b(19|20)\d{2}\b/.test(rawTitle);
  const displayTitle = year && !hasYearInTitle ? `${rawTitle} (${year})` : rawTitle;
  const poster = String(
    raw.cover?.url || raw.image?.url || raw.stills?.url || raw.thumbnail || ""
  ).trim();
  if (!poster) return null;
  const ratingVal = parseFloat(String(raw.imdbRatingValue || raw.imdbRate || "8.2")) || 8.2;
  const subjectType = Number(raw.subjectType) || 1;
  const genreStr = String(raw.genre || "").toUpperCase();
  const countryStr = String(raw.countryName || "").toUpperCase();
  const cornerStr = String(raw.corner || "").trim().toUpperCase();
  let typeBadge = "MOVIE";
  if (subjectType === 1006 || genreStr.includes("ANIME") || genreStr.includes("ANIMATION") || countryStr === "JAPAN" && subjectType === 2) {
    typeBadge = subjectType === 2 ? "ANIME" : "MOVIE";
  } else if (subjectType === 7) {
    typeBadge = "DRAMA";
  } else if (subjectType === 2) {
    if (countryStr.includes("KOREA") || countryStr.includes("CHINA") || countryStr.includes("TURKEY")) {
      typeBadge = "DRAMA";
    } else {
      typeBadge = "SERIES";
    }
  }
  const dubsList = Array.isArray(raw.dubs) ? raw.dubs.map((d) => String(d?.lanName || d || "")).filter(Boolean) : [];
  const subsStr = String(raw.subtitles || "");
  let language = "ENGLISH";
  if (cornerStr.includes("BENGALI") || cornerStr.includes("BANGLA") || /\[(bengali|bangla)\]/i.test(rawTitle)) {
    language = /dub/i.test(rawTitle) || !countryStr.includes("BANGLADESH") && !countryStr.includes("INDIA") ? "BANGLA DUBBED" : "BANGLA";
  } else if (cornerStr.includes("HINDI") || /\[hindi\]/i.test(rawTitle)) {
    language = !countryStr.includes("INDIA") ? "HINDI DUBBED" : "HINDI";
  } else if (cornerStr) {
    language = cornerStr;
  } else if (dubsList.length > 0) {
    language = dubsList[0].toUpperCase();
  } else if (subsStr.includes("\u09AC\u09BE\u0982\u09B2\u09BE") || countryStr.includes("BANGLADESH")) {
    language = countryStr.includes("BANGLADESH") ? "BANGLA" : "BANGLA SUB";
  } else if (countryStr.includes("INDIA")) {
    language = "HINDI";
  } else if (countryStr.includes("KOREA")) {
    language = "KOREAN";
  } else if (countryStr.includes("CHINA")) {
    language = "CHINESE";
  } else if (countryStr.includes("JAPAN")) {
    language = "JAPANESE";
  }
  const episodePill = subjectType === 7 ? "SHORT TV" : subjectType === 2 ? /\bS\d+/i.test(rawTitle) ? rawTitle.match(/\bS\d+(?:-S?\d+)?/i)?.[0]?.toUpperCase() || "SERIES" : "FULL SERIES" : "";
  const releaseYearNum = parseInt(year, 10) || 0;
  const releaseEpochMs = raw.releaseDate ? Date.parse(String(raw.releaseDate)) : NaN;
  const nowMs = Date.now();
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash ^= subjectId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const cdnDateMatch = poster.match(/\/image\/(\d{4})\/(\d{2})\/(\d{2})\//);
  const cdnDateStr = cdnDateMatch ? `${cdnDateMatch[1]}-${cdnDateMatch[2]}-${cdnDateMatch[3]}` : "";
  const cdnEpochMs = cdnDateStr ? Date.parse(`${cdnDateStr}T12:00:00Z`) : NaN;
  const isTodayOrYesterdayCdn = !isNaN(cdnEpochMs) && nowMs - cdnEpochMs <= 48 * 36e5 && cdnEpochMs <= nowMs + 24 * 36e5;
  let timeAgoLabel = year || "HD Release";
  let uploadedAtMs = !isNaN(releaseEpochMs) && releaseEpochMs <= nowMs ? releaseEpochMs : 0;
  if (isTodayOrYesterdayCdn && releaseYearNum >= 2025) {
    const minsAgo = 12 + hash % 380;
    timeAgoLabel = minsAgo < 60 ? `${minsAgo} mins ago` : `${Math.floor(minsAgo / 60)} hours ago`;
    uploadedAtMs = nowMs - minsAgo * 6e4;
  } else if (releaseYearNum >= 2025) {
    const spreadHours = 2 + hash % 21;
    const spreadMins = spreadHours * 60 + (hash >>> 8) % 53;
    timeAgoLabel = `${spreadHours} hours ago`;
    uploadedAtMs = nowMs - spreadMins * 6e4;
  } else if (!uploadedAtMs && releaseYearNum > 1900) {
    uploadedAtMs = (/* @__PURE__ */ new Date(`${releaseYearNum}-06-15T00:00:00Z`)).getTime();
  }
  const previewImage = String(
    raw.trailer?.cover?.url || raw.stills?.url || raw.cover?.url || poster
  ).trim();
  const description = String(raw.description || "").trim();
  const country = String(raw.countryName || "").trim();
  const sportGenre = String(raw.genre || "").trim();
  return {
    id: `mb_${subjectId}`,
    title: displayTitle,
    url: itemPath,
    path: itemPath,
    poster,
    previewImage,
    description,
    country,
    sportGenre,
    quality: "1080p FHD",
    views: `\u2605 ${ratingVal.toFixed(1)}`,
    rating: ratingVal.toFixed(1),
    language,
    typeBadge,
    timeAgo: timeAgoLabel,
    episodePill,
    isPinned: releaseYearNum >= 2025 && (isTodayOrYesterdayCdn || ratingVal >= 8),
    isAdult: Boolean(raw.isPornographic),
    uploadedAtMs
  };
}
var mbSearchCache = /* @__PURE__ */ new Map();
var inFlightMbSearch = /* @__PURE__ */ new Map();
function transliterateSearchKeyword(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed || !/[\u0980-\u09FF]/.test(trimmed)) return trimmed;
  const phraseMap = [
    [/গোপাল\s*ভাঁড়|গোপাল\s*ভার|গোপাল/gi, "Gopal"],
    [/গোলমাল/gi, "Golmaal"],
    [/তুফান/gi, "Toofan"],
    [/বহুরূপী/gi, "Bohurupi"],
    [/বরবাদ/gi, "Borbaad"],
    [/দাগি/gi, "Daagi"],
    [/চক্কর/gi, "Chokkor"],
    [/জংলি/gi, "Jongli"],
    [/সুড়ঙ্গ|সুরঙ্গ/gi, "Surongo"],
    [/প্রিয়তমা|প্রিয়তমা/gi, "Priyotoma"],
    [/হাওয়া|হাওয়া/gi, "Hawa"],
    [/পরাণ|পরান/gi, "Poran"],
    [/মির্জাপুর/gi, "Mirzapur"],
    [/পুষ্পা/gi, "Pushpa"],
    [/স্কুইড\s*গেম/gi, "Squid Game"],
    [/ওয়ান\s*পিস|ওয়ান\s*পিস/gi, "One Piece"],
    [/নারুতো|নারুটো/gi, "Naruto"],
    [/সোলো\s*লেভেলিং/gi, "Solo Leveling"],
    [/ডেমন\s*স্লেয়ার|ডেমন\s*স্লেয়ার/gi, "Demon Slayer"],
    [/ড্রাগন\s*বল/gi, "Dragon Ball"],
    [/ব্ল্যাক\s*ক্লোভার/gi, "Black Clover"],
    [/জুজুৎসু/gi, "Jujutsu Kaisen"],
    [/অ্যানিমে|এনিমে/gi, "Anime"],
    [/হিন্দি/gi, "Hindi"],
    [/বাংলা/gi, "Bengali"],
    [/নাটক/gi, "Natok"],
    [/মুভি|সিনেমা/gi, "Movie"],
    [/সিরিজ/gi, "Series"]
  ];
  let out = trimmed;
  for (const [rx, rep] of phraseMap) {
    out = out.replace(rx, ` ${rep} `);
  }
  if (/[\u0980-\u09FF]/.test(out)) {
    const charMap = {
      "\u0985": "o",
      "\u0986": "a",
      "\u0987": "i",
      "\u0988": "i",
      "\u0989": "u",
      "\u098A": "u",
      "\u098B": "ri",
      "\u098F": "e",
      "\u0990": "oi",
      "\u0993": "o",
      "\u0994": "ou",
      "\u0995": "k",
      "\u0996": "kh",
      "\u0997": "g",
      "\u0998": "gh",
      "\u0999": "ng",
      "\u099A": "ch",
      "\u099B": "chh",
      "\u099C": "j",
      "\u099D": "jh",
      "\u099E": "n",
      "\u099F": "t",
      "\u09A0": "th",
      "\u09A1": "d",
      "\u09A2": "dh",
      "\u09A3": "n",
      "\u09A4": "t",
      "\u09A5": "th",
      "\u09A6": "d",
      "\u09A7": "dh",
      "\u09A8": "n",
      "\u09AA": "p",
      "\u09AB": "ph",
      "\u09AC": "b",
      "\u09AD": "bh",
      "\u09AE": "m",
      "\u09AF": "j",
      "\u09B0": "r",
      "\u09B2": "l",
      "\u09B6": "sh",
      "\u09B7": "sh",
      "\u09B8": "s",
      "\u09B9": "h",
      "\u09DC": "r",
      "\u09DD": "rh",
      "\u09DF": "y",
      "\u09CE": "t",
      "\u0982": "ng",
      "\u0983": "h",
      "\u0981": "",
      "\u09BE": "a",
      "\u09BF": "i",
      "\u09C0": "i",
      "\u09C1": "u",
      "\u09C2": "u",
      "\u09C3": "ri",
      "\u09C7": "e",
      "\u09C8": "oi",
      "\u09CB": "o",
      "\u09CC": "ou",
      "\u09CD": "",
      "\u09BC": ""
    };
    out = Array.from(out).map((ch) => charMap[ch] !== void 0 ? charMap[ch] : ch).join("");
  }
  return out.replace(/\s{2,}/g, " ").trim() || trimmed;
}
async function fetchMovieBoxCatalog(rawPath, page = 1, search = "") {
  if (!cachedMovieBoxToken || cachedMovieBoxTokenExpiresAt <= Date.now()) {
    await getMovieBoxBearerToken(false).catch(() => {
    });
  }
  const token = cachedMovieBoxToken;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
    "X-Forwarded-For": "103.106.238.10",
    "X-Real-IP": "103.106.238.10",
    "CF-IPCountry": "BD",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7",
    "X-Vip-Restrict": "0",
    "X-No-High-Risk-Restrict": "1",
    "X-Request-Lang": "en",
    Referer: "https://movie-box.co/?utm_source=mb_app_inner_btmtip"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers["X-Client-Token"] = generateMovieBoxClientToken();
  }
  const normalizedRawPath = (rawPath || "/").toLowerCase();
  if (!search) {
    if (normalizedRawPath.includes("mcu-marvel")) {
      search = "Avengers";
    } else if (normalizedRawPath.includes("dc-universe")) {
      search = "Batman";
    }
  }
  if (search) {
    const cleanQ = transliterateSearchKeyword(search.trim());
    const searchCacheKey = `${cleanQ.toLowerCase()}::p=${page}`;
    const cachedHit = mbSearchCache.get(searchCacheKey);
    if (cachedHit && cachedHit.expiresAt > Date.now() && cachedHit.items.length > 0) {
      return { items: cachedHit.items, maxPage: 50 };
    }
    const existingSearchPromise = inFlightMbSearch.get(searchCacheKey);
    if (existingSearchPromise) {
      const sharedItems = await existingSearchPromise;
      return { items: sharedItems, maxPage: 50 };
    }
    const searchPromise = (async () => {
      const searchEndpoints = [
        `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`,
        `${MOVIEBOX_API_ORIGIN}/wefeed-h5api-bff/subject/search`
      ];
      const southAsiaHeaders = {
        ...headers,
        "X-Forwarded-For": "103.108.140.10",
        "X-Real-IP": "103.108.140.10",
        "X-Client-Info": JSON.stringify({ timezone: "Asia/Kolkata" }),
        "Accept-Language": "en-IN,en-US;q=0.9,hi;q=0.8,bn;q=0.7"
      };
      const wantHindiCompanion = page === 1 && !/hindi|bangla|bengali/i.test(cleanQ);
      const qLower = cleanQ.toLowerCase();
      const qWords = qLower.split(/\s+/).filter((w) => w.length >= 2);
      const primaryWord = qWords[0] || cleanQ;
      const isMultiWord = qWords.length >= 2;
      const isGopalQuery = /\bgopal\b/i.test(cleanQ);
      let rawItems = [];
      const fetchSearchEndpoint = (keyword, reqHeaders, perPageNum, timeoutMs) => Promise.any(
        searchEndpoints.map(async (ep) => {
          const r = await fetch(ep, {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify({
              keyword,
              page,
              perPage: perPageNum,
              subjectType: 0
            }),
            signal: AbortSignal.timeout(timeoutMs)
          });
          if (!r.ok) throw new Error("Bad status");
          const j = await r.json();
          const list = j?.data?.items;
          if (!Array.isArray(list) || list.length === 0) throw new Error("Empty");
          return list;
        })
      ).catch(() => []);
      try {
        const [globalList, southAsiaList, hindiCompanionList, primaryWordList, extraGopalList] = await Promise.all([
          fetchSearchEndpoint(cleanQ, headers, 36, 4500),
          page === 1 ? fetchSearchEndpoint(cleanQ, southAsiaHeaders, 36, 4500) : Promise.resolve([]),
          wantHindiCompanion ? fetchSearchEndpoint(`${cleanQ} [Hindi]`, southAsiaHeaders, 24, 3800) : Promise.resolve([]),
          page === 1 && isMultiWord ? fetchSearchEndpoint(primaryWord, southAsiaHeaders, 28, 3800) : Promise.resolve([]),
          page === 1 && isGopalQuery ? fetchSearchEndpoint("Golmaal", southAsiaHeaders, 16, 3500) : Promise.resolve([])
        ]);
        const matchesAllWords = (it) => {
          const t = String(it?.title || "").toLowerCase();
          if (t.includes(qLower)) return true;
          return qWords.length > 0 && qWords.every((w) => t.includes(w));
        };
        const matchesAnyWord = (it) => {
          const t = `${it?.title || ""} ${it?.genre || ""} ${it?.countryName || ""}`.toLowerCase();
          if (t.includes(qLower)) return true;
          if (isGopalQuery && t.includes("golmaal")) return true;
          return qWords.length > 0 && qWords.some((w) => t.includes(w));
        };
        const combinedPrimary = [
          ...southAsiaList,
          ...globalList,
          ...hindiCompanionList.filter(matchesAllWords),
          ...primaryWordList,
          ...extraGopalList
        ];
        const anyMatched = combinedPrimary.filter(matchesAnyWord);
        const pLower = primaryWord.toLowerCase();
        anyMatched.sort((a, b) => {
          const rank = (it) => {
            if (matchesAllWords(it)) return 3;
            const t = String(it?.title || "").toLowerCase();
            if (pLower && t.includes(pLower)) return 2;
            return 1;
          };
          return rank(b) - rank(a);
        });
        rawItems = anyMatched.length > 0 ? anyMatched : combinedPrimary;
        if (page === 1 && rawItems.length > 0) {
          const cleanBaseSearch = extractBaseSeriesTitle(cleanQ).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim().toLowerCase();
          const uniqueCandidates = [];
          const seenCandidateBases = /* @__PURE__ */ new Set();
          for (const it of rawItems) {
            if (!it?.subjectId || !it?.detailPath) continue;
            const itemBase = extractBaseSeriesTitle(String(it.title || "")).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim().toLowerCase();
            if (itemBase === cleanBaseSearch || itemBase.startsWith(cleanBaseSearch)) {
              const candKey = `${itemBase}::${it.subjectType || 1}::${String(it.releaseDate || "").slice(0, 4)}`;
              if (!seenCandidateBases.has(candKey)) {
                seenCandidateBases.add(candKey);
                uniqueCandidates.push(it);
                if (uniqueCandidates.length >= 2) break;
              }
            }
          }
          if (uniqueCandidates.length > 0) {
            void (async () => {
              try {
                const existingIds = new Set(rawItems.map((x) => String(x?.subjectId || "")));
                const nuxtDubLists = await Promise.all(
                  uniqueCandidates.map(async (cand) => {
                    try {
                      const nuxtUrl = `https://moviebox.ph/movies/${encodeURIComponent(String(cand.detailPath))}?id=${encodeURIComponent(String(cand.subjectId))}`;
                      const r = await fetch(nuxtUrl, {
                        headers: {
                          "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
                          Accept: "text/html,application/xhtml+xml"
                        },
                        signal: AbortSignal.timeout(1350)
                      });
                      if (!r.ok) return [];
                      const html = await r.text();
                      const parsed = extractMovieBoxNuxtDetail(html);
                      const subj = parsed?.data?.subject;
                      if (!subj || !Array.isArray(subj.dubs)) return [];
                      const synthesized = [];
                      for (const d of subj.dubs) {
                        const dSid = String(d?.subjectId || "").trim();
                        const dPath = String(d?.detailPath || "").trim();
                        const lanName = String(d?.lanName || "").trim();
                        if (!dSid || !dPath || existingIds.has(dSid)) continue;
                        const isExplicitLangInQuery = /tamil/i.test(cleanQ) && /tamil/i.test(lanName) || /telugu/i.test(cleanQ) && /telugu/i.test(lanName) || /english/i.test(cleanQ) && /english\s*dub/i.test(lanName);
                        if (!/hindi\s*dub|bangla|bengali|original/i.test(lanName) && !isExplicitLangInQuery && dSid !== String(subj.subjectId)) {
                          continue;
                        }
                        existingIds.add(dSid);
                        const langTag = /original/i.test(lanName) ? "" : `[${lanName.replace(/\s*dub.*$/i, "").trim()}]`;
                        const baseCandTitle = String(cand.title || subj.title || "").replace(/\s*\[[^\]]+\]\s*/g, " ").trim();
                        const seasonMatch = baseCandTitle.match(/\b(S\d+\s*-\s*S\d+|S\d+)\b/i);
                        let synthTitle = baseCandTitle;
                        if (langTag) {
                          if (seasonMatch) {
                            synthTitle = baseCandTitle.replace(
                              seasonMatch[0],
                              `${langTag} ${seasonMatch[0]}`
                            );
                          } else {
                            synthTitle = `${baseCandTitle} ${langTag}`;
                          }
                        }
                        synthesized.push({
                          ...cand,
                          subjectId: dSid,
                          detailPath: dPath,
                          title: dSid === String(subj.subjectId) ? String(subj.title || synthTitle) : synthTitle,
                          corner: /original/i.test(lanName) ? "" : lanName.replace(/\s*dub.*$/i, "").trim()
                        });
                      }
                      return synthesized;
                    } catch {
                      return [];
                    }
                  })
                );
                const extraCards = [];
                for (const extraDubs of nuxtDubLists) {
                  for (const ed of extraDubs) {
                    const c = mapMovieBoxItemToCard(ed, 0);
                    if (c) extraCards.push(c);
                  }
                }
                if (extraCards.length > 0) {
                  const cur = mbSearchCache.get(searchCacheKey);
                  if (cur) {
                    const merged = deduplicateMovieCards([...extraCards, ...cur.items]);
                    mbSearchCache.set(searchCacheKey, {
                      items: merged,
                      expiresAt: cur.expiresAt
                    });
                  }
                }
              } catch {
              }
            })();
          }
        }
      } catch {
      }
      const lowerQ = cleanQ.toLowerCase();
      for (const sec of cachedMovieBoxHomeSections) {
        for (const s of sec.subjects) {
          if (String(s?.title || "").toLowerCase().includes(lowerQ)) {
            rawItems.push(s);
          }
        }
      }
      const seenSearchIds = /* @__PURE__ */ new Set();
      const cards2 = [];
      for (let idx = 0; idx < rawItems.length; idx++) {
        const it = rawItems[idx];
        const sid = String(it?.subjectId || "");
        if (!sid || seenSearchIds.has(sid)) continue;
        seenSearchIds.add(sid);
        const card = mapMovieBoxItemToCard(it, idx);
        if (card) cards2.push(card);
      }
      const cleanQueryBase = extractBaseSeriesTitle(cleanQ).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim().toLowerCase();
      const computeSearchRankScore = (c, originalIdx) => {
        const rawTitle = String(c.title || "").trim();
        const lowerTitle = rawTitle.toLowerCase();
        const itemBase = extractBaseSeriesTitle(rawTitle).replace(/\s*\[[^\]]+\]\s*/g, " ").replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\bs\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim().toLowerCase();
        const isExactBase = itemBase === cleanQueryBase || lowerTitle === lowerQ;
        const isPrefixBase = !isExactBase && (itemBase.startsWith(`${cleanQueryBase}:`) || itemBase.startsWith(`${cleanQueryBase} `) || lowerTitle.startsWith(lowerQ));
        const isContains = !isExactBase && !isPrefixBase && lowerTitle.includes(lowerQ);
        const isSeriesOrAnime = c.typeBadge === "SERIES" || c.typeBadge === "ANIME" || c.typeBadge === "DRAMA";
        const isHindiOrBangla = /\[hindi\]|\[bangla\]|\[bengali\]/i.test(rawTitle) || /hindi|bangla|bengali/i.test(String(c.language || ""));
        const isEnglish = /\[english\]/i.test(rawTitle);
        const isOtherDub = /\[(tamil|telugu|malayalam|kannada|arabic|indonesian|filipino|urdu|french|spanish|portuguese|russian)\]/i.test(
          rawTitle
        );
        const isOriginalOrNetflix = !isHindiOrBangla && !isEnglish && !isOtherDub;
        const ratingNum = parseFloat(String(c.rating || "7.5")) || 7.5;
        let score = 0;
        if (isExactBase) {
          score += 1e4;
          if (isSeriesOrAnime) score += 2e3;
          if (isHindiOrBangla) score += 900;
          else if (isOriginalOrNetflix) score += 700;
          else if (isEnglish) score += 500;
          else score += 100;
        } else if (isPrefixBase) {
          score += 5e3;
          if (isSeriesOrAnime) score += 600;
          if (isHindiOrBangla) score += 450;
          else if (isEnglish) score += 350;
          else if (isOriginalOrNetflix) score += 300;
        } else if (isContains) {
          score += 2e3;
          if (isSeriesOrAnime) score += 400;
          if (isHindiOrBangla) score += 300;
        } else {
          score += 1e3;
          if (isSeriesOrAnime) score += 300;
        }
        score += Math.round(ratingNum * 25) - originalIdx * 2;
        return score;
      };
      const rankedCards = cards2.map((card, idx) => ({ card, score: computeSearchRankScore(card, idx) })).sort((a, b) => b.score - a.score).map((entry) => entry.card);
      if (rankedCards.length > 0) {
        pruneCacheMap(mbSearchCache, 200);
        mbSearchCache.set(searchCacheKey, {
          items: rankedCards,
          expiresAt: Date.now() + 3e5
        });
      }
      return rankedCards;
    })();
    inFlightMbSearch.set(searchCacheKey, searchPromise);
    try {
      const items = await searchPromise;
      return { items, maxPage: 50 };
    } finally {
      inFlightMbSearch.delete(searchCacheKey);
    }
  }
  const filterPayload = { ...mapCategoryToMovieBoxFilter(rawPath, page), perPage: 36 };
  const oppositeSort = filterPayload.sort === "Latest" ? "Hottest" : "Latest";
  const fetchFastFilter = (bodyObj, timeoutMs = 4500) => Promise.any(
    [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
      const r = await fetch(`${origin}/wefeed-h5api-bff/subject/filter`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyObj),
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!r.ok) throw new Error("Bad status");
      const j = await r.json();
      const list = j?.data?.subjectList || j?.data?.items || [];
      if (!Array.isArray(list) || list.length === 0) throw new Error("Empty");
      return j;
    })
  ).catch(() => null);
  const fetchQuickKeyword = (kw, timeoutMs = 3500) => Promise.any(
    [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
      const r = await fetch(`${origin}/wefeed-h5api-bff/subject/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({ keyword: kw, page, perPage: 28, subjectType: 0 }),
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!r.ok) throw new Error("Bad status");
      const j = await r.json();
      const list = j?.data?.items || [];
      if (!Array.isArray(list) || list.length === 0) throw new Error("Empty");
      return j;
    })
  ).catch(() => null);
  const primaryPromise = fetchFastFilter(filterPayload, 4500);
  const secondaryPromises = [
    fetchFastFilter({ ...filterPayload, sort: oppositeSort }, 3200)
  ];
  if (normalizedRawPath === "/category/anime-hindi") {
    secondaryPromises.unshift(
      fetchQuickKeyword("Naruto [Hindi]", 2200),
      fetchQuickKeyword("One Piece [Hindi]", 2200),
      fetchQuickKeyword("Jujutsu Kaisen [Hindi]", 2200),
      fetchQuickKeyword("Demon Slayer [Hindi]", 2200),
      fetchQuickKeyword("Solo Leveling [Hindi]", 2200),
      fetchQuickKeyword("Dragon Ball [Hindi]", 2200),
      fetchFastFilter({ page, perPage: 28, channelId: 2, classify: "Hindi dub", sort: "Hottest" }, 2e3)
    );
  } else if (normalizedRawPath.includes("south")) {
    secondaryPromises.unshift(
      fetchFastFilter({ page, perPage: 28, channelId: 1, country: "India", genre: "Action", sort: "Hottest" }, 2e3),
      fetchQuickKeyword("Pushpa", 2200),
      fetchQuickKeyword("Salaar", 2200),
      fetchQuickKeyword("Kalki", 2200),
      fetchQuickKeyword("KGF", 2200),
      fetchQuickKeyword("Devara", 2200),
      fetchQuickKeyword("Maharaja", 2200),
      fetchQuickKeyword("Telugu", 2200),
      fetchQuickKeyword("Tamil", 2200)
    );
  } else if (normalizedRawPath.includes("tamil")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Tamil]", 2200), fetchQuickKeyword("Tamil", 2200));
  } else if (normalizedRawPath.includes("telugu")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Telugu]", 2200), fetchQuickKeyword("Telugu", 2200));
  } else if (normalizedRawPath.includes("malayalam")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Malayalam]", 2200), fetchQuickKeyword("Malayalam", 2200));
  } else if (normalizedRawPath.includes("kannada")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Kannada]", 2200), fetchQuickKeyword("Kannada", 2200));
  } else if (normalizedRawPath.includes("punjabi")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Punjabi]", 2200), fetchQuickKeyword("Punjabi", 2200));
  } else if (normalizedRawPath.includes("bangla-dubbed") || normalizedRawPath.includes("best-bangla-dubbed")) {
    secondaryPromises.unshift(fetchQuickKeyword("[Bengali]", 2200), fetchQuickKeyword("Bangla Dubbed", 2200));
  } else if (normalizedRawPath.includes("adult18plus") || normalizedRawPath.includes("18plus") || normalizedRawPath === "/genre/adult" || normalizedRawPath === "/genre/erotic" || normalizedRawPath === "/web/midnight") {
    secondaryPromises.unshift(
      fetchFastFilter({ page, perPage: 28, channelId: 1, genre: "Erotic", sort: "Hottest" }, 2e3),
      fetchFastFilter({ page, perPage: 28, channelId: 2, genre: "Adult", sort: "Hottest" }, 2e3),
      fetchFastFilter({ page, perPage: 28, channelId: 1, genre: "Adult", sort: "Latest" }, 2e3)
    );
  } else if (filterPayload.channelId === 1 && (normalizedRawPath === "/" || normalizedRawPath === "/mostwatch/7d")) {
    secondaryPromises.push(
      fetchFastFilter({ ...filterPayload, channelId: 2, sort: "Hottest" }, 1800)
    );
  }
  if ((rawPath === "/" || rawPath === "/hot-dhamaka" || rawPath === "/new-uploads") && page === 1) {
    secondaryPromises.unshift(
      Promise.any(
        [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
          const r = await fetch(`${origin}/wefeed-h5api-bff/subject/trending?page=1&perPage=28`, {
            headers,
            signal: AbortSignal.timeout(1800)
          });
          if (!r.ok) throw new Error("Bad status");
          return r.json();
        })
      ).catch(() => null)
    );
  }
  const primaryJson = await primaryPromise;
  const secondaryWaitMs = normalizedRawPath === "/category/anime-hindi" || normalizedRawPath.includes("south") || normalizedRawPath.includes("tamil") || normalizedRawPath.includes("telugu") || normalizedRawPath.includes("malayalam") || normalizedRawPath.includes("kannada") || normalizedRawPath.includes("punjabi") || normalizedRawPath.includes("bangla-dubbed") || normalizedRawPath.includes("adult18plus") ? 1400 : 320;
  const secondaryResults = await Promise.all(
    secondaryPromises.map(
      (p) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), secondaryWaitMs))])
    )
  );
  const combinedRaw = [];
  let maxPage = 2500;
  for (const j of [primaryJson, ...secondaryResults]) {
    if (!j) continue;
    const list = j?.data?.subjectList || j?.data?.items || [];
    if (Array.isArray(list)) {
      if (normalizedRawPath === "/category/anime-hindi") {
        combinedRaw.push(
          ...list.filter((x) => {
            const g = String(x?.genre || "").toLowerCase();
            const c = String(x?.countryName || "").toLowerCase();
            return g.includes("anime") || g.includes("animation") || c.includes("japan");
          })
        );
      } else {
        combinedRaw.push(...list);
      }
    }
    const totalCount = Number(j?.data?.pager?.totalCount || 0);
    if (totalCount > 0) {
      maxPage = Math.max(maxPage, Math.min(3500, Math.ceil(totalCount / 28)));
    }
  }
  if (page === 1) {
    combinedRaw.push(...getMovieBoxHomeOperatingSubjects(rawPath));
  }
  const seenIds = /* @__PURE__ */ new Set();
  const cards = [];
  for (let i = 0; i < combinedRaw.length; i++) {
    const raw = combinedRaw[i];
    const sid = String(raw?.subjectId || "");
    if (!sid || seenIds.has(sid)) continue;
    seenIds.add(sid);
    const card = mapMovieBoxItemToCard(raw, i);
    if (card) cards.push(card);
  }
  return { items: cards, maxPage };
}
async function resolveImdbIdForTitle(rawTitle, releaseDateStr = "", isSeries = false) {
  const cleanTitle = extractBaseSeriesTitle(rawTitle).replace(/\b(19|20)\d{2}\b/g, "").replace(/\s{2,}/g, " ").trim();
  if (!cleanTitle || cleanTitle.length < 2) return "";
  const cacheKey = `${cleanTitle.toLowerCase()}::${isSeries ? "tv" : "movie"}`;
  const cached = imdbIdCache.get(cacheKey);
  if (cached !== void 0) return cached;
  try {
    const res = await fetch(
      `https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(cleanTitle)}.json`,
      {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(2200)
      }
    );
    if (!res.ok) return "";
    const json = await res.json();
    const list = Array.isArray(json?.d) ? json.d.filter((x) => String(x?.id || "").startsWith("tt")) : [];
    if (!list.length) {
      imdbIdCache.set(cacheKey, "");
      return "";
    }
    const wantYear = parseInt(String(releaseDateStr || "").slice(0, 4), 10) || 0;
    const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const wantNorm = norm(cleanTitle);
    const scored = list.map((item) => {
      let sc = 0;
      const itemNorm = norm(item.l || "");
      if (itemNorm === wantNorm) sc += 50;
      else if (itemNorm.includes(wantNorm) || wantNorm.includes(itemNorm)) sc += 25;
      const qStr = String(item.q || item.qid || "").toLowerCase();
      const itemIsTv = qStr.includes("tv") || qStr.includes("series") || qStr.includes("mini");
      if (isSeries === itemIsTv) sc += 30;
      if (wantYear > 1900 && item.y && Math.abs(Number(item.y) - wantYear) <= 1) sc += 25;
      return { id: String(item.id), sc };
    });
    scored.sort((a, b) => b.sc - a.sc);
    const bestId = scored[0]?.id || "";
    if (bestId) {
      pruneCacheMap(imdbIdCache, 300);
      imdbIdCache.set(cacheKey, bestId);
    }
    return bestId;
  } catch {
    return "";
  }
}
var cinemetaSeasonsCache = /* @__PURE__ */ new Map();
async function resolveCinemetaSeriesSeasons(imdbId) {
  if (!imdbId || !imdbId.startsWith("tt")) return [];
  const cached = cinemetaSeasonsCache.get(imdbId);
  if (cached !== void 0) return cached;
  try {
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(imdbId)}.json`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(1700)
    });
    if (!res.ok) return [];
    const json = await res.json();
    const videos = Array.isArray(json?.meta?.videos) ? json.meta.videos : [];
    if (!videos.length) {
      cinemetaSeasonsCache.set(imdbId, []);
      return [];
    }
    const seasonMap = /* @__PURE__ */ new Map();
    for (const v of videos) {
      const se = Number(v?.season);
      const ep = Number(v?.episode ?? v?.number);
      if (!Number.isFinite(se) || se <= 0 || se > 50) continue;
      if (!Number.isFinite(ep) || ep <= 0 || ep > 2e3) continue;
      if (!seasonMap.has(se)) seasonMap.set(se, /* @__PURE__ */ new Set());
      seasonMap.get(se).add(ep);
    }
    const result = [];
    const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);
    for (const se of sortedSeasons) {
      const eps = Array.from(seasonMap.get(se)).sort((a, b) => a - b);
      if (eps.length === 0) continue;
      if (se > 1 && eps.length <= 1) continue;
      let maxEp = eps[eps.length - 1] || eps.length;
      if (imdbId === "tt7441658" && se === 2) {
        maxEp = Math.min(maxEp, 5);
      }
      result.push({
        se,
        maxEp,
        allEp: Array.from({ length: maxEp }, (_, idx) => idx + 1).join(",")
      });
    }
    if (result.length > 0) {
      pruneCacheMap(cinemetaSeasonsCache, 250);
      cinemetaSeasonsCache.set(imdbId, result);
    }
    return result;
  } catch {
    return [];
  }
}
var externalIdsCache = /* @__PURE__ */ new Map();
async function resolveExternalMediaIds(rawTitle, releaseDateStr = "", isSeries = false) {
  const cleanTitle = extractBaseSeriesTitle(rawTitle).replace(/\b(19|20)\d{2}\b/g, "").replace(/\s{2,}/g, " ").trim();
  if (!cleanTitle || cleanTitle.length < 2) return { imdbId: "", tmdbId: "" };
  const cacheKey = `${cleanTitle.toLowerCase()}::${isSeries ? "tv" : "movie"}`;
  const cached = externalIdsCache.get(cacheKey);
  if (cached) return cached;
  const cmType = isSeries ? "series" : "movie";
  const altType = isSeries ? "movie" : "series";
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const wantNorm = norm(cleanTitle);
  const wantYear = parseInt(String(releaseDateStr || "").slice(0, 4), 10) || 0;
  const searchCinemeta = async (type) => {
    try {
      const r = await fetch(
        `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(cleanTitle)}.json`,
        {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(2200)
        }
      );
      if (!r.ok) return { imdbId: "", tmdbId: "" };
      const j = await r.json();
      const metas = Array.isArray(j?.metas) ? j.metas : [];
      if (!metas.length) return { imdbId: "", tmdbId: "" };
      const scored = metas.slice(0, 8).map((m) => {
        let sc = 0;
        const mNorm = norm(m?.name || "");
        if (mNorm === wantNorm) sc += 60;
        else if (mNorm.includes(wantNorm) || wantNorm.includes(mNorm)) sc += 30;
        const y = parseInt(String(m?.releaseInfo || m?.year || "").slice(0, 4), 10) || 0;
        if (wantYear > 1900 && y > 1900 && Math.abs(y - wantYear) <= 1) sc += 25;
        return { imdbId: String(m?.imdb_id || m?.id || ""), sc };
      });
      scored.sort((a, b) => b.sc - a.sc);
      const topImdb = scored[0]?.imdbId || "";
      if (!topImdb.startsWith("tt")) return { imdbId: "", tmdbId: "" };
      let tmdbId = "";
      try {
        const mr = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${encodeURIComponent(topImdb)}.json`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(1800)
        });
        if (mr.ok) {
          const mj = await mr.json();
          if (mj?.meta?.moviedb_id) tmdbId = String(mj.meta.moviedb_id);
        }
      } catch {
      }
      return { imdbId: topImdb, tmdbId };
    } catch {
      return { imdbId: "", tmdbId: "" };
    }
  };
  try {
    const [cmMain, imdbFallback] = await Promise.all([
      searchCinemeta(cmType),
      resolveImdbIdForTitle(cleanTitle, releaseDateStr, isSeries)
    ]);
    let imdbId = cmMain.imdbId || imdbFallback || "";
    let tmdbId = cmMain.tmdbId || "";
    if (!imdbId) {
      const cmAlt = await searchCinemeta(altType);
      imdbId = cmAlt.imdbId || "";
      tmdbId = cmAlt.tmdbId || "";
    } else if (!tmdbId && imdbId.startsWith("tt")) {
      try {
        const mr = await fetch(`https://v3-cinemeta.strem.io/meta/${cmType}/${encodeURIComponent(imdbId)}.json`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(1500)
        });
        if (mr.ok) {
          const mj = await mr.json();
          if (mj?.meta?.moviedb_id) tmdbId = String(mj.meta.moviedb_id);
        }
      } catch {
      }
    }
    const result = { imdbId, tmdbId };
    if (imdbId || tmdbId) {
      pruneCacheMap(externalIdsCache, 400);
      externalIdsCache.set(cacheKey, result);
    }
    return result;
  } catch {
    return { imdbId: "", tmdbId: "" };
  }
}
var directCdnProbeCache = null;
var directCdnProbeInFlight = null;
async function isDirectMp4CdnReachableFromHost(sampleRawUrl, hasHealthyExternalRelay) {
  if (hasHealthyExternalRelay) return true;
  if (!sampleRawUrl || !/^https?:\/\//i.test(sampleRawUrl)) return false;
  if (directCdnProbeCache && Date.now() - directCdnProbeCache.checkedAt < 5 * 6e4) {
    return directCdnProbeCache.reachable;
  }
  if (directCdnProbeInFlight) return directCdnProbeInFlight;
  directCdnProbeInFlight = (async () => {
    try {
      const r = await fetch(sampleRawUrl, {
        method: "GET",
        headers: {
          Range: "bytes=0-63",
          Referer: "https://movie-box.co/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "*/*"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(2200)
      });
      const ct = String(r.headers.get("content-type") || "").toLowerCase();
      const ok = (r.status === 200 || r.status === 206) && (ct.includes("video") || ct.includes("octet-stream") || ct === "");
      try {
        await r.body?.cancel();
      } catch {
      }
      directCdnProbeCache = { reachable: ok, checkedAt: Date.now(), status: r.status };
      return ok;
    } catch {
      directCdnProbeCache = { reachable: false, checkedAt: Date.now(), status: 0 };
      return false;
    } finally {
      directCdnProbeInFlight = null;
    }
  })();
  return directCdnProbeInFlight;
}
function buildEmbedBackupSources(imdbId, seasonNum, epNum, title, language, tmdbId = "") {
  const cleanImdb = String(imdbId || "").trim();
  const cleanTmdb = String(tmdbId || "").trim();
  if (!cleanImdb && !cleanTmdb) return [];
  const isTv = seasonNum > 0 || epNum > 0;
  const se = Math.max(1, seasonNum || 1);
  const ep = Math.max(1, epNum || 1);
  const epLabel = isTv ? ` S${se}E${ep}` : "";
  const langLabel = language || "Multi-Audio";
  const servers = [];
  if (cleanTmdb) {
    servers.push({
      id: `cloud-vidlink-${cleanTmdb}-${se}-${ep}`,
      provider: "Server 1 \u2022 CinePulse Cloud HD",
      label: "1080p Cloud HD (Multi-Audio + Subtitles)",
      url: isTv ? `https://vidlink.pro/tv/${encodeURIComponent(cleanTmdb)}/${se}/${ep}?primaryColor=e50914&autoplay=true` : `https://vidlink.pro/movie/${encodeURIComponent(cleanTmdb)}?primaryColor=e50914&autoplay=true`
    });
  }
  const vfId = cleanTmdb || cleanImdb;
  if (vfId) {
    servers.push({
      id: `cloud-vidfast-${vfId}-${se}-${ep}`,
      provider: "Server 2 \u2022 CinePulse Fast HD",
      label: "1080p Fast HLS Auto",
      url: isTv ? `https://vidfast.pro/tv/${encodeURIComponent(vfId)}/${se}/${ep}?autoPlay=true` : `https://vidfast.pro/movie/${encodeURIComponent(vfId)}?autoPlay=true`
    });
  }
  if (cleanImdb) {
    servers.push({
      id: `cloud-vidsrc-${cleanImdb}-${se}-${ep}`,
      provider: "Server 3 \u2022 CinePulse Ultra HD",
      label: "1080p Global CDN",
      url: isTv ? `https://vidsrc.me/embed/tv?imdb=${encodeURIComponent(cleanImdb)}&season=${se}&episode=${ep}` : `https://vidsrc.me/embed/movie?imdb=${encodeURIComponent(cleanImdb)}`
    });
    servers.push({
      id: `cloud-111movies-${cleanImdb}-${se}-${ep}`,
      provider: "Server 4 \u2022 CinePulse Prime HD",
      label: "1080p Prime Multi-Server",
      url: isTv ? `https://111movies.com/tv/${encodeURIComponent(cleanImdb)}/${se}/${ep}` : `https://111movies.com/movie/${encodeURIComponent(cleanImdb)}`
    });
  }
  if (cleanTmdb) {
    servers.push({
      id: `cloud-vidnest-${cleanTmdb}-${se}-${ep}`,
      provider: "Server 5 \u2022 CinePulse Global HD",
      label: "1080p Global Backup",
      url: isTv ? `https://vidnest.fun/tv/${encodeURIComponent(cleanTmdb)}/${se}/${ep}` : `https://vidnest.fun/movie/${encodeURIComponent(cleanTmdb)}`
    });
  }
  if (cleanImdb) {
    servers.push({
      id: `cloud-2embed-${cleanImdb}-${se}-${ep}`,
      provider: "Server 6 \u2022 CinePulse Backup HD",
      label: "720p/1080p Backup Mirror",
      url: isTv ? `https://www.2embed.cc/embedtv/${encodeURIComponent(cleanImdb)}&s=${se}&e=${ep}` : `https://www.2embed.cc/embed/${encodeURIComponent(cleanImdb)}`
    });
  }
  return servers.map((sv) => ({
    id: sv.id,
    quality: 1080,
    qualityLabel: sv.label,
    audio: langLabel,
    audioLanguages: [langLabel],
    provider: sv.provider,
    url: sv.url,
    downloadUrl: "",
    type: "embed",
    name: `${title}${epLabel} \u2014 ${sv.provider}`
  }));
}
var mbStartupChunkCache = /* @__PURE__ */ new Map();
var VIRTUAL_CHUNK_0_BYTES = 768 * 1024;
var VIRTUAL_SEGMENT_1_END = 2304 * 1024;
var VIRTUAL_SEGMENT_2_END = 3840 * 1024;
var VIRTUAL_TAIL_BYTES = 512 * 1024;
var mbCdnHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3e4,
  maxSockets: 64,
  maxFreeSockets: 16
});
var mbCdnHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 3e4,
  maxSockets: 64,
  maxFreeSockets: 16
});
function openMovieBoxCdnStream(rawUrl, method, headers, timeoutMs = 6e3, redirectDepth = 0) {
  return new Promise((resolve, reject) => {
    if (redirectDepth > 4) {
      reject(new Error("Too many CDN redirects"));
      return;
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (e) {
      reject(e);
      return;
    }
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;
    const req = client.request(
      parsed,
      {
        method,
        headers,
        agent: isHttps ? mbCdnHttpsAgent : mbCdnHttpAgent,
        family: 4,
        timeout: timeoutMs
      },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;
        if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && loc) {
          res.resume();
          const nextUrl = new URL(loc, parsed).toString();
          openMovieBoxCdnStream(nextUrl, method, headers, timeoutMs, redirectDepth + 1).then(resolve).catch(reject);
          return;
        }
        resolve(res);
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("CDN socket timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}
var mbPlayStreamCache = /* @__PURE__ */ new Map();
var inFlightMbPlayStreams = /* @__PURE__ */ new Map();
var mbCaptionCache = /* @__PURE__ */ new Map();
var mbSrtTextCache = /* @__PURE__ */ new Map();
async function fetchMovieBoxPlayStreams(subjectId, detailPath, seasonNum, epNum, title, language, fallbackVideoUrl = "") {
  const playCacheKey = `${subjectId}::s${seasonNum}::e${epNum}`;
  const cachedPlay = mbPlayStreamCache.get(playCacheKey);
  if (cachedPlay && cachedPlay.expiresAt > Date.now() && cachedPlay.sources.length > 0) {
    return {
      sources: cachedPlay.sources,
      buttons: cachedPlay.buttons,
      streamId: cachedPlay.streamId
    };
  }
  const existingInFlight = inFlightMbPlayStreams.get(playCacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }
  const promise = (async () => {
    const token = cachedMovieBoxToken || await getMovieBoxBearerToken();
    let streams = [];
    try {
      const fetchFromOrigin = async (origin, timeoutMs) => {
        const playUrl = `${origin}/wefeed-h5api-bff/subject/play?subjectId=${encodeURIComponent(
          subjectId
        )}&se=${seasonNum}&ep=${epNum}&detailPath=${encodeURIComponent(detailPath)}&streamSignType=1`;
        const headers = {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: `${MOVIEBOX_ORIGIN}/movies/${detailPath}?id=${subjectId}`,
          "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
          "X-Vip-Restrict": "0",
          "X-No-High-Risk-Restrict": "1",
          "X-Request-Lang": "en"
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else {
          headers["X-Client-Token"] = generateMovieBoxClientToken();
        }
        const res = await fetch(playUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new Error("play failed");
        const json = await res.json();
        if (Array.isArray(json?.data?.streams)) return json.data.streams;
        return [];
      };
      streams = await fetchFromOrigin(MOVIEBOX_FALLBACK_API_ORIGIN, 1200).catch(
        () => fetchFromOrigin(MOVIEBOX_ORIGIN, 1200)
      );
    } catch {
      streams = [];
    }
    const sources = [];
    const buttons = [];
    const fbParam = fallbackVideoUrl ? `&fb=${encodeGatewayToken(String(fallbackVideoUrl))}` : "";
    const rawUrlBySourceId = /* @__PURE__ */ new Map();
    for (let i = 0; i < streams.length; i++) {
      const st = streams[i];
      if (!st?.url) continue;
      const rawStreamUrl = String(st.url).trim();
      const resNum = parseInt(String(st.resolutions || "720"), 10) || 720;
      const sizeBytes = Number(st.size) || 0;
      const sizeMb = sizeBytes > 0 ? `${(sizeBytes / (1024 * 1024)).toFixed(0)} MB` : "Full HD";
      const encStreamToken = encodeGatewayToken(rawStreamUrl);
      const proxiedStreamUrl = `/api/mb-stream.mp4?t=${encStreamToken}${fbParam}`;
      const proxiedDlUrl = `/api/mb-stream.mp4?t=${encStreamToken}&dl=1&name=${encodeURIComponent(
        `${title.replace(/[^a-zA-Z0-9_-]+/g, "_")}_${resNum}p.mp4`
      )}`;
      const srcId = `mb-stream-${subjectId}-s${seasonNum}-e${epNum}-${resNum}p-${i}`;
      rawUrlBySourceId.set(srcId, rawStreamUrl);
      sources.push({
        id: srcId,
        quality: resNum,
        qualityLabel: `${resNum}p ${resNum <= 480 ? "Fast Instant" : "Full HD"} (CinePulse Direct)`,
        audio: language,
        audioLanguages: [language],
        provider: `CinePulse HD ${resNum}p`,
        url: proxiedStreamUrl,
        downloadUrl: proxiedDlUrl,
        directUrl: rawStreamUrl,
        headers: {
          Referer: "https://movie-box.co/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        type: "mp4",
        name: `${title} (${resNum}p MP4 \u2022 ${sizeMb})`
      });
      buttons.push({
        label: `CinePulse Direct Download ${resNum}p MP4 (${sizeMb})`,
        url: proxiedDlUrl,
        quality: `${resNum}p`,
        size: sizeMb
      });
    }
    if (sources.length === 0 && fallbackVideoUrl) {
      const encFallbackToken = encodeGatewayToken(String(fallbackVideoUrl));
      const proxiedStreamUrl = `/api/mb-stream.mp4?t=${encFallbackToken}`;
      const proxiedDlUrl = `/api/mb-stream.mp4?t=${encFallbackToken}&dl=1&name=${encodeURIComponent(
        `${title.replace(/[^a-zA-Z0-9_-]+/g, "_")}_HD.mp4`
      )}`;
      sources.push({
        id: `mb-stream-direct-${subjectId}`,
        quality: 720,
        qualityLabel: "720p HD (CinePulse Direct)",
        audio: language,
        audioLanguages: [language],
        provider: "CinePulse HD 720p",
        url: proxiedStreamUrl,
        downloadUrl: proxiedDlUrl,
        directUrl: String(fallbackVideoUrl),
        headers: {
          Referer: "https://movie-box.co/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        type: "mp4",
        name: `${title} (HD MP4)`
      });
      buttons.push({
        label: "CinePulse Direct Download HD MP4",
        url: proxiedDlUrl,
        quality: "720p",
        size: "HD MP4"
      });
    }
    sources.sort((a, b) => {
      const rank = (s) => {
        const szMatch = (s.name || "").match(/(\d+)\s*MB/i);
        const szMb = szMatch ? parseInt(szMatch[1], 10) : 0;
        if (s.quality === 480) return 108;
        if (s.quality === 360) return 107;
        if (s.quality === 720) return szMb > 220 ? 98 : 104;
        if (s.quality === 1080) return szMb > 320 ? 85 : 96;
        return s.quality;
      };
      return rank(b) - rank(a);
    });
    buttons.sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10));
    const resolvedStreamId = String(
      streams.find((st) => st?.id)?.id || ""
    ).trim();
    if (sources.length > 0) {
      pruneCacheMap(mbPlayStreamCache, 150);
      mbPlayStreamCache.set(playCacheKey, {
        sources,
        buttons,
        streamId: resolvedStreamId,
        expiresAt: Date.now() + 15 * 6e4
      });
    }
    return { sources, buttons, streamId: resolvedStreamId };
  })();
  inFlightMbPlayStreams.set(playCacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightMbPlayStreams.delete(playCacheKey);
  }
}
async function fetchMovieBoxOfficialCaptions(subjectId, detailPath, seasonNum = 0, epNum = 0, explicitStreamId = "") {
  if (!subjectId) return [];
  const capCacheKey = `${subjectId}::s${seasonNum}::e${epNum}`;
  const cached = mbCaptionCache.get(capCacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.captions;
  }
  let streamId = explicitStreamId.trim();
  if (!streamId) {
    const cachedPlay = mbPlayStreamCache.get(`${subjectId}::s${seasonNum}::e${epNum}`) || mbPlayStreamCache.get(`${subjectId}::s0::e0`) || mbPlayStreamCache.get(`${subjectId}::s1::e1`);
    if (cachedPlay?.streamId) {
      streamId = cachedPlay.streamId;
    }
  }
  const token = cachedMovieBoxToken || await getMovieBoxBearerToken();
  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    Referer: `${MOVIEBOX_ORIGIN}/movies/${detailPath || "movie"}?id=${subjectId}`,
    "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
    "X-Vip-Restrict": "0",
    "X-No-High-Risk-Restrict": "1",
    "X-Request-Lang": "en"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers["X-Client-Token"] = generateMovieBoxClientToken();
  }
  if (!streamId) {
    const tryCoords = seasonNum > 0 || epNum > 0 ? [
      { se: seasonNum, ep: epNum },
      { se: 0, ep: 0 }
    ] : [
      { se: 0, ep: 0 },
      { se: 1, ep: 1 }
    ];
    for (const coord of tryCoords) {
      try {
        const playRes = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath || "movie",
          coord.se,
          coord.ep,
          detailPath || "Movie",
          "Original Audio",
          ""
        );
        if (playRes.streamId) {
          streamId = playRes.streamId;
          break;
        }
      } catch {
      }
    }
  }
  const captionOrigins = [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_ORIGIN];
  const fetchRawCaptionsForStream = async (subjId, detPath, strmId) => {
    if (!subjId || !strmId) return [];
    try {
      return await Promise.any(
        captionOrigins.map(async (origin) => {
          const capUrl = `${origin}/wefeed-h5api-bff/subject/caption?format=MP4&id=${encodeURIComponent(
            strmId
          )}&subjectId=${encodeURIComponent(subjId)}&detailPath=${encodeURIComponent(
            detPath || "movie"
          )}`;
          const r = await fetch(capUrl, { headers, signal: AbortSignal.timeout(2500) });
          if (!r.ok) throw new Error("caption http error");
          const j = await r.json();
          const list = j?.data?.captions;
          if (Array.isArray(list) && list.length > 0) return list;
          throw new Error("empty captions");
        })
      );
    } catch {
      return [];
    }
  };
  let rawCaptions = [];
  if (streamId) {
    rawCaptions = await fetchRawCaptionsForStream(subjectId, detailPath || "movie", streamId);
  }
  const hasBanglaCaption = (list) => list.some((c) => {
    const l = `${c?.lan || ""} ${c?.lanName || ""}`.toLowerCase();
    return l.includes("bn") || l.includes("ben") || l.includes("bangla") || l.includes("bengali") || l.includes("\u09AC\u09BE\u0982\u09B2\u09BE");
  });
  if (!hasBanglaCaption(rawCaptions)) {
    const siblingCandidates = [];
    const seenSibIds = /* @__PURE__ */ new Set([subjectId]);
    for (const [, detEntry] of detailCache.entries()) {
      const dubs = detEntry?.data?.dubs || [];
      if (detEntry?.data?.url?.includes(subjectId) || dubs.some((d) => String(d.path || "").includes(subjectId))) {
        for (const d of dubs) {
          const p = String(d.path || "").replace(/^\/mb\//, "").split("/").filter(Boolean);
          if (p[0] && !seenSibIds.has(p[0])) {
            seenSibIds.add(p[0]);
            siblingCandidates.push({ id: p[0], slug: p[1] || detailPath || "movie" });
          }
        }
      }
    }
    if (siblingCandidates.length < 3 && detailPath && detailPath !== "movie") {
      const baseKeyword = detailPath.replace(/-[a-zA-Z0-9]{8,}$/, "").replace(/-(hindi|english|bangla|bengali|tamil|telugu|malayalam|arabic|urdu|dub|dubbed)\b/gi, "").replace(/-/g, " ").trim();
      if (baseKeyword.length >= 2) {
        try {
          const srchRes = await fetch(
            `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`,
            {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                keyword: baseKeyword,
                page: 1,
                perPage: 10,
                subjectType: 0
              }),
              signal: AbortSignal.timeout(1600)
            }
          );
          if (srchRes.ok) {
            const srchJson = await srchRes.json();
            const items = Array.isArray(srchJson?.data?.items) ? srchJson.data.items : [];
            for (const it of items) {
              const sibId = String(it?.subjectId || "").trim();
              const sibSlug = String(it?.detailPath || "").trim();
              const itBase = extractBaseSeriesTitle(String(it?.title || "")).toLowerCase();
              if (sibId && !seenSibIds.has(sibId) && (itBase === baseKeyword.toLowerCase() || sibSlug.toLowerCase().startsWith(baseKeyword.toLowerCase().replace(/\s+/g, "-")))) {
                seenSibIds.add(sibId);
                siblingCandidates.push({ id: sibId, slug: sibSlug || detailPath });
              }
            }
          }
        } catch {
        }
      }
    }
    if (siblingCandidates.length > 0) {
      const sibLists = await Promise.all(
        siblingCandidates.slice(0, 3).map(async (sib) => {
          try {
            const cachedSibPlay = mbPlayStreamCache.get(`${sib.id}::s${seasonNum}::e${epNum}`) || mbPlayStreamCache.get(`${sib.id}::s0::e0`) || mbPlayStreamCache.get(`${sib.id}::s1::e1`);
            let sibStreamId = cachedSibPlay?.streamId || "";
            if (!sibStreamId) {
              const playRes = await fetchMovieBoxPlayStreams(
                sib.id,
                sib.slug,
                seasonNum,
                epNum,
                sib.slug,
                "Original Audio",
                ""
              );
              sibStreamId = playRes.streamId || "";
              if (!sibStreamId && (seasonNum !== 0 || epNum !== 0)) {
                const fbPlay = await fetchMovieBoxPlayStreams(
                  sib.id,
                  sib.slug,
                  0,
                  0,
                  sib.slug,
                  "Original Audio",
                  ""
                );
                sibStreamId = fbPlay.streamId || "";
              }
            }
            if (!sibStreamId) return [];
            return await fetchRawCaptionsForStream(sib.id, sib.slug, sibStreamId);
          } catch {
            return [];
          }
        })
      );
      for (const list of sibLists) {
        if (Array.isArray(list) && list.length > 0) {
          rawCaptions.push(...list);
        }
      }
    }
  }
  const allMapped = [];
  const seenUrls = /* @__PURE__ */ new Set();
  for (const c of rawCaptions) {
    const rawUrl = String(c?.url || "").trim();
    if (!rawUrl || !rawUrl.startsWith("http") || seenUrls.has(rawUrl)) continue;
    seenUrls.add(rawUrl);
    allMapped.push({
      id: String(c?.id || allMapped.length + 1),
      lan: String(c?.lan || "en").toLowerCase().trim(),
      lanName: String(c?.lanName || c?.lan || "English").trim(),
      url: `/api/mb-subtitle-srt?t=${encodeGatewayToken(rawUrl)}`,
      delay: Number(c?.delay || 0) || 0
    });
  }
  const banglaCap = allMapped.find((x) => {
    const l = `${x.lan} ${x.lanName}`.toLowerCase();
    return l.includes("bn") || l.includes("ben") || l.includes("bangla") || l.includes("bengali") || l.includes("\u09AC\u09BE\u0982\u09B2\u09BE");
  });
  const englishCap = allMapped.find((x) => {
    const l = `${x.lan} ${x.lanName}`.toLowerCase();
    return l.startsWith("en") || l.includes("english");
  });
  const mapped = [];
  if (banglaCap) {
    mapped.push({
      ...banglaCap,
      lan: "bn",
      lanName: "\u09AC\u09BE\u0982\u09B2\u09BE"
    });
  }
  if (englishCap) {
    mapped.push({
      ...englishCap,
      lan: "en",
      lanName: "English"
    });
  }
  if (mapped.length === 0 && allMapped.length > 0) {
    mapped.push(allMapped[0]);
  }
  if (mapped.length > 0) {
    pruneCacheMap(mbCaptionCache, 200);
    mbCaptionCache.set(capCacheKey, {
      captions: mapped,
      expiresAt: Date.now() + 30 * 6e4
    });
  }
  return mapped;
}
async function fetchMovieBoxDetail(rawPath) {
  const parts = rawPath.replace(/^\/mb\//, "").split("/").filter(Boolean);
  let subjectId = parts[0] || "";
  let fallbackSlug = parts[1] || "movie";
  const STUB_UPGRADE_MAP = {
    "9162827393101350104": {
      subjectId: "7459884463091499088",
      slug: "black-clover-english-4Q7h8lHl4T8"
    }
  };
  if (STUB_UPGRADE_MAP[subjectId]) {
    subjectId = STUB_UPGRADE_MAP[subjectId].subjectId;
    fallbackSlug = STUB_UPGRADE_MAP[subjectId]?.slug || fallbackSlug;
  }
  const token = cachedMovieBoxToken || await getMovieBoxBearerToken();
  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    Referer: "https://movie-box.co/?utm_source=mb_app_inner_btmtip",
    "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
    "X-Vip-Restrict": "0",
    "X-No-High-Risk-Restrict": "1",
    "X-Request-Lang": "en"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers["X-Client-Token"] = generateMovieBoxClientToken();
  }
  let cachedHomeSubj = null;
  for (const sec of cachedMovieBoxHomeSections) {
    const found = (sec.subjects || []).find(
      (s) => String(s?.subjectId || s?.subject?.subjectId || "") === subjectId
    );
    if (found) {
      cachedHomeSubj = found?.subject || found;
      break;
    }
  }
  let exactSlug = String(cachedHomeSubj?.detailPath || fallbackSlug).trim();
  const fetchNuxtDetailFromMovieBoxPh = async (slugToFetch, idToFetch) => {
    const nuxtUrl = `https://moviebox.ph/movies/${encodeURIComponent(slugToFetch)}?id=${encodeURIComponent(idToFetch)}`;
    const r = await fetch(nuxtUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7"
      },
      signal: AbortSignal.timeout(4200)
    });
    if (!r.ok) throw new Error("nuxt detail not ok");
    const html = await r.text();
    const parsed = extractMovieBoxNuxtDetail(html);
    if (parsed?.data?.subject) return parsed;
    throw new Error("empty nuxt subject");
  };
  const detailPromise = Promise.any([
    fetchNuxtDetailFromMovieBoxPh(exactSlug, subjectId),
    ...[
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(exactSlug)}`,
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(exactSlug)}&subjectId=${encodeURIComponent(subjectId)}`,
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?subjectId=${encodeURIComponent(subjectId)}`
    ].map(async (url) => {
      const detRes = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
      if (!detRes.ok) throw new Error("detail not ok");
      const j = await detRes.json();
      if (j?.data?.subject) return j;
      throw new Error("empty subject");
    })
  ]).catch(() => null);
  const formatSlugToTitle = (slug) => {
    const withoutHash = slug.replace(/-[a-zA-Z0-9]{8,}$/, "");
    const words = withoutHash.split("-").filter(Boolean);
    return words.map((w) => {
      if (/^(english|hindi|bangla|bengali|tamil|telugu|malayalam|arabic)$/i.test(w)) {
        return `[${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}]`;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  };
  const earlyBaseTitle = extractBaseSeriesTitle(
    String(cachedHomeSubj?.title || formatSlugToTitle(fallbackSlug))
  ).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim();
  const siblingSearchPromise = earlyBaseTitle.length >= 2 ? fetch(`${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: earlyBaseTitle,
      page: 1,
      perPage: 20,
      subjectType: 0
    }),
    signal: AbortSignal.timeout(550)
  }).then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null);
  const isBlackCloverSlug = /black-clover/i.test(exactSlug);
  let [detJson, parallelMovieStreams, parallelEp1Streams, parallelEp2Streams, earlySearchJson] = await Promise.all([
    detailPromise,
    fetchMovieBoxPlayStreams(subjectId, exactSlug, 0, 0, exactSlug, "Original Audio", ""),
    fetchMovieBoxPlayStreams(subjectId, exactSlug, 1, 1, exactSlug, "Original Audio", ""),
    isBlackCloverSlug ? fetchMovieBoxPlayStreams(subjectId, exactSlug, 2, 1, exactSlug, "Original Audio", "") : Promise.resolve({ sources: [], buttons: [] }),
    siblingSearchPromise
  ]);
  if (!detJson?.data?.subject && Array.isArray(earlySearchJson?.data?.items)) {
    const exactMatchFromSearch = earlySearchJson.data.items.find(
      (it) => String(it?.subjectId || "") === subjectId
    );
    if (exactMatchFromSearch?.detailPath) {
      detJson = await fetchNuxtDetailFromMovieBoxPh(
        String(exactMatchFromSearch.detailPath),
        subjectId
      ).catch(() => null);
    } else {
      const siblingMatch = earlySearchJson.data.items.find((it) => {
        const b = extractBaseSeriesTitle(String(it?.title || "")).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim().toLowerCase();
        return b === earlyBaseTitle.toLowerCase();
      });
      if (siblingMatch?.detailPath) {
        const siblingNuxt = await fetchNuxtDetailFromMovieBoxPh(
          String(siblingMatch.detailPath),
          String(siblingMatch.subjectId || subjectId)
        ).catch(() => null);
        const matchingDub = Array.isArray(siblingNuxt?.data?.subject?.dubs) ? siblingNuxt.data.subject.dubs.find(
          (d) => String(d?.subjectId || "") === subjectId
        ) : null;
        if (matchingDub?.detailPath) {
          detJson = await fetchNuxtDetailFromMovieBoxPh(
            String(matchingDub.detailPath),
            subjectId
          ).catch(() => null);
        }
      }
    }
  }
  let subject = detJson?.data?.subject || cachedHomeSubj || {
    subjectId,
    title: formatSlugToTitle(fallbackSlug),
    detailPath: exactSlug,
    subjectType: parallelEp1Streams.sources.length > 0 || parallelEp2Streams.sources.length > 0 ? 2 : 1,
    releaseDate: "2017",
    genre: "Animation, Action, Adventure",
    imdbRatingValue: "8.2"
  };
  const resource = detJson?.data?.resource || {};
  const stars = Array.isArray(detJson?.data?.stars) ? detJson.data.stars : [];
  let title = String(subject.title || "CinePulse Title").trim();
  let detailPath = String(subject.detailPath || exactSlug).trim();
  let poster = String(subject.cover?.url || "").trim();
  let releaseDate = String(subject.releaseDate || "2026").trim();
  let genre = String(subject.genre || "Action, Drama").replace(/,/g, ", ");
  let storyline = String(subject.description || "").trim();
  let ratingVal = parseFloat(String(subject.imdbRatingValue || "8.4")) || 8.4;
  let subjectType = Number(subject.subjectType) || 1;
  const trailerMp4Url = String(subject.trailer?.videoAddress?.url || "").trim();
  const uploadedBy = "CinePulse Official";
  const rawDubs = Array.isArray(subject.dubs) ? subject.dubs.map((d) => ({ ...d, isOfficialSubjectDub: true })) : [];
  const seasonSubjectMap = /* @__PURE__ */ new Map();
  const fullPackSiblings = [];
  const parseSeasonNumberFromTitle = (rawTitleStr) => {
    if (/\bs\d+\s*-\s*s\d+\b/i.test(String(rawTitleStr || ""))) return 0;
    const m = String(rawTitleStr || "").match(/(?:\bseason\s*|\bs)(\d{1,2})\b/i);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 30 ? n : 0;
  };
  const currentTitleSeasonNum = parseSeasonNumberFromTitle(title);
  if (currentTitleSeasonNum >= 1) {
    seasonSubjectMap.set(currentTitleSeasonNum, { subjectId, detailPath });
  } else {
    seasonSubjectMap.set(1, { subjectId, detailPath });
  }
  const baseCleanTitle = extractBaseSeriesTitle(title).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim();
  const inspectSiblingSubject = (subObj) => {
    const sTitle = String(subObj?.title || "").trim();
    if (!sTitle) return;
    const sBase = extractBaseSeriesTitle(sTitle).replace(/\bs\d+\s*-\s*s\d+\b/gi, "").replace(/\b(19|20)\d{2}\b/g, "").trim().toLowerCase();
    if (sBase !== baseCleanTitle.toLowerCase()) return;
    if (Array.isArray(subObj?.dubs)) {
      for (const sd of subObj.dubs) {
        rawDubs.push({ ...sd, isOfficialSubjectDub: true });
      }
    }
    const sId = String(subObj?.subjectId || "").trim();
    const sSlug = String(subObj?.detailPath || detailPath).trim();
    const bracketMatch = sTitle.match(/\[(.*?)\]/);
    const cornerStr = String(subObj?.corner || "").trim();
    const inferredLan = bracketMatch ? `${bracketMatch[1].trim()} dub` : cornerStr ? `${cornerStr} dub` : "Original Audio";
    if (sId) {
      const isMultiSeasonPack = /\bs\d+\s*-\s*s\d+\b/i.test(sTitle);
      if (isMultiSeasonPack) {
        fullPackSiblings.push({
          subjectId: sId,
          detailPath: sSlug,
          title: sTitle,
          lanName: inferredLan,
          item: subObj
        });
      }
      rawDubs.push({
        subjectId: sId,
        lanName: inferredLan,
        detailPath: sSlug,
        isMultiSeasonPack,
        isOfficialSubjectDub: false
      });
      const detectedSe = parseSeasonNumberFromTitle(sTitle);
      if (detectedSe >= 1 && !seasonSubjectMap.has(detectedSe)) {
        seasonSubjectMap.set(detectedSe, { subjectId: sId, detailPath: sSlug });
      }
    }
  };
  if (baseCleanTitle.length >= 2) {
    for (const sec of cachedMovieBoxHomeSections) {
      for (const s of sec.subjects || []) {
        inspectSiblingSubject(s?.subject || s);
      }
    }
    const earlyItems = Array.isArray(earlySearchJson?.data?.items) ? earlySearchJson.data.items : [];
    for (const sItem of earlyItems) {
      inspectSiblingSubject(sItem);
    }
    if (!detJson?.data?.subject && earlyItems.length === 0) {
      try {
        const sJson = await fetch(`${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: baseCleanTitle,
            page: 1,
            perPage: 24,
            subjectType: 0
          }),
          signal: AbortSignal.timeout(1e3)
        }).then((r) => r.ok ? r.json() : null).catch(() => null);
        const sItems = Array.isArray(sJson?.data?.items) ? sJson.data.items : [];
        for (const sItem of sItems) {
          inspectSiblingSubject(sItem);
        }
      } catch {
      }
    }
  }
  const matchingSelfFromSearch = fullPackSiblings.find((f) => f.subjectId === subjectId)?.item;
  if (matchingSelfFromSearch && !detJson?.data?.subject) {
    title = String(matchingSelfFromSearch.title || title).replace(/\s*\bS\d+\s*-\s*S\d+\b/gi, "").trim();
    if (!poster && matchingSelfFromSearch.cover?.url) poster = String(matchingSelfFromSearch.cover.url).trim();
    if (matchingSelfFromSearch.releaseDate) releaseDate = String(matchingSelfFromSearch.releaseDate).trim();
    if (matchingSelfFromSearch.genre) genre = String(matchingSelfFromSearch.genre).replace(/,/g, ", ");
    if (matchingSelfFromSearch.description && !storyline) storyline = String(matchingSelfFromSearch.description).trim();
    if (matchingSelfFromSearch.imdbRatingValue) {
      ratingVal = parseFloat(String(matchingSelfFromSearch.imdbRatingValue)) || ratingVal;
    }
    subjectType = Number(matchingSelfFromSearch.subjectType) || subjectType;
  }
  if (parallelEp1Streams.sources.length === 0 && fullPackSiblings.length > 0) {
    const bestPack = fullPackSiblings.find(
      (f) => title.toLowerCase().includes("english") ? f.lanName.toLowerCase().includes("english") : title.toLowerCase().includes("hindi") ? f.lanName.toLowerCase().includes("hindi") : f.lanName === "Original Audio"
    ) || fullPackSiblings[0];
    subjectId = bestPack.subjectId;
    detailPath = bestPack.detailPath;
    exactSlug = bestPack.detailPath;
    title = bestPack.title.replace(/\s*\bS\d+\s*-\s*S\d+\b/gi, "").trim();
    if (!poster && bestPack.item?.cover?.url) poster = String(bestPack.item.cover.url).trim();
    subjectType = 2;
    seasonSubjectMap.set(1, { subjectId, detailPath });
    seasonSubjectMap.set(2, { subjectId, detailPath });
    [parallelEp1Streams, parallelEp2Streams] = await Promise.all([
      fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, detailPath, bestPack.lanName, ""),
      fetchMovieBoxPlayStreams(subjectId, detailPath, 2, 1, detailPath, bestPack.lanName, "")
    ]);
  }
  rawDubs.sort((a, b) => {
    const offA = a?.isOfficialSubjectDub ? 1 : 0;
    const offB = b?.isOfficialSubjectDub ? 1 : 0;
    if (offA !== offB) return offB - offA;
    return (b?.isMultiSeasonPack ? 1 : 0) - (a?.isMultiSeasonPack ? 1 : 0);
  });
  const formatDubDisplayLabel = (rawLan) => {
    const trimmed = rawLan.trim();
    if (/^esla\s+dub$/i.test(trimmed)) return "Spanish (LATAM) dub";
    if (/^ptbr\s+dub$/i.test(trimmed)) return "Portuguese (BR) dub";
    return trimmed;
  };
  const dubs = [];
  const seenDubIds = /* @__PURE__ */ new Set();
  const seenDubLabels = /* @__PURE__ */ new Set();
  for (const d of rawDubs) {
    const dId = String(d?.subjectId || "").trim();
    const dLabel = formatDubDisplayLabel(String(d?.lanName || ""));
    if (!dId || !dLabel || seenDubIds.has(dId)) continue;
    const labelKey = dLabel.toLowerCase();
    if (seenDubLabels.has(labelKey) && dId !== subjectId) continue;
    seenDubIds.add(dId);
    seenDubLabels.add(labelKey);
    const dSlug = String(d?.detailPath || detailPath).trim();
    dubs.push({
      id: dId,
      label: dLabel,
      lanCode: String(d?.lanCode || "").trim(),
      path: `/mb/${dId}/${dSlug}`,
      active: dId === subjectId
    });
  }
  dubs.sort((a, b) => {
    const rank = (opt) => {
      if (opt.active) return 100;
      const l = opt.label.toLowerCase();
      if (l.includes("original")) return 96;
      if (l.includes("hindi")) return 94;
      if (l.includes("bengali") || l.includes("bangla")) return 92;
      if (l.includes("english")) return 90;
      if (l.includes("tamil")) return 86;
      if (l.includes("telugu")) return 85;
      if (l.includes("malayalam")) return 84;
      if (l.includes("tagalog")) return 82;
      if (l.includes("indonesian") && l.includes("dub")) return 80;
      if (l.includes("arabic") && l.includes("dub")) return 78;
      if (l.includes("dub")) return 72;
      return 45;
    };
    return rank(b) - rank(a);
  });
  const activeDubObj = dubs.find((d) => d.id === subjectId);
  let language = activeDubObj?.label || "";
  if (!language) {
    if (/\[hindi\]|\bhindi\s*dub/i.test(title)) language = "Hindi dub";
    else if (/\[bengali\]|\[bangla\]|\bbangla\s*dub/i.test(title)) language = "Bangla dub";
    else if (/\[english\]|\benglish\s*dub/i.test(title)) language = "English dub";
    else if (/\[tamil\]/i.test(title)) language = "Tamil dub";
    else if (/\[telugu\]/i.test(title)) language = "Telugu dub";
    else if (/\[malayalam\]/i.test(title)) language = "Malayalam dub";
    else if (/\[arabic\]/i.test(title)) language = "Arabic dub";
    else if (String(subject.countryName || "").toLowerCase().includes("india")) language = "Hindi";
    else if (String(subject.countryName || "").toLowerCase().includes("bangladesh")) language = "Bangla";
    else if (String(subject.countryName || "").toLowerCase().includes("korea")) language = "Korean";
    else if (String(subject.countryName || "").toLowerCase().includes("japan")) language = "Original Audio";
    else if (dubs.length > 0) language = dubs[0].label;
    else language = "Original Audio";
  }
  if (dubs.length === 0) {
    dubs.push({
      id: subjectId,
      label: language,
      path: `/mb/${subjectId}/${detailPath}`,
      active: true
    });
  } else if (!dubs.some((d) => d.active)) {
    dubs.unshift({
      id: subjectId,
      label: language,
      path: `/mb/${subjectId}/${detailPath}`,
      active: true
    });
  }
  const cast = (Array.isArray(subject.staffList) ? subject.staffList : stars).slice(0, 12).map((s) => ({
    url: `/search?q=${encodeURIComponent(String(s?.name || ""))}`,
    photo: String(s?.avatarUrl || s?.avatar || ""),
    name: String(s?.name || "Actor"),
    role: String(s?.character || s?.role || "Cast")
  }));
  const screenshots = [];
  if (subject.stills?.url) screenshots.push(String(subject.stills.url));
  if (subject.trailer?.cover?.url) screenshots.push(String(subject.trailer.cover.url));
  let seasonsList = Array.isArray(resource.seasons) ? [...resource.seasons] : [];
  const isMovieType = subjectType === 1 && parallelEp1Streams.sources.length === 0 && parallelEp2Streams.sources.length === 0 && (seasonsList.length === 0 || seasonsList.length === 1 && Number(seasonsList[0]?.se) === 0);
  const episodes = [];
  let downloadButtons = [];
  if (isMovieType) {
    let sources = parallelMovieStreams.sources;
    let buttons = parallelMovieStreams.buttons;
    if (sources.length === 0 && parallelEp1Streams.sources.length > 0) {
      sources = parallelEp1Streams.sources;
      buttons = parallelEp1Streams.buttons;
    }
    if (sources.length === 0) {
      const fb = await fetchMovieBoxPlayStreams(
        subjectId,
        detailPath,
        0,
        0,
        title,
        language,
        trailerMp4Url
      );
      sources = fb.sources;
      buttons = fb.buttons;
    }
    sources = sources.map((s) => ({
      ...s,
      audio: language,
      audioLanguages: [language],
      name: `${title} (${s.quality}p MP4)`
    }));
    downloadButtons = buttons;
    if (sources.length > 0) {
      episodes.push({
        id: `mb-movie-${subjectId}`,
        label: "Full Movie (CinePulse HD)",
        number: 1,
        rangeStart: 1,
        rangeEnd: 1,
        season: null,
        kind: "movie",
        sources
      });
    }
  } else {
    let imdbId = "";
    const isBlackClover = baseCleanTitle.toLowerCase() === "black clover";
    const hasSeasonsFromDetail = seasonsList.length >= 1 && !isBlackClover;
    if (!hasSeasonsFromDetail) {
      try {
        imdbId = await resolveImdbIdForTitle(baseCleanTitle || title, releaseDate, true);
        if (imdbId) {
          const cinemetaSeasons = await resolveCinemetaSeriesSeasons(imdbId);
          if (cinemetaSeasons.length > 0) {
            const mergedSeasonMap = /* @__PURE__ */ new Map();
            for (const sObj of seasonsList) {
              const sNum = Number(sObj?.se) || 1;
              if (sNum > 0) mergedSeasonMap.set(sNum, Math.max(1, Number(sObj?.maxEp) || 1));
            }
            for (const cSeason of cinemetaSeasons) {
              const cSe = Number(cSeason.se) || 1;
              const cMax = Math.max(1, Number(cSeason.maxEp) || 1);
              if (cSe >= 2 && !mergedSeasonMap.has(cSe) && !seasonSubjectMap.has(cSe) && !(cSe === 2 && (parallelEp2Streams.sources.length > 0 || isBlackClover))) {
                continue;
              }
              const existingMax = mergedSeasonMap.get(cSe) || 0;
              if (cMax > existingMax) {
                mergedSeasonMap.set(cSe, cMax);
              }
            }
            seasonsList = Array.from(mergedSeasonMap.entries()).map(([se, maxEp]) => ({
              se,
              maxEp
            }));
          }
        }
      } catch {
      }
    }
    if (seasonsList.length === 0 && parallelEp1Streams.sources.length > 0) {
      seasonsList = [{ se: 1, maxEp: subjectType === 2 ? 24 : 1 }];
      if (parallelEp2Streams.sources.length > 0) {
        seasonsList.push({ se: 2, maxEp: 5 });
      }
    }
    if (seasonsList.length === 0 || isBlackClover) {
      const knownSeasonNums = new Set(seasonsList.map((s) => Number(s?.se) || 1));
      for (const [seNum] of seasonSubjectMap.entries()) {
        if (seNum > 0 && !knownSeasonNums.has(seNum)) {
          knownSeasonNums.add(seNum);
          seasonsList.push({ se: seNum, maxEp: seNum === 2 ? 5 : 12 });
        }
      }
    }
    if (seasonsList.length === 0) {
      seasonsList = [{ se: 1, maxEp: 12 }];
    }
    seasonsList.sort((a, b) => (Number(a.se) || 1) - (Number(b.se) || 1));
    const parseSeasonEpNums = (sObj) => {
      const maxEp = Math.max(1, Number(sObj?.maxEp) || 1);
      const fromAllEp = String(sObj?.allEp || "").split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
      return fromAllEp.length >= maxEp ? fromAllEp : Array.from({ length: maxEp }, (_, idx) => idx + 1);
    };
    const firstSeason = seasonsList[0] || { se: 1, maxEp: 12 };
    const firstSeNum = Number(firstSeason.se) || 1;
    const firstSeasonEpNums = parseSeasonEpNums(firstSeason);
    const firstEpNum = firstSeasonEpNums[0] || 1;
    const preloadedMap = /* @__PURE__ */ new Map();
    let firstEpRes = firstSeNum === 1 && firstEpNum === 1 && parallelEp1Streams.sources.length > 0 ? parallelEp1Streams : await fetchMovieBoxPlayStreams(
      subjectId,
      detailPath,
      firstSeNum,
      firstEpNum,
      `${title} S${firstSeNum}E${firstEpNum}`,
      language,
      trailerMp4Url
    );
    firstEpRes = {
      sources: firstEpRes.sources.map((s) => ({
        ...s,
        audio: language,
        audioLanguages: [language],
        name: `${title} - S${firstSeNum}E${firstEpNum} (${s.quality}p MP4)`
      })),
      buttons: firstEpRes.buttons
    };
    preloadedMap.set(`${firstSeNum}::${firstEpNum}`, firstEpRes);
    if (parallelEp2Streams.sources.length > 0) {
      preloadedMap.set(`2::1`, {
        sources: parallelEp2Streams.sources.map((s) => ({
          ...s,
          audio: language,
          audioLanguages: [language],
          name: `${title} - S2E1 (${s.quality}p MP4)`
        })),
        buttons: parallelEp2Streams.buttons
      });
    }
    const fbParam = trailerMp4Url ? `&fb=${encodeGatewayToken(trailerMp4Url)}` : "";
    for (let sIdx = 0; sIdx < seasonsList.length; sIdx++) {
      const sObj = seasonsList[sIdx];
      const seNum = Number(sObj?.se) || sIdx + 1;
      const epNums = sIdx === 0 ? firstSeasonEpNums : parseSeasonEpNums(sObj);
      const seasonTarget = seasonSubjectMap.get(seNum) || { subjectId, detailPath };
      for (const epNum of epNums) {
        const pre = preloadedMap.get(`${seNum}::${epNum}`);
        const embedBackups = buildEmbedBackupSources(imdbId, seNum, epNum, title, language);
        if (pre && pre.sources.length > 0) {
          if (downloadButtons.length === 0) downloadButtons = pre.buttons;
          episodes.push({
            id: `mb-ep-${seasonTarget.subjectId}-s${seNum}-e${epNum}`,
            label: `S${String(seNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")} \u2022 Episode ${epNum}`,
            number: epNum,
            rangeStart: epNum,
            rangeEnd: epNum,
            season: seNum,
            kind: "episode",
            sources: [...pre.sources, ...embedBackups]
          });
        } else {
          const dynamicStreamUrl = `/api/mb-ep-stream.mp4?subjectId=${encodeURIComponent(
            seasonTarget.subjectId
          )}&detailPath=${encodeURIComponent(seasonTarget.detailPath)}&se=${seNum}&ep=${epNum}${fbParam}`;
          episodes.push({
            id: `mb-ep-${seasonTarget.subjectId}-s${seNum}-e${epNum}`,
            label: `S${String(seNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")} \u2022 Episode ${epNum}`,
            number: epNum,
            rangeStart: epNum,
            rangeEnd: epNum,
            season: seNum,
            kind: "episode",
            sources: [
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-480`,
                quality: 480,
                qualityLabel: "480p Fast (CinePulse Direct)",
                audio: language,
                audioLanguages: [language],
                provider: "CinePulse HD 480p",
                url: `${dynamicStreamUrl}&q=480`,
                downloadUrl: `${dynamicStreamUrl}&q=480&dl=1`,
                type: "mp4",
                name: `${title} - S${seNum}E${epNum} (480p)`
              },
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-720`,
                quality: 720,
                qualityLabel: "720p HD (CinePulse Direct)",
                audio: language,
                audioLanguages: [language],
                provider: "CinePulse HD 720p",
                url: `${dynamicStreamUrl}&q=720`,
                downloadUrl: `${dynamicStreamUrl}&q=720&dl=1`,
                type: "mp4",
                name: `${title} - S${seNum}E${epNum} (720p)`
              },
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-1080`,
                quality: 1080,
                qualityLabel: "1080p Full HD (CinePulse Direct)",
                audio: language,
                audioLanguages: [language],
                provider: "CinePulse HD 1080p",
                url: `${dynamicStreamUrl}&q=1080`,
                downloadUrl: `${dynamicStreamUrl}&q=1080&dl=1`,
                type: "mp4",
                name: `${title} - S${seNum}E${epNum} (1080p)`
              },
              ...embedBackups
            ]
          });
        }
      }
    }
  }
  if (episodes.length === 0 && trailerMp4Url) {
    const trUrl = `/api/mb-stream.mp4?t=${encodeGatewayToken(trailerMp4Url)}`;
    episodes.push({
      id: `mb-trailer-${subjectId}`,
      label: "Official Preview Stream",
      number: 1,
      rangeStart: 1,
      rangeEnd: 1,
      season: null,
      kind: "movie",
      sources: [
        {
          id: `mb-trailer-src-${subjectId}`,
          quality: 720,
          qualityLabel: "720p Official Preview",
          audio: language,
          audioLanguages: [language],
          provider: "CinePulse Preview",
          url: trUrl,
          downloadUrl: trUrl,
          type: "mp4",
          name: `${title} (Preview)`
        }
      ]
    });
  }
  return {
    title,
    url: rawPath,
    poster,
    qualityNote: `1080p / 720p / 480p \u2022 ${language}`,
    typeBadge: subjectType === 2 ? "SERIES" : "MOVIE",
    language,
    quality: "1080p FHD",
    genre,
    resolution: "1080p | 720p | 480p | 360p",
    releaseDate,
    storyline,
    youtubeTrailerId: "",
    screenshots,
    episodes,
    downloadButtons,
    cast,
    dubs,
    uploadedBy,
    communityScore: {
      recommendedPercent: Math.min(99, Math.max(75, Math.round(ratingVal * 10))),
      totalVotes: Number(subject.imdbRatingCount) || 1420,
      verdict: "CinePulse HD Verified"
    }
  };
}
async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  const PORT = Number(process.env.PORT) || 3e3;
  const apiRateMap = /* @__PURE__ */ new Map();
  const imageProxyCache = /* @__PURE__ */ new Map();
  let isActiveTrialStreamToken = (_token) => false;
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path !== "/trial-embed") {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
    }
    const trialTkEarly = typeof req.query.tk === "string" ? String(req.query.tk).trim() : "";
    const isMediaProxyPath = req.path.startsWith("/api/mb-stream") || req.path.startsWith("/api/mb-ep-stream") || req.path.startsWith("/api/mb-subtitle-srt");
    const isCommercialApiOrTrialStream = req.path.startsWith("/api/trial") || isMediaProxyPath && Boolean(trialTkEarly && isActiveTrialStreamToken(trialTkEarly));
    const origin = String(req.headers.origin || "");
    if (isCommercialApiOrTrialStream) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PATCH, DELETE, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept, Range, X-API-Key, Authorization, X-Trial-Manage-Token, X-Trial-Admin"
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition, X-Trial-Plan, X-RateLimit-Limit, X-RateLimit-Remaining, X-Trial-Expires-At"
      );
      if (isMediaProxyPath) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }
    } else if (origin && (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes(".run.app"))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, X-API-Key, Authorization");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    const isRemovedPublicOrLegacyRoute = req.path === "/demo-api" || req.path === "/download-apk" || req.path === "/MovieBox-HD.apk" || req.path === "/CinePulse.apk" || req.path === "/api/download-apk" || req.path.startsWith("/_s/") || req.path === "/api/app" || req.path.startsWith("/api/app/") || req.path === "/api/demo" || req.path.startsWith("/api/demo/") || req.path.startsWith("/api/v1/") || req.path === "/api/v1";
    if (isRemovedPublicOrLegacyRoute) {
      res.status(401).json({
        ok: false,
        error: "Commercial API Key required. Use /api/trial/* with X-API-Key or ?apiKey=."
      });
      return;
    }
    if (req.path.startsWith("/api/") && req.path !== "/api/health" && !req.path.startsWith("/api/trial") && !req.path.startsWith("/api/owner")) {
      const isStreamOrSubRoute = req.path === "/api/mb-stream" || req.path === "/api/mb-stream.mp4" || req.path === "/api/mb-ep-stream" || req.path === "/api/mb-ep-stream.mp4" || req.path === "/api/mb-subtitle-srt";
      if (!isStreamOrSubRoute) {
        res.status(401).json({
          ok: false,
          error: "Commercial API Key required. Use /api/trial/* with X-API-Key or ?apiKey=."
        });
        return;
      }
      const trialStreamTk = typeof req.query.tk === "string" ? String(req.query.tk).trim() : "";
      const hasValidTrialTk = Boolean(trialStreamTk && isActiveTrialStreamToken(trialStreamTk));
      if (!hasValidTrialTk) {
        res.status(403).json({
          ok: false,
          error: "Valid active API key (?tk=) required for media streams and subtitles."
        });
        return;
      }
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  const syncLiveCategories = async () => {
    void discoverActiveMovieLinkBdOrigin(false).catch(() => {
    });
    const warmPaths = [
      "/",
      "/mostwatch/7d",
      "/type/movies",
      "/type/series",
      "/anime",
      "/language/bangla",
      "/bollywood",
      "/southIndian",
      "/language/english",
      "/category/anime-hindi",
      "/drama",
      "/category/short-tv",
      "/category/western-tv"
    ];
    for (const wp of warmPaths) {
      try {
        const cacheKey = `${wp}::page=1::q=::node=auto`;
        const [mbRes, mlRes] = await Promise.allSettled([
          fetchMovieBoxCatalog(wp, 1, ""),
          fetchMovieLinkBdCatalog(wp, 1, "")
        ]);
        const mbItems = mbRes.status === "fulfilled" ? mbRes.value.items : [];
        const mlItems = mlRes.status === "fulfilled" ? mlRes.value.items : [];
        const mbMaxPage = mbRes.status === "fulfilled" ? mbRes.value.maxPage : 2500;
        const mlMaxPage = mlRes.status === "fulfilled" ? mlRes.value.maxPage : 520;
        const preferMlFirst = wp.includes("bangla") || wp.includes("adult18");
        const combined = mergeCatalogItems(mbItems, mlItems, preferMlFirst).slice(0, 60);
        const mergedItems = wp === "/" ? sortItemsByHotAndHype(combined) : normalizeMovieCardList(combined);
        if (mergedItems.length > 0) {
          const entry = {
            data: {
              items: mergedItems,
              maxPage: Math.max(mbMaxPage, mlMaxPage),
              activeNodeId: "node-moviebox"
            },
            expiresAt: Date.now() + 6e5
          };
          pruneCacheMap(catalogCache, 120);
          catalogCache.set(cacheKey, entry);
          catalogCache.set(`${wp}::page=1::q=::node=node-moviebox`, entry);
          const warmCount = wp === "/" ? 3 : 1;
          const candidates = mergedItems.slice(0, warmCount).filter(
            (card) => card.path?.startsWith("/mb/") && !findCachedDetailByPathOrTitle(card.path, card.title)
          );
          for (const card of candidates) {
            try {
              const mbDet = await fetchMovieBoxDetail(card.path);
              if (mbDet && mbDet.episodes.length > 0) {
                storeDetailInCaches(card.path, mbDet, Date.now() + 6e5);
              }
            } catch {
            }
          }
        }
        await new Promise((r) => setTimeout(r, 250));
      } catch {
      }
    }
  };
  app.get("/api/categories", (_req, res) => {
    res.json({
      categories: ALL_CATEGORIES,
      nodes: SERVER_NODES.map(({ id, name, region }) => ({ id, name, region }))
    });
  });
  app.get("/api/mb-home", async (_req, res) => {
    try {
      const payload = await fetchMovieBoxHomePayload();
      res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
      res.json(payload);
    } catch {
      res.json({
        ok: false,
        banners: [],
        liveSports: [],
        quickCategories: [],
        comingSoon: [],
        sections: []
      });
    }
  });
  app.get("/api/server-health", async (_req, res) => {
    if (healthCache && healthCache.expiresAt > Date.now()) {
      res.json({ ok: true, nodes: healthCache.data });
      return;
    }
    const checks = await Promise.all(
      SERVER_NODES.map(async (node) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          const r = await fetch(node.origin, {
            method: "HEAD",
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          clearTimeout(timer);
          const latencyMs = Math.max(18, Date.now() - start);
          return {
            id: node.id,
            name: node.name,
            region: node.region,
            latencyMs,
            online: r.ok || r.status < 500
          };
        } catch {
          return {
            id: node.id,
            name: node.name,
            region: node.region,
            latencyMs: 28,
            online: true
          };
        }
      })
    );
    healthCache = {
      data: checks,
      expiresAt: Date.now() + 3e4
    };
    res.json({ ok: true, nodes: checks });
  });
  app.get("/api/suggest", async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) {
      res.json({ ok: true, items: [] });
      return;
    }
    const lowerQ = q.toLowerCase();
    const collectLocalMatches = () => {
      const localPool = [];
      for (const [, entry] of catalogCache.entries()) {
        for (const it of entry.data.items) {
          if (it.title.toLowerCase().includes(lowerQ)) {
            localPool.push(it);
          }
        }
      }
      for (const list of Object.values(INITIAL_FALLBACK_MOVIES)) {
        for (const it of list) {
          if (it.title.toLowerCase().includes(lowerQ)) {
            localPool.push(it);
          }
        }
      }
      return deduplicateMovieCards(localPool);
    };
    const cacheKey = `suggest::dual::${lowerQ}`;
    const cached = catalogCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ ok: true, items: cached.data.items.slice(0, 40) });
      return;
    }
    try {
      const [mbSettled, mlSettled] = await Promise.allSettled([
        fetchMovieBoxCatalog("/", 1, q),
        Promise.race([
          fetchMovieLinkBdCatalog("/", 1, q),
          new Promise(
            (resolve) => setTimeout(() => resolve({ items: [], maxPage: 1 }), 2500)
          )
        ])
      ]);
      const mbItems = mbSettled.status === "fulfilled" ? mbSettled.value.items : [];
      const mlItems = mlSettled.status === "fulfilled" ? mlSettled.value.items : [];
      const localMatches = collectLocalMatches();
      const combined = deduplicateMovieCards([
        ...mergeCatalogItems(mbItems, mlItems, false),
        ...localMatches
      ]);
      if (combined.length > 0) {
        catalogCache.set(cacheKey, {
          data: { items: combined, maxPage: 1, activeNodeId: "node-moviebox" },
          expiresAt: Date.now() + 12e4
        });
        res.json({ ok: true, items: combined.slice(0, 40) });
        return;
      }
    } catch {
    }
    const fallback = collectLocalMatches();
    res.json({ ok: true, items: fallback.slice(0, 40) });
  });
  app.get("/api/catalog", async (req, res) => {
    const rawPath = String(req.query.path || "/").trim();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const search = String(req.query.q || req.query.search || "").trim();
    const forceRefresh = String(req.query.refresh || "0") === "1";
    const nodeParam = String(req.query.node || "auto").trim();
    const isNewUploadsView = rawPath === "/new-uploads";
    const isNewReleasesView = rawPath === "/new-releases";
    const isHotDhamakaView = rawPath === "/hot-dhamaka";
    const isTrendingHomeView = rawPath === "/" || rawPath === "";
    const isAdultView = rawPath === "/adult18plus" || rawPath.includes("18plus");
    let upstreamBasePath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (isNewUploadsView || isNewReleasesView || isHotDhamakaView) {
      upstreamBasePath = "/";
    }
    const cacheKey = `${rawPath}::page=${page}::q=${search}::node=${nodeParam}`;
    const cached = catalogCache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      const normalized = normalizeMovieCardList(cached.data.items);
      res.json({
        ok: true,
        cached: true,
        path: rawPath,
        page,
        maxPage: cached.data.maxPage,
        activeNodeId: cached.data.activeNodeId,
        items: normalized
      });
      return;
    }
    try {
      const mbTargetPath = isNewReleasesView ? "/new-releases" : isNewUploadsView ? "/new-uploads" : upstreamBasePath;
      const isHomeOrGlobal = !search && page === 1 && (isTrendingHomeView || isHotDhamakaView || isNewUploadsView || isNewReleasesView);
      const tasks = [];
      const mlbdTask = Promise.race([
        fetchMovieLinkBdCatalog(upstreamBasePath, page, search),
        new Promise(
          (resolve) => setTimeout(() => resolve({ items: [], maxPage: 1 }), 3500)
        )
      ]);
      if (isAdultView) {
        tasks.push(mlbdTask);
      } else {
        tasks.push(fetchMovieBoxCatalog(mbTargetPath, page, search), mlbdTask);
        if (isHomeOrGlobal) {
          tasks.push(
            fetchMovieBoxCatalog("/language/bangla", 1, ""),
            fetchMovieBoxCatalog("/bollywood", 1, ""),
            fetchMovieBoxCatalog("/language/hindi-dubbed", 1, "")
          );
        }
      }
      const settled = await Promise.allSettled(tasks);
      const primaryMain = settled[0]?.status === "fulfilled" ? settled[0].value : { items: [], maxPage: 2500 };
      const mlbdMain = isAdultView ? primaryMain : settled[1]?.status === "fulfilled" ? settled[1].value : { items: [], maxPage: 520 };
      const extraRegional = [];
      for (let i = isAdultView ? 1 : 2; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === "fulfilled") {
          extraRegional.push(...r.value.items.slice(0, 10));
        }
      }
      const preferMlFirst = isAdultView || upstreamBasePath.includes("bangla") || search && /গোপাল|gopal|natok|নাটক|bachelor|ব্যাচেলর|bangla|kolkata/i.test(search);
      let items = isAdultView ? primaryMain.items : mergeCatalogItems(
        deduplicateMovieCards([...extraRegional, ...primaryMain.items]),
        mlbdMain.items,
        Boolean(preferMlFirst)
      );
      if (search) {
        const lowerSearch = search.toLowerCase();
        const extraSearchMatches = [];
        for (const [, entry] of catalogCache.entries()) {
          for (const it of entry.data.items) {
            if (it.title.toLowerCase().includes(lowerSearch)) {
              extraSearchMatches.push(it);
            }
          }
        }
        items = deduplicateMovieCards([...items, ...extraSearchMatches]);
      }
      if (!search && (isTrendingHomeView || isHotDhamakaView || isNewUploadsView || isNewReleasesView)) {
        if (isHotDhamakaView) {
          items = sortItemsByHotAndHype(items);
        } else if (isNewUploadsView) {
          items = sortItemsByRecentUpload(items);
        } else if (isNewReleasesView) {
          const sortedRecent = sortItemsByRecentUpload(items);
          const release2026And2025 = sortedRecent.filter(
            (i) => i.title.includes("2026") || i.title.includes("2025")
          );
          const releaseOlder = sortedRecent.filter(
            (i) => !i.title.includes("2026") && !i.title.includes("2025")
          );
          items = [...release2026And2025, ...releaseOlder];
        } else {
          items = sortItemsByHotAndHype(items);
        }
        items = items.slice(0, 64);
      } else {
        items = normalizeMovieCardList(items).slice(0, 64);
      }
      const maxPage = Math.max(primaryMain.maxPage || 1, mlbdMain.maxPage || 1, 50);
      if (items.length > 0) {
        const usedNodeId = isAdultView ? "node-mlbd" : "node-moviebox";
        catalogCache.set(cacheKey, {
          data: { items, maxPage, activeNodeId: usedNodeId },
          expiresAt: Date.now() + 6e5
        });
        res.json({
          ok: true,
          cached: false,
          path: rawPath,
          page,
          maxPage,
          activeNodeId: usedNodeId,
          items
        });
        return;
      }
    } catch (err) {
      console.error("Catalog fetch error:", err);
    }
    const fallbackItems = sortItemsByRecentUpload(
      INITIAL_FALLBACK_MOVIES[rawPath] || INITIAL_FALLBACK_MOVIES["/"] || []
    );
    res.json({
      ok: true,
      fallback: true,
      path: rawPath,
      page,
      maxPage: 2500,
      activeNodeId: "node-moviebox",
      items: fallbackItems
    });
  });
  app.get("/api/details", async (req, res) => {
    const rawPath = String(req.query.path || req.query.url || "").trim();
    const fallbackTitle = String(req.query.title || "").trim();
    if (!rawPath && !fallbackTitle) {
      res.status(400).json({ ok: false, error: "Missing path or title parameter" });
      return;
    }
    const attachFastRelatedSeasons = (detailObj) => {
      if (detailObj.relatedSeasons && detailObj.relatedSeasons.length > 0) return detailObj;
      if (detailObj.typeBadge === "MOVIE" && (detailObj.episodes?.length || 0) <= 1) {
        return detailObj;
      }
      const baseSeriesName = extractBaseSeriesTitle(fallbackTitle || detailObj.title);
      if (baseSeriesName && baseSeriesName.length >= 3) {
        const baseLower = baseSeriesName.toLowerCase();
        const matchingSeasons = [];
        const seenPaths = /* @__PURE__ */ new Set();
        for (const entry of catalogCache.values()) {
          for (const item of entry.data.items) {
            if (seenPaths.has(item.path) || item.path === detailObj.url) continue;
            const itemBase = extractBaseSeriesTitle(item.title).toLowerCase();
            if (itemBase === baseLower) {
              seenPaths.add(item.path);
              matchingSeasons.push(item);
            }
          }
        }
        if (matchingSeasons.length > 0) {
          return { ...detailObj, relatedSeasons: matchingSeasons.slice(0, 12) };
        }
      }
      return detailObj;
    };
    const ensureDetailDubsAndUploader = (detailObj) => {
      const dubs = Array.isArray(detailObj.dubs) ? [...detailObj.dubs] : [];
      if (dubs.length === 0) {
        const primaryLabel = String(detailObj.language || "Original Audio").trim();
        dubs.push({
          id: `dub-primary-${detailObj.url}`,
          label: primaryLabel,
          path: detailObj.url,
          active: true
        });
      }
      return {
        ...detailObj,
        dubs,
        uploadedBy: "CinePulse Official"
      };
    };
    const instantHit = findCachedDetailByPathOrTitle(rawPath, fallbackTitle);
    if (instantHit) {
      if (rawPath && !detailCache.has(rawPath)) {
        detailCache.set(rawPath, { data: instantHit, expiresAt: Date.now() + 6e5 });
      }
      res.json({
        ok: true,
        cached: true,
        detail: ensureDetailDubsAndUploader(attachFastRelatedSeasons(instantHit))
      });
      return;
    }
    if (rawPath && !rawPath.startsWith("/mb/")) {
      try {
        const { html, finalOrigin } = await fetchFromMirrors(rawPath, "node-mlbd");
        if (finalOrigin && finalOrigin.includes("movielinkbd.at")) {
          activeMovieLinkBdOrigin = finalOrigin;
          SERVER_NODES[1].origin = finalOrigin;
        }
        let mlDetail = parseMovieDetail(html, rawPath, finalOrigin || activeMovieLinkBdOrigin);
        if (mlDetail && (mlDetail.episodes?.length > 0 || mlDetail.downloadButtons?.length > 0)) {
          mlDetail = ensureDetailDubsAndUploader(attachFastRelatedSeasons(mlDetail));
          storeDetailInCaches(rawPath, mlDetail, Date.now() + 12 * 6e4);
          res.json({ ok: true, detail: mlDetail });
          return;
        }
      } catch {
      }
    }
    try {
      let targetMbPath = rawPath;
      if (!targetMbPath.startsWith("/mb/")) {
        const queryFromPath = rawPath.replace(/^\/(?:movie|series|anime|drama)\//i, "").replace(/[-_]+/g, " ").trim();
        const searchTitle = extractBaseSeriesTitle(fallbackTitle || queryFromPath).split(/\s+/).slice(0, 5).join(" ");
        if (searchTitle.length >= 2) {
          const mbSearch = await fetchMovieBoxCatalog("/", 1, searchTitle);
          if (mbSearch.items.length > 0) {
            targetMbPath = mbSearch.items[0].path;
          }
        }
      }
      if (targetMbPath.startsWith("/mb/")) {
        let mbDetail = await fetchMovieBoxDetail(targetMbPath);
        if (mbDetail) {
          mbDetail = ensureDetailDubsAndUploader(attachFastRelatedSeasons(mbDetail));
          storeDetailInCaches(targetMbPath, mbDetail, Date.now() + 12 * 6e4);
          res.json({ ok: true, detail: mbDetail });
          return;
        }
      }
    } catch (err) {
      console.error("Detail fetch error:", err);
    }
    res.status(404).json({
      ok: false,
      error: "CinePulse \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u098F\u0987 \u09AE\u09C1\u09AD\u09BF\u09B0 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u09AE \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964"
    });
  });
  app.get("/api/go", async (req, res) => {
    const token = String(req.query.t || "").trim();
    let target = decodeGatewayToken(token);
    if (!target || !target.startsWith("http")) {
      res.status(400).send("Invalid gateway link");
      return;
    }
    if (/fifadekho\.com\/[a-z0-9]+/i.test(target) && !target.includes("view=links")) {
      try {
        const linksUrl = `${target.replace(/\/+$/, "")}?view=links`;
        const gwRes = await fetch(linksUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (gwRes.ok) {
          const gwHtml = await gwRes.text();
          const directCloudMatch = gwHtml.match(
            /<a\s+href=["'](https?:\/\/(?:hubcloud|new\d*\.xcloud|gdflix)[^"']+)["'][^>]*class=["'][^"']*nl-link-btn/i
          );
          if (directCloudMatch && directCloudMatch[1]) {
            target = directCloudMatch[1].trim();
          } else {
            target = linksUrl;
          }
        }
      } catch {
        target = `${target.replace(/\/+$/, "")}?view=links`;
      }
    }
    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(302, target);
  });
  const handleMovieBoxVirtualChunkStream = async (req, res, targetUrl, fallbackUrl, isDownload, rawFilename) => {
    if (!targetUrl || !targetUrl.startsWith("http")) {
      res.status(400).send("Invalid MovieBox stream token");
      return;
    }
    const INITIAL_BURST_CHUNK_BYTES = 1024 * 1024;
    const PLAYBACK_MICRO_CHUNK_BYTES = 3 * 1024 * 1024;
    let requestedStart = 0;
    let requestedEnd = NaN;
    if (req.headers.range) {
      const m = String(req.headers.range).match(/bytes=(\d+)-(\d*)/i);
      if (m) {
        requestedStart = parseInt(m[1], 10) || 0;
        requestedEnd = m[2] ? parseInt(m[2], 10) : NaN;
      }
    }
    const hasClientRange = Boolean(req.headers.range);
    if (hasClientRange && !isDownload && req.method !== "HEAD") {
      const ramHit = mbStartupChunkCache.get(targetUrl);
      if (ramHit && ramHit.expiresAt > Date.now() && ramHit.buf.length > 32768) {
        if (!Number.isNaN(requestedEnd) && requestedStart < ramHit.buf.length && requestedEnd < ramHit.buf.length && requestedEnd >= requestedStart) {
          const chunk = ramHit.buf.subarray(requestedStart, requestedEnd + 1);
          res.status(206);
          res.setHeader("Content-Type", ramHit.contentType || "video/mp4");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          res.setHeader("X-Cache", "VIRTUAL-CHUNK-RAM-HIT");
          res.setHeader("Content-Length", String(chunk.length));
          res.setHeader(
            "Content-Range",
            `bytes ${requestedStart}-${requestedEnd}/${ramHit.totalSize}`
          );
          res.end(chunk);
          return;
        }
        if (requestedStart === 0 && Number.isNaN(requestedEnd) && ramHit.buf.length >= 262144) {
          const chunk = ramHit.buf;
          res.status(206);
          res.setHeader("Content-Type", ramHit.contentType || "video/mp4");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          res.setHeader("X-Cache", "VIRTUAL-CHUNK-RAM-HIT");
          res.setHeader("Content-Length", String(chunk.length));
          res.setHeader(
            "Content-Range",
            `bytes 0-${chunk.length - 1}/${ramHit.totalSize}`
          );
          res.end(chunk);
          return;
        }
      }
    }
    const chromeUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const isMlbdStream = /workers\.dev|r2\.dev|fsldownload|movielinkbd|pixeldrain/i.test(targetUrl);
    const forwardHeaders = {
      "User-Agent": chromeUa,
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9"
    };
    const chunkCap = requestedStart === 0 ? INITIAL_BURST_CHUNK_BYTES : PLAYBACK_MICRO_CHUNK_BYTES;
    if (hasClientRange && !isDownload) {
      const cappedEnd = !Number.isNaN(requestedEnd) && requestedEnd >= requestedStart ? Math.min(requestedEnd, requestedStart + chunkCap - 1) : requestedStart + chunkCap - 1;
      forwardHeaders.Range = `bytes=${requestedStart}-${cappedEnd}`;
    } else if (hasClientRange) {
      forwardHeaders.Range = String(req.headers.range);
    }
    try {
      let upstream = null;
      const refererCandidates = isMlbdStream ? [
        { "User-Agent": chromeUa },
        { "User-Agent": "okhttp/4.12.0" },
        { "User-Agent": chromeUa, Referer: `${activeMovieLinkBdOrigin}/` }
      ] : [
        { "User-Agent": chromeUa, Referer: "https://movie-box.co/" },
        { "User-Agent": chromeUa, Referer: "https://123movienow.cc/" },
        { "User-Agent": chromeUa, Referer: "https://movieboxhd.net/" },
        { "User-Agent": "okhttp/4.12.0", Referer: "https://movie-box.co/" }
      ];
      for (let attempt = 0; attempt < refererCandidates.length; attempt++) {
        try {
          const candidateRes = await openMovieBoxCdnStream(
            targetUrl,
            req.method === "HEAD" ? "HEAD" : "GET",
            { ...forwardHeaders, ...refererCandidates[attempt] },
            8e3
          );
          if (candidateRes.statusCode === 200 || candidateRes.statusCode === 206) {
            upstream = candidateRes;
            break;
          }
          candidateRes.resume();
          upstream = candidateRes;
        } catch (fetchErr) {
          if (attempt === refererCandidates.length - 1) throw fetchErr;
        }
      }
      const tryStreamViaHttp2 = async (h2Target, h2Headers, timeoutMs = 8e3, redirectDepth = 0) => {
        if (!h2Target.startsWith("https://") || redirectDepth > 4) return false;
        let parsed;
        try {
          parsed = new URL(h2Target);
        } catch {
          return false;
        }
        return new Promise((resolve) => {
          let settled = false;
          const finish = (ok) => {
            if (!settled) {
              settled = true;
              resolve(ok);
            }
          };
          let client;
          try {
            client = http2.connect(parsed.origin);
          } catch {
            finish(false);
            return;
          }
          const safeCloseClient = () => {
            try {
              if (!client.destroyed) client.close();
            } catch {
            }
          };
          const timer = setTimeout(() => {
            safeCloseClient();
            finish(false);
          }, timeoutMs);
          client.on("error", () => {
            clearTimeout(timer);
            safeCloseClient();
            finish(false);
          });
          const reqHeaders = {
            ":method": req.method === "HEAD" ? "HEAD" : "GET",
            ":path": parsed.pathname + parsed.search
          };
          for (const [k, v] of Object.entries(h2Headers)) {
            if (v) reqHeaders[k.toLowerCase()] = v;
          }
          let h2Req;
          try {
            h2Req = client.request(reqHeaders);
          } catch {
            clearTimeout(timer);
            safeCloseClient();
            finish(false);
            return;
          }
          h2Req.on("error", () => {
            clearTimeout(timer);
            safeCloseClient();
            if (res.headersSent && !res.writableEnded) res.end();
            finish(false);
          });
          h2Req.on("response", (hdrs) => {
            clearTimeout(timer);
            const status = Number(hdrs[":status"] || 0);
            const loc = hdrs.location ? String(hdrs.location) : "";
            if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && loc) {
              h2Req.close();
              safeCloseClient();
              const nextUrl = new URL(loc, parsed).toString();
              void tryStreamViaHttp2(nextUrl, h2Headers, timeoutMs, redirectDepth + 1).then(finish);
              return;
            }
            if (status !== 200 && status !== 206) {
              h2Req.close();
              safeCloseClient();
              finish(false);
              return;
            }
            let ct = String(hdrs["content-type"] || "video/mp4").split(";")[0].trim();
            if (!ct || ct === "application/octet-stream" || ct === "binary/octet-stream") {
              ct = /\.mkv(\?|$)/i.test(h2Target) ? "video/x-matroska" : "video/mp4";
            }
            const cr = hdrs["content-range"] ? String(hdrs["content-range"]) : "";
            const cl = hdrs["content-length"] ? String(hdrs["content-length"]) : "";
            res.status(status);
            res.setHeader("Content-Type", ct);
            res.setHeader("Accept-Ranges", String(hdrs["accept-ranges"] || "bytes"));
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            res.setHeader("X-Cache", "VIRTUAL-CHUNK-H2");
            if (cl) res.setHeader("Content-Length", cl);
            if (cr) res.setHeader("Content-Range", cr);
            if (isDownload) {
              res.setHeader(
                "Content-Disposition",
                `attachment; filename="${rawFilename.endsWith(".mp4") ? rawFilename : `${rawFilename}.mp4`}"`
              );
            }
            if (req.method === "HEAD") {
              h2Req.close();
              safeCloseClient();
              res.end();
              finish(true);
              return;
            }
            res.on("close", () => {
              try {
                if (!h2Req.destroyed) h2Req.close();
              } catch {
              }
              safeCloseClient();
            });
            h2Req.on("end", () => {
              safeCloseClient();
            });
            h2Req.pipe(res);
            finish(true);
          });
          h2Req.end();
        });
      };
      if (!upstream || upstream.statusCode !== 200 && upstream.statusCode !== 206) {
        const h2HeaderSets = isMlbdStream ? [{ "User-Agent": chromeUa, Referer: `${activeMovieLinkBdOrigin}/`, Accept: "*/*" }] : [
          {
            "User-Agent": chromeUa,
            Referer: "https://movie-box.co/",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Fetch-Dest": "video",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site"
          },
          {
            "User-Agent": chromeUa,
            Referer: "https://123movienow.cc/",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9"
          },
          {
            "User-Agent": "okhttp/4.12.0",
            Referer: "https://movie-box.co/",
            Accept: "*/*"
          }
        ];
        for (const hSet of h2HeaderSets) {
          const h2Hdrs = { ...hSet };
          if (forwardHeaders.Range) h2Hdrs.Range = forwardHeaders.Range;
          const okH2 = await tryStreamViaHttp2(targetUrl, h2Hdrs, 8e3);
          if (okH2) return;
        }
      }
      if ((!upstream || upstream.statusCode !== 200 && upstream.statusCode !== 206) && fallbackUrl && fallbackUrl.startsWith("http")) {
        try {
          const fbHeaders = {
            "User-Agent": chromeUa,
            Referer: isMlbdStream ? `${activeMovieLinkBdOrigin}/` : "https://movie-box.co/",
            Accept: "*/*"
          };
          if (forwardHeaders.Range) fbHeaders.Range = forwardHeaders.Range;
          const fbRes = await openMovieBoxCdnStream(
            fallbackUrl,
            req.method === "HEAD" ? "HEAD" : "GET",
            fbHeaders,
            8e3
          );
          if (fbRes.statusCode === 200 || fbRes.statusCode === 206) {
            upstream = fbRes;
          } else {
            fbRes.resume();
          }
        } catch {
        }
      }
      if (!upstream || upstream.statusCode !== 200 && upstream.statusCode !== 206) {
        const fetchTargets = [targetUrl, fallbackUrl].filter((u) => Boolean(u && u.startsWith("http")));
        const fetchHeaderSets = isMlbdStream ? [{ "User-Agent": chromeUa, Referer: `${activeMovieLinkBdOrigin}/`, Accept: "*/*" }] : [
          {
            "User-Agent": chromeUa,
            Referer: "https://movie-box.co/",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9"
          },
          {
            "User-Agent": chromeUa,
            Referer: "https://123movienow.cc/",
            Accept: "*/*"
          },
          {
            "User-Agent": "okhttp/4.12.0",
            Referer: "https://movie-box.co/",
            Accept: "*/*"
          }
        ];
        for (const fTarget of fetchTargets) {
          for (const hSet of fetchHeaderSets) {
            try {
              const undiciHeaders = { ...hSet };
              if (forwardHeaders.Range) undiciHeaders.Range = forwardHeaders.Range;
              const fRes = await fetch(fTarget, {
                method: req.method === "HEAD" ? "HEAD" : "GET",
                headers: undiciHeaders,
                signal: AbortSignal.timeout(8e3)
              });
              if (fRes.status === 200 || fRes.status === 206) {
                let ct = String(fRes.headers.get("content-type") || "video/mp4").split(";")[0].trim();
                if (!ct || ct === "application/octet-stream" || ct === "binary/octet-stream") {
                  ct = /\.mkv(\?|$)/i.test(fTarget) ? "video/x-matroska" : "video/mp4";
                }
                const cr = String(fRes.headers.get("content-range") || "");
                const cl = fRes.headers.get("content-length");
                res.status(fRes.status);
                res.setHeader("Content-Type", ct);
                res.setHeader("Accept-Ranges", String(fRes.headers.get("accept-ranges") || "bytes"));
                res.setHeader("Cache-Control", "public, max-age=3600");
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                res.setHeader("X-Cache", "VIRTUAL-CHUNK-FETCH");
                if (cl) res.setHeader("Content-Length", cl);
                if (cr) res.setHeader("Content-Range", cr);
                if (isDownload) {
                  res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${rawFilename.endsWith(".mp4") ? rawFilename : `${rawFilename}.mp4`}"`
                  );
                }
                if (req.method === "HEAD" || !fRes.body) {
                  res.end();
                  return;
                }
                const { Readable } = await import("stream");
                const nodeStream = Readable.fromWeb(fRes.body);
                res.on("close", () => {
                  if (!res.writableEnded) nodeStream.destroy();
                });
                nodeStream.pipe(res);
                return;
              }
              try {
                await fRes.body?.cancel();
              } catch {
              }
            } catch {
            }
          }
        }
      }
      if (isMlbdStream && (!upstream || upstream.statusCode === 403 || upstream.statusCode === 429) && targetUrl.startsWith("http")) {
        res.setHeader("Referrer-Policy", "no-referrer");
        res.redirect(302, targetUrl);
        return;
      }
      if (!upstream || upstream.statusCode !== 200 && upstream.statusCode !== 206) {
        res.status(upstream?.statusCode || 502).send(`MovieBox CDN upstream returned ${upstream?.statusCode || 502}`);
        return;
      }
      res.on("close", () => {
        if (!res.writableEnded && upstream) {
          upstream.destroy();
        }
      });
      let contentType = String(upstream.headers["content-type"] || "video/mp4").split(";")[0].trim();
      if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
        contentType = /\.mkv(\?|$)/i.test(targetUrl) ? "video/x-matroska" : "video/mp4";
      }
      const contentRange = String(upstream.headers["content-range"] || "");
      const contentLength = upstream.headers["content-length"];
      res.status(upstream.statusCode || 206);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", String(upstream.headers["accept-ranges"] || "bytes"));
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("X-Cache", "VIRTUAL-CHUNK-STREAM");
      if (contentLength) {
        res.setHeader("Content-Length", String(contentLength));
      }
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }
      if (isDownload) {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${rawFilename.endsWith(".mp4") ? rawFilename : `${rawFilename}.mp4`}"`
        );
      }
      if (req.method === "HEAD") {
        upstream.resume();
        res.end();
        return;
      }
      const HEADER_CACHE_BYTES = 512 * 1024;
      const shouldCacheStartupChunk = !isDownload && requestedStart === 0 && upstream.statusCode === 206 && !mbStartupChunkCache.has(targetUrl);
      const totalMatch = contentRange.match(/\/(\d+)$/);
      const parsedTotalSize = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const collectedChunks = [];
      let collectedLen = 0;
      if (shouldCacheStartupChunk && parsedTotalSize > 0) {
        upstream.on("data", (chunk) => {
          if (collectedLen < HEADER_CACHE_BYTES) {
            const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const needed = HEADER_CACHE_BYTES - collectedLen;
            const slice = b.length > needed ? b.subarray(0, needed) : b;
            collectedChunks.push(slice);
            collectedLen += slice.length;
          }
        });
        upstream.on("end", () => {
          if (collectedLen > 32768 && !mbStartupChunkCache.has(targetUrl)) {
            if (mbStartupChunkCache.size >= 30) {
              const oldestKey = mbStartupChunkCache.keys().next().value;
              if (oldestKey) mbStartupChunkCache.delete(oldestKey);
            }
            mbStartupChunkCache.set(targetUrl, {
              buf: Buffer.concat(collectedChunks),
              tailStart: parsedTotalSize,
              tailBuf: null,
              totalSize: parsedTotalSize,
              contentType,
              expiresAt: Date.now() + 10 * 6e4
            });
          }
        });
      }
      upstream.on("error", () => {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      upstream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).send("CinePulse stream connection interrupted");
      } else {
        res.end();
      }
    }
  };
  app.get(["/api/mb-stream", "/api/mb-stream.mp4"], async (req, res) => {
    const token = String(req.query.t || "").trim();
    const fbToken = String(req.query.fb || "").trim();
    const isDownload = String(req.query.dl || "0") === "1";
    const rawFilename = String(req.query.name || req.query.fn || "CinePulse-HD.mp4").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const targetUrl = decodeGatewayToken(token);
    const fallbackUrl = fbToken ? decodeGatewayToken(fbToken) : "";
    await handleMovieBoxVirtualChunkStream(
      req,
      res,
      targetUrl,
      fallbackUrl,
      isDownload,
      rawFilename
    );
  });
  app.get("/api/mb-resolve-ep", async (req, res) => {
    let subjectId = String(req.query.subjectId || "").trim();
    let detailPath = String(req.query.detailPath || "").trim();
    if (subjectId === "9162827393101350104") {
      subjectId = "7459884463091499088";
      detailPath = "black-clover-english-4Q7h8lHl4T8";
    }
    const parsedResolveSe = parseInt(String(req.query.se ?? "1"), 10);
    const parsedResolveEp = parseInt(String(req.query.ep ?? "1"), 10);
    const se = Number.isNaN(parsedResolveSe) ? 1 : Math.max(0, parsedResolveSe);
    const ep = Number.isNaN(parsedResolveEp) ? 1 : Math.max(0, parsedResolveEp);
    const title = String(req.query.title || detailPath || "Episode").trim();
    const lang = String(req.query.lang || "Original Audio").trim();
    if (!subjectId || !detailPath) {
      res.json({ ok: false, sources: [], buttons: [] });
      return;
    }
    try {
      let playRes = await fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, "");
      if (playRes.sources.length === 0 && se > 1) {
        const fbPrevEp = ep > 1 ? await fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep - 1, title, lang, "") : { sources: [], buttons: [] };
        if (fbPrevEp.sources.length > 0) {
          playRes = fbPrevEp;
        } else {
          const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, "");
          if (fbSe1.sources.length > 0) {
            playRes = fbSe1;
          }
        }
      }
      if (playRes.sources.length === 0 && (se !== 0 || ep !== 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, lang, "");
        if (fbMovie.sources.length > 0) {
          playRes = fbMovie;
        }
      } else if (playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbEp1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, lang, "");
        if (fbEp1.sources.length > 0) {
          playRes = fbEp1;
        }
      }
      res.json({
        ok: true,
        sources: playRes.sources,
        buttons: playRes.buttons
      });
    } catch {
      res.json({ ok: false, sources: [], buttons: [] });
    }
  });
  app.get(["/api/mb-ep-stream", "/api/mb-ep-stream.mp4"], async (req, res) => {
    let subjectId = String(req.query.subjectId || "").trim();
    let detailPath = String(req.query.detailPath || "").trim();
    if (subjectId === "9162827393101350104") {
      subjectId = "7459884463091499088";
      detailPath = "black-clover-english-4Q7h8lHl4T8";
    }
    const parsedSe = parseInt(String(req.query.se ?? "1"), 10);
    const parsedEp = parseInt(String(req.query.ep ?? "1"), 10);
    const se = Number.isNaN(parsedSe) ? 1 : Math.max(0, parsedSe);
    const ep = Number.isNaN(parsedEp) ? 1 : Math.max(0, parsedEp);
    const preferredQuality = parseInt(String(req.query.q || "480"), 10) || 480;
    const isDownload = String(req.query.dl || "0") === "1";
    const fbToken = String(req.query.fb || "").trim();
    const fallbackUrl = fbToken ? decodeGatewayToken(fbToken) : "";
    if (!subjectId || !detailPath) {
      res.status(400).send("Missing subjectId or detailPath");
      return;
    }
    try {
      const altSe = se === 0 ? 1 : 0;
      const altEp = ep === 0 ? 1 : 0;
      const nowMs = Date.now();
      const cachedPrimary = mbPlayStreamCache.get(`${subjectId}::s${se}::e${ep}`) || mbPlayStreamCache.get(`${subjectId}::${se}::${ep}`);
      const cachedAlt = se === 0 && ep === 0 || se === 1 && ep === 1 ? mbPlayStreamCache.get(`${subjectId}::s${altSe}::e${altEp}`) || mbPlayStreamCache.get(`${subjectId}::${altSe}::${altEp}`) : void 0;
      let sources = [];
      if (cachedPrimary && cachedPrimary.expiresAt > nowMs && cachedPrimary.sources.length > 0) {
        sources = cachedPrimary.sources;
      } else if (cachedAlt && cachedAlt.expiresAt > nowMs && cachedAlt.sources.length > 0) {
        sources = cachedAlt.sources;
      } else {
        const resMain = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath,
          se,
          ep,
          detailPath,
          "English / Original",
          fallbackUrl
        );
        sources = resMain.sources;
        if (sources.length === 0 && (se === 0 && ep === 0 || se === 1 && ep === 1)) {
          const resAlt = await fetchMovieBoxPlayStreams(
            subjectId,
            detailPath,
            altSe,
            altEp,
            detailPath,
            "English / Original",
            fallbackUrl
          );
          sources = resAlt.sources;
        }
      }
      if (!sources.length && se > 1 && ep > 1) {
        const fbPrev = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath,
          se,
          ep - 1,
          detailPath,
          "English / Original",
          fallbackUrl
        );
        if (fbPrev.sources.length) sources = fbPrev.sources;
      }
      if (!sources.length && se > 1) {
        const fbDedicatedSe = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath,
          1,
          ep,
          detailPath,
          "English / Original",
          fallbackUrl
        );
        if (fbDedicatedSe.sources.length) sources = fbDedicatedSe.sources;
      }
      if (!sources.length && se >= 1) {
        const fbMovie = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath,
          0,
          0,
          detailPath,
          "English",
          fallbackUrl
        );
        if (fbMovie.sources.length) sources = fbMovie.sources;
      }
      if (!sources.length) {
        if (fallbackUrl) {
          await handleMovieBoxVirtualChunkStream(
            req,
            res,
            fallbackUrl,
            "",
            isDownload,
            `${detailPath}.mp4`
          );
          return;
        }
        res.status(404).send("No MovieBox streams found for this episode");
        return;
      }
      const chosen = sources.find((s) => s.quality === preferredQuality) || (preferredQuality <= 480 ? sources.find((s) => s.quality === 480 || s.quality === 360) : void 0) || sources.find((s) => s.quality === 480) || sources.find((s) => s.quality === 360) || sources.find((s) => s.quality === 720) || sources[0];
      let streamRouteUrl = isDownload && chosen.downloadUrl ? chosen.downloadUrl : chosen.url;
      try {
        if (streamRouteUrl.startsWith("/_s/v.mp4")) {
          const parsedCloak = new URL(streamRouteUrl, "http://localhost");
          const uncloaked = decodeCloakToken(parsedCloak.searchParams.get("k") || "");
          if (uncloaked) streamRouteUrl = uncloaked;
        }
        const parsedRoute = new URL(streamRouteUrl, "http://localhost");
        const tParam = parsedRoute.searchParams.get("t") || "";
        const fbParam = parsedRoute.searchParams.get("fb") || fbToken;
        const fnParam = parsedRoute.searchParams.get("name") || `${detailPath}-${chosen.quality}p.mp4`;
        const decodedCdnUrl = tParam ? decodeGatewayToken(tParam) : "";
        const decodedFbUrl = fbParam ? decodeGatewayToken(fbParam) : fallbackUrl;
        if (decodedCdnUrl && decodedCdnUrl.startsWith("http")) {
          await handleMovieBoxVirtualChunkStream(
            req,
            res,
            decodedCdnUrl,
            decodedFbUrl,
            isDownload,
            fnParam
          );
          return;
        }
      } catch {
      }
      const reqTk = typeof req.query.tk === "string" ? String(req.query.tk).trim() : "";
      const redirectUrl = reqTk && !streamRouteUrl.includes("tk=") ? `${streamRouteUrl}${streamRouteUrl.includes("?") ? "&" : "?"}tk=${encodeURIComponent(reqTk)}` : streamRouteUrl;
      res.redirect(302, redirectUrl);
    } catch {
      if (fallbackUrl) {
        await handleMovieBoxVirtualChunkStream(
          req,
          res,
          fallbackUrl,
          "",
          isDownload,
          `${detailPath}.mp4`
        );
        return;
      }
      res.status(502).send("Failed to resolve MovieBox episode stream");
    }
  });
  app.get(["/api/mb-captions", "/api/v1/captions"], async (req, res) => {
    const rawPath = String(req.query.path || "").trim();
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    let detailPath = String(req.query.detailPath || req.query.slug || "").trim();
    if (rawPath.startsWith("/mb/")) {
      const parts = rawPath.replace(/^\/mb\//, "").split("/").filter(Boolean);
      if (!subjectId && parts[0]) subjectId = parts[0];
      if (!detailPath && parts[1]) detailPath = parts[1];
    }
    if (subjectId === "9162827393101350104") {
      subjectId = "7459884463091499088";
      detailPath = "black-clover-english-4Q7h8lHl4T8";
    }
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || "0"), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || "0"), 10) || 0);
    const streamId = String(req.query.streamId || "").trim();
    if (!subjectId) {
      res.json({ ok: false, captions: [] });
      return;
    }
    try {
      const captions = await fetchMovieBoxOfficialCaptions(
        subjectId,
        detailPath || "movie",
        se,
        ep,
        streamId
      );
      res.setHeader("Cache-Control", "public, max-age=1800");
      res.json({
        ok: true,
        subjectId,
        detailPath: detailPath || "movie",
        season: se,
        episode: ep,
        totalCaptions: captions.length,
        captions
      });
    } catch {
      res.json({ ok: false, captions: [] });
    }
  });
  app.get("/api/mb-subtitle-srt", async (req, res) => {
    const tokenParam = String(req.query.t || "").trim();
    const rawUrl = tokenParam ? decodeGatewayToken(tokenParam) : String(req.query.url || "").trim();
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      res.status(400).send("");
      return;
    }
    const cached = mbSrtTextCache.get(rawUrl);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(cached.text);
      return;
    }
    try {
      const r = await fetch(rawUrl, {
        headers: {
          Accept: "*/*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://movie-box.co/"
        },
        signal: AbortSignal.timeout(4e3)
      });
      if (!r.ok) {
        res.status(r.status).send("");
        return;
      }
      const text = await r.text();
      if (text && text.includes("-->")) {
        pruneCacheMap(mbSrtTextCache, 150);
        mbSrtTextCache.set(rawUrl, { text, expiresAt: Date.now() + 60 * 6e4 });
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(text);
    } catch {
      res.status(502).send("");
    }
  });
  app.use("/api/v1", (req, res, next) => {
    if (!req.headers["x-cp-sig"] && req.headers["x-cp-client"] !== "cp-web-v4") {
      res.status(403).json({ ok: false, error: "Protected by CinePulse Security Shield" });
      return;
    }
    next();
  });
  app.get("/api/v1/status", (_req, res) => {
    res.json({
      ok: true,
      version: "v1.0.0-hybrid-direct-auto-api",
      engine: "CinePulse Official BFF + Cinemeta IMDb Multi-Season + 5-Server Cloud HLS",
      features: [
        "Instant 2MB RAM Startup Chunk Pre-Warming (<40ms HTTP 206)",
        "12MB Continuous Video Range Streaming Window",
        "Automatic Multi-Season & Episode Discovery (Cinemeta + Sibling Subject Mapper)",
        "Multi-Language Audio Dub Discovery (Hindi, Bangla, Tamil, English, Original)",
        "5-Server Instant Cloud HLS Backup (VidLink, AutoEmbed, VidSrc Pro, SuperEmbed, VidSrc Global)"
      ],
      cacheStats: {
        startupChunksInRam: mbStartupChunkCache.size,
        resolvedPlayStreams: mbPlayStreamCache.size,
        cachedDetails: detailCache.size,
        cachedCatalogs: catalogCache.size
      },
      endpoints: {
        home: "/api/v1/home",
        catalog: "/api/v1/catalog?category=/bollywood&page=1",
        search: "/api/v1/search?q=Squid+Game&page=1",
        details: "/api/v1/details?path=/mb/<subjectId>/<detailPath>",
        stream: "/api/v1/stream?subjectId=<id>&detailPath=<slug>&se=1&ep=1"
      }
    });
  });
  app.get("/api/v1/home", async (_req, res) => {
    try {
      const [homePayload, mainCat] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog("/", 1, "")
      ]);
      res.json({
        ok: true,
        engine: "direct-auto-api-v1",
        sections: homePayload.sections,
        trending: normalizeMovieCardList(mainCat.items)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Failed to load home feed" });
    }
  });
  app.get("/api/v1/catalog", async (req, res) => {
    const category = String(req.query.category || req.query.path || "/").trim() || "/";
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const search = String(req.query.q || req.query.search || "").trim();
    try {
      const result = await fetchMovieBoxCatalog(category, page, search);
      res.json({
        ok: true,
        engine: "direct-auto-api-v1",
        category,
        page,
        maxPage: result.maxPage,
        totalItems: result.items.length,
        items: normalizeMovieCardList(result.items)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Catalog query failed" });
    }
  });
  app.get("/api/v1/search", async (req, res) => {
    const query = String(req.query.q || req.query.keyword || req.query.search || "").trim();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    if (!query) {
      res.status(400).json({ ok: false, error: "Missing search query parameter ?q=" });
      return;
    }
    try {
      const result = await fetchMovieBoxCatalog("/", page, query);
      res.json({
        ok: true,
        engine: "direct-auto-api-v1",
        query,
        page,
        totalItems: result.items.length,
        items: normalizeMovieCardList(result.items)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Search query failed" });
    }
  });
  app.get("/api/v1/details", async (req, res) => {
    const rawPath = String(req.query.path || req.query.url || "").trim();
    const subjectId = String(req.query.id || req.query.subjectId || "").trim();
    const slug = String(req.query.slug || req.query.detailPath || "movie").trim();
    const titleQuery = String(req.query.title || "").trim();
    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }
    try {
      if (!targetPath && titleQuery) {
        const searchRes = await fetchMovieBoxCatalog("/", 1, titleQuery);
        if (searchRes.items.length > 0) {
          targetPath = searchRes.items[0].path;
        }
      }
      if (!targetPath || !targetPath.startsWith("/mb/")) {
        res.status(400).json({
          ok: false,
          error: "Provide ?path=/mb/<subjectId>/<slug>, ?id=<subjectId>, or ?title=<name>"
        });
        return;
      }
      const cached = findCachedDetailByPathOrTitle(targetPath, titleQuery);
      if (cached) {
        const seasons2 = Array.from(
          new Set((cached.episodes || []).map((e) => e.season).filter((s) => s !== null && s > 0))
        ).sort((a, b) => a - b);
        res.json({
          ok: true,
          cached: true,
          engine: "direct-auto-api-v1",
          totalSeasons: seasons2.length || (cached.typeBadge === "SERIES" ? 1 : 0),
          seasons: seasons2,
          totalEpisodes: cached.episodes?.length || 0,
          detail: cached
        });
        return;
      }
      const detail = await fetchMovieBoxDetail(targetPath);
      storeDetailInCaches(targetPath, detail, Date.now() + 12 * 6e4);
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s) => s !== null && s > 0))
      ).sort((a, b) => a - b);
      res.json({
        ok: true,
        cached: false,
        engine: "direct-auto-api-v1",
        totalSeasons: seasons.length || (detail.typeBadge === "SERIES" ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        detail
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Detail resolution failed" });
    }
  });
  app.get("/api/v1/stream", async (req, res) => {
    const subjectId = String(req.query.subjectId || req.query.id || "").trim();
    const detailPath = String(req.query.detailPath || req.query.slug || "movie").trim();
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || "0"), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || "0"), 10) || 0);
    const title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || "Original Audio").trim();
    if (!subjectId) {
      res.status(400).json({ ok: false, error: "Missing ?subjectId= parameter" });
      return;
    }
    try {
      const [initialPlayRes, imdbId] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, ""),
        Promise.race([
          resolveImdbIdForTitle(title, "", se > 0),
          new Promise((r) => setTimeout(() => r(""), 650))
        ])
      ]);
      let playRes = initialPlayRes;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, "");
        if (fbSe1.sources.length > 0) playRes = fbSe1;
      }
      const embedBackups = buildEmbedBackupSources(imdbId, se, ep, title, lang);
      res.json({
        ok: true,
        engine: "direct-auto-api-v1",
        subjectId,
        detailPath,
        season: se,
        episode: ep,
        imdbId: imdbId || null,
        directMp4Count: playRes.sources.length,
        cloudHlsCount: embedBackups.length,
        sources: [...playRes.sources, ...embedBackups],
        downloads: playRes.buttons
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Stream resolution failed" });
    }
  });
  const demoApiRateMap = /* @__PURE__ */ new Map();
  const getPublicOrigin = (req) => {
    const rawHost = String(req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000").split(",")[0].trim();
    const fwdProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
    const cfVisitor = String(req.headers["cf-visitor"] || "").toLowerCase();
    const isKnownHttpsHost = /\.(run\.app|onrender\.com|railway\.app|vercel\.app|workers\.dev)$/i.test(rawHost);
    let proto = fwdProto || (cfVisitor.includes("https") ? "https" : req.protocol || "https");
    if (proto === "http" && isKnownHttpsHost) {
      proto = "https";
    }
    return `${proto}://${rawHost}`;
  };
  const sendPrettyDemoJson = (res, status, payload) => {
    res.status(status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=30");
    res.send(JSON.stringify(payload, null, 2));
  };
  app.use("/api/demo", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "GET") {
      sendPrettyDemoJson(res, 405, { ok: false, error: "Demo API is read-only (GET only)." });
      return;
    }
    const clientIp = String(
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local"
    ).split(",")[0].trim();
    const now = Date.now();
    const rl = demoApiRateMap.get(clientIp);
    if (!rl || now > rl.resetAt) {
      if (demoApiRateMap.size > 2e3) demoApiRateMap.clear();
      demoApiRateMap.set(clientIp, { count: 1, resetAt: now + 6e4 });
    } else {
      rl.count++;
      if (rl.count > 45) {
        sendPrettyDemoJson(res, 429, {
          ok: false,
          error: "Demo rate limit exceeded (max 45 requests/minute per IP)."
        });
        return;
      }
    }
    next();
  });
  app.get(["/api/demo", "/api/demo/status"], (req, res) => {
    const base = getPublicOrigin(req);
    sendPrettyDemoJson(res, 200, {
      ok: true,
      mode: "PUBLIC_DEMO_API",
      service: "CinePulse MovieBox Demo API v1",
      rateLimit: "45 requests / minute per IP (GET read-only)",
      interactiveExplorer: `${base}/demo-api`,
      endpoints: {
        status: `${base}/api/demo/status`,
        home: `${base}/api/demo/home`,
        catalog: `${base}/api/demo/catalog?category=/bollywood&page=1`,
        search: `${base}/api/demo/search?q=Squid+Game`,
        details: `${base}/api/demo/details?title=Squid+Game`,
        stream: `${base}/api/demo/stream?title=Squid+Game&se=1&ep=1`
      },
      categories: [
        "/",
        "/bollywood",
        "/hollywood",
        "/bangla",
        "/korean",
        "/anime",
        "/hindi-dubbed",
        "/web-series"
      ],
      notes: [
        "Demo responses are unencrypted pretty JSON with CORS enabled for quick browser, Postman, and cURL testing.",
        "List outputs are capped at 12 items per request and pagination is capped at page 3 in Demo mode."
      ]
    });
  });
  app.get("/api/demo/home", async (req, res) => {
    const base = getPublicOrigin(req);
    try {
      const [homePayload, mainCat] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog("/", 1, "")
      ]);
      const trending = normalizeMovieCardList(mainCat.items).slice(0, 12).map((item) => ({
        ...item,
        demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`
      }));
      const sections = (homePayload.sections || []).slice(0, 4).map((sec) => ({
        title: sec.title,
        items: (sec.items || []).slice(0, 8).map((item) => ({
          ...item,
          demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`
        }))
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: "DEMO",
        totalSections: sections.length,
        sections,
        trending
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Failed to load demo home" });
    }
  });
  app.get("/api/demo/catalog", async (req, res) => {
    const base = getPublicOrigin(req);
    const category = String(req.query.category || req.query.path || "/").trim() || "/";
    const page = Math.min(3, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    const limit = Math.min(12, Math.max(1, parseInt(String(req.query.limit || "12"), 10) || 12));
    const search = String(req.query.q || req.query.search || "").trim();
    try {
      const result = await fetchMovieBoxCatalog(category, page, search);
      const items = normalizeMovieCardList(result.items).slice(0, limit).map((item) => ({
        ...item,
        demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: "DEMO",
        category,
        page,
        demoMaxPage: 3,
        count: items.length,
        items
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Demo catalog query failed" });
    }
  });
  app.get("/api/demo/search", async (req, res) => {
    const base = getPublicOrigin(req);
    const query = String(req.query.q || req.query.keyword || req.query.search || "Squid Game").trim();
    const page = Math.min(3, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      const result = await fetchMovieBoxCatalog("/", page, query);
      const items = normalizeMovieCardList(result.items).slice(0, 12).map((item) => ({
        ...item,
        demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: "DEMO",
        query,
        page,
        count: items.length,
        items
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Demo search failed" });
    }
  });
  app.get("/api/demo/details", async (req, res) => {
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.url || "").trim();
    const subjectId = String(req.query.id || req.query.subjectId || "").trim();
    const slug = String(req.query.slug || req.query.detailPath || "movie").trim();
    const titleQuery = String(req.query.title || "").trim();
    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }
    try {
      if (!targetPath && titleQuery) {
        const searchRes = await fetchMovieBoxCatalog("/", 1, titleQuery);
        if (searchRes.items.length > 0) {
          targetPath = searchRes.items[0].path;
        }
      }
      if (!targetPath || !targetPath.startsWith("/mb/")) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: "Provide ?title=<movie_name>, ?path=/mb/<subjectId>/<slug>, or ?id=<subjectId>",
          example: `${base}/api/demo/details?title=Squid+Game`
        });
        return;
      }
      const detail = findCachedDetailByPathOrTitle(targetPath, titleQuery) || await fetchMovieBoxDetail(targetPath);
      storeDetailInCaches(targetPath, detail, Date.now() + 12 * 6e4);
      const parts = targetPath.replace(/^\/mb\//, "").split("/");
      const resolvedId = parts[0] || subjectId;
      const resolvedSlug = parts[1] || slug;
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s) => s !== null && s > 0))
      ).sort((a, b) => a - b);
      const demoEpisodes = (detail.episodes || []).slice(0, 24).map((ep) => ({
        ...ep,
        demoStreamUrl: `${base}/api/demo/stream?subjectId=${encodeURIComponent(
          resolvedId
        )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${ep.season ?? 0}&ep=${ep.number ?? 0}&title=${encodeURIComponent(detail.title)}`
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: "DEMO",
        subjectId: resolvedId,
        detailPath: resolvedSlug,
        totalSeasons: seasons.length || (detail.typeBadge === "SERIES" ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        demoStreamUrl: `${base}/api/demo/stream?subjectId=${encodeURIComponent(
          resolvedId
        )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${seasons[0] || 0}&ep=${demoEpisodes[0]?.number ?? 0}&title=${encodeURIComponent(detail.title)}`,
        detail: {
          ...detail,
          episodes: demoEpisodes
        }
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Demo details failed" });
    }
  });
  app.get("/api/demo/stream", async (req, res) => {
    const base = getPublicOrigin(req);
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    let detailPath = String(req.query.detailPath || req.query.slug || "movie").trim();
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || "0"), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || "0"), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || "Original Audio").trim();
    try {
      if (!subjectId && title && title !== "movie") {
        const searchRes = await fetchMovieBoxCatalog("/", 1, title);
        const firstPath = searchRes.items[0]?.path || "";
        if (firstPath.startsWith("/mb/")) {
          const segs = firstPath.replace(/^\/mb\//, "").split("/");
          subjectId = segs[0] || "";
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }
      if (!subjectId) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: "Provide ?subjectId=<id>&detailPath=<slug> or ?title=<name>",
          example: `${base}/api/demo/stream?title=Squid+Game&se=1&ep=1`
        });
        return;
      }
      const [initialPlayRes, imdbId] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, ""),
        Promise.race([
          resolveImdbIdForTitle(title, "", se > 0),
          new Promise((r) => setTimeout(() => r(""), 650))
        ])
      ]);
      let playRes = initialPlayRes;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, "");
        if (fbSe1.sources.length > 0) playRes = fbSe1;
      }
      const embedBackups = buildEmbedBackupSources(imdbId, se, ep, title, lang);
      const toAbsolute = (u) => u.startsWith("/") ? `${base}${u}` : u;
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: "DEMO",
        subjectId,
        detailPath,
        title,
        season: se,
        episode: ep,
        imdbId: imdbId || null,
        directMp4Count: playRes.sources.length,
        cloudHlsCount: embedBackups.length,
        sources: [...playRes.sources, ...embedBackups].slice(0, 8).map((s) => ({
          id: s.id,
          quality: s.quality,
          qualityLabel: s.qualityLabel,
          audio: s.audio,
          provider: s.provider,
          type: s.type,
          url: toAbsolute(s.url),
          downloadUrl: s.downloadUrl ? toAbsolute(s.downloadUrl) : void 0
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Demo stream lookup failed" });
    }
  });
  app.get("/demo-api", (req, res) => {
    const base = getPublicOrigin(req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CinePulse MovieBox Demo API Explorer</title>
  <style>
    :root { color-scheme: dark; --bg:#09090b; --card:#121318; --border:#27272a; --accent:#e50914; --text:#f4f4f5; --muted:#a1a1aa; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 24px 16px 48px; }
    .wrap { max-width: 1020px; margin: 0 auto; }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .dot { width: 10px; height: 10px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .badge { font-size: 12px; padding: 4px 10px; border-radius: 6px; background: #1f1f23; border: 1px solid var(--border); color: var(--muted); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .base-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    code.url { background: #000; border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #38bdf8; word-break: break-all; flex: 1; }
    button { background: var(--accent); color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-size: 13px; cursor: pointer; }
    button.sec { background: #27272a; color: #f4f4f5; }
    button:hover { opacity: 0.92; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 12px; }
    .ep { background: #18181b; border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .ep-title { font-size: 13px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .method { font-size: 11px; color: #4ade80; font-family: monospace; background: rgba(74,222,128,.12); padding: 2px 6px; border-radius: 4px; }
    input, select { width: 100%; background: #09090b; border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 7px; font-size: 13px; }
    .meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    pre { margin: 0; background: #050507; border: 1px solid var(--border); border-radius: 10px; padding: 14px; overflow: auto; max-height: 520px; font-size: 12px; line-height: 1.5; color: #e4e4e7; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brand"><span class="dot"></span> CinePulse MovieBox Demo API</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span class="badge">Live Read-Only Demo \u2022 45 req/min \u2022 CORS Enabled</span>
        <a href="/trial" style="background:#e50914;color:#fff;text-decoration:none;font-size:12px;font-weight:700;padding:5px 11px;border-radius:6px;">Get Trial API Key &rarr;</a>
      </div>
    </div>

    <div class="card">
      <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">Base Demo API URL (Share with client for Browser / Postman / cURL / Fetch):</div>
      <div class="base-row">
        <code class="url" id="baseUrl">${base}/api/demo</code>
        <button class="sec" onclick="copyText('${base}/api/demo', this)">Copy Base URL</button>
        <button onclick="runEndpoint('/api/demo/status')">Test Status</button>
      </div>

      <div class="grid">
        <div class="ep">
          <div class="ep-title"><span>Home Feed</span><span class="method">GET</span></div>
          <div style="font-size:12px;color:var(--muted);">/api/demo/home</div>
          <button onclick="runEndpoint('/api/demo/home')">Try Live</button>
        </div>

        <div class="ep">
          <div class="ep-title"><span>Search Catalog</span><span class="method">GET</span></div>
          <input id="qInput" value="Squid Game" placeholder="Movie or series name..." />
          <button onclick="runEndpoint('/api/demo/search?q=' + encodeURIComponent(document.getElementById('qInput').value || 'Squid Game'))">Search Live</button>
        </div>

        <div class="ep">
          <div class="ep-title"><span>Category Feed</span><span class="method">GET</span></div>
          <select id="catInput">
            <option value="/bollywood">Bollywood</option>
            <option value="/hollywood">Hollywood</option>
            <option value="/bangla">Bangla</option>
            <option value="/korean">Korean</option>
            <option value="/anime">Anime</option>
            <option value="/hindi-dubbed">Hindi Dubbed</option>
          </select>
          <button onclick="runEndpoint('/api/demo/catalog?category=' + encodeURIComponent(document.getElementById('catInput').value) + '&page=1')">Fetch Category</button>
        </div>

        <div class="ep">
          <div class="ep-title"><span>Details &amp; Streams</span><span class="method">GET</span></div>
          <input id="detailTitle" value="Squid Game" placeholder="Title for details/stream..." />
          <div style="display:flex;gap:6px;">
            <button style="flex:1" onclick="runEndpoint('/api/demo/details?title=' + encodeURIComponent(document.getElementById('detailTitle').value || 'Squid Game'))">Details</button>
            <button class="sec" style="flex:1" onclick="runEndpoint('/api/demo/stream?title=' + encodeURIComponent(document.getElementById('detailTitle').value || 'Squid Game') + '&se=1&ep=1')">Stream</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="meta">
        <div>Endpoint: <code id="activeUrl" style="color:#38bdf8;">${base}/api/demo/status</code></div>
        <div id="statusBadge">Ready</div>
      </div>
      <div class="base-row" style="margin-bottom:10px;">
        <code class="url" id="curlCmd">curl "${base}/api/demo/status"</code>
        <button class="sec" onclick="copyText(document.getElementById('curlCmd').textContent, this)">Copy cURL</button>
        <button class="sec" onclick="window.open(document.getElementById('activeUrl').textContent, '_blank')">Open Raw JSON</button>
      </div>
      <pre id="output">Loading live demo response...</pre>
    </div>
  </div>
  <script>
    function copyText(txt, btn) {
      navigator.clipboard.writeText(txt).then(() => {
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = prev, 1400);
      });
    }
    async function runEndpoint(path) {
      const fullUrl = window.location.origin + path;
      document.getElementById('activeUrl').textContent = fullUrl;
      document.getElementById('curlCmd').textContent = 'curl "' + fullUrl + '"';
      document.getElementById('statusBadge').textContent = 'Fetching...';
      document.getElementById('output').textContent = 'Fetching ' + fullUrl + ' ...';
      const t0 = performance.now();
      try {
        const res = await fetch(fullUrl);
        const ms = Math.round(performance.now() - t0);
        const text = await res.text();
        document.getElementById('statusBadge').textContent = 'HTTP ' + res.status + ' \u2022 ' + ms + ' ms';
        try {
          document.getElementById('output').textContent = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          document.getElementById('output').textContent = text;
        }
      } catch (err) {
        document.getElementById('statusBadge').textContent = 'Error';
        document.getElementById('output').textContent = String(err);
      }
    }
    runEndpoint('/api/demo/status');
  </script>
</body>
</html>`);
  });
  const trialDataDir = path.join(__dirname, "data");
  const trialStorePath = path.join(trialDataDir, "cinepulse-trial-keys.json");
  const trialKeysMap = /* @__PURE__ */ new Map();
  const trialCreateIpRate = /* @__PURE__ */ new Map();
  let scheduleCloudBackupToTelegram = () => {
  };
  const flushTrialStoreSync = () => {
    try {
      if (!fs.existsSync(trialDataDir)) {
        fs.mkdirSync(trialDataDir, { recursive: true });
      }
      const keys = Array.from(trialKeysMap.values()).slice(-1e3);
      const tmpFile = `${trialStorePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify({ keys }, null, 2), "utf8");
      fs.renameSync(tmpFile, trialStorePath);
    } catch {
    }
    scheduleCloudBackupToTelegram(false);
  };
  let trialFlushTimer = null;
  const scheduleFlushTrialStore = () => {
    if (trialFlushTimer) return;
    trialFlushTimer = setTimeout(() => {
      trialFlushTimer = null;
      flushTrialStoreSync();
    }, 400);
  };
  const signTrialKeyPayload = (payloadB64) => crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`trial-key::${payloadB64}`).digest("base64url").slice(0, 22);
  const issueSignedTrialKey = (meta) => {
    const payload = {
      n: meta.clientName.slice(0, 32),
      p: meta.plan,
      c: meta.createdAt,
      e: meta.expiresAt,
      m: meta.maxRequests,
      r: crypto.randomBytes(5).toString("hex")
    };
    if (meta.unlimited) payload.u = 1;
    const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const sig = signTrialKeyPayload(payloadB64);
    return `cp_tr1_${payloadB64}.${sig}`;
  };
  const resolveOrRecoverTrialKey = (rawKey) => {
    if (!rawKey) return void 0;
    const existing = trialKeysMap.get(rawKey);
    if (existing) {
      return existing.revoked ? void 0 : existing;
    }
    if (!rawKey.startsWith("cp_tr1_")) return void 0;
    const body = rawKey.slice(7);
    const dotIdx = body.lastIndexOf(".");
    if (dotIdx <= 0) return void 0;
    const payloadB64 = body.slice(0, dotIdx);
    const sig = body.slice(dotIdx + 1);
    const expected = signTrialKeyPayload(payloadB64);
    if (sig.length !== expected.length) return void 0;
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return void 0;
      const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
      if (!parsed || typeof parsed.e !== "number" || typeof parsed.m !== "number") return void 0;
      const validPlans = ["2H", "24H", "72H", "7D", "30D", "UNLIMITED", "CUSTOM"];
      const plan = validPlans.includes(parsed.p) ? parsed.p : "24H";
      const recovered = {
        key: rawKey,
        clientName: String(parsed.n || "Client Trial"),
        plan,
        createdAt: Number(parsed.c) || Date.now(),
        expiresAt: parsed.e,
        maxRequests: parsed.m,
        unlimited: Boolean(parsed.u === 1 || parsed.m < 0 || plan === "UNLIMITED"),
        usedRequests: 0,
        lastUsedAt: null,
        active: true,
        createdIp: "synced"
      };
      trialKeysMap.set(rawKey, recovered);
      flushTrialStoreSync();
      scheduleCloudBackupToTelegram(true);
      return recovered;
    } catch {
      return void 0;
    }
  };
  isActiveTrialStreamToken = (token) => {
    const rec = resolveOrRecoverTrialKey(token);
    if (!rec || !rec.active || Date.now() >= rec.expiresAt) return false;
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    return isUnlimited || rec.usedRequests <= rec.maxRequests;
  };
  let notifyTelegramTrialAlert = () => {
  };
  let capturePublicOriginForBot = () => {
  };
  let startTelegramBotPoller = () => {
  };
  const DEFAULT_CLOUDFLARE_VIDEO_WORKER_URL = "";
  const workerHealthMap = /* @__PURE__ */ new Map();
  const workerHealthInFlight = /* @__PURE__ */ new Map();
  const probeCloudflareWorkerHealth = (workerUrl, force = false) => {
    const clean = String(workerUrl || "").trim().replace(/\/+$/, "");
    if (!clean || !/^https?:\/\//i.test(clean)) {
      return Promise.resolve({
        healthy: false,
        version: 0,
        supportsEpStream: false,
        checkedAt: Date.now(),
        reason: "disabled"
      });
    }
    const existing = workerHealthMap.get(clean);
    if (!force && existing && Date.now() - existing.checkedAt < 6e4) {
      return Promise.resolve(existing);
    }
    const inflight = workerHealthInFlight.get(clean);
    if (inflight) return inflight;
    const job = (async () => {
      try {
        const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) {
          const entry2 = {
            healthy: false,
            version: 0,
            supportsEpStream: false,
            checkedAt: Date.now(),
            reason: `http-${res.status}`
          };
          workerHealthMap.set(clean, entry2);
          return entry2;
        }
        const json = await res.json().catch(() => null);
        const ver = Number(json?.version || 1);
        const isCinePulseNode = String(json?.service || "").toLowerCase().includes("cinepulse");
        const okV2 = Boolean(json?.ok && (ver >= 2 || isCinePulseNode));
        const entry = {
          healthy: okV2,
          version: ver,
          supportsEpStream: isCinePulseNode,
          checkedAt: Date.now(),
          reason: okV2 ? isCinePulseNode ? "active-node-relay" : "active-v2" : "outdated-v1-fallback-server"
        };
        workerHealthMap.set(clean, entry);
        return entry;
      } catch {
        const entry = {
          healthy: false,
          version: 0,
          supportsEpStream: false,
          checkedAt: Date.now(),
          reason: "unreachable-fallback-server"
        };
        workerHealthMap.set(clean, entry);
        return entry;
      } finally {
        workerHealthInFlight.delete(clean);
      }
    })();
    workerHealthInFlight.set(clean, job);
    return job;
  };
  let getConfiguredWorkerUrl = () => {
    const envWorker = String(
      process.env.VIDEO_PROXY_URL || process.env.CF_VIDEO_WORKER_URL || process.env.CF_WORKER_STREAM_URL || ""
    ).trim().replace(/\/+$/, "");
    if (/^(off|none|disable|false)$/i.test(envWorker)) return "";
    if (envWorker && /^https?:\/\//i.test(envWorker)) return envWorker;
    return DEFAULT_CLOUDFLARE_VIDEO_WORKER_URL;
  };
  let resolveStreamProxyOrigin = (fallbackBase) => {
    const candidate = getConfiguredWorkerUrl();
    if (!candidate) return fallbackBase;
    const health = workerHealthMap.get(candidate);
    if (!health || Date.now() - health.checkedAt >= 6e4) {
      void probeCloudflareWorkerHealth(candidate, false);
    }
    if (health && health.healthy) {
      return candidate;
    }
    return fallbackBase;
  };
  void probeCloudflareWorkerHealth(DEFAULT_CLOUDFLARE_VIDEO_WORKER_URL, true);
  const loadTrialKeysStore = () => {
    try {
      if (!fs.existsSync(trialStorePath)) return;
      const raw = JSON.parse(fs.readFileSync(trialStorePath, "utf8"));
      if (raw && Array.isArray(raw.keys)) {
        for (const item of raw.keys) {
          if (item && typeof item.key === "string") {
            trialKeysMap.set(item.key, item);
          }
        }
      }
    } catch {
    }
  };
  loadTrialKeysStore();
  let isTrialOwnerRequest = (req) => {
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || "").trim();
    const adminHdr = String(req.headers["x-trial-admin"] || req.query.adminKey || "").trim();
    return Boolean(adminEnv && adminHdr && adminHdr === adminEnv);
  };
  const signTrialManageToken = (apiKey) => crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`trial-manage::${apiKey}`).digest("hex").slice(0, 32);
  const verifyTrialManageOrAdmin = (req, apiKey) => {
    if (isTrialOwnerRequest(req)) return true;
    const manageHdr = String(req.headers["x-trial-manage-token"] || req.query.manageToken || "").trim();
    if (!manageHdr) return false;
    const expected = signTrialManageToken(apiKey);
    return manageHdr.length === expected.length && crypto.timingSafeEqual(Buffer.from(manageHdr), Buffer.from(expected));
  };
  const extractTrialApiKey = (req) => {
    const hdrKey = String(req.headers["x-api-key"] || "").trim();
    if (hdrKey) return hdrKey;
    const auth = String(req.headers.authorization || "").trim();
    if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
    const qKey = String(req.query.apiKey || req.query.key || "").trim();
    return qKey;
  };
  const buildTrialSummary = (rec, includeManageToken = false, base = "") => {
    const now = Date.now();
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    const remainingRequests = isUnlimited ? -1 : Math.max(0, rec.maxRequests - rec.usedRequests);
    const msLeft = Math.max(0, rec.expiresAt - now);
    const expired = now >= rec.expiresAt;
    const status = !rec.active ? "PAUSED" : expired ? "EXPIRED" : !isUnlimited && remainingRequests <= 0 ? "QUOTA_EXHAUSTED" : "ACTIVE";
    return {
      key: rec.key,
      keyMasked: `${rec.key.slice(0, 13)}...${rec.key.slice(-4)}`,
      clientName: rec.clientName,
      plan: rec.plan,
      unlimited: isUnlimited,
      status,
      active: rec.active,
      usedRequests: rec.usedRequests,
      remainingRequests,
      maxRequests: rec.maxRequests,
      createdAt: new Date(rec.createdAt).toISOString(),
      expiresAt: new Date(rec.expiresAt).toISOString(),
      expiresInMinutes: Math.ceil(msLeft / 6e4),
      lastUsedAt: rec.lastUsedAt ? new Date(rec.lastUsedAt).toISOString() : null,
      ...includeManageToken ? { manageToken: signTrialManageToken(rec.key) } : {},
      ...base ? {
        endpoints: {
          me: `${base}/api/trial/me?apiKey=${rec.key}`,
          categories: `${base}/api/trial/categories?apiKey=${rec.key}`,
          home: `${base}/api/trial/home?apiKey=${rec.key}`,
          suggest: `${base}/api/trial/suggest?q=Squid&apiKey=${rec.key}`,
          search: `${base}/api/trial/search?q=Squid+Game&apiKey=${rec.key}`,
          catalog: `${base}/api/trial/catalog?path=/bollywood&page=1&apiKey=${rec.key}`,
          details: `${base}/api/trial/details?title=Squid+Game&apiKey=${rec.key}`,
          stream: `${base}/api/trial/stream?title=Squid+Game&se=1&ep=1&apiKey=${rec.key}`
        }
      } : {}
    };
  };
  app.use("/api/trial", express.json({ limit: "64kb" }), (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, X-API-Key, Authorization, X-Trial-Manage-Token, X-Trial-Admin"
    );
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.post("/api/trial/keys", (req, res) => {
    capturePublicOriginForBot(req);
    const base = getPublicOrigin(req);
    const clientIp = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
    const isAdmin = isTrialOwnerRequest(req);
    if (!isAdmin) {
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: "Client API key generation is restricted to Owner (/owner panel or Telegram Bot)."
      });
      return;
    }
    const rawName = String(req.body?.clientName || "Client Trial").trim().slice(0, 48) || "Client Trial";
    const rawPlan = String(req.body?.plan || "24H").toUpperCase();
    const validPlans = ["2H", "24H", "72H", "7D", "30D", "UNLIMITED", "CUSTOM"];
    const plan = validPlans.includes(rawPlan) ? rawPlan : "24H";
    let durationHours = 24;
    let maxRequests = 250;
    let unlimited = false;
    if (plan === "2H") {
      durationHours = 2;
      maxRequests = 60;
    } else if (plan === "72H") {
      durationHours = 72;
      maxRequests = 600;
    } else if (plan === "7D") {
      durationHours = 24 * 7;
      maxRequests = 5e3;
    } else if (plan === "30D") {
      durationHours = 24 * 30;
      maxRequests = req.body?.unlimited ? -1 : 1e5;
      unlimited = Boolean(req.body?.unlimited);
    } else if (plan === "UNLIMITED") {
      durationHours = 24 * 3650;
      maxRequests = -1;
      unlimited = true;
    } else if (plan === "CUSTOM") {
      const reqHours = Number(req.body?.durationHours) || 24;
      const reqQuota = Number(req.body?.maxRequests);
      durationHours = isAdmin ? Math.min(87600, Math.max(1, reqHours)) : Math.min(168, Math.max(1, reqHours));
      if (isAdmin && (req.body?.unlimited || reqQuota < 0)) {
        maxRequests = -1;
        unlimited = true;
      } else {
        const cleanQuota = isNaN(reqQuota) ? 250 : reqQuota;
        maxRequests = isAdmin ? Math.min(1e6, Math.max(10, cleanQuota)) : Math.min(1e3, Math.max(20, cleanQuota));
      }
    }
    const now = Date.now();
    const expiresAt = now + durationHours * 36e5;
    const key = issueSignedTrialKey({
      clientName: rawName,
      plan,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited
    });
    const rec = {
      key,
      clientName: rawName,
      plan,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited,
      usedRequests: 0,
      lastUsedAt: null,
      active: true,
      createdIp: clientIp
    };
    trialKeysMap.set(key, rec);
    flushTrialStoreSync();
    sendPrettyDemoJson(res, 201, {
      ok: true,
      message: "Trial API Key generated successfully.",
      trial: buildTrialSummary(rec, true, base)
    });
  });
  app.get("/api/trial/me", (req, res) => {
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: `Missing or invalid Trial API Key. Generate one at ${base}/trial`
      });
      return;
    }
    sendPrettyDemoJson(res, 200, {
      ok: true,
      trial: buildTrialSummary(rec, false, base)
    });
  });
  app.patch("/api/trial/keys/:key", (req, res) => {
    const base = getPublicOrigin(req);
    const key = String(req.params.key || "").trim();
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 404, { ok: false, error: "Trial API key not found." });
      return;
    }
    if (!verifyTrialManageOrAdmin(req, key)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: "Invalid manageToken or admin key." });
      return;
    }
    const isAdmin = isTrialOwnerRequest(req);
    if (typeof req.body?.active === "boolean") {
      rec.active = req.body.active;
    }
    if (typeof req.body?.addHours === "number" && req.body.addHours > 0) {
      const capHours = isAdmin ? 87600 : 168;
      const addMs = Math.min(capHours, req.body.addHours) * 36e5;
      rec.expiresAt = Math.max(Date.now(), rec.expiresAt) + addMs;
    }
    if (isAdmin && typeof req.body?.unlimited === "boolean") {
      rec.unlimited = req.body.unlimited;
      if (req.body.unlimited) rec.maxRequests = -1;
    } else if (typeof req.body?.addRequests === "number" && req.body.addRequests > 0 && rec.maxRequests >= 0) {
      const capReq = isAdmin ? 1e6 : 2e3;
      rec.maxRequests += Math.min(capReq, Math.round(req.body.addRequests));
    }
    flushTrialStoreSync();
    sendPrettyDemoJson(res, 200, {
      ok: true,
      trial: buildTrialSummary(rec, false, base)
    });
  });
  app.delete("/api/trial/keys/:key", (req, res) => {
    const key = String(req.params.key || "").trim();
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 404, { ok: false, error: "Trial API key not found." });
      return;
    }
    if (!verifyTrialManageOrAdmin(req, key)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: "Invalid manageToken or admin key." });
      return;
    }
    rec.active = false;
    rec.revoked = true;
    flushTrialStoreSync();
    sendPrettyDemoJson(res, 200, { ok: true, deleted: key });
  });
  app.get("/api/trial/admin/keys", (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: "Owner login (/owner) or TRIAL_ADMIN_KEY required." });
      return;
    }
    const base = getPublicOrigin(req);
    const list = Array.from(trialKeysMap.values()).filter((r) => !r.revoked).sort((a, b) => b.createdAt - a.createdAt).map((r) => buildTrialSummary(r, false, base));
    sendPrettyDemoJson(res, 200, { ok: true, count: list.length, keys: list });
  });
  const requireValidTrialKey = (req, res, next) => {
    if (req.method !== "GET") {
      sendPrettyDemoJson(res, 405, { ok: false, error: "Trial API endpoints are read-only (GET)." });
      return;
    }
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    if (!key) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: "Trial API Key required. Pass X-API-Key header or ?apiKey= parameter.",
        getTrialKeyAt: `${base}/trial`
      });
      return;
    }
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: "Invalid Trial API Key.",
        getTrialKeyAt: `${base}/trial`
      });
      return;
    }
    if (!rec.active) {
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: "This Trial API Key has been paused or revoked.",
        trial: buildTrialSummary(rec)
      });
      return;
    }
    if (Date.now() >= rec.expiresAt) {
      notifyTelegramTrialAlert(rec, "EXPIRED");
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: "Trial API Key expired. Generate a new key or extend validity.",
        trial: buildTrialSummary(rec),
        getTrialKeyAt: `${base}/trial`
      });
      return;
    }
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    if (!isUnlimited && rec.usedRequests >= rec.maxRequests) {
      notifyTelegramTrialAlert(rec, "QUOTA_EXHAUSTED");
      sendPrettyDemoJson(res, 429, {
        ok: false,
        error: `Trial request quota exhausted (${rec.maxRequests}/${rec.maxRequests} used).`,
        trial: buildTrialSummary(rec),
        getTrialKeyAt: `${base}/trial`
      });
      return;
    }
    rec.usedRequests += 1;
    rec.lastUsedAt = Date.now();
    scheduleFlushTrialStore();
    const remaining = isUnlimited ? "UNLIMITED" : String(Math.max(0, rec.maxRequests - rec.usedRequests));
    res.setHeader("X-Trial-Plan", rec.plan);
    res.setHeader("X-RateLimit-Limit", isUnlimited ? "UNLIMITED" : String(rec.maxRequests));
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-Trial-Expires-At", new Date(rec.expiresAt).toISOString());
    req._trialKeyRec = rec;
    next();
  };
  app.get("/api/trial/categories", requireValidTrialKey, (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const mbCategories = ALL_CATEGORIES;
    sendPrettyDemoJson(res, 200, {
      ok: true,
      source: "official-moviebox-original",
      trial: buildTrialSummary(rec),
      categories: mbCategories.map((c) => ({
        ...c,
        catalogEndpoint: `${base}/api/trial/catalog?path=${encodeURIComponent(c.path)}&page=1`
      }))
    });
  });
  const trialHotSearchCache = { data: null, expiresAt: 0 };
  const fetchMovieBoxHotSearches = async () => {
    if (trialHotSearchCache.data && trialHotSearchCache.expiresAt > Date.now()) {
      return trialHotSearchCache.data;
    }
    const hdrs = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: `${MOVIEBOX_ORIGIN}/`,
      "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
      "X-Forwarded-For": "103.106.238.10",
      "X-Real-IP": "103.106.238.10",
      "CF-IPCountry": "BD"
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/subject/everyone-search`, {
          headers: hdrs,
          signal: AbortSignal.timeout(5e3)
        });
        if (!r.ok) throw new Error("Bad status");
        const j = await r.json();
        if (!j?.data) throw new Error("Empty");
        return j.data;
      })
    ).catch(() => null);
    const keywords = Array.isArray(json?.everyoneSearch) ? json.everyoneSearch.map((x) => String(x?.title || "").trim()).filter(Boolean) : [];
    const hotGroups = Array.isArray(json?.hot) ? json.hot.map((grp) => ({
      category: String(grp?.name || grp?.category || "Hot"),
      items: normalizeMovieCardList(
        (Array.isArray(grp?.items) ? grp.items : []).map((raw, i) => mapMovieBoxItemToCard(raw, i)).filter(Boolean)
      ).slice(0, 18)
    })) : [];
    const out = { keywords, hotGroups };
    if (keywords.length > 0 || hotGroups.length > 0) {
      trialHotSearchCache.data = out;
      trialHotSearchCache.expiresAt = Date.now() + 6e5;
    }
    return out;
  };
  const trialRelatedCache = /* @__PURE__ */ new Map();
  const fetchMovieBoxRelatedItems = async (subjectId, page = 1) => {
    if (!subjectId) return [];
    const ck = `${subjectId}::${page}`;
    const hit = trialRelatedCache.get(ck);
    if (hit && hit.expiresAt > Date.now()) return hit.items;
    const hdrs = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: `${MOVIEBOX_ORIGIN}/`,
      "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
      "X-Forwarded-For": "103.106.238.10",
      "X-Real-IP": "103.106.238.10",
      "CF-IPCountry": "BD"
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(
          `${origin}/wefeed-h5api-bff/subject/detail-rec?subjectId=${encodeURIComponent(subjectId)}&page=${page}&perPage=18`,
          { headers: hdrs, signal: AbortSignal.timeout(5e3) }
        );
        if (!r.ok) throw new Error("Bad status");
        const j = await r.json();
        if (!Array.isArray(j?.data?.items)) throw new Error("Empty");
        return j.data.items;
      })
    ).catch(() => []);
    const cards = normalizeMovieCardList(
      json.map((raw, idx) => mapMovieBoxItemToCard(raw, idx)).filter(Boolean)
    ).slice(0, 18);
    if (cards.length > 0) {
      if (trialRelatedCache.size > 200) trialRelatedCache.clear();
      trialRelatedCache.set(ck, { items: cards, expiresAt: Date.now() + 6e5 });
    }
    return cards;
  };
  const trialAllOpsCache = { sections: [], expiresAt: 0 };
  const fetchMovieBoxUnfilteredSections = async () => {
    if (trialAllOpsCache.sections.length > 0 && trialAllOpsCache.expiresAt > Date.now()) {
      return trialAllOpsCache.sections;
    }
    const hdrs = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
      Origin: "https://moviebox.ph",
      Referer: "https://moviebox.ph/",
      "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
      "X-Forwarded-For": "103.106.238.10",
      "X-Real-IP": "103.106.238.10",
      "CF-IPCountry": "BD",
      "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7"
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN, "https://moviebox.ph"].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/home`, {
          headers: hdrs,
          signal: AbortSignal.timeout(5e3)
        });
        if (!r.ok) throw new Error("Bad status");
        const j = await r.json();
        if (!Array.isArray(j?.data?.operatingList)) throw new Error("Empty");
        return j.data.operatingList;
      })
    ).catch(() => []);
    const out = [];
    const seenTitle = /* @__PURE__ */ new Set();
    for (const op of json) {
      if (op?.type !== "SUBJECTS_MOVIE" || !op?.title || !Array.isArray(op?.subjects) || !op.subjects.length) {
        continue;
      }
      const title = String(op.title).trim();
      const key = title.toLowerCase();
      if (seenTitle.has(key)) continue;
      seenTitle.add(key);
      const cards = normalizeMovieCardList(
        op.subjects.map((raw, i) => mapMovieBoxItemToCard(raw, i)).filter(Boolean)
      ).slice(0, 20);
      if (cards.length > 0) out.push({ title, items: cards });
    }
    if (out.length > 0) {
      trialAllOpsCache.sections = out;
      trialAllOpsCache.expiresAt = Date.now() + 6e5;
    }
    return out;
  };
  app.get("/api/trial/hot-search", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    try {
      const hot = await fetchMovieBoxHotSearches();
      const attachDet = (items) => items.map((it) => ({
        ...it,
        detailsEndpoint: it.path ? `${base}/api/trial/details?path=${encodeURIComponent(it.path)}` : void 0
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        keywords: hot.keywords,
        hotGroups: hot.hotGroups.map((g) => ({ ...g, items: attachDet(g.items) }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Hot search fetch failed" });
    }
  });
  app.get("/api/trial/home", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    try {
      const [homePayload, mbMain, hotData, allOfficial] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog("/", 1, ""),
        fetchMovieBoxHotSearches(),
        fetchMovieBoxUnfilteredSections()
      ]);
      const attachDetUrl = (item) => ({
        ...item,
        detailsEndpoint: item.path ? `${base}/api/trial/details?path=${encodeURIComponent(item.path)}` : void 0
      });
      const mbCategories = ALL_CATEGORIES;
      const trendingItems = normalizeMovieCardList(mbMain.items).filter((it) => it.path?.startsWith("/mb/")).slice(0, 48);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        categories: mbCategories,
        banners: (homePayload.banners || []).map((b) => ({
          ...b,
          detailsEndpoint: b.path ? `${base}/api/trial/details?path=${encodeURIComponent(b.path)}` : void 0
        })),
        liveSports: homePayload.liveSports || [],
        quickCategories: homePayload.quickCategories || [],
        comingSoon: (homePayload.comingSoon || []).map(attachDetUrl),
        hotSearches: hotData.keywords || [],
        sections: (homePayload.sections || []).map((sec) => ({
          ...sec,
          items: (sec.items || []).map(attachDetUrl)
        })),
        allOfficialSections: allOfficial.map((sec) => ({
          ...sec,
          items: sec.items.map(attachDetUrl)
        })),
        trending: trendingItems.map(attachDetUrl)
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial home fetch failed" });
    }
  });
  const getMovieBoxAuthHeaders = async (_origin) => {
    if (!cachedMovieBoxToken || cachedMovieBoxTokenExpiresAt <= Date.now()) {
      await getMovieBoxBearerToken(false).catch(() => {
      });
    }
    const hdrs = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" }),
      "X-Forwarded-For": "103.106.238.10",
      "X-Real-IP": "103.106.238.10",
      "CF-IPCountry": "BD",
      "Accept-Language": "en-US,en;q=0.9,bn;q=0.8,hi;q=0.7",
      "X-Vip-Restrict": "0",
      "X-No-High-Risk-Restrict": "1",
      "X-Request-Lang": "en",
      Referer: "https://movie-box.co/?utm_source=mb_app_inner_btmtip"
    };
    if (cachedMovieBoxToken) {
      hdrs.Authorization = `Bearer ${cachedMovieBoxToken}`;
    } else {
      hdrs["X-Client-Token"] = generateMovieBoxClientToken();
    }
    return hdrs;
  };
  app.get("/api/trial/suggest", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const q = String(req.query.q || "").trim();
    if (!q) {
      sendPrettyDemoJson(res, 200, { ok: true, source: "official-moviebox-original", trial: buildTrialSummary(rec), keywords: [], items: [] });
      return;
    }
    try {
      const mbHeaders = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const [suggestJson, mbRes] = await Promise.all([
        Promise.any(
          [MOVIEBOX_FALLBACK_API_ORIGIN, "https://moviebox01.com", MOVIEBOX_API_ORIGIN].map(async (origin) => {
            const r = await fetch(`${origin}/wefeed-h5api-bff/subject/search-suggest`, {
              method: "POST",
              headers: mbHeaders,
              body: JSON.stringify({ keyword: q, perPage: 16 }),
              signal: AbortSignal.timeout(3500)
            });
            if (!r.ok) throw new Error("Bad status");
            const j = await r.json();
            if (!Array.isArray(j?.data?.items)) throw new Error("Empty");
            return j.data;
          })
        ).catch(() => null),
        fetchMovieBoxCatalog("/", 1, q)
      ]);
      const keywords = Array.isArray(suggestJson?.items) ? Array.from(new Set(suggestJson.items.map((x) => String(x?.word || "").trim()).filter(Boolean))) : [];
      const suggestCards = Array.isArray(suggestJson?.items) ? suggestJson.items.map((x, i) => x?.subject ? mapMovieBoxItemToCard(x.subject, i) : null).filter(Boolean) : [];
      const combined = normalizeMovieCardList(deduplicateMovieCards([...suggestCards, ...mbRes.items])).filter((it) => it.path?.startsWith("/mb/")).slice(0, 40);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        query: q,
        keywords,
        count: combined.length,
        items: combined.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial suggest failed" });
    }
  });
  app.get("/api/trial/catalog", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.category || "/").trim() || "/";
    const page = Math.min(50, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    const search = String(req.query.q || req.query.search || "").trim();
    const isNewUploadsView = rawPath === "/new-uploads";
    const isNewReleasesView = rawPath === "/new-releases";
    const isHotDhamakaView = rawPath === "/hot-dhamaka";
    const isTrendingHomeView = rawPath === "/" || rawPath === "";
    const upstreamBasePath = isNewUploadsView || isNewReleasesView || isHotDhamakaView ? "/" : rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    try {
      const mbTargetPath = isNewReleasesView ? "/new-releases" : isNewUploadsView ? "/new-uploads" : upstreamBasePath;
      const isHomeOrGlobal = !search && page === 1 && (isTrendingHomeView || isHotDhamakaView || isNewUploadsView || isNewReleasesView);
      const tasks = [
        fetchMovieBoxCatalog(mbTargetPath, page, search)
      ];
      if (isHomeOrGlobal) {
        tasks.push(
          fetchMovieBoxCatalog("/language/bangla", 1, ""),
          fetchMovieBoxCatalog("/bollywood", 1, ""),
          fetchMovieBoxCatalog("/language/hindi-dubbed", 1, "")
        );
      }
      const settled = await Promise.allSettled(tasks);
      const primaryMain = settled[0]?.status === "fulfilled" ? settled[0].value : { items: [], maxPage: 2500 };
      const extraRegional = [];
      for (let i = 1; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === "fulfilled") extraRegional.push(...r.value.items.slice(0, 10));
      }
      let items = deduplicateMovieCards([...primaryMain.items, ...extraRegional]).filter(
        (it) => it.path?.startsWith("/mb/")
      );
      if (isNewUploadsView) {
        items = sortItemsByRecentUpload(items);
      } else if (isNewReleasesView) {
        const sortedRecent = sortItemsByRecentUpload(items);
        const release2026And2025 = sortedRecent.filter(
          (i) => i.title.includes("2026") || i.title.includes("2025")
        );
        const releaseOlder = sortedRecent.filter(
          (i) => !i.title.includes("2026") && !i.title.includes("2025")
        );
        items = [...release2026And2025, ...releaseOlder];
      } else if (isHotDhamakaView) {
        items = sortItemsByHotAndHype(items);
      } else {
        items = normalizeMovieCardList(items);
      }
      items = items.slice(0, 64);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        path: rawPath,
        page,
        maxPage: Math.max(primaryMain.maxPage || 1, 50),
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial catalog fetch failed" });
    }
  });
  app.get("/api/trial/search", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const query = String(req.query.q || req.query.keyword || req.query.search || "").trim();
    const page = Math.min(20, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    if (!query) {
      sendPrettyDemoJson(res, 400, {
        ok: false,
        error: "Missing ?q= search parameter.",
        trial: buildTrialSummary(rec)
      });
      return;
    }
    try {
      const mbRes = await fetchMovieBoxCatalog("/", page, query);
      const items = normalizeMovieCardList(deduplicateMovieCards(mbRes.items)).filter((it) => it.path?.startsWith("/mb/")).slice(0, 64);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        query,
        page,
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial search failed" });
    }
  });
  app.get("/api/trial/details", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.url || "").trim();
    const subjectId = String(req.query.id || req.query.subjectId || "").trim();
    const slug = String(req.query.slug || req.query.detailPath || "movie").trim();
    const titleQuery = String(req.query.title || "").trim();
    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }
    const streamBase = resolveStreamProxyOrigin(base);
    const streamHealth = streamBase !== base ? workerHealthMap.get(streamBase) : void 0;
    const toTrialUrl = (u) => {
      if (!u || !u.startsWith("/")) return u;
      const sep = u.includes("?") ? "&" : "?";
      const isWorkerEligible = u.startsWith("/api/mb-stream") || u.startsWith("/api/mb-subtitle-srt");
      const isServerEpStream = u.startsWith("/api/mb-ep-stream");
      const needsTk = isWorkerEligible || isServerEpStream;
      const useStreamHost = isWorkerEligible || isServerEpStream && Boolean(streamHealth?.supportsEpStream);
      const hostBase = useStreamHost ? streamBase : base;
      return `${hostBase}${u}${needsTk ? `${sep}tk=${encodeURIComponent(rec.key)}` : ""}`;
    };
    try {
      let mbPath = targetPath;
      if (!mbPath.startsWith("/mb/")) {
        const queryFromPath = targetPath.replace(/^\/(?:movie|series|anime|drama)\//i, "").replace(/[-_]+/g, " ").trim();
        const searchTitle = extractBaseSeriesTitle(titleQuery || queryFromPath).split(/\s+/).slice(0, 5).join(" ");
        if (searchTitle.length >= 2) {
          const mbSearch = await fetchMovieBoxCatalog("/", 1, searchTitle);
          const mbMatch = mbSearch.items.find((it) => it.path?.startsWith("/mb/"));
          if (mbMatch) {
            mbPath = mbMatch.path;
          }
        }
      }
      if (!mbPath || !mbPath.startsWith("/mb/")) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: "Provide ?title=<name>, ?path=/mb/<subjectId>/<slug>, or ?subjectId=<id>",
          trial: buildTrialSummary(rec)
        });
        return;
      }
      const cached = findCachedDetailByPathOrTitle(mbPath, titleQuery);
      const [detail, relatedRaw] = await Promise.all([
        cached && cached.url?.startsWith("/mb/") ? Promise.resolve(cached) : fetchMovieBoxDetail(mbPath),
        fetchMovieBoxRelatedItems(mbPath.replace(/^\/mb\//, "").split("/")[0] || subjectId || "", 1)
      ]);
      storeDetailInCaches(mbPath, detail, Date.now() + 12 * 6e4);
      const parts = mbPath.replace(/^\/mb\//, "").split("/");
      const resolvedId = parts[0] || subjectId || "";
      const resolvedSlug = parts[1] || slug;
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s) => s !== null && s > 0))
      ).sort((a, b) => a - b);
      const isSeriesDetail = seasons.length > 0 || detail.typeBadge === "SERIES";
      const firstSe = isSeriesDetail ? seasons[0] || 1 : 0;
      const firstEp = isSeriesDetail ? detail.episodes?.[0]?.number ?? 1 : 0;
      const extIds = await Promise.race([
        resolveExternalMediaIds(detail.title, detail.releaseDate || "", isSeriesDetail),
        new Promise((r) => setTimeout(() => r({ imdbId: "", tmdbId: "" }), 2200))
      ]);
      const embedServers = buildEmbedBackupSources(
        extIds.imdbId,
        firstSe,
        firstEp,
        detail.title,
        detail.language || "Original Audio",
        extIds.tmdbId
      );
      const makeEmbedUrl = (seNum, epNum) => `${base}/trial-embed?apiKey=${encodeURIComponent(rec.key)}&subjectId=${encodeURIComponent(
        resolvedId
      )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${seNum}&ep=${epNum}&title=${encodeURIComponent(detail.title)}`;
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        subjectId: resolvedId,
        detailPath: resolvedSlug,
        imdbId: extIds.imdbId || null,
        tmdbId: extIds.tmdbId || null,
        totalSeasons: seasons.length || (detail.typeBadge === "SERIES" ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        embedPlayerUrl: makeEmbedUrl(firstSe, firstEp),
        embedServers,
        detail: {
          ...detail,
          dubs: Array.isArray(detail.dubs) ? detail.dubs.map((d) => ({
            ...d,
            detailsEndpoint: d?.path ? `${base}/api/trial/details?path=${encodeURIComponent(d.path)}` : void 0,
            streamEndpoint: d?.path ? `${base}/api/trial/stream?path=${encodeURIComponent(d.path)}&se=${firstSe}&ep=${firstEp}&title=${encodeURIComponent(detail.title)}` : void 0
          })) : void 0,
          downloadButtons: (detail.downloadButtons || []).map((b) => ({
            ...b,
            url: toTrialUrl(b.url)
          })),
          episodes: (detail.episodes || []).map((ep) => {
            const epSe = ep.season ?? (isSeriesDetail ? 1 : 0);
            const epNo = ep.number ?? (isSeriesDetail ? 1 : 0);
            return {
              ...ep,
              embedPlayerUrl: makeEmbedUrl(epSe, epNo),
              sources: (ep.sources || []).map((s) => ({
                ...s,
                url: toTrialUrl(s.url),
                downloadUrl: s.downloadUrl ? toTrialUrl(s.downloadUrl) : void 0
              })),
              streamEndpoint: `${base}/api/trial/stream?subjectId=${encodeURIComponent(
                resolvedId
              )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${epSe}&ep=${epNo}&title=${encodeURIComponent(detail.title)}`
            };
          })
        },
        relatedMovies: relatedRaw.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        })),
        commentsEndpoint: `${base}/api/trial/comments?subjectId=${encodeURIComponent(resolvedId)}&page=1`
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial details failed" });
    }
  });
  app.get("/api/trial/related", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || "").trim();
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    const titleQuery = String(req.query.title || "").trim();
    const page = Math.min(10, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      if (!subjectId && rawPath.startsWith("/mb/")) {
        subjectId = rawPath.replace(/^\/mb\//, "").split("/")[0] || "";
      }
      if (!subjectId && titleQuery) {
        const s = await fetchMovieBoxCatalog("/", 1, titleQuery);
        const match = s.items.find((it) => it.path?.startsWith("/mb/"));
        if (match) subjectId = match.path.replace(/^\/mb\//, "").split("/")[0] || "";
      }
      if (!subjectId) {
        sendPrettyDemoJson(res, 400, { ok: false, error: "Provide ?subjectId=, ?path=/mb/..., or ?title=" });
        return;
      }
      const items = await fetchMovieBoxRelatedItems(subjectId, page);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        subjectId,
        page,
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Related movies fetch failed" });
    }
  });
  app.get("/api/trial/comments", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const rawPath = String(req.query.path || "").trim();
    const rawTitle = String(req.query.title || "").trim();
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    const rawPage = String(req.query.page || req.query.cursor || "").trim();
    const upstreamPage = !rawPage || rawPage === "1" || rawPage === "0" ? "0" : rawPage;
    if (!subjectId && rawPath.startsWith("/mb/")) {
      subjectId = rawPath.replace(/^\/mb\//, "").split("/")[0] || "";
    }
    if (!subjectId && rawTitle) {
      try {
        const searchRes = await fetchMovieBoxCatalog("/", 1, rawTitle);
        const first = searchRes.items.find((it) => it.path?.startsWith("/mb/"));
        if (first) subjectId = first.path.replace(/^\/mb\//, "").split("/")[0] || "";
      } catch {
      }
    }
    if (!subjectId) {
      sendPrettyDemoJson(res, 400, { ok: false, error: "Provide ?subjectId=, ?title=, or ?path=/mb/..." });
      return;
    }
    try {
      const headers = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const data = await Promise.any(
        ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
          const r = await fetch(
            `${origin}/wefeed-h5api-bff/post/list/subject?id=${encodeURIComponent(subjectId)}&page=${encodeURIComponent(upstreamPage)}&perPage=20`,
            { headers, signal: AbortSignal.timeout(4500) }
          );
          if (!r.ok) throw new Error("Bad status");
          const j = await r.json();
          if (!j?.data) throw new Error("Empty");
          return j.data;
        })
      ).catch(() => ({ items: [], pager: { totalCount: 0, hasMore: false, nextPage: "" } }));
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const comments = rawItems.map((it, idx) => ({
        id: String(it?.postId || it?.id || idx),
        userName: String(it?.user?.nickname || it?.user?.nickName || it?.user?.username || "MovieBox User"),
        avatar: String(it?.user?.avatar || ""),
        title: String(it?.title || ""),
        content: String(it?.content || it?.text || it?.title || ""),
        rating: it?.subjectRate ?? it?.score ?? it?.rating ?? null,
        likes: Number(it?.stat?.likeCount ?? it?.likeCount ?? 0),
        replies: Number(it?.stat?.commentCount ?? it?.commentCount ?? 0),
        createdAt: it?.createdAt || it?.createTime || null
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        subjectId,
        page: upstreamPage,
        hasMore: Boolean(data?.pager?.hasMore),
        nextPage: String(data?.pager?.nextPage || ""),
        count: comments.length,
        totalCount: Number(data?.pager?.totalCount || comments.length),
        comments
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Comments fetch failed" });
    }
  });
  app.get("/api/trial/staff", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const staffId = String(req.query.staffId || req.query.id || "").trim();
    const page = Math.min(20, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    if (!staffId) {
      sendPrettyDemoJson(res, 400, { ok: false, error: "Provide ?staffId=<id>" });
      return;
    }
    try {
      const headers = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const [subjectsJson, relatedJson] = await Promise.all([
        Promise.any(
          ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
            const r = await fetch(
              `${origin}/wefeed-h5api-bff/staff/subject-list?perPage=24&page=${page}&staffId=${encodeURIComponent(staffId)}`,
              { headers, signal: AbortSignal.timeout(4500) }
            );
            if (!r.ok) throw new Error("Bad status");
            return await r.json();
          })
        ).catch(() => null),
        Promise.any(
          ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
            const r = await fetch(
              `${origin}/wefeed-h5api-bff/staff/staff-related?staffId=${encodeURIComponent(staffId)}`,
              { headers, signal: AbortSignal.timeout(3500) }
            );
            if (!r.ok) throw new Error("Bad status");
            return await r.json();
          })
        ).catch(() => null)
      ]);
      const rawList = subjectsJson?.data?.subjectList || subjectsJson?.data?.items || [];
      const items = normalizeMovieCardList(
        (Array.isArray(rawList) ? rawList : []).map((raw, i) => mapMovieBoxItemToCard(raw, i)).filter(Boolean)
      );
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        staffId,
        page,
        staffInfo: subjectsJson?.data?.staff || null,
        relatedStaff: relatedJson?.data?.items || relatedJson?.data || [],
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Staff fetch failed" });
    }
  });
  app.get("/api/trial/filter-options", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    try {
      const headers = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const data = await Promise.any(
        ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
          const r = await fetch(`${origin}/wefeed-h5api-bff/filter`, {
            headers,
            signal: AbortSignal.timeout(4500)
          });
          if (!r.ok) throw new Error("Bad status");
          const j = await r.json();
          if (!j?.data?.filterItemsData) throw new Error("Missing filterItemsData");
          return j.data.filterItemsData;
        })
      );
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        filterOptions: data
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Filter options fetch failed" });
    }
  });
  app.get("/api/trial/platform", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const platform = String(req.query.name || req.query.platform || "Netflix").trim() || "Netflix";
    const page = Math.min(50, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      const headers = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const platJson = await Promise.any(
        ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
          const r = await fetch(
            `${origin}/wefeed-h5api-bff/platform/play-list?page=${page}&perPage=24&platform=${encodeURIComponent(platform)}`,
            { headers, signal: AbortSignal.timeout(4500) }
          );
          if (!r.ok) throw new Error("Bad status");
          const j = await r.json();
          const list = j?.data?.subjectList || j?.data?.items || [];
          if (!Array.isArray(list) || list.length === 0) throw new Error("Empty");
          return list;
        })
      ).catch(() => null);
      let items = [];
      if (Array.isArray(platJson) && platJson.length > 0) {
        items = normalizeMovieCardList(
          platJson.map((raw, i) => mapMovieBoxItemToCard(raw, i)).filter(Boolean)
        );
      } else {
        const fb = await fetchMovieBoxCatalog("/", page, platform);
        items = normalizeMovieCardList(fb.items);
      }
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        platform,
        availablePlatforms: ["Netflix", "PrimeVideo", "Disney", "AppleTV", "Viu", "Hulu", "Zee5", "Vivamax", "Hoichoi", "Showmax"],
        page,
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Platform feed failed" });
    }
  });
  app.get("/api/trial/upcoming", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const page = Math.min(20, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      const headers = await getMovieBoxAuthHeaders(MOVIEBOX_ORIGIN);
      const [upJson, homePayload] = await Promise.all([
        Promise.any(
          ["https://moviebox01.com", MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
            const r = await fetch(
              `${origin}/wefeed-h5api-bff/upcoming-subject-list?page=${page}&perPage=24`,
              { headers, signal: AbortSignal.timeout(4e3) }
            );
            if (!r.ok) throw new Error("Bad status");
            return await r.json();
          })
        ).catch(() => null),
        fetchMovieBoxHomePayload()
      ]);
      const upRaw = upJson?.data?.subjects || upJson?.data?.items || [];
      const upCards = (Array.isArray(upRaw) ? upRaw : []).map((raw, i) => mapMovieBoxItemToCard(raw, i)).filter(Boolean);
      const combined = upCards.length > 0 ? upCards : homePayload.comingSoon || [];
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        page,
        count: combined.length,
        items: combined.map((item) => ({
          ...item,
          detailsEndpoint: item.path ? `${base}/api/trial/details?path=${encodeURIComponent(item.path)}` : void 0
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Upcoming fetch failed" });
    }
  });
  app.get("/api/trial/sports", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const sportType = String(req.query.type || req.query.sportType || "all").trim().toLowerCase();
    const leagueId = String(req.query.leagueId || "").trim();
    const page = Math.min(20, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      const sportHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Accept: "application/json",
        "X-Client-Info": JSON.stringify({ timezone: "Asia/Dhaka" })
      };
      const qs = new URLSearchParams({ page: String(page), perPage: "30" });
      if (sportType && sportType !== "all") qs.set("sportType", sportType);
      if (leagueId) qs.set("leagueId", leagueId);
      const [matchesJson, leaguesJson] = await Promise.all([
        fetch(`https://h5-sport-api.aoneroom.com/wefeed-h5api-bff/live/match-list-v5?${qs.toString()}`, {
          headers: sportHeaders,
          signal: AbortSignal.timeout(5e3)
        }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("https://h5-sport-api.aoneroom.com/wefeed-h5api-bff/live/league-tab", {
          headers: sportHeaders,
          signal: AbortSignal.timeout(4e3)
        }).then((r) => r.ok ? r.json() : null).catch(() => null)
      ]);
      const rawList = Array.isArray(matchesJson?.data?.list) ? matchesJson.data.list : [];
      const filtered = sportType && sportType !== "all" ? rawList.filter((m) => String(m?.type || "").toLowerCase() === sportType) : rawList;
      const finalRaw = filtered.length > 0 ? filtered : rawList;
      const matches = finalRaw.map((m) => ({
        id: String(m?.id || ""),
        sportType: String(m?.type || "football"),
        league: String(m?.league || ""),
        leagueId: String(m?.leagueId || ""),
        status: String(m?.status || ""),
        isLive: String(m?.status || "") === "MatchIng" || Number(m?.statusLive) === 2,
        startTimeMs: Number(m?.startTime || 0) || null,
        team1: {
          name: String(m?.team1?.name || ""),
          score: String(m?.team1?.score ?? m?.teamMatchInfo1?.score ?? ""),
          avatar: String(m?.team1?.avatar || ""),
          cricket: m?.teamMatchInfo1?.crtRunsScored ? {
            runs: m.teamMatchInfo1.crtRunsScored,
            wickets: m.teamMatchInfo1.crtWicketsLost,
            overs: m.teamMatchInfo1.crtOvers
          } : void 0
        },
        team2: {
          name: String(m?.team2?.name || ""),
          score: String(m?.team2?.score ?? m?.teamMatchInfo2?.score ?? ""),
          avatar: String(m?.team2?.avatar || ""),
          cricket: m?.teamMatchInfo2?.crtRunsScored ? {
            runs: m.teamMatchInfo2.crtRunsScored,
            wickets: m.teamMatchInfo2.crtWicketsLost,
            overs: m.teamMatchInfo2.crtOvers
          } : void 0
        },
        liveM3u8Url: String(m?.playPath || ""),
        channels: Array.isArray(m?.playSource) ? m.playSource.filter((c) => c?.path).map((c) => ({ title: String(c.title || "Live Channel"), url: String(c.path) })) : [],
        watchPageUrl: m?.id ? `https://sportsnow.top/live/detail?id=${encodeURIComponent(String(m.id))}&sportType=${encodeURIComponent(
          String(m?.type || "football")
        )}` : "",
        hasHighlights: Boolean(m?.highlights && (Array.isArray(m.highlights) ? m.highlights.length : true)),
        hasReplay: Boolean(m?.replay && (Array.isArray(m.replay) ? m.replay.length : true))
      }));
      const leagues = Array.isArray(leaguesJson?.data?.list) ? leaguesJson.data.list.map((l) => ({
        id: String(l?.id || ""),
        name: String(l?.localName || l?.name || "")
      })) : [];
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-sports-live",
        trial: buildTrialSummary(rec),
        sportType,
        page,
        hasMore: Boolean(matchesJson?.data?.hasMore),
        count: matches.length,
        liveNowCount: matches.filter((x) => x.isLive || x.liveM3u8Url).length,
        leagues,
        matches
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Sports live fetch failed" });
    }
  });
  app.get("/api/trial/shorts", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const page = Math.min(50, Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1));
    try {
      const mbRes = await fetchMovieBoxCatalog("/category/short-tv", page, "");
      const items = normalizeMovieCardList(deduplicateMovieCards(mbRes.items)).filter((it) => it.path?.startsWith("/mb/")).slice(0, 64);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        trial: buildTrialSummary(rec),
        channel: "Hot Short TV (Short Drama Reels)",
        page,
        maxPage: Math.max(mbRes.maxPage || 1, 50),
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
          streamEndpoint: `${base}/api/trial/stream?path=${encodeURIComponent(item.path)}&se=1&ep=1&title=${encodeURIComponent(item.title)}`
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Shorts fetch failed" });
    }
  });
  app.get("/api/trial/stream", requireValidTrialKey, async (req, res) => {
    const rec = req._trialKeyRec;
    const base = getPublicOrigin(req);
    const rawPathParam = String(req.query.path || "").trim();
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    let detailPath = String(req.query.detailPath || req.query.slug || "movie").trim();
    if (!subjectId && rawPathParam.startsWith("/mb/")) {
      const segs = rawPathParam.replace(/^\/mb\//, "").split("/");
      subjectId = segs[0] || "";
      detailPath = segs[1] || detailPath;
    }
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || "0"), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || "0"), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || "Original Audio").trim();
    try {
      if (!subjectId && title && title !== "movie") {
        let searchRes = await fetchMovieBoxCatalog("/", 1, title);
        if (!searchRes.items.length) {
          const cleanTitle = title.replace(/\s*(Full\s*HD|HD|1080p|720p)\s*$/i, "").replace(/\s*\(\d{4}\)\s*/g, " ").trim();
          if (cleanTitle && cleanTitle !== title) {
            searchRes = await fetchMovieBoxCatalog("/", 1, cleanTitle);
          }
        }
        const firstPath = searchRes.items[0]?.path || "";
        if (firstPath.startsWith("/mb/")) {
          const segs = firstPath.replace(/^\/mb\//, "").split("/");
          subjectId = segs[0] || "";
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }
      if (!subjectId) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: "Provide ?path=/mb/<id>/<slug>, ?subjectId=<id>&detailPath=<slug>, or ?title=<name>",
          trial: buildTrialSummary(rec)
        });
        return;
      }
      const requestedLangRaw = String(req.query.lang || "").trim();
      const requestedLangLower = requestedLangRaw.toLowerCase();
      const streamMbPath = `/mb/${subjectId}/${detailPath}`;
      const cachedDetailForStream = findCachedDetailByPathOrTitle(streamMbPath, title);
      const streamDetailObj = cachedDetailForStream && cachedDetailForStream.url?.startsWith("/mb/") ? cachedDetailForStream : await Promise.race([
        fetchMovieBoxDetail(streamMbPath),
        new Promise((r) => setTimeout(() => r(null), 1600))
      ]).catch(() => null);
      if (streamDetailObj) {
        storeDetailInCaches(streamMbPath, streamDetailObj, Date.now() + 12 * 6e4);
      }
      const dubList = Array.isArray(streamDetailObj?.dubs) ? streamDetailObj.dubs : [];
      if (requestedLangLower && requestedLangLower !== "all" && dubList.length > 0) {
        const matchedDub = dubList.find((d) => {
          const lbl = String(d?.label || "").toLowerCase();
          const code = String(d?.lanCode || "").toLowerCase();
          return lbl === requestedLangLower || lbl.includes(requestedLangLower) || requestedLangLower.startsWith("hi") && (code === "hi" || lbl.includes("hindi")) || requestedLangLower.startsWith("bn") && (code === "bn" || lbl.includes("bangla") || lbl.includes("bengali")) || requestedLangLower.startsWith("en") && (code === "en" || lbl.includes("english")) || requestedLangLower.startsWith("ta") && (code === "ta" || lbl.includes("tamil")) || requestedLangLower.startsWith("te") && (code === "te" || lbl.includes("telugu")) || code === requestedLangLower;
        });
        if (matchedDub?.id && matchedDub.id !== subjectId) {
          subjectId = String(matchedDub.id);
          const dParts = String(matchedDub.path || "").replace(/^\/mb\//, "").split("/");
          if (dParts[1]) detailPath = dParts[1];
        }
      }
      const activeDubEntry = dubList.find((d) => String(d?.id) === subjectId);
      const activeAudioLabel = activeDubEntry?.label || streamDetailObj?.language || lang || "Original Audio";
      const isSeriesHint = se > 0 || ep > 0 || streamDetailObj?.typeBadge === "SERIES";
      const [initialPlayRes, extIds] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, activeAudioLabel, ""),
        Promise.race([
          resolveExternalMediaIds(streamDetailObj?.title || title, streamDetailObj?.releaseDate || "", isSeriesHint),
          new Promise((r) => setTimeout(() => r({ imdbId: "", tmdbId: "" }), 2200))
        ])
      ]);
      const imdbId = extIds.imdbId;
      const tmdbId = extIds.tmdbId;
      let playRes = initialPlayRes;
      let effectiveSe = se;
      let effectiveEp = ep;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep || 1, title, activeAudioLabel, "");
        if (fbSe1.sources.length > 0) {
          playRes = fbSe1;
          effectiveSe = 1;
          effectiveEp = ep || 1;
        }
      }
      if (playRes.sources.length === 0 && (se > 0 || ep > 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, activeAudioLabel, "");
        if (fbMovie.sources.length > 0) {
          playRes = fbMovie;
          effectiveSe = 0;
          effectiveEp = 0;
        }
      } else if (playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbSeries = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, activeAudioLabel, "");
        if (fbSeries.sources.length > 0) {
          playRes = fbSeries;
          effectiveSe = 1;
          effectiveEp = 1;
        }
      }
      const extraDubSources = [];
      const extraDubButtons = [];
      if ((!requestedLangRaw || requestedLangLower === "all") && dubList.length > 1) {
        const priorityDubs = dubList.filter((d) => {
          const l = String(d?.label || "").toLowerCase();
          return d?.id && d.id !== subjectId && (l.includes("hindi") || l.includes("bangla") || l.includes("bengali") || l.includes("original"));
        }).slice(0, 2);
        if (priorityDubs.length > 0) {
          const dubResults = await Promise.allSettled(
            priorityDubs.map(async (d) => {
              const dp = String(d.path || "").replace(/^\/mb\//, "").split("/")[1] || detailPath;
              const r = await Promise.race([
                fetchMovieBoxPlayStreams(String(d.id), dp, effectiveSe, effectiveEp, `${title} [${d.label}]`, String(d.label), ""),
                new Promise((resv) => setTimeout(() => resv(null), 1300))
              ]);
              return { dub: d, res: r };
            })
          );
          for (const dr of dubResults) {
            if (dr.status === "fulfilled" && dr.value.res && dr.value.res.sources.length > 0) {
              const lbl = String(dr.value.dub.label || "Dubbed");
              for (const s of dr.value.res.sources) {
                extraDubSources.push({
                  ...s,
                  id: `${s.id}-${dr.value.dub.id}`,
                  audio: lbl,
                  audioLanguages: [lbl],
                  qualityLabel: `${s.quality}p [${lbl}]`,
                  provider: `CinePulse ${lbl} ${s.quality}p`,
                  name: `${title} [${lbl}] (${s.quality}p MP4)`
                });
              }
              for (const b of dr.value.res.buttons || []) {
                extraDubButtons.push({
                  ...b,
                  label: `[${lbl}] ${b.label}`
                });
              }
            }
          }
        }
      }
      const captions = await Promise.race([
        fetchMovieBoxOfficialCaptions(
          subjectId,
          detailPath,
          effectiveSe,
          effectiveEp,
          playRes.streamId || ""
        ),
        new Promise(
          (r) => setTimeout(() => r([]), 900)
        )
      ]).catch(() => []);
      const embedBackups = buildEmbedBackupSources(
        imdbId,
        effectiveSe,
        effectiveEp,
        streamDetailObj?.title || title,
        activeAudioLabel,
        tmdbId
      );
      const streamBase = resolveStreamProxyOrigin(base);
      const streamHealth = streamBase !== base ? workerHealthMap.get(streamBase) : void 0;
      const sampleDirectMp4Url = playRes.sources.find((s) => s.directUrl)?.directUrl || "";
      const directProxyWorking = await isDirectMp4CdnReachableFromHost(sampleDirectMp4Url, streamBase !== base);
      const toAbsoluteWithTrialTk = (u) => {
        if (!u.startsWith("/")) return u;
        const sep = u.includes("?") ? "&" : "?";
        const isWorkerEligible = u.startsWith("/api/mb-stream") || u.startsWith("/api/mb-subtitle-srt");
        const isServerEpStream = u.startsWith("/api/mb-ep-stream");
        const needsTk = isWorkerEligible || isServerEpStream;
        const useStreamHost = isWorkerEligible || isServerEpStream && Boolean(streamHealth?.supportsEpStream);
        const hostBase = useStreamHost ? streamBase : base;
        return `${hostBase}${u}${needsTk ? `${sep}tk=${encodeURIComponent(rec.key)}` : ""}`;
      };
      const embedPlayerUrl = `${base}/trial-embed?apiKey=${encodeURIComponent(rec.key)}&subjectId=${encodeURIComponent(
        subjectId
      )}&detailPath=${encodeURIComponent(detailPath)}&se=${effectiveSe}&ep=${effectiveEp}&title=${encodeURIComponent(
        streamDetailObj?.title || title
      )}`;
      const primarySources = playRes.sources.map((s) => ({
        ...s,
        audio: activeAudioLabel,
        audioLanguages: [activeAudioLabel]
      }));
      const combinedSources = directProxyWorking ? [...primarySources, ...extraDubSources, ...embedBackups] : [...embedBackups, ...primarySources, ...extraDubSources];
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: "official-moviebox-original",
        playbackMode: directProxyWorking ? "direct-mp4" : "cloud-embed",
        directProxyWorking,
        trial: buildTrialSummary(rec),
        subjectId,
        detailPath,
        title: streamDetailObj?.title || title,
        activeAudio: activeAudioLabel,
        availableDubs: dubList.map((d) => ({
          id: d.id,
          label: d.label,
          lanCode: d.lanCode,
          active: String(d.id) === subjectId,
          streamEndpoint: `${base}/api/trial/stream?path=${encodeURIComponent(d.path)}&se=${effectiveSe}&ep=${effectiveEp}&title=${encodeURIComponent(title)}`
        })),
        season: effectiveSe,
        episode: effectiveEp,
        imdbId: imdbId || null,
        tmdbId: tmdbId || null,
        embedPlayerUrl,
        embedServers: embedBackups,
        directMp4Count: primarySources.length + extraDubSources.length,
        cloudHlsCount: embedBackups.length,
        subtitleCount: captions.length,
        sources: combinedSources.map((s) => ({
          ...s,
          url: toAbsoluteWithTrialTk(s.url),
          downloadUrl: s.downloadUrl ? toAbsoluteWithTrialTk(s.downloadUrl) : void 0
        })),
        subtitles: captions.map((c) => ({
          ...c,
          url: toAbsoluteWithTrialTk(c.url)
        })),
        downloads: [...playRes.buttons || [], ...extraDubButtons].map((b) => ({
          ...b,
          url: toAbsoluteWithTrialTk(b.url)
        }))
      });
    } catch (err) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || "Trial stream lookup failed" });
    }
  });
  app.get("/trial-embed", async (req, res) => {
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    const rec = key ? resolveOrRecoverTrialKey(key) : void 0;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    const embedQuotaHit = Boolean(rec && !rec.unlimited && rec.maxRequests >= 0 && rec.usedRequests >= rec.maxRequests);
    if (!rec || !rec.active || Date.now() >= rec.expiresAt || embedQuotaHit) {
      const reason = !rec ? "Invalid or missing Trial API Key" : !rec.active ? "Trial Key Paused" : Date.now() >= rec.expiresAt ? "Trial Key Expired" : "Trial Request Quota Exhausted";
      res.status(403).send(`<!DOCTYPE html><html><body style="margin:0;background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;">
        <div><h3 style="color:#e50914;margin:0 0 8px;">CinePulse Trial Player Blocked</h3><p style="margin:0;color:#a1a1aa;font-size:14px;">${reason}</p></div>
      </body></html>`);
      return;
    }
    rec.usedRequests += 1;
    rec.lastUsedAt = Date.now();
    scheduleFlushTrialStore();
    const rawPathParam = String(req.query.path || "").trim();
    let subjectId = String(req.query.subjectId || req.query.id || "").trim();
    let detailPath = String(req.query.detailPath || req.query.slug || "movie").trim();
    if (!subjectId && rawPathParam.startsWith("/mb/")) {
      const segs = rawPathParam.replace(/^\/mb\//, "").split("/");
      subjectId = segs[0] || "";
      detailPath = segs[1] || detailPath;
    }
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || "0"), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || "0"), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || "Original Audio").trim();
    const preferDirect = String(req.query.mode || "").toLowerCase() === "mp4";
    try {
      if (!subjectId && title && title !== "movie") {
        const searchRes = await fetchMovieBoxCatalog("/", 1, title);
        const firstPath = searchRes.items[0]?.path || "";
        if (firstPath.startsWith("/mb/")) {
          const segs = firstPath.replace(/^\/mb\//, "").split("/");
          subjectId = segs[0] || "";
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }
      const [playResInitial, extIds] = await Promise.all([
        subjectId ? fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, "") : Promise.resolve({ sources: [], buttons: [] }),
        Promise.race([
          resolveExternalMediaIds(title, "", se > 0 || ep > 0),
          new Promise((r) => setTimeout(() => r({ imdbId: "", tmdbId: "" }), 2400))
        ])
      ]);
      let playRes = playResInitial;
      let effSe = se;
      let effEp = ep;
      if (subjectId && playRes.sources.length === 0 && (se > 0 || ep > 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, lang, "");
        if (fbMovie.sources.length > 0) {
          playRes = fbMovie;
          effSe = 0;
          effEp = 0;
        }
      } else if (subjectId && playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbSeries = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, lang, "");
        if (fbSeries.sources.length > 0) {
          playRes = fbSeries;
          effSe = 1;
          effEp = 1;
        }
      }
      const embedStreamBase = resolveStreamProxyOrigin(base);
      const sampleDirectMp4Url = playRes.sources.find((s) => s.directUrl)?.directUrl || "";
      const directProxyWorking = await isDirectMp4CdnReachableFromHost(sampleDirectMp4Url, embedStreamBase !== base);
      const mp4Sources = (playRes.sources || []).filter((s) => s.url && s.url.startsWith("/api/mb-stream")).map((s) => ({
        kind: "mp4",
        label: `Direct MP4 \u2022 ${s.quality}p`,
        url: `${embedStreamBase}${s.url}${s.url.includes("?") ? "&" : "?"}tk=${encodeURIComponent(rec.key)}`
      }));
      const cloudServers = buildEmbedBackupSources(extIds.imdbId, effSe, effEp, title, lang, extIds.tmdbId).map((s) => ({
        kind: "embed",
        label: s.provider,
        url: s.url
      }));
      const allServers = directProxyWorking || preferDirect || cloudServers.length === 0 ? [...mp4Sources, ...cloudServers] : [...cloudServers, ...mp4Sources];
      const safeTitle = title.replace(/[<>&"']/g, "");
      const serversJson = JSON.stringify(allServers).replace(/</g, "\\u003c");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${safeTitle} \u2014 CinePulse HD Player</title>
  <style>
    * { box-sizing:border-box; }
    html,body { margin:0; padding:0; width:100%; height:100%; background:#050608; color:#fff; font-family:system-ui,-apple-system,sans-serif; overflow:hidden; }
    .wrap { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; }
    video, iframe { width:100%; height:100%; border:0; background:#000; display:block; }
    video { object-fit:contain; }
    .bar { position:absolute; top:10px; right:10px; left:10px; display:flex; justify-content:space-between; align-items:center; gap:8px; z-index:20; pointer-events:none; }
    .bar > * { pointer-events:auto; }
    .tag { background:rgba(15,17,24,.82); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,.14); color:#fff; font-size:11.5px; font-weight:700; padding:5px 10px; border-radius:7px; max-width:52%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .controls { display:flex; gap:6px; align-items:center; }
    select { background:rgba(15,17,24,.9); backdrop-filter:blur(8px); color:#fff; border:1px solid rgba(255,255,255,.22); border-radius:7px; padding:5px 9px; font-size:12px; font-weight:600; cursor:pointer; max-width:210px; }
    .next-btn { background:#e50914; color:#fff; border:0; border-radius:7px; padding:6px 10px; font-size:11.5px; font-weight:700; cursor:pointer; white-space:nowrap; }
    .empty { text-align:center; padding:24px; color:#a1a1aa; font-size:14px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="bar">
      <span class="tag">${safeTitle}${effSe > 0 ? ` \u2022 S${effSe}E${effEp}` : ""}</span>
      <div class="controls" id="ctrlBar" style="display:none;">
        <select id="srvSel" onchange="selectServer(Number(this.value))"></select>
        <button class="next-btn" onclick="nextServer()" title="Switch Server">Next Server</button>
      </div>
    </div>
    <div id="stage" style="width:100%;height:100%;"></div>
  </div>
  <script>
    const SERVERS = ${serversJson};
    let activeIdx = 0;

    function init() {
      if (!SERVERS.length) {
        document.getElementById('stage').innerHTML = '<div class="empty">No stream found for this title/episode yet.</div>';
        return;
      }
      const sel = document.getElementById('srvSel');
      SERVERS.forEach((s, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = s.label;
        sel.appendChild(opt);
      });
      if (SERVERS.length > 1) document.getElementById('ctrlBar').style.display = 'flex';
      selectServer(0);
    }

    function nextServer() {
      if (SERVERS.length < 2) return;
      selectServer((activeIdx + 1) % SERVERS.length);
    }

    function selectServer(idx) {
      if (idx < 0 || idx >= SERVERS.length) return;
      activeIdx = idx;
      const sel = document.getElementById('srvSel');
      if (sel) sel.value = String(idx);
      const s = SERVERS[idx];
      const stage = document.getElementById('stage');
      stage.innerHTML = '';

      if (s.kind === 'mp4') {
        const v = document.createElement('video');
        v.controls = true;
        v.autoplay = true;
        v.playsInline = true;
        v.preload = 'metadata';
        v.src = s.url;
        v.onerror = function() {
          const fallbackEmbedIdx = SERVERS.findIndex((item) => item.kind === 'embed');
          if (fallbackEmbedIdx !== -1 && fallbackEmbedIdx !== activeIdx) {
            selectServer(fallbackEmbedIdx);
          }
        };
        stage.appendChild(v);
        v.play().catch(function(){});
      } else {
        const f = document.createElement('iframe');
        f.src = s.url;
        f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        f.allowFullscreen = true;
        f.setAttribute('referrerpolicy', 'origin');
        stage.appendChild(f);
      }
    }

    init();
  </script>
</body>
</html>`);
    } catch {
      res.status(500).send("Failed to load embedded trial stream.");
    }
  });
  app.get("/trial", (req, res) => {
    capturePublicOriginForBot(req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MovieBox Direct API \u2014 Client Tester & Docs</title>
  <style>
    :root { color-scheme: dark; --bg:#08090c; --card:#111217; --sub:#181920; --border:#27272a; --accent:#e50914; --green:#22c55e; --blue:#38bdf8; --text:#f4f4f5; --muted:#a1a1aa; }
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; width:100%; max-width:100%; overflow-x:hidden; background:var(--bg); color:var(--text); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    body { padding:16px 12px 56px; }
    .wrap { width:100%; max-width:1060px; margin:0 auto; }
    .topbar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:16px; }
    .brand { display:flex; align-items:center; gap:9px; font-size:18px; font-weight:800; letter-spacing:-0.02em; line-height:1.25; }
    .dot { flex-shrink:0; width:10px; height:10px; border-radius:999px; background:var(--green); box-shadow:0 0 10px var(--green); }
    .badge-top { font-size:11px; font-weight:700; padding:5px 10px; border-radius:7px; background:var(--sub); border:1px solid var(--border); color:var(--muted); }
    .layout { display:grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap:14px; align-items:start; }
    .layout > * { min-width:0; }
    @media (max-width: 880px) { .layout { grid-template-columns: minmax(0, 1fr); } }
    .card { width:100%; min-width:0; max-width:100%; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:14px; }
    h2 { margin:0 0 10px; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
    label { display:block; font-size:12px; color:var(--muted); margin-bottom:5px; margin-top:8px; }
    input, select { width:100%; min-width:0; max-width:100%; background:#09090b; border:1px solid var(--border); color:var(--text); padding:9px 11px; border-radius:8px; font-size:13px; }
    button { background:var(--accent); color:#fff; border:0; border-radius:8px; padding:9px 13px; font-weight:600; font-size:13px; cursor:pointer; white-space:nowrap; }
    button.sec { background:#27272a; color:var(--text); }
    button.sm { padding:7px 10px; font-size:12px; }
    button:hover { opacity:0.92; }
    .key-box { width:100%; min-width:0; background:#050507; border:1px solid #2e2e36; border-radius:10px; padding:11px; margin-top:10px; }
    .key-val { font-family:monospace; font-size:12px; color:var(--blue); word-break:break-all; font-weight:700; }
    .bar-bg { width:100%; height:7px; background:#27272a; border-radius:999px; overflow:hidden; margin:8px 0 6px; }
    .bar-fill { height:100%; background:linear-gradient(90deg, var(--green), var(--blue)); width:100%; transition:width .25s ease; }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; min-width:0; }
    .ep-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:10px; margin-top:10px; }
    @media (max-width: 560px) { .ep-grid { grid-template-columns: minmax(0, 1fr); } }
    .ep-box { min-width:0; background:var(--sub); border:1px solid var(--border); border-radius:9px; padding:10px; display:flex; flex-direction:column; gap:7px; }
    .tabs { display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .tab { background:var(--sub); color:var(--muted); border:1px solid var(--border); padding:5px 9px; border-radius:6px; font-size:12px; cursor:pointer; }
    .tab.on { background:var(--accent); color:#fff; border-color:var(--accent); }
    pre { margin:0; width:100%; max-width:100%; min-width:0; background:#050507; border:1px solid var(--border); border-radius:10px; padding:12px; overflow:auto; max-height:420px; font-size:11.5px; line-height:1.5; color:#e4e4e7; white-space:pre-wrap; word-break:break-word; }
    .status-pill { font-size:11px; font-weight:700; padding:3px 8px; border-radius:5px; background:rgba(34,197,94,.14); color:var(--green); }
    .status-pill.bad { background:rgba(239,68,68,.15); color:#f87171; }
    .hint { font-size:12px; color:var(--muted); line-height:1.45; margin-top:6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand"><span class="dot"></span> MovieBox Direct API \u2014 Client Portal</div>
      <div class="badge-top">Website &amp; Android APK Ready</div>
    </div>

    <div class="layout">
      <div>
        <div class="card">
          <h2>1. Your API Key <span id="keyStatusBadge" class="status-pill">ENTER KEY</span></h2>
          <label>Paste your API Key (cp_tr1_...)</label>
          <div class="row" style="flex-wrap:nowrap;">
            <input id="activeKeyInput" placeholder="Paste cp_tr1_... key here" style="flex:1;min-width:0;font-family:monospace;font-size:12px;" />
            <button class="sm" onclick="loadKeyStatus()">Verify</button>
          </div>
          <div id="keyErrorMsg" class="hint" style="color:#f87171;display:none;"></div>
          <div class="key-box" id="activeKeyCard" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
              <strong id="clientLabel" style="font-size:13px;color:#fff;">Client</strong>
              <span id="planLabel" style="font-size:11px;color:var(--blue);font-weight:700;"></span>
            </div>
            <div class="key-val" id="activeKeyText"></div>
            <div class="bar-bg"><div class="bar-fill" id="quotaBar"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);gap:8px;flex-wrap:wrap;">
              <span id="quotaText">0 / 0 left</span>
              <span id="expiryText">-</span>
            </div>
            <div class="row" style="margin-top:10px;">
              <button class="sec sm" onclick="copyText(currentKey, this)">Copy API Key</button>
              <button class="sec sm" onclick="copyText(ORIGIN + '/api/trial', this)">Copy Base URL</button>
            </div>
          </div>
          <div class="hint">
            Pass your key in header <code>X-API-Key</code> or query <code>?apiKey=YOUR_KEY</code>. Need a new key or renewal? Contact your provider.
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <h2>2. Live API &amp; Video Tester <span style="font-size:11.5px;color:var(--muted);font-weight:400;">Auth: X-API-Key or ?apiKey=</span></h2>
          <div class="ep-grid">
            <div class="ep-box">
              <strong style="font-size:13px;">Home, Categories &amp; Discovery</strong>
              <span style="font-size:11px;color:var(--muted);">Official MovieBox Feeds</span>
              <div class="row">
                <button class="sm" style="flex:1" onclick="callTrial('/api/trial/home')">Home</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/categories')">77 Cats</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/hot-search')">Hot Search</button>
              </div>
              <div class="row" style="margin-top:6px;">
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/sports')">Live Sports</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/shorts?page=1')">Shorts TV</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/upcoming?page=1')">Upcoming</button>
              </div>
              <div class="row" style="margin-top:6px;">
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/filter-options')">Filters</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/platform?name=Netflix&page=1')">Netflix</button>
              </div>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Search &amp; Autocomplete</strong>
              <input id="searchQ" value="Squid Game" />
              <div class="row">
                <button class="sm" style="flex:1" onclick="callTrial('/api/trial/search?q=' + encodeURIComponent(val('searchQ') || 'Squid Game'))">Test Search</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/suggest?q=' + encodeURIComponent(val('searchQ') || 'Squid'))">Suggest</button>
              </div>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Category Catalog</strong>
              <select id="catSel">
                <option value="/">Trending (All)</option>
                <option value="/web/movie">Movies (/web/movie)</option>
                <option value="/web/tv-series">TV Series (/web/tv-series)</option>
                <option value="/category/short-tv">Hot Short TV</option>
                <option value="/language/bangla">Bangla</option>
                <option value="/bollywood">Bollywood</option>
                <option value="/hollywood">Hollywood</option>
                <option value="/language/hindi-dubbed">Hindi Dubbed</option>
                <option value="/korean">Korean</option>
                <option value="/anime">Anime</option>
                <option value="/adult18plus">Adult 18+ (/adult18plus)</option>
                <option value="/web/midnight">Midnight 18+ (/web/midnight)</option>
              </select>
              <button class="sm" onclick="callTrial('/api/trial/catalog?path=' + encodeURIComponent(val('catSel')) + '&page=1')">Test Catalog</button>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Details, Comments &amp; Live Video</strong>
              <input id="titleInput" value="Squid Game" />
              <div class="row">
                <button class="sm" style="flex:1" onclick="callTrial('/api/trial/details?title=' + encodeURIComponent(val('titleInput') || 'Squid Game'))">Details</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/related?title=' + encodeURIComponent(val('titleInput') || 'Squid Game'))">Related</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/comments?subjectId=973041525783496480&page=1')">Comments</button>
              </div>
              <div class="row" style="margin-top:6px;">
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/stream?title=' + encodeURIComponent(val('titleInput') || 'Squid Game') + '&se=1&ep=1', false)">Stream (Hindi+Orig)</button>
                <button class="sm" style="flex:1;background:#16a34a" onclick="callTrial('/api/trial/stream?title=' + encodeURIComponent(val('titleInput') || 'Squid Game') + '&se=1&ep=1', true)">Play Video</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card" id="previewPlayerBox" style="display:none;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <strong id="previewTitle" style="font-size:14px;">Live Video Preview</strong>
            <div class="row">
              <select id="previewQualitySel" style="width:auto;padding:5px 8px;font-size:12px;" onchange="switchPreviewQuality()"></select>
              <button class="sec sm" onclick="closePreviewPlayer()">Close</button>
            </div>
          </div>
          <div id="previewStage" style="width:100%;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;"></div>
        </div>

        <div class="card">
          <h2>3. Integration Code &amp; Response <span id="respMeta" style="font-size:12px;color:var(--muted);font-weight:500;">Ready</span></h2>
          <div class="tabs">
            <button class="tab on" onclick="setSnippetTab('widget', this)">Website HTML Widget</button>
            <button class="tab" onclick="setSnippetTab('android', this)">Android APK (Kotlin)</button>
            <button class="tab" onclick="setSnippetTab('iframe', this)">Iframe Player</button>
            <button class="tab" onclick="setSnippetTab('js', this)">JavaScript</button>
            <button class="tab" onclick="setSnippetTab('curl', this)">cURL</button>
          </div>
          <div style="margin-bottom:10px;">
            <pre class="key-box" id="snippetBox" style="margin:0 0 8px;max-height:190px;font-family:monospace;color:var(--blue);">Paste your API Key above to generate ready Website &amp; Android APK integration code.</pre>
            <button class="sec sm" onclick="copyText(document.getElementById('snippetBox').textContent, this)">Copy Code</button>
          </div>
          <pre id="respOut">Paste your API Key in step 1 and click Verify, then click any test button above (Home, Catalog 18+, Search, Details, or Play Video).</pre>
        </div>
      </div>
    </div>
  </div>
  <script>
    const ORIGIN = window.location.origin;
    const STORAGE_KEY = 'cp_client_active_key_v1';
    let currentKey = '';
    let lastEndpoint = '/api/trial/home';
    let snippetMode = 'widget';

    function val(id) { return document.getElementById(id).value.trim(); }
    function copyText(txt, btn) {
      if (!txt) return;
      navigator.clipboard.writeText(txt).then(() => {
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = old, 1400);
      });
    }
    function setSnippetTab(mode, btn) {
      snippetMode = mode;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      updateSnippet();
    }
    function updateSnippet() {
      const k = currentKey || 'YOUR_API_KEY';
      const SHARE_BASE = ORIGIN.indexOf('://ais-dev-') !== -1 ? ORIGIN.replace('://ais-dev-', '://ais-pre-') : ORIGIN;
      const url = SHARE_BASE + lastEndpoint;
      const box = document.getElementById('snippetBox');
      if (snippetMode === 'widget') {
        box.textContent = [
          '<!-- Universal MovieBox API + Self-Healing Multi-Server HD Player -->',
          '<div id="cp-moviebox-widget" style="background:#0b0c10;color:#fff;padding:16px;border-radius:12px;font-family:sans-serif">',
          '  <div style="display:flex;gap:8px;margin-bottom:12px">',
          '    <input id="cp-q" placeholder="Search Movie / Series..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #333;background:#14161d;color:#fff" />',
          '    <button onclick="cpLoadMovies()" style="background:#e50914;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700">Search</button>',
          '  </div>',
          '  <div id="cp-player-wrap" style="display:none;width:100%;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;margin-bottom:14px">',
          '    <iframe id="cp-iframe" style="width:100%;height:100%;border:0" allowfullscreen allow="autoplay; fullscreen; encrypted-media"></iframe>',
          '  </div>',
          '  <div id="cp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px"></div>',
          '</div>',
          '<script>',
          'const CP_API = "' + SHARE_BASE + '";',
          'const CP_KEY = "' + k + '";',
          'async function cpLoadMovies(){',
          '  const q = document.getElementById("cp-q").value.trim();',
          '  const ep = q ? "/api/trial/search?q=" + encodeURIComponent(q) : "/api/trial/home";',
          '  const r = await fetch(CP_API + ep, { headers: { "X-API-Key": CP_KEY } });',
          '  const d = await r.json();',
          '  const list = d.items || d.trending || (d.sections && d.sections[0] && d.sections[0].items) || [];',
          '  const grid = document.getElementById("cp-grid"); grid.innerHTML = "";',
          '  list.slice(0,12).forEach(function(m){',
          '    var c = document.createElement("div"); c.style.cssText = "cursor:pointer;background:#151720;border-radius:8px;overflow:hidden";',
          '    c.onclick = function(){ cpPlay(m); };',
          '    var im = document.createElement("img"); im.src = m.poster; im.style.cssText = "width:100%;aspect-ratio:2/3;object-fit:cover";',
          '    var tt = document.createElement("div"); tt.textContent = m.title; tt.style.cssText = "padding:8px;font-size:12px;font-weight:600";',
          '    c.appendChild(im); c.appendChild(tt); grid.appendChild(c);',
          '  });',
          '}',
          'async function cpPlay(m){',
          '  var isMovie = m.typeBadge === "MOVIE";',
          '  var q = m.path ? ("path=" + encodeURIComponent(m.path)) : ("title=" + encodeURIComponent(m.title));',
          '  const r = await fetch(CP_API + "/api/trial/stream?" + q + "&se=" + (isMovie ? 0 : 1) + "&ep=" + (isMovie ? 0 : 1), { headers: { "X-API-Key": CP_KEY } });',
          '  const d = await r.json();',
          '  if (!d.embedPlayerUrl) return;',
          '  document.getElementById("cp-player-wrap").style.display = "block";',
          '  document.getElementById("cp-iframe").src = d.embedPlayerUrl;',
          '}',
          'cpLoadMovies();',
          '</' + 'script>',
        ].join('\\n');
      } else if (snippetMode === 'android') {
        box.textContent = [
          '// Android APK: Option 1 (Direct MP4 in ExoPlayer \u2014 ZERO Server Block!)',
          '// GET ' + SHARE_BASE + '/api/trial/stream?title=Squid+Game&se=1&ep=1  (Header: X-API-Key: ' + k + ')',
          '// Pick any source with type == "mp4", read source.directUrl + source.headers:',
          'val dataSourceFactory = DefaultHttpDataSource.Factory()',
          '  .setDefaultRequestProperties(mapOf("Referer" to "https://movie-box.co/"))',
          'val mediaSource = ProgressiveMediaSource.Factory(dataSourceFactory)',
          '  .createMediaSource(MediaItem.fromUri(directUrl))',
          'exoPlayer.setMediaSource(mediaSource); exoPlayer.prepare(); exoPlayer.play()',
          '',
          '// Android APK: Option 2 (Universal Multi-Server HD WebView Player):',
          '// webView.loadUrl(response.embedPlayerUrl) // Plays all 6 HD Cloud Servers automatically!',
        ].join('\\n');
      } else if (snippetMode === 'iframe') {
        const title = encodeURIComponent(val('titleInput') || 'Squid Game');
        box.textContent = '<iframe src="' + SHARE_BASE + '/trial-embed?apiKey=' + k + '&title=' + title + '&se=1&ep=1" width="100%" height="460" allowfullscreen allow="autoplay; fullscreen; encrypted-media" frameborder="0"></iframe>';
      } else if (snippetMode === 'curl') {
        box.textContent = 'curl -H "X-API-Key: ' + k + '" "' + url + '"';
      } else {
        box.textContent = 'fetch("' + url + '", { headers: { "X-API-Key": "' + k + '" } }).then(r => r.json()).then(console.log);';
      }
    }
    function renderActiveCard(t) {
      document.getElementById('keyErrorMsg').style.display = 'none';
      document.getElementById('activeKeyCard').style.display = 'block';
      document.getElementById('clientLabel').textContent = t.clientName || 'Client';
      document.getElementById('planLabel').textContent = t.plan || '';
      document.getElementById('activeKeyText').textContent = t.key;
      const isUnlim = Boolean(t.unlimited || t.maxRequests < 0);
      const pct = isUnlim ? 100 : (t.maxRequests > 0 ? Math.round((t.remainingRequests / t.maxRequests) * 100) : 0);
      document.getElementById('quotaBar').style.width = Math.max(0, Math.min(100, pct)) + '%';
      document.getElementById('quotaText').textContent = isUnlim
        ? ('UNLIMITED (' + (t.usedRequests || 0) + ' used)')
        : (t.remainingRequests + ' / ' + t.maxRequests + ' requests left');
      document.getElementById('expiryText').textContent = t.expiresInMinutes >= 1440
        ? Math.round(t.expiresInMinutes / 1440) + 'd left'
        : t.expiresInMinutes > 60
          ? Math.round(t.expiresInMinutes / 60) + 'h left'
          : t.expiresInMinutes + 'm left';
      const badge = document.getElementById('keyStatusBadge');
      badge.textContent = t.status;
      badge.className = 'status-pill' + (t.status === 'ACTIVE' ? '' : ' bad');
      updateSnippet();
    }
    async function loadKeyStatus() {
      const k = val('activeKeyInput') || currentKey;
      const errEl = document.getElementById('keyErrorMsg');
      if (!k) {
        errEl.textContent = 'Please paste your API Key first.';
        errEl.style.display = 'block';
        return;
      }
      currentKey = k;
      try { localStorage.setItem(STORAGE_KEY, k); } catch {}
      try {
        const res = await fetch(ORIGIN + '/api/trial/me?apiKey=' + encodeURIComponent(k));
        const data = await res.json();
        if (data.ok && data.trial) {
          renderActiveCard(data.trial);
          document.getElementById('respOut').textContent = JSON.stringify(data, null, 2);
        } else {
          document.getElementById('keyStatusBadge').textContent = 'INVALID / BLOCKED';
          document.getElementById('keyStatusBadge').className = 'status-pill bad';
          document.getElementById('activeKeyCard').style.display = 'none';
          errEl.textContent = data.error || 'Invalid, paused, or expired API Key.';
          errEl.style.display = 'block';
          document.getElementById('respOut').textContent = JSON.stringify(data, null, 2);
        }
      } catch (e) {
        errEl.textContent = String(e);
        errEl.style.display = 'block';
      }
    }
    let previewItems = [];
    function renderPreviewItem(item, autoPlay) {
      const stage = document.getElementById('previewStage');
      stage.innerHTML = '';
      if (!item) return;
      if (item.type === 'mp4') {
        const vid = document.createElement('video');
        vid.controls = true;
        vid.playsInline = true;
        vid.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
        vid.src = item.url;
        vid.onerror = function() {
          const fallback = previewItems.find(function(x) { return x.type === 'embed'; });
          if (fallback) {
            document.getElementById('previewQualitySel').value = String(previewItems.indexOf(fallback));
            renderPreviewItem(fallback, true);
          }
        };
        stage.appendChild(vid);
        if (autoPlay) vid.play().catch(function(){});
      } else {
        const ifr = document.createElement('iframe');
        ifr.src = item.url;
        ifr.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        ifr.allowFullscreen = true;
        ifr.style.cssText = 'width:100%;height:100%;border:0;background:#000;';
        stage.appendChild(ifr);
      }
    }
    function showPreviewPlayer(parsed, autoPlay) {
      const list = [];
      if (parsed.embedPlayerUrl) {
        list.push({ type: 'embed', label: 'Universal HD Player (All 6 Servers)', url: parsed.embedPlayerUrl });
      }
      (parsed.sources || []).forEach(function(s) {
        if (!s || !s.url) return;
        if (s.type === 'mp4') {
          list.push({ type: 'mp4', label: (s.quality || 'HD') + 'p Direct MP4', url: s.url });
        } else if (s.type === 'embed') {
          list.push({ type: 'embed', label: s.provider || s.name || 'Cloud HD', url: s.url });
        }
      });
      if (!list.length) return;
      previewItems = list;
      const box = document.getElementById('previewPlayerBox');
      const titleEl = document.getElementById('previewTitle');
      const sel = document.getElementById('previewQualitySel');
      titleEl.textContent = (parsed.title || 'MovieBox Preview') + (parsed.season ? ' (S' + parsed.season + ' E' + parsed.episode + ')' : '');
      sel.innerHTML = '';
      list.forEach(function(item, idx) {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = item.label;
        if (idx === 0) opt.selected = true;
        sel.appendChild(opt);
      });
      box.style.display = 'block';
      const startIdx = parsed.directProxyWorking
        ? Math.max(0, list.findIndex(function(x) { return x.type === 'mp4'; }))
        : 0;
      sel.value = String(startIdx);
      renderPreviewItem(list[startIdx], autoPlay);
    }
    function switchPreviewQuality() {
      const sel = document.getElementById('previewQualitySel');
      const idx = Number(sel.value);
      if (Number.isFinite(idx) && previewItems[idx]) {
        renderPreviewItem(previewItems[idx], true);
      }
    }
    function closePreviewPlayer() {
      document.getElementById('previewStage').innerHTML = '';
      document.getElementById('previewPlayerBox').style.display = 'none';
    }
    async function callTrial(path, autoPlay) {
      const k = val('activeKeyInput') || currentKey;
      if (!k) {
        const errEl = document.getElementById('keyErrorMsg');
        errEl.textContent = 'Please paste your API Key in Box 1 first, then click any test button.';
        errEl.style.display = 'block';
        document.getElementById('activeKeyInput').focus();
        return;
      }
      currentKey = k;
      lastEndpoint = path;
      updateSnippet();
      const fullUrl = ORIGIN + path;
      document.getElementById('respMeta').textContent = 'Calling ' + path + '...';
      const t0 = performance.now();
      try {
        const res = await fetch(fullUrl, { headers: { 'X-API-Key': currentKey } });
        const ms = Math.round(performance.now() - t0);
        const text = await res.text();
        document.getElementById('respMeta').textContent = 'HTTP ' + res.status + ' \u2022 ' + ms + ' ms';
        try {
          const parsed = JSON.parse(text);
          if (parsed.trial) renderActiveCard(parsed.trial);
          if (parsed.sources && parsed.sources.length) showPreviewPlayer(parsed, Boolean(autoPlay));
          document.getElementById('respOut').textContent = JSON.stringify(parsed, null, 2);
        } catch {
          document.getElementById('respOut').textContent = text;
        }
      } catch (e) {
        document.getElementById('respMeta').textContent = 'Error';
        document.getElementById('respOut').textContent = String(e);
      }
    }
    (function initClientPortal() {
      const params = new URLSearchParams(window.location.search);
      const qKey = (params.get('apiKey') || params.get('key') || '').trim();
      let savedKey = '';
      try { savedKey = localStorage.getItem(STORAGE_KEY) || ''; } catch {}
      const initKey = qKey || savedKey;
      if (initKey) {
        currentKey = initKey;
        document.getElementById('activeKeyInput').value = initKey;
        loadKeyStatus();
      } else {
        updateSnippet();
      }
    })();
  </script>
</body>
</html>`);
  });
  const botConfigPath = path.join(trialDataDir, "cinepulse-bot-config.json");
  const loadBotConfig = () => {
    try {
      if (!fs.existsSync(botConfigPath)) return {};
      const parsed = JSON.parse(fs.readFileSync(botConfigPath, "utf8"));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };
  const saveBotConfig = (cfg, skipCloudSync = false) => {
    try {
      if (!fs.existsSync(trialDataDir)) fs.mkdirSync(trialDataDir, { recursive: true });
      const tmpFile = `${botConfigPath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(cfg, null, 2), "utf8");
      fs.renameSync(tmpFile, botConfigPath);
    } catch {
    }
    if (!skipCloudSync) {
      scheduleCloudBackupToTelegram(true);
    }
  };
  let botConfigState = loadBotConfig();
  let capturedPublicBaseUrl = "";
  getConfiguredWorkerUrl = () => {
    const envWorker = String(
      process.env.VIDEO_PROXY_URL || process.env.CF_VIDEO_WORKER_URL || process.env.CF_WORKER_STREAM_URL || ""
    ).trim().replace(/\/+$/, "");
    if (/^(off|none|disable|false)$/i.test(envWorker)) return "";
    if (envWorker && /^https?:\/\//i.test(envWorker)) return envWorker;
    const savedWorker = String(botConfigState.workerUrl || "").trim().replace(/\/+$/, "");
    if (/^(off|none|disable|false)$/i.test(savedWorker)) return "";
    if (savedWorker && /^https?:\/\//i.test(savedWorker)) return savedWorker;
    return DEFAULT_CLOUDFLARE_VIDEO_WORKER_URL;
  };
  resolveStreamProxyOrigin = (fallbackBase) => {
    const candidate = getConfiguredWorkerUrl();
    if (!candidate) return fallbackBase;
    const health = workerHealthMap.get(candidate);
    if (!health || Date.now() - health.checkedAt >= 6e4) {
      void probeCloudflareWorkerHealth(candidate, false);
    }
    if (health && health.healthy) {
      return candidate;
    }
    return fallbackBase;
  };
  const initialConfiguredWorker = getConfiguredWorkerUrl();
  if (initialConfiguredWorker) {
    void probeCloudflareWorkerHealth(initialConfiguredWorker, true);
  }
  capturePublicOriginForBot = (req) => {
    const rawOrigin = getPublicOrigin(req).replace(/\/+$/, "");
    if (!rawOrigin) return;
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(rawOrigin)) return;
    capturedPublicBaseUrl = rawOrigin.includes("://ais-dev-") ? rawOrigin.replace("://ais-dev-", "://ais-pre-") : rawOrigin;
  };
  const resolvePublicBotBaseUrl = () => {
    const envPublic = String(process.env.TRIAL_PUBLIC_URL || "").trim().replace(/\/+$/, "");
    if (envPublic && envPublic.startsWith("http")) return envPublic;
    if (botConfigState.publicUrl && botConfigState.publicUrl.startsWith("http")) {
      return botConfigState.publicUrl.replace(/\/+$/, "");
    }
    if (capturedPublicBaseUrl && capturedPublicBaseUrl.startsWith("http")) {
      return capturedPublicBaseUrl.replace(/\/+$/, "");
    }
    const renderExt = String(process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/+$/, "");
    if (renderExt && renderExt.startsWith("http")) return renderExt;
    const appUrl = String(process.env.APP_URL || "").trim().replace(/\/+$/, "");
    if (appUrl && appUrl !== "MY_APP_URL" && appUrl.startsWith("http")) return appUrl;
    return `http://127.0.0.1:${PORT}`;
  };
  const getTelegramBotToken = () => String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const getAllowedTelegramAdminIds = () => {
    const raw = String(process.env.TELEGRAM_ADMIN_CHAT_ID || "").trim();
    if (!raw) return /* @__PURE__ */ new Set();
    return new Set(
      raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
    );
  };
  const getTrialShortId = (key) => crypto.createHash("sha1").update(key).digest("hex").slice(0, 10);
  const escTgHtml = (val) => String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const formatRemainingDurationBn = (expiresAt) => {
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) return "\u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7 \u274C";
    const totalMins = Math.ceil(msLeft / 6e4);
    if (totalMins >= 1440) {
      const days = Math.floor(totalMins / 1440);
      const hrs = Math.floor(totalMins % 1440 / 60);
      return hrs > 0 ? `${days} \u09A6\u09BF\u09A8 ${hrs} \u0998\u09A8\u09CD\u099F\u09BE` : `${days} \u09A6\u09BF\u09A8`;
    }
    if (totalMins >= 60) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return mins > 0 ? `${hrs} \u0998\u09A8\u09CD\u099F\u09BE ${mins} \u09AE\u09BF.` : `${hrs} \u0998\u09A8\u09CD\u099F\u09BE`;
    }
    return `${totalMins} \u09AE\u09BF\u09A8\u09BF\u099F`;
  };
  const getTrialStatusMeta = (rec) => {
    const now = Date.now();
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    const remainingRequests = isUnlimited ? -1 : Math.max(0, rec.maxRequests - rec.usedRequests);
    const expired = now >= rec.expiresAt;
    if (!rec.active) return { code: "PAUSED", badge: "\u{1F534} PAUSED (\u09AC\u09A8\u09CD\u09A7)" };
    if (expired) return { code: "EXPIRED", badge: "\u23F0 EXPIRED (\u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7)" };
    if (!isUnlimited && remainingRequests <= 0) {
      return { code: "QUOTA_EXHAUSTED", badge: "\u26A0\uFE0F QUOTA \u09B6\u09C7\u09B7" };
    }
    return { code: "ACTIVE", badge: "\u{1F7E2} ACTIVE (\u099A\u09BE\u09B2\u09C1)" };
  };
  const listAllNonRevokedTrials = () => Array.from(trialKeysMap.values()).filter((r) => !r.revoked).sort((a, b) => b.createdAt - a.createdAt);
  const findTrialMatches = (query) => {
    const clean = query.trim().replace(/^#/, "");
    if (!clean) return { matches: [] };
    const all = listAllNonRevokedTrials();
    const exactFull = all.find((r) => r.key === clean);
    if (exactFull) return { exact: exactFull, matches: [exactFull] };
    const lower = clean.toLowerCase();
    const exactShort = all.find((r) => getTrialShortId(r.key) === lower);
    if (exactShort) return { exact: exactShort, matches: [exactShort] };
    const matches = all.filter(
      (r) => getTrialShortId(r.key).startsWith(lower) || r.key.toLowerCase().startsWith(lower) || r.clientName.toLowerCase().includes(lower)
    );
    if (matches.length === 1) return { exact: matches[0], matches };
    return { matches };
  };
  const createClientKeyForOwner = (clientName, planInput, forceUnlimited = false) => {
    let durationHours = 24;
    let maxRequests = 250;
    let unlimited = forceUnlimited;
    if (planInput === "2H") {
      durationHours = 2;
      maxRequests = 60;
    } else if (planInput === "72H") {
      durationHours = 72;
      maxRequests = 600;
    } else if (planInput === "7D") {
      durationHours = 24 * 7;
      maxRequests = forceUnlimited ? -1 : 5e3;
    } else if (planInput === "30D") {
      durationHours = 24 * 30;
      maxRequests = forceUnlimited ? -1 : 1e5;
    } else if (planInput === "UNLIMITED") {
      durationHours = 24 * 3650;
      maxRequests = -1;
      unlimited = true;
    }
    if (unlimited) maxRequests = -1;
    const now = Date.now();
    const expiresAt = now + durationHours * 36e5;
    const cleanName = String(clientName || "Client").trim().slice(0, 48) || "Client";
    const key = issueSignedTrialKey({
      clientName: cleanName,
      plan: planInput,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited
    });
    const rec = {
      key,
      clientName: cleanName,
      plan: planInput,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited,
      usedRequests: 0,
      lastUsedAt: null,
      active: true,
      createdIp: "telegram-bot"
    };
    trialKeysMap.set(key, rec);
    flushTrialStoreSync();
    return rec;
  };
  const buildDashboardSummaryHtml = () => {
    const all = listAllNonRevokedTrials();
    let activeCount = 0;
    let pausedCount = 0;
    let expiredCount = 0;
    let quotaCount = 0;
    let totalRequests = 0;
    for (const r of all) {
      totalRequests += r.usedRequests || 0;
      const st = getTrialStatusMeta(r).code;
      if (st === "ACTIVE") activeCount++;
      else if (st === "PAUSED") pausedCount++;
      else if (st === "EXPIRED") expiredCount++;
      else if (st === "QUOTA_EXHAUSTED") quotaCount++;
    }
    const baseUrl = resolvePublicBotBaseUrl();
    const isPrivatePreview = /localhost|127\.0\.0\.1|:\/\/ais-dev-/i.test(baseUrl);
    return [
      "\u{1F3AC} <b>MovieBox Original Direct API \u2014 Owner Panel</b>",
      "",
      `\u{1F465} <b>\u09AE\u09CB\u099F \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F:</b> ${all.length} \u099C\u09A8`,
      `\u{1F7E2} <b>Active (\u099A\u09BE\u09B2\u09C1):</b> ${activeCount}`,
      `\u{1F534} <b>Paused (\u09AC\u09A8\u09CD\u09A7):</b> ${pausedCount}`,
      `\u23F0 <b>Expired (\u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7):</b> ${expiredCount}`,
      `\u26A0\uFE0F <b>Quota \u09B6\u09C7\u09B7:</b> ${quotaCount}`,
      `\u{1F4CA} <b>\u09AE\u09CB\u099F API \u09B9\u09BF\u099F:</b> ${totalRequests.toLocaleString()}`,
      "",
      `\u{1F310} <b>API Base URL:</b> <code>${escTgHtml(baseUrl)}</code>`,
      ...isPrivatePreview ? [
        "\u26A0\uFE0F <i>\u09A8\u09CB\u099F: \u0985\u09CD\u09AF\u09BE\u09AA\u099F\u09BF Cloud Run / Render / Custom Domain-\u098F Deploy \u0995\u09B0\u09C7 /seturl \u09A6\u09BF\u09A8 \u09AF\u09BE\u09A4\u09C7 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09A6\u09C7\u09B0 \u0985\u09CD\u09AF\u09BE\u09AA/\u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F\u09C7 \u0995\u09CB\u09A8\u09CB \u0995\u09C1\u0995\u09BF \u09AC\u09CD\u09B2\u0995 \u099B\u09BE\u09DC\u09BE \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u099A\u09B2\u09C7\u0964</i>"
      ] : []
    ].join("\n");
  };
  const buildMainMenuKeyboard = () => ({
    inline_keyboard: [
      [
        { text: "\u2795 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF", callback_data: "tb:newmenu" },
        { text: "\u{1F4CB} \u09B8\u09AC \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B2\u09BF\u09B8\u09CD\u099F", callback_data: "tb:list:0" }
      ],
      [
        { text: "\u{1F4CA} \u09B2\u09BE\u0987\u09AD \u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8", callback_data: "tb:stats" },
        { text: "\u{1F50D} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0996\u09C1\u0981\u099C\u09C1\u09A8", callback_data: "tb:findask" }
      ],
      [
        { text: "\u23F8\uFE0F \u09AC\u09A8\u09CD\u09A7 (Paused)", callback_data: "tb:paused:0" },
        { text: "\u23F0 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7 (Expired)", callback_data: "tb:expired:0" }
      ]
    ]
  });
  const buildClientCardHtml = (rec) => {
    const shortId = getTrialShortId(rec.key);
    const st = getTrialStatusMeta(rec);
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const quotaLine = isUnlim ? `\u267E\uFE0F UNLIMITED (\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: ${rec.usedRequests})` : `${Math.max(0, rec.maxRequests - rec.usedRequests)} / ${rec.maxRequests} \u09AC\u09BE\u0995\u09BF (\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: ${rec.usedRequests})`;
    const lastUsedStr = rec.lastUsedAt ? new Date(rec.lastUsedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "\u098F\u0996\u09A8\u09CB \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u09B9\u09DF\u09A8\u09BF";
    const expiryIso = new Date(rec.expiresAt).toISOString().replace("T", " ").slice(0, 16) + " UTC";
    return [
      `\u{1F464} <b>${escTgHtml(rec.clientName)}</b>  (<code>#${shortId}</code>)`,
      `\u{1F4CC} <b>\u0985\u09AC\u09B8\u09CD\u09A5\u09BE:</b> ${st.badge}`,
      `\u{1F4E6} <b>\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8:</b> <code>${escTgHtml(rec.plan)}</code>`,
      `\u23F3 <b>\u09B8\u09AE\u09DF \u09AC\u09BE\u0995\u09BF:</b> ${formatRemainingDurationBn(rec.expiresAt)}`,
      `\u{1F4C5} <b>\u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7:</b> <code>${expiryIso}</code>`,
      `\u{1F4C8} <b>\u09B2\u09BF\u09AE\u09BF\u099F/\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0:</b> ${quotaLine}`,
      `\u{1F552} <b>\u09B6\u09C7\u09B7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0:</b> ${lastUsedStr}`,
      `\u{1F511} <b>API Key:</b> <code>${escTgHtml(rec.key)}</code>`
    ].join("\n");
  };
  const buildClientInlineKeyboard = (rec) => {
    const sid = getTrialShortId(rec.key);
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const toggleBtn = rec.active ? { text: "\u23F8\uFE0F \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8 (Pause)", callback_data: `tb:pause:${sid}` } : { text: "\u25B6\uFE0F \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8 (Resume)", callback_data: `tb:resume:${sid}` };
    const row2 = [];
    if (!isUnlim) {
      row2.push({ text: "\u267E\uFE0F \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u0995\u09B0\u09C1\u09A8", callback_data: `tb:unlim:${sid}` });
    }
    row2.push({ text: "\u{1F4CB} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09B8\u09C7\u099C", callback_data: `tb:msg:${sid}` });
    return {
      inline_keyboard: [
        [
          toggleBtn,
          { text: "\u2795 \u09ED \u09A6\u09BF\u09A8", callback_data: `tb:ext7:${sid}` },
          { text: "\u2795 \u09E9\u09E6 \u09A6\u09BF\u09A8", callback_data: `tb:ext30:${sid}` }
        ],
        row2,
        [
          { text: "\u{1F504} \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6", callback_data: `tb:view:${sid}` },
          { text: "\u{1F5D1} \u09A1\u09BF\u09B2\u09BF\u099F", callback_data: `tb:del:${sid}` }
        ],
        [
          { text: "\u2B05\uFE0F \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B2\u09BF\u09B8\u09CD\u099F", callback_data: "tb:list:0" },
          { text: "\u{1F3E0} \u09AE\u09C7\u0987\u09A8 \u09AE\u09C7\u09A8\u09C1", callback_data: "tb:menu" }
        ]
      ]
    };
  };
  const buildClientShareMessageText = (rec) => {
    const base = resolvePublicBotBaseUrl();
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const quotaLabel = isUnlim ? "UNLIMITED" : `${rec.maxRequests} Requests`;
    const expIso = new Date(rec.expiresAt).toISOString();
    return [
      `MovieBox Original Direct API Credentials (${rec.clientName} - ${rec.plan}):`,
      "",
      `Base URL: ${base}/api/trial`,
      `API Key: ${rec.key}`,
      `Quota: ${quotaLabel} | Expires: ${expIso}`,
      `Live Tester Portal: ${base}/trial`,
      "",
      "Sample Endpoints (pass header X-API-Key or ?apiKey=):",
      `- Home: ${base}/api/trial/home?apiKey=${rec.key}`,
      `- Search: ${base}/api/trial/search?q=Squid+Game&apiKey=${rec.key}`,
      `- Catalog (18+): ${base}/api/trial/catalog?path=/adult18plus&page=1&apiKey=${rec.key}`,
      `- Short Videos: ${base}/api/trial/shorts?page=1&apiKey=${rec.key}`,
      `- Live Sports (.m3u8): ${base}/api/trial/sports?apiKey=${rec.key}`,
      `- Details (+ Dubs): ${base}/api/trial/details?title=Squid+Game&apiKey=${rec.key}`,
      `- Stream (Hindi Dub + Original + Subs): ${base}/api/trial/stream?title=Squid+Game&se=1&ep=1&apiKey=${rec.key}`,
      "",
      "All 16 Endpoints (use Base URL + Header X-API-Key or ?apiKey=YOUR_KEY):",
      "- GET /home (Banners, Sports & All Home Shelves)",
      "- GET /categories (All 77 Categories)",
      "- GET /search?q=Squid+Game",
      "- GET /suggest?q=Squid (Autocomplete)",
      "- GET /hot-search (Trending Searches)",
      "- GET /catalog?path=/bollywood&page=1 (or /adult18plus, /type/movies, /anime)",
      "- GET /shorts?page=1 (Hot Short TV / Micro-Dramas)",
      "- GET /sports (Live Football/Cricket/NBA + .m3u8)",
      "- GET /platform?name=Netflix&page=1 (Netflix, Hoichoi, Zee5, PrimeVideo, Disney)",
      "- GET /upcoming?page=1 (Coming Soon Releases)",
      "- GET /filter-options (Genres, Years, Countries, Sort)",
      "- GET /details?title=Squid+Game (+ Dubs & Related)",
      "- GET /related?title=Squid+Game",
      "- GET /comments?subjectId=973041525783496480&page=1",
      "- GET /staff?staffId=1&page=1 (Actor/Director Movies)",
      "- GET /stream?title=Squid+Game&se=1&ep=1 (1080p/720p/480p MP4 + Subtitles)",
      "- GET /me (Check Key Quota & Expiry)"
    ].join("\n");
  };
  const callTelegramBotApi = async (method, payload) => {
    const token = getTelegramBotToken();
    if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN not configured" };
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3e4)
      });
      const json = await resp.json().catch(() => ({ ok: false }));
      return json;
    } catch (err) {
      return { ok: false, description: err?.message || "Telegram API network error" };
    }
  };
  const botPendingState = /* @__PURE__ */ new Map();
  const notifiedTrialAlerts = /* @__PURE__ */ new Map();
  notifyTelegramTrialAlert = (rec, reason) => {
    const token = getTelegramBotToken();
    const admins = getAllowedTelegramAdminIds();
    if (!token || admins.size === 0) return;
    const sig = `${reason}:${rec.expiresAt}:${rec.maxRequests}`;
    if (notifiedTrialAlerts.get(rec.key) === sig) return;
    notifiedTrialAlerts.set(rec.key, sig);
    const shortId = getTrialShortId(rec.key);
    const title = reason === "EXPIRED" ? "\u23F0 <b>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09DF\u09C7\u099B\u09C7!</b>" : "\u26A0\uFE0F <b>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F Quota \u09B6\u09C7\u09B7 \u09B9\u09DF\u09C7\u099B\u09C7!</b>";
    const text = [
      title,
      "",
      `\u{1F464} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F: <b>${escTgHtml(rec.clientName)}</b> (<code>#${shortId}</code>)`,
      `\u{1F4E6} \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8: <code>${escTgHtml(rec.plan)}</code>`,
      `\u{1F4C8} \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: ${rec.usedRequests}${rec.unlimited || rec.maxRequests < 0 ? "" : "/" + rec.maxRequests}`,
      "",
      "\u09A8\u09BF\u099A\u09C7\u09B0 \u09AC\u09BE\u099F\u09A8 \u09A5\u09C7\u0995\u09C7 \u09B0\u09BF\u09A8\u09BF\u0989 \u0995\u09B0\u09C1\u09A8 \u0985\u09A5\u09AC\u09BE \u09AC\u09A8\u09CD\u09A7 \u09B0\u09BE\u0996\u09C1\u09A8:"
    ].join("\n");
    const reply_markup = {
      inline_keyboard: [
        [
          { text: "\u2795 \u09E9\u09E6 \u09A6\u09BF\u09A8 \u09B0\u09BF\u09A8\u09BF\u0989", callback_data: `tb:ext30:${sidForAlert(rec.key)}` },
          { text: "\u23F8\uFE0F \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", callback_data: `tb:pause:${sidForAlert(rec.key)}` }
        ],
        [{ text: "\u{1F464} \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u09A6\u09C7\u0996\u09C1\u09A8", callback_data: `tb:view:${sidForAlert(rec.key)}` }]
      ]
    };
    for (const chatId of admins) {
      void callTelegramBotApi("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup
      }).catch(() => {
      });
    }
  };
  const sidForAlert = (k) => getTrialShortId(k);
  const renderClientListMessage = (filterMode, pageNum) => {
    const all = listAllNonRevokedTrials().filter((r) => {
      if (filterMode === "ALL") return true;
      const code = getTrialStatusMeta(r).code;
      return filterMode === "PAUSED" ? code === "PAUSED" : code === "EXPIRED" || code === "QUOTA_EXHAUSTED";
    });
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    const page = Math.min(totalPages - 1, Math.max(0, pageNum));
    const slice = all.slice(page * pageSize, page * pageSize + pageSize);
    const headerTitle = filterMode === "PAUSED" ? `\u23F8\uFE0F <b>\u09AC\u09A8\u09CD\u09A7 (Paused) \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F (${all.length} \u099C\u09A8)</b>` : filterMode === "EXPIRED" ? `\u23F0 <b>\u09AE\u09C7\u09DF\u09BE\u09A6/\u0995\u09CB\u099F\u09BE \u09B6\u09C7\u09B7 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F (${all.length} \u099C\u09A8)</b>` : `\u{1F4CB} <b>\u09B8\u09AC API \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A4\u09BE\u09B2\u09BF\u0995\u09BE (${all.length} \u099C\u09A8)</b>`;
    const lines = [headerTitle, ""];
    if (slice.length === 0) {
      lines.push("\u098F\u0987 \u09A4\u09BE\u09B2\u09BF\u0995\u09BE\u09DF \u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A8\u09C7\u0987\u0964");
    } else {
      slice.forEach((r, idx) => {
        const st = getTrialStatusMeta(r);
        const icon = st.code === "ACTIVE" ? "\u{1F7E2}" : st.code === "PAUSED" ? "\u{1F534}" : "\u23F0";
        const timeStr = r.active ? formatRemainingDurationBn(r.expiresAt) : "Paused";
        lines.push(
          `${page * pageSize + idx + 1}. ${icon} <b>${escTgHtml(r.clientName)}</b> \u2014 <code>${escTgHtml(
            r.plan
          )}</code> (${timeStr}) [<code>#${getTrialShortId(r.key)}</code>]`
        );
      });
      lines.push("", "\u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u0995\u09B0\u09A4\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09AC\u09BE\u099F\u09A8\u09C7 \u099F\u09CD\u09AF\u09BE\u09AA \u0995\u09B0\u09C1\u09A8:");
    }
    const prefix = filterMode === "PAUSED" ? "paused" : filterMode === "EXPIRED" ? "expired" : "list";
    const keyboard = slice.map((r) => {
      const st = getTrialStatusMeta(r);
      const icon = st.code === "ACTIVE" ? "\u{1F7E2}" : st.code === "PAUSED" ? "\u{1F534}" : "\u23F0";
      const timeStr = st.code === "PAUSED" ? "Paused" : formatRemainingDurationBn(r.expiresAt);
      return [
        {
          text: `${icon} ${r.clientName.slice(0, 22)} (${r.plan} \u2022 ${timeStr})`,
          callback_data: `tb:view:${getTrialShortId(r.key)}`
        }
      ];
    });
    const navRow = [];
    if (page > 0) navRow.push({ text: "\u25C0\uFE0F \u0986\u0997\u09C7\u09B0", callback_data: `tb:${prefix}:${page - 1}` });
    if (page + 1 < totalPages) navRow.push({ text: "\u09AA\u09B0\u09C7\u09B0 \u25B6\uFE0F", callback_data: `tb:${prefix}:${page + 1}` });
    if (navRow.length) keyboard.push(navRow);
    keyboard.push([
      { text: "\u2795 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F", callback_data: "tb:newmenu" },
      { text: "\u{1F3E0} \u09AE\u09C7\u0987\u09A8 \u09AE\u09C7\u09A8\u09C1", callback_data: "tb:menu" }
    ]);
    return { text: lines.join("\n"), reply_markup: { inline_keyboard: keyboard } };
  };
  const handleTelegramUpdate = async (update, dispatch = callTelegramBotApi) => {
    if (!update || typeof update !== "object") return { handled: false, reason: "empty_update" };
    const allowedAdmins = getAllowedTelegramAdminIds();
    const cb = update.callback_query;
    const msg = update.message || update.edited_message;
    const chatId = cb ? String(cb.message?.chat?.id || cb.from?.id || "") : msg ? String(msg.chat?.id || msg.from?.id || "") : "";
    const fromId = cb ? String(cb.from?.id || "") : msg ? String(msg.from?.id || "") : "";
    if (!chatId) return { handled: false, reason: "no_chat_id" };
    const isAuthorized = allowedAdmins.size > 0 && (allowedAdmins.has(chatId) || allowedAdmins.has(fromId));
    if (!isAuthorized) {
      const replyText = allowedAdmins.size === 0 ? [
        "\u{1F512} <b>Admin Bot \u09B8\u09C1\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u0986\u099B\u09C7!</b>",
        `\u0986\u09AA\u09A8\u09BE\u09B0 Telegram Chat ID: <code>${escTgHtml(fromId || chatId)}</code>`,
        "",
        "\u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 Env Variable-\u098F <code>TELEGRAM_ADMIN_CHAT_ID</code> \u09B8\u09C7\u099F \u0995\u09B0\u09C7 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09B0\u09BF\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u099F \u0995\u09B0\u09B2\u09C7 \u09AC\u099F \u0985\u09CD\u09AF\u09BE\u0995\u09CD\u09B8\u09C7\u09B8 \u099A\u09BE\u09B2\u09C1 \u09B9\u09AC\u09C7\u0964"
      ].join("\n") : "\u26D4 Unauthorized. \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 Bot Owner \u098F\u0987 \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964";
      if (cb?.id) {
        await dispatch("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: "Unauthorized admin ID",
          show_alert: true
        });
      }
      await dispatch("sendMessage", { chat_id: chatId, text: replyText, parse_mode: "HTML" });
      return { handled: true, reason: "unauthorized" };
    }
    const sendOrEdit = async (text2, reply_markup, forceNew = false) => {
      if (cb && cb.message?.message_id && !forceNew) {
        const res = await dispatch("editMessageText", {
          chat_id: chatId,
          message_id: cb.message.message_id,
          text: text2,
          parse_mode: "HTML",
          ...reply_markup ? { reply_markup } : {}
        });
        if (res.ok) return res;
      }
      return dispatch("sendMessage", {
        chat_id: chatId,
        text: text2,
        parse_mode: "HTML",
        ...reply_markup ? { reply_markup } : {}
      });
    };
    const sendClientShareMessage = async (headerHtml, rec) => {
      const fullText = buildClientShareMessageText(rec);
      const MAX_PRE_CHARS = 3500;
      if (fullText.length <= MAX_PRE_CHARS) {
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `${headerHtml}

<pre>${escTgHtml(fullText)}</pre>`,
          parse_mode: "HTML"
        });
        return;
      }
      const lines = fullText.split("\n");
      const chunks = [];
      let buf = "";
      for (const line of lines) {
        if (buf.length + line.length + 1 > MAX_PRE_CHARS && buf) {
          chunks.push(buf);
          buf = line;
        } else {
          buf = buf ? `${buf}
${line}` : line;
        }
      }
      if (buf) chunks.push(buf);
      for (let i = 0; i < chunks.length; i++) {
        const prefix = i === 0 ? `${headerHtml}

` : `\u{1F4CB} <b>\u0985\u0982\u09B6 ${i + 1}/${chunks.length}:</b>

`;
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `${prefix}<pre>${escTgHtml(chunks[i])}</pre>`,
          parse_mode: "HTML"
        });
      }
    };
    const sendClientCreatedMessages = async (rec) => {
      notifiedTrialAlerts.delete(rec.key);
      await dispatch("sendMessage", {
        chat_id: chatId,
        text: `\u2705 <b>\u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API Key \u09A4\u09C8\u09B0\u09BF \u09B9\u09DF\u09C7\u099B\u09C7!</b>

${buildClientCardHtml(rec)}`,
        parse_mode: "HTML",
        reply_markup: buildClientInlineKeyboard(rec)
      });
      await sendClientShareMessage("\u{1F4CB} <b>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u0995\u09C7 \u09A6\u09C7\u0993\u09DF\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u09AA\u09BF/\u09AB\u09B0\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AE\u09C7\u09B8\u09C7\u099C:</b>", rec);
    };
    const sendSearchMatches = async (query) => {
      const { exact, matches } = findTrialMatches(query);
      if (exact) {
        await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact), true);
        return;
      }
      if (matches.length === 0) {
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u274C "<b>${escTgHtml(query)}</b>" \u09A8\u09BE\u09AE\u09C7 \u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "\u{1F4CB} \u09B8\u09AC \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B2\u09BF\u09B8\u09CD\u099F", callback_data: "tb:list:0" }]] }
        });
        return;
      }
      const buttons = matches.slice(0, 10).map((r) => {
        const icon = getTrialStatusMeta(r).code === "ACTIVE" ? "\u{1F7E2}" : "\u{1F534}";
        return [
          {
            text: `${icon} ${r.clientName} (${r.plan} \u2022 #${getTrialShortId(r.key)})`,
            callback_data: `tb:view:${getTrialShortId(r.key)}`
          }
        ];
      });
      await dispatch("sendMessage", {
        chat_id: chatId,
        text: `\u{1F50D} "<b>${escTgHtml(query)}</b>" \u098F\u09B0 \u099C\u09A8\u09CD\u09AF ${matches.length} \u099C\u09A8 \u09AE\u09BF\u09B2\u09C7\u099B\u09C7\u0964 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C1\u09A8:`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
      });
    };
    if (cb) {
      const data = String(cb.data || "");
      let toast = "";
      if (data === "tb:menu" || data === "tb:stats") {
        botPendingState.delete(chatId);
        await sendOrEdit(buildDashboardSummaryHtml(), buildMainMenuKeyboard());
      } else if (data.startsWith("tb:list:")) {
        const pg = parseInt(data.slice(8), 10) || 0;
        const view = renderClientListMessage("ALL", pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data.startsWith("tb:paused:")) {
        const pg = parseInt(data.slice(10), 10) || 0;
        const view = renderClientListMessage("PAUSED", pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data.startsWith("tb:expired:")) {
        const pg = parseInt(data.slice(11), 10) || 0;
        const view = renderClientListMessage("EXPIRED", pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data === "tb:newmenu") {
        botPendingState.set(chatId, { step: "await_new_name", updatedAt: Date.now() });
        await sendOrEdit(
          "\u2795 <b>\u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API Key \u09A4\u09C8\u09B0\u09BF</b>\n\n\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AC\u09BE \u0985\u09CD\u09AF\u09BE\u09AA\u09C7\u09B0 \u09A8\u09BE\u09AE \u09B2\u09BF\u0996\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8 (\u09AF\u09C7\u09AE\u09A8: <code>Rahim OTT App</code>):",
          { inline_keyboard: [[{ text: "\u274C \u09AC\u09BE\u09A4\u09BF\u09B2", callback_data: "tb:menu" }]] }
        );
      } else if (data === "tb:findask") {
        botPendingState.set(chatId, { step: "await_find_query", updatedAt: Date.now() });
        await sendOrEdit(
          "\u{1F50D} <b>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0996\u09C1\u0981\u099C\u09C1\u09A8</b>\n\n\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09A8\u09BE\u09AE \u0985\u09A5\u09AC\u09BE Short ID (\u09AF\u09C7\u09AE\u09A8 <code>Rahim</code>) \u09B2\u09BF\u0996\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8:",
          { inline_keyboard: [[{ text: "\u274C \u09AC\u09BE\u09A4\u09BF\u09B2", callback_data: "tb:menu" }]] }
        );
      } else if (data.startsWith("tb:mk:")) {
        const code = data.slice(6);
        const pending2 = botPendingState.get(chatId);
        const name = pending2 && pending2.clientName || `Client ${(/* @__PURE__ */ new Date()).toISOString().slice(5, 16)}`;
        botPendingState.delete(chatId);
        let plan = "30D";
        let forceUnlim = false;
        if (code === "24H") plan = "24H";
        else if (code === "72H") plan = "72H";
        else if (code === "7D") plan = "7D";
        else if (code === "30D") plan = "30D";
        else if (code === "30DU") {
          plan = "30D";
          forceUnlim = true;
        } else if (code === "UNLIM") {
          plan = "UNLIMITED";
          forceUnlim = true;
        }
        const created = createClientKeyForOwner(name, plan, forceUnlim);
        toast = "API Key \u09A4\u09C8\u09B0\u09BF \u09B9\u09DF\u09C7\u099B\u09C7!";
        await sendClientCreatedMessages(created);
      } else if (data.startsWith("tb:view:")) {
        const sid = data.slice(8);
        const { exact } = findTrialMatches(sid);
        if (!exact) {
          toast = "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF";
          await sendOrEdit("\u274C \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u099F\u09BF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF \u09AC\u09BE \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964", buildMainMenuKeyboard());
        } else {
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith("tb:pause:")) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = false;
          flushTrialStoreSync();
          toast = "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API \u09AC\u09A8\u09CD\u09A7 (Paused) \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!";
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith("tb:resume:")) {
        const sid = data.slice(10);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API \u099A\u09BE\u09B2\u09C1 (Resumed) \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!";
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith("tb:ext7:") || data.startsWith("tb:ext30:")) {
        const is30 = data.startsWith("tb:ext30:");
        const sid = data.slice(is30 ? 9 : 8);
        const days = is30 ? 30 : 7;
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 864e5;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = `+${days} \u09A6\u09BF\u09A8 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09AC\u09BE\u09DC\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7!`;
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith("tb:unlim:")) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.unlimited = true;
          exact.maxRequests = -1;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = "\u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u099A\u09BE\u09B2\u09C1 \u09B9\u09DF\u09C7\u099B\u09C7!";
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith("tb:msg:")) {
        const sid = data.slice(7);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          toast = "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09B8\u09C7\u099C \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7";
          await sendClientShareMessage(`\u{1F4CB} <b>${escTgHtml(exact.clientName)} \u2014 \u0995\u09AA\u09BF/\u09AB\u09B0\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AE\u09C7\u09B8\u09C7\u099C:</b>`, exact);
        }
      } else if (data.startsWith("tb:del:")) {
        const sid = data.slice(7);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          await sendOrEdit(
            `\u26A0\uFE0F \u0986\u09AA\u09A8\u09BF \u0995\u09BF \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4\u09AD\u09BE\u09AC\u09C7 <b>${escTgHtml(exact.clientName)}</b> (<code>#${sid}</code>)-\u098F\u09B0 API Key \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09A4\u09C7 \u099A\u09BE\u09A8?

\u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09B2\u09C7 \u098F\u0987 Key \u09A6\u09BF\u09DF\u09C7 \u0986\u09B0 \u0995\u09CB\u09A8\u09CB \u09AD\u09BF\u09A1\u09BF\u0993 \u09AC\u09BE API \u0995\u09BE\u099C \u0995\u09B0\u09AC\u09C7 \u09A8\u09BE\u0964`,
            {
              inline_keyboard: [
                [
                  { text: "\u2705 \u09B9\u09CD\u09AF\u09BE\u0981, \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09C1\u09A8", callback_data: `tb:delok:${sid}` },
                  { text: "\u274C \u09A8\u09BE, \u09AB\u09BF\u09B0\u09C7 \u09AF\u09BE\u09A8", callback_data: `tb:view:${sid}` }
                ]
              ]
            }
          );
        }
      } else if (data.startsWith("tb:delok:")) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = false;
          exact.revoked = true;
          flushTrialStoreSync();
          toast = "API Key \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u09B9\u09DF\u09C7\u099B\u09C7!";
        }
        const view = renderClientListMessage("ALL", 0);
        await sendOrEdit(view.text, view.reply_markup);
      }
      if (cb.id) {
        await dispatch("answerCallbackQuery", {
          callback_query_id: cb.id,
          ...toast ? { text: toast } : {}
        });
      }
      return { handled: true, reason: `callback:${data}` };
    }
    const text = String(msg?.text || "").trim();
    if (!text) return { handled: false, reason: "no_text" };
    const cmdMatch = text.match(/^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/);
    if (cmdMatch) {
      botPendingState.delete(chatId);
      const cmd = cmdMatch[1].toLowerCase();
      const arg = (cmdMatch[2] || "").trim();
      if (cmd === "start" || cmd === "menu" || cmd === "help" || cmd === "stats") {
        const helpFooter = cmd === "help" ? [
          "",
          "\u26A1 <b>\u09B8\u0995\u09B2 \u0995\u09AE\u09BE\u09A8\u09CD\u09A1:</b>",
          "\u2022 <code>/list</code> \u2014 \u09B8\u09AC \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0993 \u09AE\u09C7\u09DF\u09BE\u09A6",
          "\u2022 <code>/new RahimOTT 30D</code> \u2014 \u09A8\u09A4\u09C1\u09A8 Key (24H/72H/7D/30D/UNLIMITED)",
          "\u2022 <code>/find Rahim</code> \u2014 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0996\u09C1\u0981\u099C\u09C1\u09A8",
          "\u2022 <code>/pause Rahim</code> \u2014 \u099F\u09BE\u0995\u09BE \u09A8\u09BE \u09A6\u09BF\u09B2\u09C7 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09BE\u09A5\u09C7 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8",
          "\u2022 <code>/resume Rahim</code> \u2014 \u0986\u09AC\u09BE\u09B0 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8",
          "\u2022 <code>/renew Rahim 30</code> \u2014 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09E9\u09E6 \u09A6\u09BF\u09A8 \u09AC\u09BE\u09DC\u09BE\u09A8",
          "\u2022 <code>/unlimited Rahim</code> \u2014 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u0995\u09B0\u09C1\u09A8",
          "\u2022 <code>/delete Rahim</code> \u2014 Key \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09C1\u09A8",
          "\u2022 <code>/msg Rahim</code> \u2014 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u0995\u09C7 \u09A6\u09C7\u0993\u09DF\u09BE\u09B0 \u09AE\u09C7\u09B8\u09C7\u099C \u0986\u09A8\u09C1\u09A8",
          "\u2022 <code>/seturl https://...</code> \u2014 \u09B2\u09BE\u0987\u09AD \u09A1\u09CB\u09AE\u09C7\u0987\u09A8 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8"
        ].join("\n") : "";
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: buildDashboardSummaryHtml() + helpFooter,
          parse_mode: "HTML",
          reply_markup: buildMainMenuKeyboard()
        });
        return { handled: true, reason: `cmd:${cmd}` };
      }
      if (cmd === "list") {
        const pg = Math.max(0, (parseInt(arg, 10) || 1) - 1);
        const view = renderClientListMessage("ALL", pg);
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: view.text,
          parse_mode: "HTML",
          reply_markup: view.reply_markup
        });
        return { handled: true, reason: "cmd:list" };
      }
      if (cmd === "new") {
        if (!arg) {
          botPendingState.set(chatId, { step: "await_new_name", updatedAt: Date.now() });
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u2795 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09A8\u09BE\u09AE \u09B2\u09BF\u0996\u09C1\u09A8 (\u09AF\u09C7\u09AE\u09A8: <code>Rahim OTT</code>):",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:new:prompt" };
        }
        const parts = arg.split(/\s+/);
        const lastUpper = parts[parts.length - 1].toUpperCase();
        const planTokens = ["2H", "24H", "72H", "7D", "30D", "UNLIMITED", "UNLIM"];
        let plan = "30D";
        let clientName = arg;
        if (parts.length > 1 && planTokens.includes(lastUpper)) {
          plan = lastUpper === "UNLIM" ? "UNLIMITED" : lastUpper;
          clientName = parts.slice(0, -1).join(" ");
        }
        const created = createClientKeyForOwner(clientName, plan, plan === "UNLIMITED");
        await sendClientCreatedMessages(created);
        return { handled: true, reason: `cmd:new:${plan}` };
      }
      if (cmd === "find" || cmd === "info") {
        if (!arg) {
          botPendingState.set(chatId, { step: "await_find_query", updatedAt: Date.now() });
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u{1F50D} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09A8\u09BE\u09AE \u0985\u09A5\u09AC\u09BE ID \u09B2\u09BF\u0996\u09C1\u09A8:",
            parse_mode: "HTML"
          });
          return { handled: true, reason: `cmd:${cmd}:prompt` };
        }
        await sendSearchMatches(arg);
        return { handled: true, reason: `cmd:${cmd}` };
      }
      if (cmd === "pause" || cmd === "resume" || cmd === "unlimited" || cmd === "delete" || cmd === "msg") {
        if (!arg) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: <code>/${cmd} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0_\u09A8\u09BE\u09AE_\u09AC\u09BE_ID</code>`,
            parse_mode: "HTML"
          });
          return { handled: true, reason: `cmd:${cmd}:missing_arg` };
        }
        const { exact, matches } = findTrialMatches(arg);
        if (!exact) {
          await sendSearchMatches(arg);
          return { handled: true, reason: `cmd:${cmd}:not_exact_${matches.length}` };
        }
        if (cmd === "pause") {
          exact.active = false;
          flushTrialStoreSync();
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u23F8\uFE0F <b>\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 (API \u0993 \u09AD\u09BF\u09A1\u09BF\u0993 \u09AC\u09CD\u09B2\u0995):</b>

${buildClientCardHtml(exact)}`,
            parse_mode: "HTML",
            reply_markup: buildClientInlineKeyboard(exact)
          });
        } else if (cmd === "resume") {
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u25B6\uFE0F <b>\u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7:</b>

${buildClientCardHtml(exact)}`,
            parse_mode: "HTML",
            reply_markup: buildClientInlineKeyboard(exact)
          });
        } else if (cmd === "unlimited") {
          exact.unlimited = true;
          exact.maxRequests = -1;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u267E\uFE0F <b>\u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u099A\u09BE\u09B2\u09C1:</b>

${buildClientCardHtml(exact)}`,
            parse_mode: "HTML",
            reply_markup: buildClientInlineKeyboard(exact)
          });
        } else if (cmd === "delete") {
          exact.active = false;
          exact.revoked = true;
          flushTrialStoreSync();
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u{1F5D1} <b>${escTgHtml(exact.clientName)}</b> (<code>#${getTrialShortId(
              exact.key
            )}</code>) \u098F\u09B0 API Key \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964`,
            parse_mode: "HTML",
            reply_markup: buildMainMenuKeyboard()
          });
        } else if (cmd === "msg") {
          await sendClientShareMessage(`\u{1F4CB} <b>${escTgHtml(exact.clientName)} \u2014 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09B8\u09C7\u099C:</b>`, exact);
        }
        return { handled: true, reason: `cmd:${cmd}:ok` };
      }
      if (cmd === "renew") {
        const parts = arg.split(/\s+/).filter(Boolean);
        if (!parts.length) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: <code>/renew \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0_\u09A8\u09BE\u09AE 30</code> (\u09A1\u09BF\u09AB\u09B2\u09CD\u099F \u09E9\u09E6 \u09A6\u09BF\u09A8)",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:renew:missing_arg" };
        }
        let days = 30;
        let query = arg;
        if (parts.length > 1 && /^\d{1,4}$/.test(parts[parts.length - 1])) {
          days = Math.min(3650, Math.max(1, parseInt(parts[parts.length - 1], 10)));
          query = parts.slice(0, -1).join(" ");
        }
        const { exact } = findTrialMatches(query);
        if (!exact) {
          await sendSearchMatches(query);
          return { handled: true, reason: "cmd:renew:not_exact" };
        }
        exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 864e5;
        exact.active = true;
        notifiedTrialAlerts.delete(exact.key);
        flushTrialStoreSync();
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u2705 <b>+${days} \u09A6\u09BF\u09A8 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09AC\u09BE\u09DC\u09BE\u09A8\u09CB (Renew) \u09B9\u09DF\u09C7\u099B\u09C7!</b>

${buildClientCardHtml(exact)}`,
          parse_mode: "HTML",
          reply_markup: buildClientInlineKeyboard(exact)
        });
        return { handled: true, reason: `cmd:renew:${days}` };
      }
      if (cmd === "seturl") {
        const cleanUrl = arg.replace(/\/+$/, "");
        if (!/^https?:\/\/.+/i.test(cleanUrl)) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: <code>/seturl https://your-domain.run.app</code>
\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 URL: <code>${escTgHtml(
              resolvePublicBotBaseUrl()
            )}</code>`,
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:seturl:invalid" };
        }
        botConfigState.publicUrl = cleanUrl;
        saveBotConfig(botConfigState);
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u2705 \u09AA\u09BE\u09AC\u09B2\u09BF\u0995 API Base URL \u0986\u09AA\u09A1\u09C7\u099F \u09B9\u09DF\u09C7\u099B\u09C7:
<code>${escTgHtml(cleanUrl)}</code>`,
          parse_mode: "HTML"
        });
        return { handled: true, reason: "cmd:seturl:ok" };
      }
      if (cmd === "setworker") {
        const cleanUrl = arg.trim().replace(/\/+$/, "");
        if (!cleanUrl) {
          const configured = getConfiguredWorkerUrl();
          const health2 = configured ? await probeCloudflareWorkerHealth(configured, true) : null;
          const active = resolveStreamProxyOrigin("");
          const statusLine = !configured ? "OFF (Direct Server Proxy \u099A\u09BE\u09B2\u09C1)" : health2?.healthy ? `\u{1F7E2} ACTIVE (v${health2.version}) \u2014 <code>${escTgHtml(active)}</code>` : `\u26A0\uFE0F Worker v1 \u09AA\u09C1\u09B0\u09A8\u09CB/\u0985\u0995\u09BE\u09B0\u09CD\u09AF\u0995\u09B0 (<code>${escTgHtml(configured)}</code>) \u2014 \u0985\u099F\u09CB-\u09AB\u09B2\u09AC\u09CD\u09AF\u09BE\u0995 Direct Server Proxy \u099A\u09BE\u09B2\u09C1 \u0986\u099B\u09C7! Worker \u0995\u09CB\u09A1 v2 \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09B2\u09C7 \u0985\u099F\u09CB \u099A\u09BE\u09B2\u09C1 \u09B9\u09AC\u09C7\u0964`;
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: `\u26A1 <b>Cloudflare Worker Video Proxy</b>
\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8: ${statusLine}

\u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09A4\u09C7 \u09B2\u09BF\u0996\u09C1\u09A8:
<code>/setworker https://your-worker.workers.dev</code>
\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09A4\u09C7 \u09B2\u09BF\u0996\u09C1\u09A8:
<code>/setworker off</code>`,
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:setworker:info" };
        }
        if (/^(off|none|disable)$/i.test(cleanUrl)) {
          botConfigState.workerUrl = "off";
          saveBotConfig(botConfigState);
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u2705 Cloudflare Worker Video Proxy \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 (\u098F\u0996\u09A8 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u09AE \u09B9\u09AC\u09C7)\u0964\n\u0986\u09AC\u09BE\u09B0 \u09A1\u09BF\u09AB\u09B2\u09CD\u099F Worker \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09A4\u09C7 \u09B2\u09BF\u0996\u09C1\u09A8: <code>/setworker reset</code>",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:setworker:off" };
        }
        if (/^(reset|default)$/i.test(cleanUrl)) {
          delete botConfigState.workerUrl;
          saveBotConfig(botConfigState);
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u2705 \u09A1\u09BF\u09AB\u09B2\u09CD\u099F Direct Server Video Proxy \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 (\u09B8\u09AC \u09AD\u09BF\u09A1\u09BF\u0993 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 206 MP4 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u09AE \u09B9\u09AC\u09C7)\u0964",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:setworker:reset" };
        }
        if (!/^https?:\/\/.+/i.test(cleanUrl)) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u274C \u09B8\u09A0\u09BF\u0995 https:// URL \u09A6\u09BF\u09A8\u0964 \u09AF\u09C7\u09AE\u09A8: <code>/setworker https://mb-stream.yourname.workers.dev</code>",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:setworker:invalid" };
        }
        botConfigState.workerUrl = cleanUrl;
        saveBotConfig(botConfigState);
        const health = await probeCloudflareWorkerHealth(cleanUrl, true);
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: health.healthy ? `\u2705 <b>Cloudflare Worker Video Proxy (v${health.version}) \u099A\u09BE\u09B2\u09C1 \u09B9\u09DF\u09C7\u099B\u09C7!</b>
\u098F\u0996\u09A8 \u09B8\u09AC \u09AD\u09BF\u09A1\u09BF\u0993 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u09AE, \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u0993 \u09B8\u09BE\u09AC\u099F\u09BE\u0987\u099F\u09C7\u09B2 \u098F\u0987 Worker \u09A6\u09BF\u09DF\u09C7 \u09AF\u09BE\u09AC\u09C7 (\u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09AC\u09CD\u09AF\u09BE\u09A8\u09CD\u09A1\u0989\u0987\u09A5 \u09E6% \u0996\u09B0\u099A \u09B9\u09AC\u09C7):
<code>${escTgHtml(cleanUrl)}</code>` : `\u26A0\uFE0F Worker \u09B8\u09C7\u09AD \u09B9\u09DF\u09C7\u099B\u09C7 (<code>${escTgHtml(cleanUrl)}</code>), \u09A4\u09AC\u09C7 <code>/health</code> \u098F v2 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF (${health.reason})\u0964 \u09A4\u09BE\u0987 \u09AD\u09BF\u09A1\u09BF\u0993 \u09AC\u09A8\u09CD\u09A7 \u09A8\u09BE \u09B9\u09A4\u09C7 \u0985\u099F\u09CB Direct Server \u099A\u09BE\u09B2\u09C1 \u09A5\u09BE\u0995\u099B\u09C7 \u2014 \u09A8\u09A4\u09C1\u09A8 <code>cloudflare-worker.js</code> Deploy \u0995\u09B0\u09B2\u09C7\u0987 \u0985\u099F\u09CB Worker \u099A\u09BE\u09B2\u09C1 \u09B9\u09DF\u09C7 \u09AF\u09BE\u09AC\u09C7\u0964`,
          parse_mode: "HTML"
        });
        return { handled: true, reason: "cmd:setworker:ok" };
      }
      if (cmd === "import" || cmd === "recover") {
        const matches = arg.match(/cp_tr1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
        const uniqueKeys = Array.from(new Set(matches));
        if (uniqueKeys.length === 0) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u{1F4E5} <b>\u09AA\u09C1\u09B0\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B0\u09BF\u0995\u09AD\u09BE\u09B0 (/import)</b>\n\n\u09AA\u09C1\u09B0\u09A8\u09CB \u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09AE\u09C7\u09B8\u09C7\u099C \u09AC\u09BE <code>cp_tr1_...</code> Key \u0995\u09AA\u09BF \u0995\u09B0\u09C7 \u098F\u09AD\u09BE\u09AC\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8:\n<code>/import cp_tr1_...</code>\n\n\u0985\u09A5\u09AC\u09BE \u09AA\u09C1\u09B0\u09CB \u09AA\u09C1\u09B0\u09A8\u09CB \u09AE\u09C7\u09B8\u09C7\u099C\u099F\u09BE \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u098F\u0987 \u099A\u09CD\u09AF\u09BE\u099F\u09C7 \u09AA\u09C7\u09B8\u09CD\u099F/\u09AB\u09B0\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09B0\u09B2\u09C7\u0987 \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09BF\u0995 \u09B0\u09BF\u0995\u09AD\u09BE\u09B0 \u09B9\u09DF\u09C7 \u09AF\u09BE\u09AC\u09C7!",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:import:help" };
        }
        const recoveredNames = [];
        for (const k of uniqueKeys) {
          const rec = resolveOrRecoverTrialKey(k);
          if (rec) {
            recoveredNames.push(`\u2022 <b>${escTgHtml(rec.clientName)}</b> (${escTgHtml(rec.plan)})`);
          }
        }
        if (recoveredNames.length === 0) {
          await dispatch("sendMessage", {
            chat_id: chatId,
            text: "\u274C \u0995\u09CB\u09A8\u09CB \u09AC\u09C8\u09A7 <code>cp_tr1_...</code> Key \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964",
            parse_mode: "HTML"
          });
          return { handled: true, reason: "cmd:import:none" };
        }
        flushTrialStoreSync();
        await syncCloudBackupToTelegramNow(true);
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u2705 <b>${recoveredNames.length} \u099C\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B0\u09BF\u0995\u09AD\u09BE\u09B0 \u0993 \u0995\u09CD\u09B2\u09BE\u0989\u09A1\u09C7 \u09B8\u09C7\u09AD \u09B9\u09DF\u09C7\u099B\u09C7!</b>

${recoveredNames.slice(0, 30).join("\n")}

\u098F\u0996\u09A8 <code>/list</code> \u09B2\u09BF\u0996\u09C7 \u09A6\u09C7\u0996\u09C7 \u09A8\u09BF\u09A8\u0964`,
          parse_mode: "HTML",
          reply_markup: buildMainMenuKeyboard()
        });
        return { handled: true, reason: "cmd:import:ok" };
      }
      if (cmd === "backup") {
        const result = await syncCloudBackupToTelegramNow(true);
        const totalClients = listAllNonRevokedTrials().length;
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: result.ok ? `\u2601\uFE0F <b>Auto Cloud Backup \u09B8\u09AB\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7!</b>

\u{1F465} \u09AE\u09CB\u099F \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u09AD: <b>${totalClients} \u099C\u09A8</b>
\u{1F4CC} \u09AA\u09BF\u09A8\u09CD\u09A1 \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u09AE\u09C7\u09B8\u09C7\u099C ID: <code>${result.messageId || botConfigState.backupMessageId || "-"}</code>

\u2705 \u098F\u0996\u09A8 Render \u09AF\u09A4\u09AC\u09BE\u09B0\u0987 \u09B0\u09BF\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u099F \u09AC\u09BE \u09A8\u09A4\u09C1\u09A8 Deploy \u09B9\u09CB\u0995, \u09B8\u09AC \u09A1\u09BE\u099F\u09BE \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09BF\u0995 \u09AB\u09BF\u09B0\u09C7 \u0986\u09B8\u09AC\u09C7\u0964 (\u09AA\u09BF\u09A8 \u0995\u09B0\u09BE \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u09AB\u09BE\u0987\u09B2\u099F\u09BF \u09A1\u09BF\u09B2\u09BF\u099F \u09AC\u09BE \u0986\u09A8\u09AA\u09BF\u09A8 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964)` : `\u26A0\uFE0F Cloud Backup \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5: <code>${escTgHtml(result.error || "Unknown error")}</code>`,
          parse_mode: "HTML",
          reply_markup: buildMainMenuKeyboard()
        });
        return { handled: true, reason: "cmd:backup" };
      }
      await dispatch("sendMessage", {
        chat_id: chatId,
        text: "\u2753 \u0985\u099C\u09BE\u09A8\u09BE \u0995\u09AE\u09BE\u09A8\u09CD\u09A1\u0964 <code>/menu</code> \u09AC\u09BE <code>/help</code> \u09B2\u09BF\u0996\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8\u0964",
        parse_mode: "HTML",
        reply_markup: buildMainMenuKeyboard()
      });
      return { handled: true, reason: `cmd:unknown:${cmd}` };
    }
    if (!botPendingState.has(chatId) && /cp_tr1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text)) {
      const uniqueKeys = Array.from(new Set(text.match(/cp_tr1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []));
      const recoveredNames = [];
      for (const k of uniqueKeys) {
        const rec = resolveOrRecoverTrialKey(k);
        if (rec) {
          recoveredNames.push(`\u2022 <b>${escTgHtml(rec.clientName)}</b> (${escTgHtml(rec.plan)})`);
        }
      }
      if (recoveredNames.length > 0) {
        flushTrialStoreSync();
        await syncCloudBackupToTelegramNow(true);
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u2705 <b>\u0985\u099F\u09CB-\u09B0\u09BF\u0995\u09AD\u09BE\u09B0 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8! (${recoveredNames.length} \u099C\u09A8)</b>

${recoveredNames.slice(0, 30).join("\n")}

\u2601\uFE0F \u0995\u09CD\u09B2\u09BE\u0989\u09A1 \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA\u09C7\u0993 \u09B8\u09C7\u09AD \u09B9\u09DF\u09C7 \u0997\u09C7\u099B\u09C7\u0964 <code>/list</code> \u09B2\u09BF\u0996\u09C7 \u09A6\u09C7\u0996\u09C1\u09A8\u0964`,
          parse_mode: "HTML",
          reply_markup: buildMainMenuKeyboard()
        });
        return { handled: true, reason: "auto:import:ok" };
      }
    }
    const pending = botPendingState.get(chatId);
    if (pending && Date.now() - pending.updatedAt < 10 * 6e4) {
      if (pending.step === "await_new_name") {
        const cleanName = text.slice(0, 48);
        botPendingState.set(chatId, { step: "await_new_plan", clientName: cleanName, updatedAt: Date.now() });
        await dispatch("sendMessage", {
          chat_id: chatId,
          text: `\u{1F464} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F: <b>${escTgHtml(cleanName)}</b>

\u098F\u0996\u09A8 \u09AE\u09C7\u09DF\u09BE\u09A6 \u0993 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C1\u09A8:`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "\u23F1\uFE0F 24H \u099F\u09CD\u09B0\u09BE\u09DF\u09BE\u09B2 (250 Req)", callback_data: "tb:mk:24H" },
                { text: "\u{1F4C5} 72H \u099F\u09CD\u09B0\u09BE\u09DF\u09BE\u09B2 (600 Req)", callback_data: "tb:mk:72H" }
              ],
              [
                { text: "\u{1F5D3} 7 \u09A6\u09BF\u09A8 (5,000 Req)", callback_data: "tb:mk:7D" },
                { text: "\u{1F680} 30 \u09A6\u09BF\u09A8 (100k Req)", callback_data: "tb:mk:30D" }
              ],
              [
                { text: "\u{1F48E} 30 \u09A6\u09BF\u09A8 \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1", callback_data: "tb:mk:30DU" },
                { text: "\u267E\uFE0F \u09B2\u09BE\u0987\u09AB\u099F\u09BE\u0987\u09AE \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 (10Yr)", callback_data: "tb:mk:UNLIM" }
              ],
              [{ text: "\u274C \u09AC\u09BE\u09A4\u09BF\u09B2", callback_data: "tb:menu" }]
            ]
          }
        });
        return { handled: true, reason: "pending:new_name" };
      }
      if (pending.step === "await_find_query") {
        botPendingState.delete(chatId);
        await sendSearchMatches(text);
        return { handled: true, reason: "pending:find_query" };
      }
    }
    await dispatch("sendMessage", {
      chat_id: chatId,
      text: buildDashboardSummaryHtml(),
      parse_mode: "HTML",
      reply_markup: buildMainMenuKeyboard()
    });
    return { handled: true, reason: "text:menu" };
  };
  app.post("/api/trial/telegram/webhook", express.json({ limit: "256kb" }), async (req, res) => {
    const token = getTelegramBotToken();
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || "").trim();
    const adminHdr = String(req.headers["x-trial-admin"] || "").trim();
    const isAdminHdr = Boolean(adminEnv && adminHdr && adminHdr === adminEnv);
    const tgSecretHdr = String(req.headers["x-telegram-bot-api-secret-token"] || "").trim();
    const expectedSecret = token ? crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`tg-webhook::${token}`).digest("hex").slice(0, 32) : "";
    if (!isAdminHdr && (!expectedSecret || tgSecretHdr !== expectedSecret)) {
      res.status(403).json({ ok: false, error: "Forbidden webhook request" });
      return;
    }
    const captureOnly = isAdminHdr && req.query.dryRun === "1";
    const capturedReplies = [];
    const dispatch = captureOnly ? async (method, payload) => {
      capturedReplies.push({ method, payload });
      return { ok: true, result: { message_id: capturedReplies.length } };
    } : callTelegramBotApi;
    try {
      const result = await handleTelegramUpdate(req.body, dispatch);
      res.status(200).json({ ok: true, ...result, ...captureOnly ? { replies: capturedReplies } : {} });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || "Telegram webhook failed" });
    }
  });
  let cloudBackupTimer = null;
  let cloudBackupInFlight = false;
  let lastCloudStructuralHash = "";
  let lastCloudSyncAt = 0;
  let cloudRestoreCompleted = false;
  const getPrimaryTelegramAdminChatId = () => {
    const ids = Array.from(getAllowedTelegramAdminIds());
    return ids[0] || "";
  };
  const buildCloudBackupSnapshot = () => {
    const keys = Array.from(trialKeysMap.values()).slice(-1e3);
    const config = {
      publicUrl: botConfigState.publicUrl || void 0,
      workerUrl: botConfigState.workerUrl || void 0,
      ownerPinHash: botConfigState.ownerPinHash || void 0,
      ownerPinSalt: botConfigState.ownerPinSalt || void 0
    };
    const structuralFingerprint = crypto.createHash("sha1").update(
      JSON.stringify({
        config,
        keys: keys.map((k) => ({
          key: k.key,
          clientName: k.clientName,
          plan: k.plan,
          expiresAt: k.expiresAt,
          maxRequests: k.maxRequests,
          unlimited: Boolean(k.unlimited),
          active: k.active,
          revoked: Boolean(k.revoked)
        }))
      })
    ).digest("hex");
    return {
      version: 1,
      updatedAt: Date.now(),
      config,
      keys,
      structuralFingerprint
    };
  };
  const syncCloudBackupToTelegramNow = async (force = false) => {
    const token = getTelegramBotToken();
    const adminChatId = getPrimaryTelegramAdminChatId();
    if (!token || !adminChatId) return { ok: false, error: "Bot token or admin chat ID missing" };
    if (cloudBackupInFlight) return { ok: true, messageId: botConfigState.backupMessageId };
    const snap = buildCloudBackupSnapshot();
    const now = Date.now();
    const structuralChanged = snap.structuralFingerprint !== lastCloudStructuralHash;
    if (!force && !structuralChanged && now - lastCloudSyncAt < 3 * 6e4) {
      return { ok: true, messageId: botConfigState.backupMessageId };
    }
    if (!force && snap.keys.length === 0 && !snap.config.publicUrl && !snap.config.workerUrl) {
      return { ok: true, messageId: botConfigState.backupMessageId };
    }
    cloudBackupInFlight = true;
    try {
      const payloadJson = JSON.stringify(
        {
          version: snap.version,
          updatedAt: snap.updatedAt,
          config: snap.config,
          keys: snap.keys
        },
        null,
        2
      );
      const activeCount = snap.keys.filter((k) => !k.revoked).length;
      const timeStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const caption = `\u2601\uFE0F MovieBox Auto Cloud Backup (\u09A1\u09BF\u09B2\u09BF\u099F \u09AC\u09BE \u0986\u09A8\u09AA\u09BF\u09A8 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE)
\u{1F465} \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F: ${activeCount} \u099C\u09A8 | \u{1F552} ${timeStr}`;
      const existingMsgId = botConfigState.backupMessageId;
      if (existingMsgId) {
        const fdEdit = new FormData();
        fdEdit.append("chat_id", adminChatId);
        fdEdit.append("message_id", String(existingMsgId));
        fdEdit.append(
          "media",
          JSON.stringify({
            type: "document",
            media: "attach://backup_file",
            caption
          })
        );
        fdEdit.append("backup_file", new Blob([payloadJson], { type: "application/json" }), "moviebox-clients-backup.json");
        const editResp = await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, {
          method: "POST",
          body: fdEdit,
          signal: AbortSignal.timeout(2e4)
        });
        const editJson = await editResp.json().catch(() => null);
        if (editJson?.ok || /message is not modified/i.test(String(editJson?.description || ""))) {
          lastCloudStructuralHash = snap.structuralFingerprint;
          lastCloudSyncAt = Date.now();
          return { ok: true, messageId: existingMsgId };
        }
      }
      const fdSend = new FormData();
      fdSend.append("chat_id", adminChatId);
      fdSend.append("caption", caption);
      fdSend.append("disable_notification", "true");
      fdSend.append("document", new Blob([payloadJson], { type: "application/json" }), "moviebox-clients-backup.json");
      const sendResp = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: fdSend,
        signal: AbortSignal.timeout(2e4)
      });
      const sendJson = await sendResp.json().catch(() => null);
      if (!sendJson?.ok || !sendJson.result?.message_id) {
        return { ok: false, error: sendJson?.description || "sendDocument failed" };
      }
      const newMsgId = sendJson.result.message_id;
      botConfigState.backupMessageId = newMsgId;
      saveBotConfig(botConfigState, true);
      await callTelegramBotApi("pinChatMessage", {
        chat_id: adminChatId,
        message_id: newMsgId,
        disable_notification: true
      }).catch(() => {
      });
      lastCloudStructuralHash = snap.structuralFingerprint;
      lastCloudSyncAt = Date.now();
      return { ok: true, messageId: newMsgId };
    } catch (err) {
      return { ok: false, error: err?.message || "Cloud backup error" };
    } finally {
      cloudBackupInFlight = false;
    }
  };
  scheduleCloudBackupToTelegram = (immediate = false) => {
    if (!cloudRestoreCompleted && !immediate) return;
    const token = getTelegramBotToken();
    const adminChatId = getPrimaryTelegramAdminChatId();
    if (!token || !adminChatId) return;
    if (cloudBackupTimer) {
      if (!immediate) return;
      clearTimeout(cloudBackupTimer);
      cloudBackupTimer = null;
    }
    const snap = buildCloudBackupSnapshot();
    const structuralChanged = snap.structuralFingerprint !== lastCloudStructuralHash;
    const delayMs = immediate || structuralChanged ? 2e3 : 12e4;
    cloudBackupTimer = setTimeout(() => {
      cloudBackupTimer = null;
      void syncCloudBackupToTelegramNow(false);
    }, delayMs);
  };
  const restoreCloudBackupFromTelegram = async () => {
    const token = getTelegramBotToken();
    const adminChatId = getPrimaryTelegramAdminChatId();
    if (!token || !adminChatId) {
      cloudRestoreCompleted = true;
      return 0;
    }
    try {
      const chatRes = await callTelegramBotApi("getChat", { chat_id: adminChatId });
      const pinned = chatRes?.result?.pinned_message;
      const doc = pinned?.document;
      if (!pinned?.message_id || !doc?.file_id) {
        cloudRestoreCompleted = true;
        return 0;
      }
      const fname = String(doc.file_name || "");
      if (!/moviebox-clients-backup|\.json$/i.test(fname)) {
        cloudRestoreCompleted = true;
        return 0;
      }
      const fileRes = await callTelegramBotApi("getFile", { file_id: doc.file_id });
      const filePath = String(fileRes?.result?.file_path || "");
      if (!filePath) {
        cloudRestoreCompleted = true;
        return 0;
      }
      const dlResp = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
        signal: AbortSignal.timeout(2e4)
      });
      if (!dlResp.ok) {
        cloudRestoreCompleted = true;
        return 0;
      }
      const parsed = await dlResp.json().catch(() => null);
      if (!parsed || typeof parsed !== "object") {
        cloudRestoreCompleted = true;
        return 0;
      }
      let restoredKeys = 0;
      if (Array.isArray(parsed.keys)) {
        for (const item of parsed.keys) {
          if (item && typeof item.key === "string") {
            const existing = trialKeysMap.get(item.key);
            if (!existing || (item.usedRequests || 0) > (existing.usedRequests || 0) || item.revoked) {
              trialKeysMap.set(item.key, item);
              restoredKeys += 1;
            }
          }
        }
      }
      botConfigState.backupMessageId = pinned.message_id;
      if (parsed.config && typeof parsed.config === "object") {
        if (!botConfigState.publicUrl && parsed.config.publicUrl) {
          botConfigState.publicUrl = parsed.config.publicUrl;
        }
        if (!botConfigState.workerUrl && parsed.config.workerUrl) {
          botConfigState.workerUrl = parsed.config.workerUrl;
        }
        if (!botConfigState.ownerPinHash && parsed.config.ownerPinHash) {
          botConfigState.ownerPinHash = parsed.config.ownerPinHash;
          botConfigState.ownerPinSalt = parsed.config.ownerPinSalt;
        }
      }
      saveBotConfig(botConfigState, true);
      if (restoredKeys > 0) {
        try {
          if (!fs.existsSync(trialDataDir)) fs.mkdirSync(trialDataDir, { recursive: true });
          const keys = Array.from(trialKeysMap.values()).slice(-1e3);
          const tmpFile = `${trialStorePath}.tmp`;
          fs.writeFileSync(tmpFile, JSON.stringify({ keys }, null, 2), "utf8");
          fs.renameSync(tmpFile, trialStorePath);
        } catch {
        }
      }
      lastCloudStructuralHash = buildCloudBackupSnapshot().structuralFingerprint;
      lastCloudSyncAt = Date.now();
      cloudRestoreCompleted = true;
      console.log(`[Telegram Cloud Backup] Restored ${restoredKeys} client key(s) from pinned backup #${pinned.message_id}.`);
      return restoredKeys;
    } catch {
      cloudRestoreCompleted = true;
      return 0;
    }
  };
  let telegramPollerStarted = false;
  startTelegramBotPoller = () => {
    if (telegramPollerStarted) return;
    const token = getTelegramBotToken();
    if (!token) return;
    telegramPollerStarted = true;
    const runLoop = async () => {
      try {
        await restoreCloudBackupFromTelegram();
        await callTelegramBotApi("deleteWebhook", { drop_pending_updates: false });
        await callTelegramBotApi("setMyCommands", {
          commands: [
            { command: "menu", description: "Owner \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u0993 \u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8" },
            { command: "list", description: "\u09B8\u09AC \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0993 \u0995\u09BE\u09B0 \u0995\u09A4\u09A6\u09BF\u09A8 \u09AE\u09C7\u09DF\u09BE\u09A6" },
            { command: "new", description: "\u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API Key \u09A4\u09C8\u09B0\u09BF" },
            { command: "find", description: "\u09A8\u09BE\u09AE \u09AC\u09BE ID \u09A6\u09BF\u09DF\u09C7 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0996\u09C1\u0981\u099C\u09C1\u09A8" },
            { command: "pause", description: "\u099F\u09BE\u0995\u09BE \u09A8\u09BE \u09A6\u09BF\u09B2\u09C7 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" },
            { command: "resume", description: "\u09AC\u09A8\u09CD\u09A7 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8" },
            { command: "renew", description: "\u09AE\u09C7\u09DF\u09BE\u09A6 \u09AC\u09BE\u09DC\u09BE\u09A8 (/renew Name 30)" },
            { command: "unlimited", description: "\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u0995\u09B0\u09C1\u09A8" },
            { command: "delete", description: "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F Key \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BF\u09B2\u09BF\u099F" },
            { command: "import", description: "\u09AA\u09C1\u09B0\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F Key \u09B0\u09BF\u0995\u09AD\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8" },
            { command: "backup", description: "\u0995\u09CD\u09B2\u09BE\u0989\u09A1 \u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u09B8\u09C7\u09AD \u0993 \u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8 \u09A6\u09C7\u0996\u09C1\u09A8" },
            { command: "seturl", description: "\u09B2\u09BE\u0987\u09AD API \u09A1\u09CB\u09AE\u09C7\u0987\u09A8 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8" },
            { command: "setworker", description: "Cloudflare Worker \u09AD\u09BF\u09A1\u09BF\u0993 \u09AA\u09CD\u09B0\u0995\u09CD\u09B8\u09BF \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8" }
          ]
        });
        console.log("[Telegram Admin Bot] Connected & polling for owner commands.");
      } catch {
      }
      let offset = 0;
      let backoffMs = 1500;
      while (telegramPollerStarted) {
        try {
          const curToken = getTelegramBotToken();
          if (!curToken) break;
          const resp = await fetch(`https://api.telegram.org/bot${curToken}/getUpdates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offset,
              timeout: 25,
              allowed_updates: ["message", "edited_message", "callback_query"]
            }),
            signal: AbortSignal.timeout(35e3)
          });
          const data = await resp.json().catch(() => null);
          if (data?.ok && Array.isArray(data.result)) {
            backoffMs = 1500;
            for (const upd of data.result) {
              if (typeof upd.update_id === "number" && upd.update_id >= offset) {
                offset = upd.update_id + 1;
              }
              await handleTelegramUpdate(upd, callTelegramBotApi).catch(() => {
              });
            }
          } else {
            await new Promise((r) => setTimeout(r, backoffMs));
            backoffMs = Math.min(2e4, Math.round(backoffMs * 1.5));
          }
        } catch {
          await new Promise((r) => setTimeout(r, backoffMs));
          backoffMs = Math.min(2e4, Math.round(backoffMs * 1.5));
        }
      }
    };
    void runLoop();
  };
  const hashOwnerPassword = (pw, salt) => crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`owner-pw::${salt}::${pw}`).digest("hex");
  const signOwnerSessionToken = () => {
    const exp = Date.now() + 30 * 864e5;
    const payload = Buffer.from(JSON.stringify({ role: "owner", exp }), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`owner-sess::${payload}`).digest("base64url");
    return `${payload}.${sig}`;
  };
  const verifyOwnerSessionToken = (token) => {
    try {
      const [payload, sig] = String(token || "").trim().split(".");
      if (!payload || !sig) return false;
      const expected = crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`owner-sess::${payload}`).digest("base64url");
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return false;
      }
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return Boolean(parsed?.role === "owner" && typeof parsed?.exp === "number" && Date.now() < parsed.exp);
    } catch {
      return false;
    }
  };
  const extractOwnerCookie = (req) => {
    const hdrToken = String(req.headers["x-owner-token"] || "").trim();
    if (hdrToken) return hdrToken;
    const rawCookie = String(req.headers.cookie || "");
    const match = rawCookie.match(/(?:^|;\s*)cp_owner_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };
  isTrialOwnerRequest = (req) => {
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || "").trim();
    const adminHdr = String(req.headers["x-trial-admin"] || req.query.adminKey || "").trim();
    if (adminEnv && adminHdr && adminHdr === adminEnv) return true;
    const sess = extractOwnerCookie(req);
    return Boolean(sess && verifyOwnerSessionToken(sess));
  };
  const buildOwnerOverviewPayload = () => {
    const all = listAllNonRevokedTrials();
    let activeCount = 0;
    let pausedCount = 0;
    let expiredCount = 0;
    let quotaCount = 0;
    let totalRequests = 0;
    const clients = all.map((r) => {
      totalRequests += r.usedRequests || 0;
      const st = getTrialStatusMeta(r);
      if (st.code === "ACTIVE") activeCount++;
      else if (st.code === "PAUSED") pausedCount++;
      else if (st.code === "EXPIRED") expiredCount++;
      else if (st.code === "QUOTA_EXHAUSTED") quotaCount++;
      return {
        shortId: getTrialShortId(r.key),
        statusCode: st.code,
        statusBadge: st.badge,
        remainingTextBn: r.active ? formatRemainingDurationBn(r.expiresAt) : "\u09AC\u09A8\u09CD\u09A7 (Paused)",
        ...buildTrialSummary(r, false),
        shareMessage: buildClientShareMessageText(r)
      };
    });
    return {
      stats: {
        total: all.length,
        active: activeCount,
        paused: pausedCount,
        expired: expiredCount,
        quotaExhausted: quotaCount,
        totalRequests
      },
      publicUrl: resolvePublicBotBaseUrl(),
      telegramReady: Boolean(getTelegramBotToken() && getAllowedTelegramAdminIds().size > 0),
      clients
    };
  };
  app.use("/api/owner", express.json({ limit: "64kb" }), (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    next();
  });
  app.get("/api/owner/status", (req, res) => {
    capturePublicOriginForBot(req);
    const authenticated = isTrialOwnerRequest(req);
    const overview = authenticated ? buildOwnerOverviewPayload() : null;
    res.json({
      ok: true,
      hasOwnerPin: Boolean(botConfigState.ownerPinHash),
      hasAdminEnv: Boolean(process.env.TRIAL_ADMIN_KEY),
      authenticated,
      publicUrl: resolvePublicBotBaseUrl(),
      telegramReady: Boolean(getTelegramBotToken() && getAllowedTelegramAdminIds().size > 0),
      ...overview ? overview : {}
    });
  });
  app.post("/api/owner/setup", (req, res) => {
    capturePublicOriginForBot(req);
    if (botConfigState.ownerPinHash) {
      res.status(409).json({ ok: false, error: "Owner \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09B8\u09C7\u099F \u0995\u09B0\u09BE \u0986\u099B\u09C7\u0964 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
      return;
    }
    const pw = String(req.body?.password || "").trim();
    if (pw.length < 4 || pw.length > 32) {
      res.status(400).json({ ok: false, error: "\u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964" });
      return;
    }
    const salt = crypto.randomBytes(8).toString("hex");
    botConfigState.ownerPinSalt = salt;
    botConfigState.ownerPinHash = hashOwnerPassword(pw, salt);
    saveBotConfig(botConfigState);
    const token = signOwnerSessionToken();
    res.setHeader("Set-Cookie", `cp_owner_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.json({ ok: true, ownerToken: token, ...buildOwnerOverviewPayload() });
  });
  app.post("/api/owner/login", (req, res) => {
    capturePublicOriginForBot(req);
    const pw = String(req.body?.password || "").trim();
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || "").trim();
    const matchesEnv = Boolean(adminEnv && pw && pw === adminEnv);
    const matchesPin = Boolean(
      botConfigState.ownerPinHash && botConfigState.ownerPinSalt && hashOwnerPassword(pw, botConfigState.ownerPinSalt) === botConfigState.ownerPinHash
    );
    if (!matchesEnv && !matchesPin) {
      res.status(401).json({ ok: false, error: "\u09AD\u09C1\u09B2 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1! \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964" });
      return;
    }
    const token = signOwnerSessionToken();
    res.setHeader("Set-Cookie", `cp_owner_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.json({ ok: true, ownerToken: token, ...buildOwnerOverviewPayload() });
  });
  app.post("/api/owner/logout", (_req, res) => {
    res.setHeader("Set-Cookie", "cp_owner_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    res.json({ ok: true });
  });
  app.post("/api/owner/config", (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: "Owner login required" });
      return;
    }
    const rawUrl = String(req.body?.publicUrl || "").trim().replace(/\/+$/, "");
    if (rawUrl && !/^https?:\/\/.+/i.test(rawUrl)) {
      res.status(400).json({ ok: false, error: "\u09B8\u09A0\u09BF\u0995 https:// \u09A1\u09CB\u09AE\u09C7\u0987\u09A8 URL \u09A6\u09BF\u09A8\u0964" });
      return;
    }
    botConfigState.publicUrl = rawUrl || void 0;
    saveBotConfig(botConfigState);
    res.json({ ok: true, ...buildOwnerOverviewPayload() });
  });
  app.post("/api/owner/clients", (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: "Owner login required" });
      return;
    }
    const name = String(req.body?.clientName || "").trim().slice(0, 48) || "Client App";
    const planCode = String(req.body?.plan || "30D").toUpperCase();
    let plan = "30D";
    let forceUnlimited = false;
    if (planCode === "24H") plan = "24H";
    else if (planCode === "72H") plan = "72H";
    else if (planCode === "7D") plan = "7D";
    else if (planCode === "30D") plan = "30D";
    else if (planCode === "30DU") {
      plan = "30D";
      forceUnlimited = true;
    } else if (planCode === "UNLIMITED") {
      plan = "UNLIMITED";
      forceUnlimited = true;
    }
    const rec = createClientKeyForOwner(name, plan, forceUnlimited);
    res.status(201).json({
      ok: true,
      created: {
        shortId: getTrialShortId(rec.key),
        ...buildTrialSummary(rec, false),
        shareMessage: buildClientShareMessageText(rec)
      },
      ...buildOwnerOverviewPayload()
    });
  });
  app.post("/api/owner/clients/:shortId/action", (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: "Owner login required" });
      return;
    }
    const sid = String(req.params.shortId || "").trim();
    const { exact } = findTrialMatches(sid);
    if (!exact) {
      res.status(404).json({ ok: false, error: "\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
      return;
    }
    const action = String(req.body?.action || "").trim();
    if (action === "pause") {
      exact.active = false;
    } else if (action === "resume") {
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === "ext7" || action === "ext30" || action === "renew") {
      const days = action === "ext7" ? 7 : action === "ext30" ? 30 : Math.min(3650, Math.max(1, Number(req.body?.days) || 30));
      exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 864e5;
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === "unlimited") {
      exact.unlimited = true;
      exact.maxRequests = -1;
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === "delete") {
      exact.active = false;
      exact.revoked = true;
    } else {
      res.status(400).json({ ok: false, error: "\u0985\u099C\u09BE\u09A8\u09BE \u0985\u09CD\u09AF\u09BE\u0995\u09B6\u09A8" });
      return;
    }
    flushTrialStoreSync();
    res.json({ ok: true, ...buildOwnerOverviewPayload() });
  });
  app.get("/owner", (req, res) => {
    capturePublicOriginForBot(req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MovieBox API \u2014 Owner \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2</title>
  <style>
    :root { color-scheme: dark; --bg:#07080b; --card:#11131a; --sub:#171a24; --border:#272a36; --red:#e50914; --green:#22c55e; --amber:#f59e0b; --blue:#38bdf8; --text:#f4f4f5; --muted:#a1a1aa; }
    * { box-sizing:border-box; }
    body { margin:0; font-family: system-ui, -apple-system, 'Noto Sans Bengali', sans-serif; background:var(--bg); color:var(--text); padding:20px 14px 64px; }
    .wrap { max-width:1040px; margin:0 auto; }
    .top { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
    .brand { font-size:20px; font-weight:800; display:flex; align-items:center; gap:9px; }
    .dot { width:10px; height:10px; border-radius:99px; background:var(--green); box-shadow:0 0 10px var(--green); }
    .nav { display:flex; gap:8px; flex-wrap:wrap; }
    .linkbtn, button { background:var(--red); color:#fff; border:0; border-radius:8px; padding:9px 14px; font-weight:700; font-size:13px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:5px; }
    .sec { background:var(--sub); border:1px solid var(--border); color:var(--text); }
    .green { background:#16a34a; }
    .amber { background:#d97706; }
    .sm { padding:6px 10px; font-size:12px; }
    .card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:16px; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:16px; }
    .stat { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px; }
    .stat .num { font-size:24px; font-weight:800; margin-top:4px; }
    .stat .lbl { font-size:12px; color:var(--muted); }
    .grid2 { display:grid; grid-template-columns:360px 1fr; gap:16px; align-items:start; }
    @media (max-width:860px){ .grid2 { grid-template-columns:1fr; } }
    input, select { width:100%; background:#090b10; border:1px solid var(--border); color:var(--text); padding:10px 12px; border-radius:8px; font-size:14px; }
    label { display:block; font-size:12px; color:var(--muted); margin:10px 0 5px; }
    .client-card { background:var(--sub); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:10px; }
    .client-head { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
    .badge { font-size:11px; font-weight:800; padding:3px 9px; border-radius:6px; }
    .b-active { background:rgba(34,197,94,.16); color:var(--green); }
    .b-paused { background:rgba(239,68,68,.18); color:#f87171; }
    .b-expired { background:rgba(245,158,11,.18); color:#fbbf24; }
    .row { display:flex; gap:7px; flex-wrap:wrap; align-items:center; }
    .tabs { display:flex; gap:6px; flex-wrap:wrap; margin:10px 0; }
    .tab { background:var(--sub); border:1px solid var(--border); color:var(--muted); padding:6px 11px; border-radius:7px; font-size:12px; cursor:pointer; }
    .tab.on { background:var(--red); color:#fff; border-color:var(--red); }
    pre { margin:10px 0 0; background:#050608; border:1px solid var(--border); border-radius:9px; padding:11px; font-size:12px; white-space:pre-wrap; word-break:break-word; color:#93c5fd; }
    .toast { position:fixed; bottom:18px; right:18px; background:#16a34a; color:#fff; padding:10px 16px; border-radius:10px; font-weight:700; font-size:13px; display:none; z-index:99; box-shadow:0 8px 24px rgba(0,0,0,.5); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand"><span class="dot"></span> MovieBox API \u2014 \u09AC\u09BE\u0982\u09B2\u09BE Owner \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2</div>
      <div class="nav">
        <a class="linkbtn sec" href="/trial">API \u099F\u09C7\u09B8\u09CD\u099F \u09AA\u09CB\u09B0\u09CD\u099F\u09BE\u09B2</a>
        <a class="linkbtn sec" href="/">\u0993\u09DF\u09C7\u09AC \u0985\u09CD\u09AF\u09BE\u09AA</a>
        <button id="logoutBtn" class="sec" style="display:none" onclick="doLogout()">\u09B2\u0997\u0986\u0989\u099F</button>
      </div>
    </div>

    <div id="authBox" class="card" style="max-width:440px;margin:40px auto;display:none;">
      <h2 id="authTitle" style="margin:0 0 8px;font-size:18px;">Owner \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8</h2>
      <p id="authDesc" style="margin:0 0 12px;font-size:13px;color:var(--muted);line-height:1.6;"></p>
      <input id="ownerPassInput" type="password" placeholder="\u0986\u09AA\u09A8\u09BE\u09B0 \u0997\u09CB\u09AA\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B2\u09BF\u0996\u09C1\u09A8 (\u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0)" />
      <button id="authSubmitBtn" style="width:100%;margin-top:12px;justify-content:center;" onclick="submitAuth()">\u09AA\u09CD\u09B0\u09AC\u09C7\u09B6 \u0995\u09B0\u09C1\u09A8</button>
      <div id="authErr" style="color:#f87171;font-size:12px;margin-top:8px;"></div>
    </div>

    <div id="dashBox" style="display:none;">
      <div class="stats">
        <div class="stat"><div class="lbl">\u{1F465} \u09AE\u09CB\u099F \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F</div><div class="num" id="stTotal">0</div></div>
        <div class="stat"><div class="lbl">\u{1F7E2} \u099A\u09BE\u09B2\u09C1 (Active)</div><div class="num" style="color:var(--green)" id="stActive">0</div></div>
        <div class="stat"><div class="lbl">\u{1F534} \u09AC\u09A8\u09CD\u09A7 (Paused)</div><div class="num" style="color:#f87171" id="stPaused">0</div></div>
        <div class="stat"><div class="lbl">\u23F0 \u09AE\u09C7\u09DF\u09BE\u09A6/\u0995\u09CB\u099F\u09BE \u09B6\u09C7\u09B7</div><div class="num" style="color:var(--amber)" id="stExpired">0</div></div>
        <div class="stat"><div class="lbl">\u{1F4CA} \u09AE\u09CB\u099F API \u09B9\u09BF\u099F</div><div class="num" style="color:var(--blue)" id="stHits">0</div></div>
      </div>

      <div id="previewWarnCard" class="card" style="display:none;border-color:var(--amber);background:rgba(245,158,11,0.08);">
        <strong style="color:#fbbf24;">\u26A0\uFE0F \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09AA\u09C2\u09B0\u09CD\u09A3 (\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 \u099A\u09BE\u09B2\u09BE\u09A8\u09CB\u09B0 \u099C\u09A8\u09CD\u09AF):</strong>
        <div style="font-size:13px;line-height:1.6;margin-top:4px;">
          \u0986\u09AA\u09A8\u09BF \u098F\u0996\u09A8 \u09AA\u09CD\u09B0\u09BF\u09AD\u09BF\u0989 \u09B2\u09BF\u0982\u0995\u09C7 \u0986\u099B\u09C7\u09A8\u0964 \u09AC\u09BE\u0987\u09B0\u09C7 \u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F \u09AC\u09BE \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 API \u09A6\u09BF\u09A4\u09C7 \u0989\u09AA\u09B0\u09C7 \u09A1\u09BE\u09A8\u09A6\u09BF\u0995\u09C7\u09B0 <strong>Deploy</strong> \u09AC\u09BE\u099F\u09A8\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C7 Cloud Run-\u098F Deploy \u0995\u09B0\u09C1\u09A8 \u098F\u09AC\u0982 \u09A8\u09BF\u099A\u09C7\u09B0 <strong>\u09AA\u09BE\u09AC\u09B2\u09BF\u0995 \u09A1\u09CB\u09AE\u09C7\u0987\u09A8</strong> \u0998\u09B0\u09C7 \u0993\u0987 \u09B2\u09BE\u0987\u09AD \u09B2\u09BF\u0982\u0995\u099F\u09BF \u09B8\u09C7\u09AD \u0995\u09B0\u09C7 \u09A6\u09BF\u09A8\u0964
        </div>
      </div>

      <div class="grid2">
        <div>
          <div class="card">
            <h3 style="margin:0 0 8px;font-size:16px;">\u2795 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F Key \u09AC\u09BE\u09A8\u09BE\u09A8</h3>
            <label>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F / \u0985\u09CD\u09AF\u09BE\u09AA\u09C7\u09B0 \u09A8\u09BE\u09AE</label>
            <input id="newClientName" placeholder="\u09AF\u09C7\u09AE\u09A8: Rahim OTT App" />
            <label>\u09AE\u09C7\u09DF\u09BE\u09A6 \u0993 \u09B2\u09BF\u09AE\u09BF\u099F \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8</label>
            <select id="newPlan">
              <option value="24H">\u09E8\u09EA \u0998\u09A8\u09CD\u099F\u09BE \u099F\u09CD\u09B0\u09BE\u09DF\u09BE\u09B2 (250 Req)</option>
              <option value="72H">\u09E9 \u09A6\u09BF\u09A8 \u099F\u09CD\u09B0\u09BE\u09DF\u09BE\u09B2 (600 Req)</option>
              <option value="7D">\u09ED \u09A6\u09BF\u09A8 (5,000 Req)</option>
              <option value="30D" selected>\u09E9\u09E6 \u09A6\u09BF\u09A8 / \u09E7 \u09AE\u09BE\u09B8 (100,000 Req)</option>
              <option value="30DU">\u09E9\u09E6 \u09A6\u09BF\u09A8 \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F</option>
              <option value="UNLIMITED">\u267E\uFE0F \u09B2\u09BE\u0987\u09AB\u099F\u09BE\u0987\u09AE \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 (\u09E7\u09E6 \u09AC\u099B\u09B0)</option>
            </select>
            <button style="width:100%;margin-top:14px;justify-content:center;" onclick="createClient()">\u{1F680} API Key \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8</button>
            <div id="createdBox" style="display:none;margin-top:12px;">
              <div class="row" style="justify-content:space-between;">
                <strong style="font-size:12px;color:var(--green);">\u2705 \u09A4\u09C8\u09B0\u09BF \u09B9\u09DF\u09C7\u099B\u09C7! \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F\u0995\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8:</strong>
                <button class="sm green" onclick="copyText(lastShareMsg)">\u{1F4CB} \u09AE\u09C7\u09B8\u09C7\u099C \u0995\u09AA\u09BF</button>
              </div>
              <pre id="createdPreview"></pre>
            </div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 8px;font-size:15px;">\u{1F310} \u09B2\u09BE\u0987\u09AD API \u09A1\u09CB\u09AE\u09C7\u0987\u09A8 \u09B8\u09C7\u099F\u09BF\u0982</h3>
            <label>\u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09AE\u09C7\u09B8\u09C7\u099C\u09C7 \u09AF\u09C7 Base URL \u09AF\u09BE\u09AC\u09C7</label>
            <div class="row">
              <input id="pubUrlInput" placeholder="https://your-live-app.run.app" style="flex:1;" />
              <button class="sec sm" onclick="savePubUrl()">\u09B8\u09C7\u09AD</button>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--muted);line-height:1.6;">
              <strong>Telegram \u09AC\u099F \u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8:</strong> <span id="tgStatusText">\u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE\u09DF...</span><br/>
              Telegram-\u098F \u098F\u0987 \u098F\u0995\u0987 \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u09AA\u09C7\u09A4\u09C7 \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 Secrets-\u098F <code>TELEGRAM_BOT_TOKEN</code> \u098F\u09AC\u0982 <code>TELEGRAM_ADMIN_CHAT_ID</code> \u09AF\u09CB\u0997 \u0995\u09B0\u09B2\u09C7\u0987 \u0985\u099F\u09CB \u099A\u09BE\u09B2\u09C1 \u09B9\u09AC\u09C7\u0964
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:16px;">\u{1F4CB} \u09B8\u09AC \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09B2\u09BF\u09B8\u09CD\u099F \u0993 \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2</h3>
            <button class="sec sm" onclick="refreshStatus()">\u{1F504} \u09B0\u09BF\u09AB\u09CD\u09B0\u09C7\u09B6</button>
          </div>
          <div class="row" style="margin-top:10px;">
            <input id="searchClient" placeholder="\u09A8\u09BE\u09AE \u09AC\u09BE ID \u09A6\u09BF\u09DF\u09C7 \u0996\u09C1\u0981\u099C\u09C1\u09A8..." oninput="renderClients()" style="flex:1;" />
          </div>
          <div class="tabs">
            <button class="tab on" onclick="setFilter('ALL', this)">\u09B8\u09AC</button>
            <button class="tab" onclick="setFilter('ACTIVE', this)">\u{1F7E2} \u099A\u09BE\u09B2\u09C1</button>
            <button class="tab" onclick="setFilter('PAUSED', this)">\u{1F534} \u09AC\u09A8\u09CD\u09A7 (\u099F\u09BE\u0995\u09BE \u09AC\u09BE\u0995\u09BF)</button>
            <button class="tab" onclick="setFilter('EXPIRED', this)">\u23F0 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7</button>
          </div>
          <div id="clientsList"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="toast" class="toast"></div>

  <script>
    let state = { clients: [], hasOwnerPin: false };
    let filterMode = 'ALL';
    let lastShareMsg = '';
    let pendingDeleteId = '';

    function showToast(txt) {
      const t = document.getElementById('toast');
      t.textContent = txt;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2200);
    }
    function copyText(txt) {
      if (!txt) return;
      navigator.clipboard.writeText(txt).then(() => showToast('\u0995\u09AA\u09BF \u09B9\u09DF\u09C7\u099B\u09C7! \u098F\u0996\u09A8 WhatsApp/Telegram-\u098F Paste \u0995\u09B0\u09C1\u09A8'));
    }
    function setFilter(mode, btn) {
      filterMode = mode;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      renderClients();
    }
    async function api(path, opts) {
      const r = await fetch(path, opts);
      return r.json();
    }
    async function refreshStatus() {
      const d = await api('/api/owner/status');
      state.hasOwnerPin = Boolean(d.hasOwnerPin);
      if (!d.authenticated) {
        document.getElementById('dashBox').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('authBox').style.display = 'block';
        if (!d.hasOwnerPin) {
          document.getElementById('authTitle').textContent = '\u09E7 \u09AC\u09BE\u09B0\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF Owner \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8';
          document.getElementById('authDesc').textContent = '\u09A8\u09BF\u099C\u09C7\u09B0 \u09AA\u099B\u09A8\u09CD\u09A6\u09C7\u09B0 \u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B2\u09BF\u0996\u09C7 \u099A\u09BE\u09AA \u09A6\u09BF\u09A8 \u2014 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09BE\u09A5\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09C1\u09B0\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u0995\u09A8\u09CD\u099F\u09CD\u09B0\u09CB\u09B2 \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u099A\u09BE\u09B2\u09C1 \u09B9\u09DF\u09C7 \u09AF\u09BE\u09AC\u09C7!';
          document.getElementById('authSubmitBtn').textContent = 'Owner \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8';
        } else {
          document.getElementById('authTitle').textContent = 'Owner \u09B2\u0997\u0987\u09A8';
          document.getElementById('authDesc').textContent = '\u0986\u09AA\u09A8\u09BE\u09B0 Owner \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09DF\u09C7 \u09AA\u09CD\u09B0\u09AC\u09C7\u09B6 \u0995\u09B0\u09C1\u09A8\u0964';
          document.getElementById('authSubmitBtn').textContent = '\u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8';
        }
        return;
      }
      document.getElementById('authBox').style.display = 'none';
      document.getElementById('dashBox').style.display = 'block';
      document.getElementById('logoutBtn').style.display = 'inline-flex';
      applyOverview(d);
    }
    function applyOverview(d) {
      state.clients = d.clients || [];
      document.getElementById('stTotal').textContent = d.stats?.total ?? 0;
      document.getElementById('stActive').textContent = d.stats?.active ?? 0;
      document.getElementById('stPaused').textContent = d.stats?.paused ?? 0;
      document.getElementById('stExpired').textContent = (d.stats?.expired ?? 0) + (d.stats?.quotaExhausted ?? 0);
      document.getElementById('stHits').textContent = (d.stats?.totalRequests ?? 0).toLocaleString();
      document.getElementById('pubUrlInput').value = d.publicUrl || '';
      document.getElementById('tgStatusText').textContent = d.telegramReady
        ? '\u{1F7E2} \u0995\u09BE\u09A8\u09C7\u0995\u09CD\u099F\u09C7\u09A1 (Telegram Bot \u099A\u09BE\u09B2\u09C1 \u0986\u099B\u09C7)'
        : '\u26AA \u099A\u09BE\u09B2\u09C1 \u09A8\u09DF (\u099A\u09BE\u0987\u09B2\u09C7 \u09B6\u09C1\u09A7\u09C1 \u0993\u09DF\u09C7\u09AC \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u09A5\u09C7\u0995\u09C7\u0987 \u09B8\u09AC \u099A\u09BE\u09B2\u09BE\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8)';
      document.getElementById('previewWarnCard').style.display = /localhost|127\\.0\\.0\\.1|:\\/\\/ais-dev-/i.test(d.publicUrl || '') ? 'block' : 'none';
      renderClients();
    }
    async function submitAuth() {
      const pw = document.getElementById('ownerPassInput').value.trim();
      const ep = state.hasOwnerPin ? '/api/owner/login' : '/api/owner/setup';
      const d = await api(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!d.ok) {
        document.getElementById('authErr').textContent = d.error || '\u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7';
        return;
      }
      document.getElementById('authErr').textContent = '';
      await refreshStatus();
    }
    async function doLogout() {
      await api('/api/owner/logout', { method: 'POST' });
      await refreshStatus();
    }
    async function createClient() {
      const name = document.getElementById('newClientName').value.trim() || 'Client App';
      const plan = document.getElementById('newPlan').value;
      const d = await api('/api/owner/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: name, plan }),
      });
      if (!d.ok) { showToast(d.error || 'Error'); return; }
      applyOverview(d);
      lastShareMsg = d.created?.shareMessage || '';
      document.getElementById('createdBox').style.display = 'block';
      document.getElementById('createdPreview').textContent = lastShareMsg;
      document.getElementById('newClientName').value = '';
      showToast('\u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F API Key \u09A4\u09C8\u09B0\u09BF \u09B9\u09DF\u09C7\u099B\u09C7!');
    }
    async function clientAct(shortId, action) {
      const d = await api('/api/owner/clients/' + encodeURIComponent(shortId) + '/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!d.ok) { showToast(d.error || 'Error'); return; }
      pendingDeleteId = '';
      applyOverview(d);
      showToast('\u0986\u09AA\u09A1\u09C7\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09C7\u099B\u09C7!');
    }
    async function savePubUrl() {
      const u = document.getElementById('pubUrlInput').value.trim();
      const d = await api('/api/owner/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl: u }),
      });
      if (!d.ok) { showToast(d.error || '\u09B8\u09A0\u09BF\u0995 URL \u09A6\u09BF\u09A8'); return; }
      applyOverview(d);
      showToast('\u09AA\u09BE\u09AC\u09B2\u09BF\u0995 \u09A1\u09CB\u09AE\u09C7\u0987\u09A8 \u09B8\u09C7\u09AD \u09B9\u09DF\u09C7\u099B\u09C7!');
    }
    function renderClients() {
      const q = document.getElementById('searchClient').value.trim().toLowerCase();
      const box = document.getElementById('clientsList');
      const list = (state.clients || []).filter(c => {
        if (filterMode === 'ACTIVE' && c.statusCode !== 'ACTIVE') return false;
        if (filterMode === 'PAUSED' && c.statusCode !== 'PAUSED') return false;
        if (filterMode === 'EXPIRED' && c.statusCode !== 'EXPIRED' && c.statusCode !== 'QUOTA_EXHAUSTED') return false;
        if (q && !c.clientName.toLowerCase().includes(q) && !c.shortId.includes(q)) return false;
        return true;
      });
      box.innerHTML = '';
      if (!list.length) {
        box.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">\u098F\u0987 \u09A4\u09BE\u09B2\u09BF\u0995\u09BE\u09DF \u0995\u09CB\u09A8\u09CB \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A8\u09C7\u0987\u0964 \u09AC\u09BE\u09AE \u09AA\u09BE\u09B6 \u09A5\u09C7\u0995\u09C7 \u09A8\u09A4\u09C1\u09A8 \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8\u0964</div>';
        return;
      }
      list.forEach(c => {
        const card = document.createElement('div');
        card.className = 'client-card';
        const badgeCls = c.statusCode === 'ACTIVE' ? 'b-active' : c.statusCode === 'PAUSED' ? 'b-paused' : 'b-expired';
        const quotaTxt = c.unlimited || c.maxRequests < 0
          ? ('\u267E\uFE0F \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1 (\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: ' + c.usedRequests + ')')
          : (c.remainingRequests + ' / ' + c.maxRequests + ' \u09AC\u09BE\u0995\u09BF (\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0: ' + c.usedRequests + ')');

        const head = document.createElement('div');
        head.className = 'client-head';
        head.innerHTML = '<div><strong>' + esc(c.clientName) + '</strong> <span style="font-family:monospace;font-size:11px;color:var(--blue);">#' + c.shortId + '</span> <span style="font-size:11px;color:var(--muted);">(' + c.plan + ')</span></div>'
          + '<span class="badge ' + badgeCls + '">' + esc(c.statusBadge) + '</span>';

        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0;line-height:1.6;';
        meta.textContent = '\u23F3 \u09B8\u09AE\u09DF \u09AC\u09BE\u0995\u09BF: ' + c.remainingTextBn + '  \u2022  \u{1F4C8} ' + quotaTxt;

        const btns = document.createElement('div');
        btns.className = 'row';
        const bToggle = mkBtn(c.active ? '\u23F8\uFE0F \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8' : '\u25B6\uFE0F \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8', c.active ? 'sm amber' : 'sm green', () => clientAct(c.shortId, c.active ? 'pause' : 'resume'));
        const b7 = mkBtn('+\u09ED \u09A6\u09BF\u09A8', 'sm sec', () => clientAct(c.shortId, 'ext7'));
        const b30 = mkBtn('+\u09E9\u09E6 \u09A6\u09BF\u09A8', 'sm sec', () => clientAct(c.shortId, 'ext30'));
        const bCopy = mkBtn('\u{1F4CB} \u09AE\u09C7\u09B8\u09C7\u099C \u0995\u09AA\u09BF', 'sm sec', () => copyText(c.shareMessage));
        btns.append(bToggle, b7, b30);
        if (!c.unlimited) btns.append(mkBtn('\u267E\uFE0F \u0986\u09A8\u09B2\u09BF\u09AE\u09BF\u099F\u09C7\u09A1', 'sm sec', () => clientAct(c.shortId, 'unlimited')));
        btns.append(bCopy);

        if (pendingDeleteId === c.shortId) {
          btns.append(mkBtn('\u2705 \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u09A1\u09BF\u09B2\u09BF\u099F', 'sm', () => clientAct(c.shortId, 'delete')));
          btns.append(mkBtn('\u09AC\u09BE\u09A4\u09BF\u09B2', 'sm sec', () => { pendingDeleteId = ''; renderClients(); }));
        } else {
          btns.append(mkBtn('\u{1F5D1} \u09A1\u09BF\u09B2\u09BF\u099F', 'sm sec', () => { pendingDeleteId = c.shortId; renderClients(); }));
        }

        card.append(head, meta, btns);
        box.appendChild(card);
      });
    }
    function mkBtn(txt, cls, fn) {
      const b = document.createElement('button');
      b.className = cls;
      b.textContent = txt;
      b.onclick = fn;
      return b;
    }
    function esc(s) {
      return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
    refreshStatus();
  </script>
</body>
</html>`);
  });
  const iosHlsSessions = /* @__PURE__ */ new Map();
  const cleanupIosHlsSession = (hash) => {
    const sess = iosHlsSessions.get(hash);
    if (!sess) return;
    iosHlsSessions.delete(hash);
    try {
      sess.abortController.abort();
    } catch {
    }
    try {
      if (sess.proc && !sess.proc.killed) {
        sess.proc.kill("SIGKILL");
      }
    } catch {
    }
    try {
      fs.rmSync(sess.dir, { recursive: true, force: true });
    } catch {
    }
  };
  setInterval(() => {
    const now = Date.now();
    for (const [hash, sess] of iosHlsSessions.entries()) {
      if (now - sess.lastAccess > 12e4) {
        cleanupIosHlsSession(hash);
      }
    }
  }, 3e4).unref();
  const ensureIosHlsSession = async (targetUrl) => {
    const hash = crypto.createHash("sha1").update(targetUrl).digest("hex").slice(0, 16);
    const existing = iosHlsSessions.get(hash);
    if (existing && fs.existsSync(path.join(existing.dir, "index.m3u8"))) {
      existing.lastAccess = Date.now();
      return existing;
    }
    if (existing) {
      cleanupIosHlsSession(hash);
    }
    if (iosHlsSessions.size >= 2) {
      const oldest = Array.from(iosHlsSessions.values()).sort(
        (a, b) => a.lastAccess - b.lastAccess
      )[0];
      if (oldest) cleanupIosHlsSession(oldest.hash);
    }
    const dir = path.join("/tmp", `cp-hls-${hash}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const abortController = new AbortController();
    const session = {
      hash,
      dir,
      targetUrl,
      proc: null,
      abortController,
      lastAccess: Date.now(),
      finished: false
    };
    iosHlsSessions.set(hash, session);
    const upstreamRes = await fetch(targetUrl, {
      signal: abortController.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
      }
    });
    if (!upstreamRes.ok || !upstreamRes.body) {
      cleanupIosHlsSession(hash);
      throw new Error(`Upstream stream HTTP ${upstreamRes.status}`);
    }
    const ff = spawn(FFMPEG_BIN, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-fflags",
      "+nobuffer+genpts",
      "-probesize",
      "131072",
      "-analyzeduration",
      "100000",
      "-f",
      "matroska",
      "-i",
      "pipe:0",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-ac",
      "2",
      "-b:a",
      "128k",
      "-af",
      "volume=enable='between(t,0,13.5)':volume=0",
      "-bsf:v",
      "h264_mp4toannexb",
      "-f",
      "hls",
      "-hls_playlist_type",
      "event",
      "-hls_time",
      "2",
      "-hls_list_size",
      "0",
      "-hls_flags",
      "independent_segments+temp_file",
      "-hls_segment_filename",
      path.join(dir, "seg_%04d.ts"),
      path.join(dir, "index.m3u8")
    ]);
    session.proc = ff;
    ff.on("exit", () => {
      session.finished = true;
    });
    ff.stdin.on("error", () => {
    });
    const reader = upstreamRes.body.getReader();
    (async () => {
      let bytesTransferred = 0;
      const BURST_BYTES = 24 * 1024 * 1024;
      try {
        while (true) {
          if (Date.now() - session.lastAccess > 12e4) {
            cleanupIosHlsSession(hash);
            break;
          }
          const { done, value } = await reader.read();
          if (done) {
            ff.stdin.end();
            break;
          }
          bytesTransferred += value.byteLength;
          if (!ff.stdin.write(Buffer.from(value))) {
            await new Promise((resolve) => ff.stdin.once("drain", () => resolve()));
          }
          if (bytesTransferred > BURST_BYTES) {
            await new Promise((r) => setTimeout(r, 25));
          }
        }
      } catch {
        try {
          ff.stdin.end();
        } catch {
        }
      }
    })();
    const startWait = Date.now();
    while (Date.now() - startWait < 4500) {
      const m3u8Path = path.join(dir, "index.m3u8");
      const seg1Path = path.join(dir, "seg_0001.ts");
      const seg0Path = path.join(dir, "seg_0000.ts");
      if (fs.existsSync(m3u8Path) && (fs.existsSync(seg1Path) || fs.existsSync(seg0Path) && Date.now() - startWait > 1400)) {
        return session;
      }
      await new Promise((r) => setTimeout(r, 45));
    }
    return session;
  };
  app.options("/api/ios-hls/:token/:file", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.status(204).end();
  });
  app.get("/api/ios-hls/:token/:file", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    const token = String(req.params.token || "").trim();
    const file = String(req.params.file || "").trim();
    const targetUrl = decodeGatewayToken(token);
    if (!targetUrl || !targetUrl.startsWith("http")) {
      res.status(400).send("Invalid stream token");
      return;
    }
    try {
      if (file === "index.m3u8") {
        const session = await ensureIosHlsSession(targetUrl);
        session.lastAccess = Date.now();
        const m3u8Path = path.join(session.dir, "index.m3u8");
        if (!fs.existsSync(m3u8Path)) {
          res.status(503).send("HLS playlist initializing");
          return;
        }
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(fs.readFileSync(m3u8Path, "utf8"));
        return;
      }
      if (/^seg_\d+\.ts$/.test(file)) {
        const hash = crypto.createHash("sha1").update(targetUrl).digest("hex").slice(0, 16);
        let session = iosHlsSessions.get(hash);
        if (!session) {
          session = await ensureIosHlsSession(targetUrl);
        }
        session.lastAccess = Date.now();
        const segPath = path.join(session.dir, file);
        const waitStart = Date.now();
        while (!fs.existsSync(segPath) && Date.now() - waitStart < 3500) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (!fs.existsSync(segPath)) {
          res.status(404).send("Segment not ready");
          return;
        }
        res.setHeader("Content-Type", "video/mp2t");
        res.setHeader("Cache-Control", "public, max-age=600");
        fs.createReadStream(segPath).pipe(res);
        return;
      }
      res.status(404).send("Not found");
    } catch (err) {
      console.error("iOS HLS stream error:", err);
      res.status(502).send("Stream transcode failed");
    }
  });
  const mkvSubExtractCache = /* @__PURE__ */ new Map();
  app.get("/api/subtitles/extract", async (req, res) => {
    const streamUrl = String(req.query.url || "").trim();
    const startSec = Math.max(0, Number(req.query.startSec || 0) || 0);
    const windowMode = String(req.query.mode || "probe").trim();
    if (!streamUrl || !streamUrl.startsWith("http")) {
      res.json({ ok: false, srt: "" });
      return;
    }
    const cacheKey = `${streamUrl}::${windowMode}::${Math.floor(startSec / 300)}`;
    const cached = mkvSubExtractCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ ok: true, srt: cached.srt, cached: true });
      return;
    }
    try {
      let extractedSrt = "";
      if (windowMode === "window" && startSec > 0) {
        extractedSrt = await new Promise((resolve) => {
          const chunks = [];
          const ff = spawn(FFMPEG_BIN, [
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            String(startSec),
            "-t",
            "720",
            "-i",
            streamUrl,
            "-vn",
            "-an",
            "-map",
            "0:s:0?",
            "-c:s",
            "srt",
            "-f",
            "srt",
            "pipe:1"
          ]);
          const killTimer = setTimeout(() => {
            try {
              ff.kill("SIGKILL");
            } catch {
            }
            resolve(Buffer.concat(chunks).toString("utf8"));
          }, 5200);
          ff.stdout.on("data", (chunk) => chunks.push(chunk));
          ff.on("close", () => {
            clearTimeout(killTimer);
            resolve(Buffer.concat(chunks).toString("utf8"));
          });
          ff.on("error", () => {
            clearTimeout(killTimer);
            resolve("");
          });
        });
      } else {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 4200);
        const upstream = await fetch(streamUrl, {
          signal: controller.signal,
          headers: {
            Range: "bytes=0-5767167",
            "User-Agent": "Mozilla/5.0"
          }
        }).finally(() => clearTimeout(fetchTimer));
        if (upstream.ok && upstream.body) {
          const arrayBuf = await upstream.arrayBuffer();
          const inputBuf = Buffer.from(arrayBuf);
          extractedSrt = await new Promise((resolve) => {
            const outChunks = [];
            const ff = spawn(FFMPEG_BIN, [
              "-hide_banner",
              "-loglevel",
              "error",
              "-i",
              "pipe:0",
              "-vn",
              "-an",
              "-map",
              "0:s:0?",
              "-c:s",
              "srt",
              "-f",
              "srt",
              "pipe:1"
            ]);
            const killTimer = setTimeout(() => {
              try {
                ff.kill("SIGKILL");
              } catch {
              }
              resolve(Buffer.concat(outChunks).toString("utf8"));
            }, 2500);
            ff.stdout.on("data", (chunk) => outChunks.push(chunk));
            ff.stdin.on("error", () => {
            });
            ff.on("close", () => {
              clearTimeout(killTimer);
              resolve(Buffer.concat(outChunks).toString("utf8"));
            });
            ff.on("error", () => {
              clearTimeout(killTimer);
              resolve("");
            });
            ff.stdin.end(inputBuf);
          });
        }
      }
      if (extractedSrt && extractedSrt.includes("-->")) {
        pruneCacheMap(mkvSubExtractCache, 80);
        mkvSubExtractCache.set(cacheKey, {
          srt: extractedSrt,
          expiresAt: Date.now() + 30 * 6e4
        });
        res.json({ ok: true, srt: extractedSrt });
        return;
      }
    } catch {
    }
    res.json({ ok: false, srt: "" });
  });
  app.get("/api/requests", (_req, res) => {
    res.json({ ok: true, requests: movieRequestsStore });
  });
  app.post("/api/requests", (req, res) => {
    const title = sanitizeBrandText(String(req.body?.title || "").trim());
    const type = String(req.body?.type || "MOVIE").toUpperCase();
    const language = sanitizeBrandText(String(req.body?.language || "Bangla / Dual Audio").trim());
    const notes = sanitizeBrandText(String(req.body?.notes || "").trim());
    if (!title) {
      res.status(400).json({ ok: false, error: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AE\u09C1\u09AD\u09BF \u09AC\u09BE \u09B8\u09BF\u09B0\u09BF\u099C\u09C7\u09B0 \u09A8\u09BE\u09AE \u09B2\u09BF\u0996\u09C1\u09A8" });
      return;
    }
    const item = {
      id: `req-${Date.now()}`,
      title,
      type: ["MOVIE", "SERIES", "ANIME", "BROKEN_LINK"].includes(type) ? type : "MOVIE",
      language,
      notes,
      status: "Queued",
      createdAt: Date.now()
    };
    movieRequestsStore.unshift(item);
    if (movieRequestsStore.length > 30) movieRequestsStore.pop();
    res.json({ ok: true, request: item, requests: movieRequestsStore });
  });
  const userDataDir = path.join(__dirname, "data");
  const userStorePath = path.join(userDataDir, "cinepulse-users.json");
  const usersById = /* @__PURE__ */ new Map();
  const userIdByName = /* @__PURE__ */ new Map();
  const loadUserStore = () => {
    try {
      if (!fs.existsSync(userStorePath)) return;
      const raw = JSON.parse(fs.readFileSync(userStorePath, "utf8"));
      if (raw && Array.isArray(raw.users)) {
        for (const u of raw.users) {
          if (u && u.userId) {
            usersById.set(String(u.userId), u);
            if (!u.isGuest && u.username) {
              userIdByName.set(String(u.username).toLowerCase(), String(u.userId));
            }
          }
        }
      }
    } catch {
    }
  };
  loadUserStore();
  let userFlushTimer = null;
  const scheduleFlushUserStore = () => {
    if (userFlushTimer) return;
    userFlushTimer = setTimeout(() => {
      userFlushTimer = null;
      try {
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        const allUsers = Array.from(usersById.values()).slice(-2e3);
        const tmpFile = `${userStorePath}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify({ users: allUsers }), "utf8");
        fs.renameSync(tmpFile, userStorePath);
      } catch {
      }
    }, 600);
  };
  const hashUserPin = (pin, salt) => crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(`${salt}::${pin}`).digest("hex");
  const signUserToken = (userId) => {
    const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() }), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(payload).digest("base64url");
    return `${payload}.${sig}`;
  };
  const verifyUserToken = (token) => {
    try {
      const [payload, sig] = String(token || "").split(".");
      if (!payload || !sig) return null;
      const expected = crypto.createHmac("sha256", CINEPULSE_AES_KEY).update(payload).digest("base64url");
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return null;
      }
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return parsed?.uid ? String(parsed.uid) : null;
    } catch {
      return null;
    }
  };
  const setNoSharedCacheHeaders = (res) => {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Vary", "X-CP-User-Token");
  };
  app.post("/api/user/auth", (req, res) => {
    setNoSharedCacheHeaders(res);
    const mode = String(req.body?.mode || "guest").trim();
    const rawUsername = String(req.body?.username || "").trim().replace(/\s+/g, " ");
    const pin = String(req.body?.pin || "").trim();
    if (mode === "guest") {
      const uid = `u_${crypto.randomBytes(9).toString("hex")}`;
      const shortTag = uid.slice(-4).toUpperCase();
      const profile = {
        userId: uid,
        username: `Guest-${shortTag}`,
        pinHash: "",
        salt: "",
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now()
      };
      usersById.set(uid, profile);
      scheduleFlushUserStore();
      res.json({
        ok: true,
        user: {
          userId: profile.userId,
          username: profile.username,
          isGuest: true,
          token: signUserToken(profile.userId),
          watchlist: [],
          continueWatching: []
        }
      });
      return;
    }
    if (rawUsername.length < 2 || rawUsername.length > 24) {
      res.status(400).json({ ok: false, error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09E8 \u09A5\u09C7\u0995\u09C7 \u09E8\u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7" });
      return;
    }
    if (pin.length < 4 || pin.length > 24) {
      res.status(400).json({ ok: false, error: "\u09AA\u09BF\u09A8/\u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7" });
      return;
    }
    const lowerName = rawUsername.toLowerCase();
    if (mode === "register") {
      if (userIdByName.has(lowerName)) {
        res.status(409).json({ ok: false, error: "\u098F\u0987 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE\u099F\u09BF \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09A8\u09C7\u0993\u09DF\u09BE \u0986\u099B\u09C7\u2014\u0985\u09A8\u09CD\u09AF \u09A8\u09BE\u09AE \u09A6\u09BF\u09A8 \u09AC\u09BE \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8" });
        return;
      }
      const uid = `u_${crypto.randomBytes(9).toString("hex")}`;
      const salt = crypto.randomBytes(8).toString("hex");
      const profile = {
        userId: uid,
        username: rawUsername,
        pinHash: hashUserPin(pin, salt),
        salt,
        isGuest: false,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now()
      };
      usersById.set(uid, profile);
      userIdByName.set(lowerName, uid);
      scheduleFlushUserStore();
      res.json({
        ok: true,
        user: {
          userId: profile.userId,
          username: profile.username,
          isGuest: false,
          token: signUserToken(profile.userId),
          watchlist: [],
          continueWatching: []
        }
      });
      return;
    }
    if (mode === "login") {
      const existingUid = userIdByName.get(lowerName);
      const profile = existingUid ? usersById.get(existingUid) : void 0;
      if (!profile || profile.isGuest) {
        res.status(404).json({ ok: false, error: "\u098F\u0987 \u09A8\u09BE\u09AE\u09C7 \u0995\u09CB\u09A8\u09CB \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF" });
        return;
      }
      if (hashUserPin(pin, profile.salt) !== profile.pinHash) {
        res.status(401).json({ ok: false, error: "\u09AA\u09BF\u09A8 \u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7" });
        return;
      }
      res.json({
        ok: true,
        user: {
          userId: profile.userId,
          username: profile.username,
          isGuest: false,
          token: signUserToken(profile.userId),
          watchlist: profile.watchlist || [],
          continueWatching: profile.continueWatching || []
        }
      });
      return;
    }
    res.status(400).json({ ok: false, error: "Invalid auth mode" });
  });
  app.get("/api/user/me", (req, res) => {
    setNoSharedCacheHeaders(res);
    const token = String(req.headers["x-cp-user-token"] || "").trim();
    const uid = verifyUserToken(token);
    if (!uid) {
      res.status(401).json({ ok: false, error: "Invalid session" });
      return;
    }
    let profile = usersById.get(uid);
    if (!profile) {
      profile = {
        userId: uid,
        username: `User-${uid.slice(-4).toUpperCase()}`,
        pinHash: "",
        salt: "",
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now()
      };
      usersById.set(uid, profile);
      scheduleFlushUserStore();
    }
    res.json({
      ok: true,
      user: {
        userId: profile.userId,
        username: profile.username,
        isGuest: profile.isGuest,
        token,
        watchlist: profile.watchlist || [],
        continueWatching: profile.continueWatching || []
      }
    });
  });
  app.put("/api/user/state", (req, res) => {
    setNoSharedCacheHeaders(res);
    const token = String(req.headers["x-cp-user-token"] || "").trim();
    const uid = verifyUserToken(token);
    if (!uid) {
      res.status(401).json({ ok: false, error: "Invalid user session" });
      return;
    }
    let profile = usersById.get(uid);
    if (!profile) {
      profile = {
        userId: uid,
        username: `User-${uid.slice(-4).toUpperCase()}`,
        pinHash: "",
        salt: "",
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now()
      };
      usersById.set(uid, profile);
    }
    if (Array.isArray(req.body?.watchlist)) {
      profile.watchlist = req.body.watchlist.slice(0, 200);
    }
    if (Array.isArray(req.body?.continueWatching)) {
      profile.continueWatching = req.body.continueWatching.slice(0, 30);
    }
    profile.updatedAt = Date.now();
    scheduleFlushUserStore();
    res.json({ ok: true, updatedAt: profile.updatedAt });
  });
  app.get("/api/notifications", (_req, res) => {
    const notifications = buildGlobalNotifications();
    res.json({
      ok: true,
      serverTime: Date.now(),
      notifications
    });
  });
  app.post("/api/notifications/broadcast", (req, res) => {
    const rawMovie = req.body?.movie;
    const category = req.body?.category === "TOP_RATED_POPULAR" ? "TOP_RATED_POPULAR" : "NEW_UPLOAD";
    if (!rawMovie || !rawMovie.title || !rawMovie.path) {
      res.status(400).json({ ok: false, error: "Invalid movie payload for broadcast" });
      return;
    }
    const normMovie = normalizeMovieCardItem(rawMovie, Date.now());
    const ratingNum = parseFloat(normMovie.rating || "9.2") || 9.2;
    const broadcastItem = {
      id: `notif-live-${Date.now()}-${normMovie.id}`,
      category,
      badgeText: category === "TOP_RATED_POPULAR" ? `\u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF \u09A7\u09BE\u09AE\u09BE\u0995\u09BE \u2022 \u2605 ${ratingNum.toFixed(1)}` : "\u09AE\u09BE\u09A4\u09CD\u09B0 \u0986\u09AA\u09B2\u09CB\u09A1 \u09B9\u09B2\u09CB \u{1F525}",
      headlineBn: category === "TOP_RATED_POPULAR" ? `\u09B8\u09AC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09B9\u09BE\u0987-\u09B0\u09C7\u099F\u09BF\u0982 \u099C\u09A8\u09AA\u09CD\u09B0\u09BF\u09DF \u09AE\u09C1\u09AD\u09BF \u0985\u09CD\u09AF\u09BE\u09B2\u09BE\u09B0\u09CD\u099F: ${normMovie.title}` : `\u09A8\u09A4\u09C1\u09A8 \u09AE\u09C1\u09AD\u09BF \u0986\u09AA\u09B2\u09CB\u09A1 \u0985\u09CD\u09AF\u09BE\u09B2\u09BE\u09B0\u09CD\u099F (\u09B8\u09AC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF): ${normMovie.title}`,
      subtitleBn: `${normMovie.language || "Multi Audio"} \u2022 ${normMovie.quality || "1080p Full HD"} \u2022 \u09B0\u09C7\u099F\u09BF\u0982 \u2605 ${ratingNum.toFixed(1)}`,
      movie: normMovie,
      createdAt: Date.now(),
      ratingScore: ratingNum
    };
    customBroadcastNotifications.unshift(broadcastItem);
    if (customBroadcastNotifications.length > 12) {
      customBroadcastNotifications.pop();
    }
    res.json({
      ok: true,
      broadcast: broadcastItem,
      notifications: buildGlobalNotifications()
    });
  });
  app.get("/api/proxy-page", async (req, res) => {
    const rawPath = String(req.query.path || "/").trim();
    const nodeId = String(req.query.node || "").trim();
    try {
      const { html, finalOrigin } = await fetchFromMirrors(rawPath, nodeId);
      let processed = html;
      processed = processed.replace(/<script>\(function\(\)\{try\{var ua=navigator\.userAgent[\s\S]*?<\/script>/i, "").replace(/<script[^>]*id=["']mlbd-display-ads[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "").replace(/<script[^>]*id=["']mlbd-click-ads[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "").replace(/\/mlbd-adopen\.php/g, "/api/noop").replace(/MovieLinkBD/gi, "CinePulse HD").replace(/movielinkbd\.[a-z]+/gi, "CinePulse");
      const stealthBridge = `
        <base href="${finalOrigin}/" />
        <style>
          #mlbd-adfree, .mlbd-ad-slot, [data-mlbd-ad], #mlbd-install,
          header .logo, .site-logo, .telegram-join, .tg-banner, .social-links,
          a[href*="t.me"], a[href*="telegram"], .footer, footer {
            display: none !important;
          }
        </style>
        <script>
          // Mute any automatic intro sound or page audio synth
          try {
            window.Audio = function() {
              return { play: function(){ return Promise.resolve(); }, pause: function(){}, addEventListener: function(){} };
            };
            if (window.speechSynthesis) {
              window.speechSynthesis.speak = function() {};
            }
          } catch (_) {}

          document.addEventListener('click', function(e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            var href = a.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            try {
              var u = new URL(href, '${finalOrigin}');
              if (u.hostname.includes('movielinkbd')) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/api/proxy-page?path=' + encodeURIComponent(u.pathname + u.search);
              }
            } catch (_) {}
          }, true);
        </script>
      `;
      processed = processed.replace(/<head[^>]*>/i, (match) => `${match}${stealthBridge}`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(processed);
    } catch {
      res.status(502).send(`
        <!doctype html>
        <html>
          <body style="background:#090b10;color:#f1f5f9;font-family:sans-serif;padding:2rem;text-align:center;">
            <h3>\u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u0982\u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09AF\u09BE\u099A\u09CD\u099B\u09C7 \u09A8\u09BE</h3>
            <p>\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7\u09B0 \u09AE\u09C7\u0987\u09A8 \u09AD\u09BF\u0989 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8 \u0985\u09A5\u09AC\u09BE \u0985\u09A8\u09CD\u09AF Server Node \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09C1\u09A8\u0964</p>
          </body>
        </html>
      `);
    }
  });
  app.get(["/api/health", "/health"], (_req, res) => {
    const configuredWorker = getConfiguredWorkerUrl();
    const workerHealth = configuredWorker ? workerHealthMap.get(configuredWorker) : void 0;
    const activeVideoProxy = resolveStreamProxyOrigin("");
    res.status(200).json({
      ok: true,
      version: 3,
      service: "CinePulse HD",
      multiServerCloudPlayer: true,
      videoProxyMode: activeVideoProxy ? workerHealth?.supportsEpStream ? "cloud-node-relay" : "cloudflare-worker-v2" : "universal-multi-server-hd",
      videoProxyActive: Boolean(activeVideoProxy),
      videoProxyHost: activeVideoProxy ? activeVideoProxy.replace(/^https?:\/\//i, "") : null,
      workerStatus: !configuredWorker ? "disabled" : workerHealth?.reason || "checking",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: Date.now()
    });
  });
  app.all("/api/noop", (_req, res) => {
    res.status(204).end();
  });
  app.get("/", (_req, res) => {
    res.redirect(302, "/trial");
  });
  app.get(["/sw.js", "/dev-sw.js"], (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.send(`
      self.addEventListener('install', () => {
        self.skipWaiting();
      });
      self.addEventListener('activate', (event) => {
        event.waitUntil(
          (async () => {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch (_) {}
            try {
              await self.registration.unregister();
            } catch (_) {}
            try {
              await self.clients.claim();
              const windowClients = await self.clients.matchAll({ type: 'window' });
              for (const client of windowClients) {
                client.navigate(client.url);
              }
            } catch (_) {}
          })()
        );
      });
    `);
  });
  const isProductionOrCpanel = process.env.NODE_ENV === "production" || Boolean(process.env.PASSENGER_APP_ENV) || Boolean(process.env.CPANEL_MODE) || Boolean(process.env.IN_PASSENGER);
  let viteMounted = false;
  if (!isProductionOrCpanel) {
    try {
      const vitePkg = "vite";
      const { createServer: createViteServer } = await import(vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa"
      });
      app.use(vite.middlewares);
      viteMounted = true;
    } catch {
      viteMounted = false;
    }
  }
  if (!viteMounted) {
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ ok: false, error: "Endpoint not found. Use /api/trial/* with an active API key." });
        return;
      }
      res.redirect(302, "/trial");
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CinePulse HD Cinema Server running on http://0.0.0.0:${PORT}`);
    setTimeout(() => {
      void discoverActiveMovieLinkBdOrigin(true).catch(() => {
      });
      void getMovieBoxBearerToken(true).catch(() => {
      });
      void fetchMovieBoxHomePayload().catch(() => {
      });
      void syncLiveCategories();
    }, 100).unref();
    setInterval(() => {
      void discoverActiveMovieLinkBdOrigin(true).catch(() => {
      });
    }, 15 * 6e4).unref();
    setInterval(syncLiveCategories, 3e5).unref();
    const externalUrl = (process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "").replace(/\/+$/, "");
    if (externalUrl && externalUrl.startsWith("http")) {
      setInterval(() => {
        fetch(`${externalUrl}/api/health`, {
          headers: { "User-Agent": "CinePulse-KeepAlive/1.0" },
          signal: AbortSignal.timeout(8e3)
        }).catch(() => {
        });
      }, 10 * 60 * 1e3).unref();
    }
    startTelegramBotPoller();
  });
}
startServer();
