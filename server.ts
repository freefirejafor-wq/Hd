import 'dotenv/config';
import { spawn, type ChildProcess } from 'child_process';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { ALL_CATEGORIES, INITIAL_FALLBACK_MOVIES } from './src/data/categories.ts';
import {
  cleanTimeAgoAndEpisode,
  deduplicateMovieCards,
  getCanonicalTitleKey,
  getItemMinutesAgo,
  normalizeMovieCardItem,
  normalizeMovieCardList,
  sortItemsByHighRating,
  sortItemsByHotAndHype,
  sortItemsByRecentUpload,
} from './src/utils/timeAgo.ts';
import { cloakPayloadDeep, decodeCloakToken } from './src/utils/securityShield.ts';
import type {
  CastMember,
  DirectDownloadButton,
  EpisodeItem,
  GlobalMovieNotification,
  MovieBoxComingSoonItem,
  MovieBoxHomePayload,
  MovieBoxHomeShelf,
  MovieBoxLiveSportItem,
  MovieBoxQuickCategory,
  MovieCardItem,
  MovieDetailData,
  MovieDubOption,
  ServerNodeStatus,
  StreamSource,
  UserMovieRequest,
} from './src/types/cinema.ts';

const __dirname =
  typeof import.meta?.url === 'string' && import.meta.url
    ? path.dirname(fileURLToPath(import.meta.url))
    : process.cwd();

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (kept server alive):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (kept server alive):', reason);
});

interface MirrorNodeConfig {
  id: string;
  name: string;
  region: string;
  origin: string;
}

const SERVER_NODES: MirrorNodeConfig[] = [
  { id: 'node-moviebox', name: 'CinePulse HD', region: 'CinePulse Global 4K/1080p Cloud', origin: 'https://movie-box.co' },
  { id: 'node-mlbd', name: 'CinePulse Bangla & South Hub', region: 'CinePulse Direct BD/Cloud', origin: 'https://rmqn25.movielinkbd.at' },
];

let activeMovieLinkBdOrigin = 'https://rmqn25.movielinkbd.at';
const MOVIELINKBD_DISCOVERY_HUBS = [
  'https://movielinkbd.at/',
  'https://movielinkbd.com/',
];
let lastMlbdDiscoveryAt = 0;

function getMirrorNodes(): MirrorNodeConfig[] {
  return [
    {
      id: 'node-mlbd',
      name: 'CinePulse Bangla & South Hub',
      region: 'CinePulse Direct BD/Cloud',
      origin: activeMovieLinkBdOrigin,
    },
    {
      id: 'node-mlbd-fallback',
      name: 'CinePulse Bangla Mirror',
      region: 'CinePulse Mirror Gateway',
      origin: 'https://movielinkbd.at',
    },
  ];
}

async function discoverActiveMovieLinkBdOrigin(force = false): Promise<string> {
  if (!force && Date.now() - lastMlbdDiscoveryAt < 10 * 60_000) {
    return activeMovieLinkBdOrigin;
  }
  lastMlbdDiscoveryAt = Date.now();
  for (const hubUrl of MOVIELINKBD_DISCOVERY_HUBS) {
    try {
      const res = await fetch(hubUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(4500),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const finalHost = new URL(res.url || hubUrl);
        if (finalHost.hostname.endsWith('movielinkbd.at') && finalHost.hostname !== 'movielinkbd.at') {
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
      // try next discovery hub
    }
  }
  return activeMovieLinkBdOrigin;
}

const MOVIEBOX_ORIGIN = 'https://movie-box.co';
const MOVIEBOX_BACKUP_ORIGIN = 'https://movieboxhd.net';
const MOVIEBOX_API_ORIGIN = 'https://movie-box.co';
const MOVIEBOX_FALLBACK_API_ORIGIN = 'https://h5-api.aoneroom.com';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const FFMPEG_BIN = fs.existsSync('/usr/bin/ffmpeg')
  ? '/usr/bin/ffmpeg'
  : fs.existsSync('/usr/local/bin/ffmpeg')
    ? '/usr/local/bin/ffmpeg'
    : 'ffmpeg';

function pruneCacheMap<K, V>(map: Map<K, V>, maxEntries: number): void {
  if (map.size <= maxEntries) return;
  const excess = map.size - maxEntries;
  let removed = 0;
  for (const key of map.keys()) {
    map.delete(key);
    removed++;
    if (removed >= excess) break;
  }
}

const catalogCache = new Map<string, CacheEntry<{ items: MovieCardItem[]; maxPage: number; activeNodeId: string }>>();
const detailCache = new Map<string, CacheEntry<MovieDetailData>>();
const detailTitleCache = new Map<string, CacheEntry<MovieDetailData>>();
const imdbIdCache = new Map<string, string>();
let healthCache: CacheEntry<ServerNodeStatus[]> | null = null;
const mirrorHtmlCache = new Map<string, CacheEntry<{ html: string; finalOrigin: string; activeNodeId: string }>>();
const inFlightMirrorMap = new Map<string, Promise<{ html: string; finalOrigin: string; activeNodeId: string }>>();
const inFlightCatalogMap = new Map<string, Promise<any>>();

function sortSourcesFastestFirst(sources?: StreamSource[]): StreamSource[] {
  if (!Array.isArray(sources) || sources.length <= 1) return sources || [];
  const score = (src: StreamSource) => {
    const isEmbed =
      src.type === 'embed' ||
      /abyssplayer\.com|abysscdn\.com|vidsrc|multiembed|autoembed/i.test(`${src.url || ''} ${src.id || ''}`);
    if (isEmbed) return 400;
    const isMovieBox =
      src.id?.startsWith('mb-') || /\/api\/mb-stream|\/api\/mb-ep-stream/i.test(src.url || '');
    if (isMovieBox) {
      // movie-box.co direct H.264 MP4 streams always get highest priority for instant native <video> playback
      const baseMb = 4500;
      const sizeMatch = (src.name || '').match(/(\d+)\s*MB/i);
      const sizeMb = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
      const isHeavyFile = sizeMb > 350;
      if (src.quality === 720) return baseMb + 140;
      if (src.quality === 480) return baseMb + 135;
      if (src.quality === 360) return baseMb + 125;
      if (src.quality === 1080) return isHeavyFile ? baseMb + 80 : baseMb + 130;
      return baseMb + 100;
    }
    const isHevc = /\b(hevc|h\.?265|x265|10bit|av1)\b/i.test(`${src.name} ${src.qualityLabel}`);
    const isBestHeavy = /best\s*quality/i.test(src.qualityLabel || '');
    let s = isHevc ? 1400 : 3000;
    if (isBestHeavy) s -= 250;
    if (src.quality >= 360 && src.quality <= 576) s += 650;
    else if (src.quality === 720) s += 550;
    else if (src.quality === 1080) s += 400;
    else s += 150;
    return s;
  };
  return [...sources].sort((a, b) => score(b) - score(a));
}

function storeDetailInCaches(itemPath: string, det: MovieDetailData, expiresAt: number): void {
  if (!det || typeof det !== 'object') return;
  // Cap stream token cache at 12 minutes so signed fsldownload stream URLs never expire into HTTP 410 Gone
  const safeExpiresAt = Math.min(expiresAt, Date.now() + 12 * 60_000);
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
    const isMbSource = Boolean(itemPath.startsWith('/mb/') || det.url?.startsWith('/mb/'));
    const scopePrefix = isMbSource ? 'mb::' : 'ml::';
    const canon = getCanonicalTitleKey(det.title);
    if (canon) detailTitleCache.set(`${scopePrefix}${canon}`, { data: det, expiresAt: safeExpiresAt });
    const base = extractBaseSeriesTitle(det.title).toLowerCase();
    if (base) detailTitleCache.set(`${scopePrefix}${base}`, { data: det, expiresAt: safeExpiresAt });
  }
}

function findCachedDetailByPathOrTitle(itemPath: string, rawTitle = ''): MovieDetailData | null {
  const now = Date.now();
  if (itemPath) {
    const hit = detailCache.get(itemPath);
    if (hit && hit.expiresAt > now && hit.data?.episodes?.length) {
      return hit.data;
    }
    // Never fall back to stripped title cache for distinct paths across MovieBox or MovieLinkBD,
    // so distinct seasons/dubs (e.g. MovieBox Bachelor Point vs MovieLinkBD S05 Ep 129-134) never collide!
    if (itemPath.startsWith('/mb/')) {
      return null;
    }
    if (rawTitle) {
      const canon = getCanonicalTitleKey(rawTitle);
      const byMlCanon = canon ? detailTitleCache.get(`ml::${canon}`) : undefined;
      if (
        byMlCanon &&
        byMlCanon.expiresAt > now &&
        byMlCanon.data?.episodes?.length &&
        !byMlCanon.data.url?.startsWith('/mb/')
      ) {
        return byMlCanon.data;
      }
    }
    return null;
  }
  if (rawTitle) {
    const canon = getCanonicalTitleKey(rawTitle);
    for (const pfx of ['mb::', 'ml::', '']) {
      const byCanon = canon ? detailTitleCache.get(`${pfx}${canon}`) : undefined;
      if (byCanon && byCanon.expiresAt > now && byCanon.data?.episodes?.length) return byCanon.data;
    }
    const base = extractBaseSeriesTitle(rawTitle).toLowerCase();
    for (const pfx of ['mb::', 'ml::', '']) {
      const byBase = base ? detailTitleCache.get(`${pfx}${base}`) : undefined;
      if (byBase && byBase.expiresAt > now && byBase.data?.episodes?.length) return byBase.data;
    }
  }
  return null;
}

const movieRequestsStore: UserMovieRequest[] = [
  {
    id: 'req-1',
    title: 'Pushpa 2: The Rule (2025) [Bangla Dubbed 4K]',
    type: 'MOVIE',
    language: 'Bangla Dubbed',
    notes: 'Full HD 1080p Dual Audio version',
    status: 'Processing',
    createdAt: Date.now() - 3600_000 * 5,
  },
  {
    id: 'req-2',
    title: 'Solo Leveling Season 2 [Hindi + Japanese Dual Audio]',
    type: 'ANIME',
    language: 'Dual Audio',
    notes: 'All episodes 1080p WEB-DL',
    status: 'Queued',
    createdAt: Date.now() - 3600_000 * 2,
  },
];

const customBroadcastNotifications: GlobalMovieNotification[] = [];

function formatMovieBoxStyleNotification(
  item: MovieCardItem,
  idx: number,
  category: 'NEW_UPLOAD' | 'TOP_RATED_POPULAR',
  now: number
): GlobalMovieNotification {
  const cleanTitle = item.title
    .replace(/\s*\((?:19|20)\d{2}\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rawDesc = String(item.description || '').trim();
  const isSeriesOrAnime =
    item.typeBadge === 'SERIES' ||
    item.typeBadge === 'ANIME' ||
    item.typeBadge === 'DRAMA' ||
    Boolean(item.episodePill);
  const ratingNum = parseFloat(item.rating || '8.7') || 8.7;

  let headline = '';
  const pattern = idx % 4;
  if (isSeriesOrAnime && pattern === 0) {
    headline = `${cleanTitle} is back—what will happen next?`;
  } else if (isSeriesOrAnime && pattern === 1) {
    headline = `“${cleanTitle}” is heating up—tap to find out what happens next!`;
  } else if (rawDesc && pattern === 2) {
    const snippet = rawDesc.length > 68 ? `${rawDesc.slice(0, 65).trim()}...` : rawDesc;
    headline = `${cleanTitle}: ${snippet}`;
  } else if (isSeriesOrAnime) {
    headline = `“${cleanTitle}” new episodes are streaming—tap to watch now!`;
  } else if (rawDesc) {
    const snippet = rawDesc.length > 68 ? `${rawDesc.slice(0, 65).trim()}...` : rawDesc;
    headline = `${cleanTitle}: ${snippet}`;
  } else {
    headline = `“${cleanTitle}” is now streaming in Full HD—tap to watch!`;
  }

  const fullSynopsis = rawDesc
    ? `${cleanTitle}: ${rawDesc}`
    : `${cleanTitle}: Stream in ${item.language || 'Multi Audio'} • ${item.quality || '1080p HD'} • ★ ${ratingNum.toFixed(1)} (${item.sportGenre || item.typeBadge || 'Cinema'}).`;

  const minsList = [12, 23, 35, 43, 58, 75, 95, 120, 165, 210, 260, 320];
  const mins = minsList[idx % minsList.length];
  const timeBadge =
    mins < 60
      ? `${mins} min ago`
      : `${Math.floor(mins / 60)} hr ${mins % 60 > 0 ? `${mins % 60} min ` : ''}ago`;

  return {
    id: `notif-${category === 'NEW_UPLOAD' ? 'new' : 'pop'}-${item.id}`,
    category,
    badgeText: timeBadge,
    headlineBn: headline,
    subtitleBn: fullSynopsis,
    movie: item,
    createdAt: Math.max(now - mins * 60_000, now - 24 * 3600_000),
    ratingScore: ratingNum,
  };
}

function buildGlobalNotifications(): GlobalMovieNotification[] {
  const now = Date.now();
  const pool: MovieCardItem[] = [];
  const seenPaths = new Set<string>();
  const seenTitles = new Set<string>();

  // 1. Pull rich MovieBox items with full descriptions from cachedMovieBoxHomeSections first
  for (const sec of cachedMovieBoxHomeSections) {
    if (!Array.isArray(sec.subjects)) continue;
    for (let idx = 0; idx < sec.subjects.length; idx++) {
      const card = mapMovieBoxItemToCard(sec.subjects[idx], idx);
      if (!card || card.isAdult) continue;
      const item = normalizeMovieCardItem(card, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');
      if (!item.path || seenPaths.has(item.path) || (tKey && seenTitles.has(tKey))) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }

  // 2. Supplement from catalogCache
  for (const [key, entry] of catalogCache.entries()) {
    if (key.includes('adult18plus')) continue;
    for (const rawItem of entry.data.items.slice(0, 24)) {
      if (rawItem.isAdult) continue;
      const item = normalizeMovieCardItem(rawItem, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');
      if (!item.path || seenPaths.has(item.path) || (tKey && seenTitles.has(tKey))) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }

  if (pool.length < 10) {
    for (const rawItem of INITIAL_FALLBACK_MOVIES['/'] || []) {
      if (rawItem.isAdult) continue;
      const item = normalizeMovieCardItem(rawItem, now);
      const tKey = item.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');
      if (!item.path || seenPaths.has(item.path) || (tKey && seenTitles.has(tKey))) continue;
      seenPaths.add(item.path);
      if (tKey) seenTitles.add(tKey);
      pool.push(item);
    }
  }

  // Prioritize items with real descriptions so notifications have authentic MovieBox synopses
  const withDesc = pool.filter((i) => Boolean(i.description));
  const withoutDesc = pool.filter((i) => !i.description);
  const orderedPool = [...withDesc, ...withoutDesc];

  const recentUploads = sortItemsByRecentUpload(orderedPool, now).slice(0, 14);
  const topRatedPopular = sortItemsByHighRating(orderedPool, now).slice(0, 14);

  const notifications: GlobalMovieNotification[] = [...customBroadcastNotifications];
  const notifSeen = new Set<string>(notifications.map((n) => n.movie.path));

  const maxLen = Math.max(recentUploads.length, topRatedPopular.length);
  let notifIdx = 0;
  for (let i = 0; i < maxLen; i++) {
    const newItem = recentUploads[i];
    if (newItem && !notifSeen.has(newItem.path)) {
      notifSeen.add(newItem.path);
      notifications.push(
        formatMovieBoxStyleNotification(newItem, notifIdx++, 'NEW_UPLOAD', now)
      );
    }

    const popItem = topRatedPopular[i];
    if (popItem && !notifSeen.has(popItem.path)) {
      notifSeen.add(popItem.path);
      notifications.push(
        formatMovieBoxStyleNotification(popItem, notifIdx++, 'TOP_RATED_POPULAR', now)
      );
    }
  }

  return notifications.slice(0, 28);
}

const CINEPULSE_AES_KEY = crypto
  .createHash('sha256')
  .update('CinePulse_AES256_Master_Key_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF')
  .digest();

const SHIELD_SECRET = 'CP_SHIELD_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF';

function computeServerShieldSignature(pathAndQuery: string, timestampStr: string): string {
  const cleanPath = (pathAndQuery || '/').split('#')[0];
  const raw = `${timestampStr}::${cleanPath}::${SHIELD_SECRET}`;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= c + (i & 0xff);
    h2 = Math.imul(h2, 2246822507) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function encryptServerApiPayload(payloadObj: any): { _s: 1; n: string; d: string } {
  const cloned = cloakPayloadDeep(JSON.parse(JSON.stringify(payloadObj)));
  const jsonText = JSON.stringify(cloned);
  const plainBuf = Buffer.from(jsonText, 'utf8');
  const nonce = crypto.randomBytes(6).toString('hex');
  const keyStr = `${SHIELD_SECRET}::${nonce}`;
  const keyBytes = Buffer.from(keyStr, 'utf8');
  const kLen = keyBytes.length;
  let state = 0x5a3c9e17 >>> 0;
  for (let i = 0; i < kLen; i++) {
    state = (Math.imul(state ^ keyBytes[i], 1664525) + 1013904223) >>> 0;
  }
  const outBuf = Buffer.allocUnsafe(plainBuf.length);
  for (let i = 0; i < plainBuf.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const mask = ((state >>> 16) ^ keyBytes[i % kLen] ^ (i & 0xff)) & 0xff;
    outBuf[i] = plainBuf[i] ^ mask;
  }
  return {
    _s: 1,
    n: nonce,
    d: outBuf.toString('base64'),
  };
}

function encodeGatewayToken(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const iv = crypto.createHash('md5').update(`${rawUrl}::cp_iv_v4`).digest().subarray(0, 12);
    const cipher = crypto.createCipheriv('aes-256-gcm', CINEPULSE_AES_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(rawUrl, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `cp1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  } catch {
    return Buffer.from(rawUrl, 'utf8').toString('base64url');
  }
}

function encodeGatewayUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return `/api/go?t=${encodeGatewayToken(rawUrl)}`;
}

function decodeGatewayToken(token: string): string {
  if (!token) return '';
  try {
    const trimmed = token.trim();
    if (trimmed.startsWith('cp1.')) {
      const parts = trimmed.split('.');
      if (parts.length === 4) {
        const iv = Buffer.from(parts[1], 'base64url');
        const tag = Buffer.from(parts[2], 'base64url');
        const encrypted = Buffer.from(parts[3], 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-gcm', CINEPULSE_AES_KEY, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
      }
    }
    return Buffer.from(trimmed, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Strips any upstream site names, domains, watermarks, or tags from scraped text.
 */
function sanitizeBrandText(input: string): string {
  if (!input) return '';
  return input
    .replace(/https?:\/\/[^\s"'<>]*movielinkbd[^\s"'<>]*/gi, '')
    .replace(/\b[a-z0-9-]*\.?movielinkbd\.[a-z]{2,6}\b/gi, 'CinePulse')
    .replace(/movielinkbd|nexaflox/gi, 'CinePulse')
    .replace(/movie\s*link\s*bd/gi, 'CinePulse')
    .replace(/\bmlbd\b/gi, 'CP')
    .replace(/\s*watch\s+online\s+and\s+download\s*(?:["“”']?web-dl["“”']?|["“”']?hdtc["“”']?|["“”']?hd["“”']?|["“”']?4k["“”']?)?\s*…?/gi, '')
    .replace(/\s*watch\s+online\s*…?/gi, '')
    .replace(/\s*[“”"'](?:web(?:-?dl|rip)?|hdtc|hdts|4k|hd)[^"”]*[”"']?\s*…?\s*$/gi, '')
    .replace(/\s+[–—-]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function decodeMlbdCipher(base64Str: string, hexSeed: string, rounds: number): string {
  try {
    let x = parseInt(hexSeed, 16) >>> 0;
    for (let i = 0; i < rounds; i++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    }
    const raw = Buffer.from(base64Str.trim(), 'base64');
    const out = Buffer.alloc(raw.length);
    for (let j = 0; j < raw.length; j++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
      out[j] = raw[j] ^ ((x >>> 16) & 255);
    }
    return out.toString('utf8');
  } catch {
    return '';
  }
}

function decodeHtmlEntities(str: string): string {
  const cleaned = (str || '')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&#039;|&#8217;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&amp;|&#038;/g, '&')
    .replace(/&bull;|&#8226;/g, '•')
    .replace(/&#8230;|&hellip;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
  return sanitizeBrandText(cleaned);
}

function getOrderedNodes(preferredNodeId?: string): MirrorNodeConfig[] {
  const nodes = getMirrorNodes();
  if (!preferredNodeId || preferredNodeId === 'node-moviebox') return nodes;
  const preferred = nodes.find((n) => n.id === preferredNodeId);
  if (!preferred) return nodes;
  return [preferred, ...nodes.filter((n) => n.id !== preferredNodeId)];
}

async function fetchFromMirrors(
  targetPath: string,
  preferredNodeId?: string
): Promise<{ html: string; finalOrigin: string; activeNodeId: string }> {
  const cleanPath = targetPath.startsWith('http')
    ? new URL(targetPath).pathname + new URL(targetPath).search
    : targetPath.startsWith('/')
      ? targetPath
      : `/${targetPath}`;

  const orderedNodes = getOrderedNodes(preferredNodeId);

  const attemptNode = async (node: MirrorNodeConfig, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${node.origin}${cleanPath}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          Cookie: 'mlbd_show18=1; hide18On=false',
          Referer: `${node.origin}/`,
        },
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      if (
        !html ||
        html.length < 1200 ||
        (!html.includes('movie-card') &&
          !html.includes('mlbdInlinePlayerData') &&
          !html.includes('<div class="n">404</div>'))
      ) {
        throw new Error('Challenge or incomplete HTML');
      }
      const finalOrigin = new URL(res.url || url).origin;
      return { html, finalOrigin, activeNodeId: node.id };
    } finally {
      clearTimeout(timer);
    }
  };

  const mirrorKey = `${preferredNodeId || 'auto'}::${cleanPath}`;
  const cachedMirror = mirrorHtmlCache.get(mirrorKey);
  if (cachedMirror && cachedMirror.expiresAt > Date.now()) {
    return cachedMirror.data;
  }
  const existingFlight = inFlightMirrorMap.get(mirrorKey);
  if (existingFlight) {
    return existingFlight;
  }

  const runMirrorFetch = (async () => {
    // Race top 2 mirror nodes in parallel for sub-second response!
    try {
      const winner = await Promise.any(
        orderedNodes.slice(0, 2).map((node) => attemptNode(node, 4500))
      );
      pruneCacheMap(mirrorHtmlCache, 60);
      mirrorHtmlCache.set(mirrorKey, { data: winner, expiresAt: Date.now() + 45_000 });
      return winner;
    } catch {
      for (const node of orderedNodes.slice(2)) {
        try {
          const fallbackWinner = await attemptNode(node, 5000);
          pruneCacheMap(mirrorHtmlCache, 60);
          mirrorHtmlCache.set(mirrorKey, { data: fallbackWinner, expiresAt: Date.now() + 45_000 });
          return fallbackWinner;
        } catch {
          // try next
        }
      }
    }
    throw new Error('All cinema stream nodes unreachable');
  })();

  inFlightMirrorMap.set(mirrorKey, runMirrorFetch);
  try {
    return await runMirrorFetch;
  } finally {
    inFlightMirrorMap.delete(mirrorKey);
  }
}

function parseMovieCards(html: string): { items: MovieCardItem[]; maxPage: number } {
  const bodyIdx = html.indexOf('<body');
  const body = bodyIdx >= 0 ? html.slice(bodyIdx) : html;
  const blocks = body.split(/<div class="movie-card"/i).slice(1);
  const items: MovieCardItem[] = [];
  const seenPaths = new Set<string>();

  for (const block of blocks) {
    const chunk = block.slice(0, 3200);
    if (chunk.includes("'+esc(") || chunk.includes('${')) continue;

    const titleMatch =
      chunk.match(/class=["']title["'][^>]*>([\s\S]*?)<\/a>/i) ||
      chunk.match(/alt=["']([^"']+)["']/i);
    const hrefMatch = chunk.match(/<a[^>]+href=["']([^"']+)["']/i);
    if (!titleMatch || !hrefMatch) continue;

    const rawHref = hrefMatch[1].trim();
    if (!rawHref || rawHref.includes("'+") || rawHref === '#') continue;

    let itemPath = '';
    try {
      itemPath = rawHref.startsWith('http')
        ? new URL(rawHref).pathname
        : rawHref.startsWith('/')
          ? rawHref
          : `/${rawHref}`;
    } catch {
      continue;
    }

    if (seenPaths.has(itemPath)) continue;

    const title = decodeHtmlEntities(titleMatch[1]);
    if (!title) continue;

    const titleKey = getCanonicalTitleKey(title);
    if (titleKey && seenPaths.has(`title::${titleKey}`)) continue;

    const posterMatch =
      chunk.match(/data-src=["'](https?:\/\/[^"']+)["']/i) ||
      chunk.match(/src=["'](https?:\/\/[^"']+)["']/i);
    const poster = posterMatch ? posterMatch[1].trim() : '';
    const posterKey = poster ? poster.toLowerCase().split('?')[0].trim() : '';
    if (posterKey && seenPaths.has(`poster::${posterKey}`)) continue;

    seenPaths.add(itemPath);
    if (titleKey) seenPaths.add(`title::${titleKey}`);
    if (posterKey) seenPaths.add(`poster::${posterKey}`);

    const quality = decodeHtmlEntities(
      (chunk.match(/<span class=["']quality["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || 'WEB-DL'
    );
    const language = decodeHtmlEntities(
      (chunk.match(/<span class=["']language["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || 'MULTI'
    );
    const views = decodeHtmlEntities(
      (chunk.match(/<span class=["']views-badge-top["'][^>]*>[\s\S]*?<\/i>\s*([^<]+)<\/span>/i) || [])[1] || '2.4K'
    );
    const rawTimeAgo = decodeHtmlEntities(
      (chunk.match(/<div class=["']upload-time["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || 'Recently added'
    );
    const rawEpisodePill = decodeHtmlEntities(
      (chunk.match(/<span class=["']badge ep-badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || ''
    );
    const cleanedTime = cleanTimeAgoAndEpisode(
      rawTimeAgo,
      rawEpisodePill,
      itemPath || title,
      items.length
    );

    const isPinned = chunk.includes('pin-badge') || chunk.includes('data-pin="1"');
    const isAdult =
      chunk.includes('data-18="1"') ||
      itemPath.includes('18plus') ||
      cleanedTime.episodePill.toUpperCase().includes('18+');

    let typeBadge: 'MOVIE' | 'SERIES' | 'ANIME' | 'DRAMA' = 'MOVIE';
    if (itemPath.includes('/anime/')) typeBadge = 'ANIME';
    else if (itemPath.includes('/drama/')) typeBadge = 'DRAMA';
    else if (itemPath.includes('/series/') || Boolean(cleanedTime.episodePill)) typeBadge = 'SERIES';

    // Extract real R2 upload Unix timestamp if embedded in poster URL (e.g. poster_v778gm1793478302.webp)
    const r2TsMatch = poster.match(/poster_[a-z0-9_]*?(17\d{8})\./i);
    const r2EpochMs = r2TsMatch ? parseInt(r2TsMatch[1], 10) * 1000 : 0;
    const nowMs = Date.now();
    let pathHash = 2166136261 >>> 0;
    for (let c = 0; c < itemPath.length; c++) {
      pathHash ^= itemPath.charCodeAt(c);
      pathHash = Math.imul(pathHash, 16777619) >>> 0;
    }
    const minuteJitter = cleanedTime.minutesAgo >= 60 ? (pathHash % 47) : 0;
    const computedUploadMs =
      r2EpochMs > nowMs - 48 * 3600_000 && r2EpochMs <= nowMs
        ? r2EpochMs
        : nowMs - (cleanedTime.minutesAgo + minuteJitter) * 60_000;

    items.push({
      id: itemPath.replace(/[^a-zA-Z0-9_-]/g, '_'),
      title,
      // Never expose upstream URL; keep clean relative path
      url: itemPath,
      path: itemPath,
      poster,
      quality: quality || 'HD',
      views: views || '1.9K',
      language: language || 'MULTI',
      typeBadge,
      timeAgo: cleanedTime.timeAgo,
      episodePill: cleanedTime.episodePill,
      isPinned,
      isAdult,
      uploadedAtMs: computedUploadMs,
    });
  }

  const pageMatches = [...body.matchAll(/\/page\/(\d+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => !isNaN(n) && n > 0 && n <= 2000);
  const maxPage = pageMatches.length > 0 ? Math.max(...pageMatches) : 520;

  return { items, maxPage };
}

function parseMovieDetail(html: string, itemPath: string, origin: string): MovieDetailData {
  let inlineData: any = null;
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

  const downloadButtons: DirectDownloadButton[] = [];
  const dlRegex = /<a[^>]*data-dl=["']([^"']+)["'][^>]*data-ds=["']([^"']+)["'][^>]*data-dr=["'](\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(dlRegex)) {
    const decodedHref = decodeMlbdCipher(match[1], match[2], parseInt(match[3], 10) || 300);
    const label = decodeHtmlEntities(match[4]);
    if (decodedHref) {
      const fullDlUrl = decodedHref.startsWith('http')
        ? decodedHref
        : `${origin}${decodedHref.startsWith('/') ? '' : '/'}${decodedHref}`;
      const bracketMatch = label.match(/\[(.*?)\]/);
      const parts = bracketMatch ? bracketMatch[1].split('•').map((s) => s.trim()) : [];
      downloadButtons.push({
        label: sanitizeBrandText(label || 'High-Speed Direct Download'),
        url: fullDlUrl,
        quality: parts[0] || 'HD',
        size: parts[1] || '',
      });
    }
  }

  const rawTitle =
    inlineData?.title ||
    decodeHtmlEntities((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || 'Cinema Title');
  const title = sanitizeBrandText(rawTitle);

  const poster =
    inlineData?.poster ||
    (html.match(/<div class=["']image-container-view["'][\s\S]*?<img[^>]+src=["'](https?:\/\/[^"']+)["']/i) || [])[1] ||
    '';

  const qualityNote = sanitizeBrandText(
    decodeHtmlEntities(
      (html.match(/<div class=["']movie-info-view["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || ''
    )
  );

  const extractInfoLine = (keyword: string): string => {
    const regex = new RegExp(`<p class=["']info-line["'][^>]*>[\\s\\S]*?${keyword}:?<\\/b>([\\s\\S]*?)<\\/p>`, 'i');
    const m = html.match(regex);
    return m ? decodeHtmlEntities(m[1]) : '';
  };

  const genre = extractInfoLine('Genre') || 'Cinema, Entertainment';
  const language = extractInfoLine('Language') || 'Multi Audio';
  const quality = extractInfoLine('Quality') || 'WEB-DL';
  const resolution = extractInfoLine('Resolution') || '1080p | 720p | 480p';
  const releaseDate = extractInfoLine('Released') || '2026';

  const storyline = sanitizeBrandText(
    decodeHtmlEntities(
      (html.match(/<p class=["']story-text["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] ||
        (html.match(/<meta name=["']description["'] content=["']([^"']+)["']/i) || [])[1] ||
        ''
    )
  );

  const trailerMatch = html.match(/data-mlbd-trailer=["']([a-zA-Z0-9_-]{6,20})["']/i);
  const youtubeTrailerId = trailerMatch ? trailerMatch[1] : '';

  const cast: CastMember[] = [];
  const castRegex = /<a class=["']mlbd-cast__p["'][^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>[\s\S]*?<small>([\s\S]*?)<\/small>/gi;
  for (const m of html.matchAll(castRegex)) {
    const actorName = decodeHtmlEntities(m[3]);
    if (actorName) {
      cast.push({
        url: `/search?q=${encodeURIComponent(actorName)}`,
        photo: m[2],
        name: actorName,
        role: decodeHtmlEntities(m[4]),
      });
    }
  }

  let communityScore: MovieDetailData['communityScore'] | undefined;
  const voteMatch = html.match(/data-summary=["']([^"']+)["']/i);
  if (voteMatch) {
    try {
      const parsedVote = JSON.parse(decodeHtmlEntities(voteMatch[1]));
      communityScore = {
        recommendedPercent: Number(parsedVote.recommended_percent) || 88,
        totalVotes: Number(parsedVote.total) || 24,
        verdict: sanitizeBrandText(parsedVote.verdict || 'দর্শকদের পছন্দ'),
      };
    } catch {
      // ignore
    }
  }

  const inferStreamQuality = (s: any): number => {
    const combined = `${s?.quality_label || ''} ${s?.name || ''}`.toLowerCase();
    if (/\b(2160p|4k)\b/.test(combined)) return 2160;
    if (/\b(1080p|full\s*hd)\b/.test(combined)) return 1080;
    if (/\b(480p|360p)\b/.test(combined)) return 480;
    if (/\b720p\b/.test(combined)) return 720;
    const q = Number(s?.quality);
    if (q === 480 || q === 720 || q === 1080 || q === 2160) return q;
    if (/best\s*quality/i.test(combined)) return 1080;
    return 720;
  };

  const scoreSourceForSmoothPlay = (src: StreamSource): number => {
    const isHevc = /\b(hevc|h\.?265|x265|10bit)\b/i.test(`${src.name} ${src.qualityLabel}`);
    const isBestHeavy = /best\s*quality/i.test(src.qualityLabel || '');
    let score = isHevc ? 200 : 1000;
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

  const mapRawEpisode = (ep: any, idx: number): EpisodeItem => {
    const rawSources: StreamSource[] = Array.isArray(ep.sources)
      ? ep.sources
          .filter((s: any) => s && (s.url || s.download_url))
          .map((s: any, sIdx: number) => {
            const rawUrl = String(s.url || '');
            const rawStreamUrl = rawUrl.startsWith('http')
              ? rawUrl
              : rawUrl
                ? `${origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
                : '';
            const rawDlUrl = String(s.download_url || s.url || '');
            const fullDlUrl = rawDlUrl.startsWith('http')
              ? rawDlUrl
              : rawDlUrl
                ? `${origin}${rawDlUrl.startsWith('/') ? '' : '/'}${rawDlUrl}`
                : '';
            const realQuality = inferStreamQuality(s);
            const cleanStreamName = sanitizeBrandText(String(s.name || `${title} - ${realQuality}p`));
            const fileSlug = (cleanStreamName || 'CinePulse-HD')
              .replace(/[^a-zA-Z0-9._-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            const isDirectFile =
              rawStreamUrl.startsWith('http') &&
              !/\/embed\/|abyssplayer|abysscdn|vidsrc|multiembed|autoembed/i.test(rawStreamUrl);
            const proxiedStreamUrl = isDirectFile
              ? `/api/mb-stream.mp4?t=${encodeGatewayToken(rawStreamUrl)}&name=${encodeURIComponent(fileSlug)}`
              : rawStreamUrl;
            const isDirectDl =
              fullDlUrl.startsWith('http') &&
              (/\.(mp4|mkv|m4v)(\?|$)/i.test(fullDlUrl) ||
                /workers\.dev|r2\.dev|fsldownload|cloudflare/i.test(fullDlUrl));
            const proxiedDlUrl = isDirectDl
              ? `/api/mb-stream.mp4?t=${encodeGatewayToken(fullDlUrl)}&dl=1&name=${encodeURIComponent(fileSlug)}`
              : encodeGatewayUrl(fullDlUrl);
            const rawExt = String(s.type || '').toLowerCase();
            const inferredType =
              rawExt === 'mp4' || /\.mp4(\?|$)/i.test(rawStreamUrl)
                ? 'mp4'
                : rawExt || (/\.mkv(\?|$)/i.test(rawStreamUrl) ? 'mkv' : 'mp4');
            return {
              id: String(s.id || `src-${idx}-${realQuality}-${sIdx}`),
              quality: realQuality,
              qualityLabel: s.quality_label || `${realQuality}p`,
              audio: sanitizeBrandText(String(s.audio || 'Multi Audio')),
              audioLanguages: Array.isArray(s.audio_languages)
                ? s.audio_languages.map((a: any) => sanitizeBrandText(String(a)))
                : [sanitizeBrandText(String(s.audio || 'Original'))],
              provider: `CinePulse Cloud #${sIdx + 1}`,
              url: proxiedStreamUrl,
              downloadUrl: proxiedDlUrl,
              type: inferredType,
              name: cleanStreamName,
              screenshot: s.screenshot || undefined,
            };
          })
      : [];

    const sources = [...rawSources].sort(
      (a, b) => scoreSourceForSmoothPlay(b) - scoreSourceForSmoothPlay(a)
    );

    const rawLabel = sanitizeBrandText(
      String(ep.label || (ep.number ? `Episode ${ep.number}` : 'Full Movie'))
    );

    // Parse episode range or season from label if not explicitly set
    const rangeMatch = rawLabel.match(/(?:ep(?:isode)?|e)\s*0*(\d{1,4})\s*[-–—]\s*0*(\d{1,4})/i);
    const singleEpMatch =
      rawLabel.match(/s\d+\s*e0*(\d{1,4})/i) ||
      rawLabel.match(/(?:ep(?:isode)?|e)\s*0*(\d{1,4})/i);
    const seasonMatch = rawLabel.match(/\bs(?:eason)?\s*0*(\d{1,2})\b/i);

    const parsedStart = rangeMatch
      ? Number(rangeMatch[1])
      : singleEpMatch
        ? Number(singleEpMatch[1])
        : null;
    const parsedEnd = rangeMatch ? Number(rangeMatch[2]) : parsedStart;

    const number =
      ep.number !== null && ep.number !== undefined
        ? Number(ep.number)
        : ep.range_start !== null && ep.range_start !== undefined
          ? Number(ep.range_start)
          : parsedStart;

    const rangeStart =
      ep.range_start !== null && ep.range_start !== undefined
        ? Number(ep.range_start)
        : number;
    const rangeEnd =
      ep.range_end !== null && ep.range_end !== undefined
        ? Number(ep.range_end)
        : parsedEnd ?? rangeStart;

    const season =
      ep.season !== null && ep.season !== undefined
        ? Number(ep.season)
        : seasonMatch
          ? Number(seasonMatch[1])
          : null;

    return {
      id: String(ep.id || `ep-${idx + 1}`),
      label: rawLabel,
      number,
      rangeStart,
      rangeEnd,
      season,
      kind: String(ep.kind || (number !== null ? 'episode' : 'movie')),
      sources,
    };
  };

  const episodes: EpisodeItem[] = Array.isArray(inlineData?.episodes)
    ? inlineData.episodes
        .map((ep: any, idx: number) => mapRawEpisode(ep, idx))
        .filter((ep: EpisodeItem) => ep.sources.length > 0)
        .sort((a: EpisodeItem, b: EpisodeItem) => {
          const sA = a.season ?? 0;
          const sB = b.season ?? 0;
          if (sA !== sB && a.season !== null && b.season !== null) return sA - sB;
          const nA = a.rangeStart ?? a.number ?? 999999;
          const nB = b.rangeStart ?? b.number ?? 999999;
          if (nA !== nB) return nA - nB;
          return (a.rangeEnd ?? nA) - (b.rangeEnd ?? nB);
        })
    : [];

  const screenshots: string[] = Array.isArray(inlineData?.screenshots)
    ? inlineData.screenshots.map((s: any) => s?.url).filter(Boolean)
    : [];

  return {
    title,
    url: itemPath,
    poster,
    qualityNote,
    typeBadge: inlineData?.content_type === 'series' || episodes.length > 1 ? 'SERIES' : 'MOVIE',
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
    communityScore,
  };
}

function extractBaseSeriesTitle(rawTitle: string): string {
  return String(rawTitle || '')
    .replace(/\[.*?\]|\(.*?\)/g, ' ')
    .replace(/\b(?:S\d+|Season\s*\d+(?:-\d+)?|Ep(?:isode)?\s*\d+(?:-\d+)?|Complete(?:d)?|Added|Full\s*HD|ORG|Hindi|Bangla|Bengali|Dual|Multi|Audio|Watch|Online|Download|WEB-DL|HDTC|4K|The\s*Movie)\b/gi, ' ')
    .replace(/[:\-–—|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function mapCategoryToMovieLinkBdPath(rawPath: string, page = 1, search = ''): string {
  if (search) {
    return page > 1
      ? `/search?q=${encodeURIComponent(search)}&page=${page}`
      : `/search?q=${encodeURIComponent(search)}`;
  }

  const p = (rawPath || '/').toLowerCase().replace(/\/page\/\d+\/?$/, '').replace(/\/+$/, '') || '/';
  let mlPath = '/';

  if (
    p === '/' ||
    p === '/home' ||
    p === '/hot-dhamaka' ||
    p === '/new-uploads' ||
    p === '/new-releases' ||
    p === '/mostwatch/7d'
  ) {
    mlPath = '/';
  } else if (p === '/adult18plus' || p.includes('18plus')) {
    mlPath = '/category/18plus';
  } else if (p.includes('bangla-dubbed') || p.includes('bangladubbed')) {
    mlPath = '/search?q=Bangla+Dubbed';
  } else if (p.includes('bangla') || p.includes('bengali') || p.includes('kolkata')) {
    mlPath = '/search?q=Bangla';
  } else if (p.includes('hindi-dubbed') || p.includes('hindidubbed') || p.includes('dual-audio')) {
    mlPath = '/search?q=Hindi+Dubbed';
  } else if (p.includes('bollywood') || p.includes('hindi')) {
    mlPath = '/search?q=Hindi';
  } else if (p.includes('south') || p.includes('tamil') || p.includes('telugu') || p.includes('malayalam')) {
    mlPath = '/search?q=South';
  } else if (p.includes('hollywood') || p.includes('english')) {
    mlPath = '/search?q=English';
  } else if (p.includes('anime')) {
    mlPath = '/anime';
  } else if (p.includes('animation') || p.includes('family')) {
    mlPath = '/genre/animation';
  } else if (p.includes('drama') || p.includes('korean') || p.includes('k-drama') || p.includes('chinese')) {
    mlPath = '/drama';
  } else if (p.includes('series') || p.includes('ongoing') || p.includes('tv')) {
    mlPath = '/series';
  } else if (p.includes('movies') || p === '/movies') {
    mlPath = '/movie';
  } else if (p.startsWith('/genre/')) {
    mlPath = p;
  } else {
    const slug = p.split('/').filter(Boolean).pop() || '';
    return slug ? `/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}` : '/';
  }

  if (page > 1 && !mlPath.includes('?')) {
    return `${mlPath === '/' ? '' : mlPath}/page/${page}`;
  }
  return mlPath;
}

async function fetchMovieLinkBdCatalog(
  rawPath: string,
  page = 1,
  search = ''
): Promise<{ items: MovieCardItem[]; maxPage: number }> {
  const mlPath = mapCategoryToMovieLinkBdPath(rawPath, page, search);
  try {
    const { html, finalOrigin } = await fetchFromMirrors(mlPath, 'node-mlbd');
    if (finalOrigin && finalOrigin.includes('movielinkbd.at')) {
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

function mergeCatalogItems(
  primaryItems: MovieCardItem[],
  secondaryItems: MovieCardItem[],
  preferSecondaryFirst = false
): MovieCardItem[] {
  const firstList = preferSecondaryFirst ? secondaryItems : primaryItems;
  const secondList = preferSecondaryFirst ? primaryItems : secondaryItems;
  const interleaved: MovieCardItem[] = [];
  const maxLen = Math.max(firstList.length, secondList.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < firstList.length) interleaved.push(firstList[i]);
    if (i < secondList.length) interleaved.push(secondList[i]);
  }
  return deduplicateMovieCards(interleaved);
}

// ============================================================================
// MovieBox HD (https://movie-box.co + movieboxhd.net + h5-api.aoneroom.com) Full Content Engine
// ============================================================================
let cachedMovieBoxToken = '';
let cachedMovieBoxTokenExpiresAt = 0;
let cachedMovieBoxHomeSections: Array<{ title: string; type: string; subjects: any[] }> = [];
let cachedMovieBoxHomeExpiresAt = 0;
let cachedMovieBoxHomePayload: MovieBoxHomePayload | null = null;
let cachedMovieBoxHomePayloadExpiresAt = 0;
let inFlightMovieBoxHomePromise: Promise<MovieBoxHomePayload> | null = null;

function extractMovieBoxNuxtOperatingList(html: string): any[] {
  try {
    const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m?.[1]) return [];
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return [];

    const resolve = (idx: any, depth = 0): any => {
      if (depth > 8 || typeof idx !== 'number' || idx < 0 || idx >= arr.length) return idx;
      const val = arr[idx];
      if (Array.isArray(val)) {
        if (val[0] === 'ShallowReactive' || val[0] === 'Reactive' || val[0] === 'Ref') {
          return resolve(val[1], depth + 1);
        }
        return val.map((v) => resolve(v, depth + 1));
      }
      if (val && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = resolve(v, depth + 1);
        }
        return out;
      }
      return val;
    };

    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === 'object' && !Array.isArray(v) && 'operatingList' in v) {
        const resolved = resolve(i);
        if (Array.isArray(resolved?.operatingList) && resolved.operatingList.length > 0) {
          return resolved.operatingList;
        }
      }
    }
  } catch {
    // ignore Nuxt parse error
  }
  return [];
}

function extractMovieBoxNuxtDetail(html: string): any | null {
  try {
    const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m?.[1]) return null;
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return null;

    const resolve = (idx: any, depth = 0): any => {
      if (depth > 8 || typeof idx !== 'number' || idx < 0 || idx >= arr.length) return idx;
      const val = arr[idx];
      if (Array.isArray(val)) {
        if (val[0] === 'ShallowReactive' || val[0] === 'Reactive' || val[0] === 'Ref') {
          return resolve(val[1], depth + 1);
        }
        return val.map((v) => resolve(v, depth + 1));
      }
      if (val && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = resolve(v, depth + 1);
        }
        return out;
      }
      return val;
    };

    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === 'object' && !Array.isArray(v) && 'subject' in v && 'resource' in v) {
        const resolved = resolve(i);
        if (resolved?.subject?.subjectId) {
          return { code: 0, message: 'ok', data: resolved };
        }
      }
    }
  } catch {
    // ignore Nuxt detail parse error
  }
  return null;
}

function mapMovieBoxShelfTitleToMeta(rawTitle: string): { bnTitle: string; categoryPath: string; badge?: string } {
  const t = rawTitle.toLowerCase();
  if (t.includes('trending drama')) {
    return { bnTitle: 'ট্রেন্ডিং ড্রামা সিরিজ', categoryPath: '/category/trending-drama', badge: 'HOT DRAMA' };
  }
  if (t.includes('trending movie')) {
    return { bnTitle: 'ট্রেন্ডিং মুভি (CinePulse Top)', categoryPath: '/type/movies', badge: 'TRENDING' };
  }
  if (t.includes('indian cinema') || t.includes('trending india')) {
    return { bnTitle: 'ইন্ডিয়ান সিনেমা ট্রেন্ডিং', categoryPath: '/category/indian-cinema', badge: 'INDIA TOP' };
  }
  if (t.includes('bengali')) {
    return { bnTitle: 'ট্রেন্ডিং বাংলা মুভি ও নাটক', categoryPath: '/language/bangla', badge: 'BANGLA HIT' };
  }
  if (t.includes('bollywood')) {
    return { bnTitle: 'বলিউড হিন্দি মুভি', categoryPath: '/bollywood', badge: 'BOLLYWOOD' };
  }
  if (t.includes('south indian')) {
    return { bnTitle: 'সাউথ ইন্ডিয়ান ব্লকবাস্টার', categoryPath: '/southIndian', badge: 'SOUTH DUB' };
  }
  if (t.includes('hollywood') || t.includes('trending western')) {
    return { bnTitle: 'হলিউড ব্লকবাস্টার মুভি', categoryPath: '/language/english', badge: 'HOLLYWOOD' };
  }
  if (t.includes('short tv') || t.includes('shorttv')) {
    return { bnTitle: 'হট শর্ট টিভি ও মিনি ড্রামা', categoryPath: '/category/short-tv', badge: 'SHORT TV' };
  }
  if (t.includes('c-drama')) {
    return { bnTitle: 'চায়নিজ ড্রামা ও সিরিজ', categoryPath: '/language/chinese', badge: 'C-DRAMA' };
  }
  if (t.includes('asian drama') || t.includes('k-drama') || t.includes('thai-drama') || t.includes('filipino drama')) {
    return { bnTitle: 'কোরিয়ান ও এশিয়ান ড্রামা', categoryPath: '/drama', badge: 'ASIAN DRAMA' };
  }
  if (t.includes('western tv')) {
    return { bnTitle: 'ওয়েস্টার্ন ও হলিউড টিভি শো', categoryPath: '/category/western-tv', badge: 'WESTERN TV' };
  }
  if (t.includes('anime in hindi')) {
    return { bnTitle: 'হিন্দি ডাবিং অ্যানিমে', categoryPath: '/category/anime-hindi', badge: 'HINDI ANIME' };
  }
  if (t.includes('animated film')) {
    return { bnTitle: 'অ্যানিমেশন মুভি', categoryPath: '/genre/animation', badge: 'ANIMATION' };
  }
  if (t.includes('popular anime') || t.includes('anime')) {
    return { bnTitle: 'জনপ্রিয় অ্যানিমে সিরিজ', categoryPath: '/anime', badge: 'ANIME' };
  }
  if (t.includes('horror') || t.includes('frights')) {
    return { bnTitle: 'হরর ও ভৌতিক মুভি', categoryPath: '/genre/horror', badge: 'HORROR' };
  }
  if (t.includes('monster') || t.includes('titan')) {
    return { bnTitle: 'সায়েন্স ফিকশন ও ফ্যান্টাসি', categoryPath: '/genre/sci-fi', badge: 'SCI-FI' };
  }
  if (t.includes('recently added') || t.includes('movie new release')) {
    return { bnTitle: 'সদ্য মুক্তিপ্রাপ্ত নতুন মুভি', categoryPath: '/type/movies', badge: 'NEW MOVIE' };
  }
  if (t.includes('tv series new release')) {
    return { bnTitle: 'নতুন টিভি ও ওয়েব সিরিজ', categoryPath: '/type/series', badge: 'NEW SERIES' };
  }
  if (t.includes('punjabi')) {
    return { bnTitle: 'সেরা পাঞ্জাবি মুভি', categoryPath: '/language/punjabi', badge: 'PUNJABI' };
  }
  if (t.includes('indian drama')) {
    return { bnTitle: 'ইন্ডিয়ান ড্রামা ও সিরিয়াল', categoryPath: '/category/indian-drama', badge: 'INDIAN DRAMA' };
  }
  if (t.includes('arabic')) {
    return { bnTitle: 'আরবি ড্রামা ও সিরিজ', categoryPath: '/category/arabic-drama', badge: 'ARABIC' };
  }
  if (t.includes('ramadan')) {
    return { bnTitle: 'রমজান স্পেশাল ড্রামা', categoryPath: '/category/arabic-drama', badge: 'SPECIAL' };
  }
  return { bnTitle: rawTitle, categoryPath: '/type/movies' };
}

let inFlightTokenPromise: Promise<string> | null = null;

function generateMovieBoxClientToken(): string {
  const ts = Math.floor(Date.now() / 1000);
  const rev = String(ts).split('').reverse().join('');
  const hash = crypto.createHash('md5').update(rev).digest('hex');
  return `${ts},${hash}`;
}

async function getMovieBoxBearerToken(needHomeSections = false): Promise<string> {
  if (
    cachedMovieBoxToken &&
    cachedMovieBoxTokenExpiresAt > Date.now() &&
    (!needHomeSections || (cachedMovieBoxHomeSections.length > 0 && cachedMovieBoxHomeExpiresAt > Date.now()))
  ) {
    return cachedMovieBoxToken;
  }

  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = (async () => {
    try {
      // 1. Obtain official MovieBox JWT token from x-user header via get-latest-app-pkgs with X-Client-Token
      if (!cachedMovieBoxToken || cachedMovieBoxTokenExpiresAt <= Date.now()) {
        const pkgEndpoints = [
          `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/app/get-latest-app-pkgs?appName=moviebox`,
          `${MOVIEBOX_ORIGIN}/wefeed-h5api-bff/app/get-latest-app-pkgs?appName=moviebox`,
        ];
        for (const pkgUrl of pkgEndpoints) {
          try {
            const pkgRes = await fetch(pkgUrl, {
              headers: {
                Accept: 'application/json',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                Referer: 'https://movie-box.co/?utm_source=mb_app_inner_btmtip',
                'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
                'X-Client-Token': generateMovieBoxClientToken(),
                'X-Vip-Restrict': '0',
                'X-No-High-Risk-Restrict': '1',
                'X-Request-Lang': 'en',
              },
              signal: AbortSignal.timeout(2500),
            });
            const xUser = pkgRes.headers.get('x-user') || pkgRes.headers.get('x-user-info');
            if (xUser) {
              const parsed = JSON.parse(xUser);
              if (parsed?.token) {
                cachedMovieBoxToken = String(parsed.token);
                cachedMovieBoxTokenExpiresAt = Date.now() + 2 * 3600_000;
                break;
              }
            }
          } catch {
            // try next endpoint
          }
        }
      }

      // 2. Only fetch SSR operatingList from https://movie-box.co/ when explicitly requested via needHomeSections!
      const shouldFetchSsr =
        needHomeSections && (cachedMovieBoxHomeSections.length === 0 || cachedMovieBoxHomeExpiresAt <= Date.now());
      const ssrPromise = shouldFetchSsr
        ? fetch(`${MOVIEBOX_ORIGIN}/`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8,hi;q=0.7',
            },
            signal: AbortSignal.timeout(3800),
          })
            .then((r) => (r.ok ? r.text() : ''))
            .then((html) => (html ? extractMovieBoxNuxtOperatingList(html) : []))
            .catch(() => [])
        : Promise.resolve([]);

      let bffOps: any[] = [];
      if (shouldFetchSsr) {
        const homeEndpoints = [
          `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/home?host=movie-box.co`,
          `${MOVIEBOX_ORIGIN}/wefeed-h5api-bff/home?host=movie-box.co`,
        ];
        for (const endpoint of homeEndpoints) {
          try {
            const headers: Record<string, string> = {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              Accept: 'application/json',
              Referer: 'https://movie-box.co/?utm_source=mb_app_inner_btmtip',
              'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
              'X-Vip-Restrict': '0',
              'X-No-High-Risk-Restrict': '1',
              'X-Request-Lang': 'en',
            };
            if (cachedMovieBoxToken) {
              headers.Authorization = `Bearer ${cachedMovieBoxToken}`;
            } else {
              headers['X-Client-Token'] = generateMovieBoxClientToken();
            }
            const res = await fetch(endpoint, {
              headers,
              signal: AbortSignal.timeout(3000),
            });
            const xUser = res.headers.get('x-user') || res.headers.get('x-user-info');
            if (xUser) {
              try {
                const parsed = JSON.parse(xUser);
                if (parsed?.token) {
                  cachedMovieBoxToken = String(parsed.token);
                  cachedMovieBoxTokenExpiresAt = Date.now() + 2 * 3600_000;
                }
              } catch {
                // ignore
              }
            }
            if (res.ok) {
              const json = (await res.json().catch(() => null)) as any;
              const ops = Array.isArray(json?.data?.operatingList) ? json.data.operatingList : [];
              if (ops.length > 0) {
                bffOps = ops;
                break;
              }
            }
          } catch {
            // try next MovieBox gateway
          }
        }
      }

      if (!cachedMovieBoxTokenExpiresAt || cachedMovieBoxTokenExpiresAt <= Date.now()) {
        cachedMovieBoxTokenExpiresAt = Date.now() + 15 * 60_000;
      }

      const ssrOps = await ssrPromise;
      const combinedOps = [...ssrOps, ...bffOps];
      if (combinedOps.length > 0) {
        const seenTitles = new Set<string>();
        const sections: Array<{ title: string; type: string; subjects: any[] }> = [];
        for (const op of combinedOps) {
          const title = String(op?.title || '').trim();
          const type = String(op?.type || '').trim();
          const subjects = Array.isArray(op?.subjects)
            ? op.subjects
            : Array.isArray(op?.banner?.items)
              ? op.banner.items
              : [];
          if (!subjects.length) continue;
          const key = `${type}::${title.toLowerCase()}`;
          if (seenTitles.has(key)) continue;
          seenTitles.add(key);
          sections.push({ title, type, subjects });
        }
        if (sections.length > 0) {
          cachedMovieBoxHomeSections = sections;
          cachedMovieBoxHomeExpiresAt = Date.now() + 300_000;
        }
      }

      return cachedMovieBoxToken;
    } finally {
      inFlightTokenPromise = null;
    }
  })();

  return inFlightTokenPromise;
}

async function fetchMovieBoxHomePayload(): Promise<MovieBoxHomePayload> {
  if (cachedMovieBoxHomePayload && cachedMovieBoxHomePayloadExpiresAt > Date.now()) {
    return cachedMovieBoxHomePayload;
  }
  // Stale-While-Revalidate: return warm cached shelves in 0ms while refreshing silently in background!
  if (cachedMovieBoxHomePayload) {
    if (!inFlightMovieBoxHomePromise) {
      void (async () => {
        try {
          cachedMovieBoxHomePayloadExpiresAt = Date.now() + 30_000;
          await fetchMovieBoxHomePayloadFresh();
        } catch {
          // ignore
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

async function fetchMovieBoxHomePayloadFresh(): Promise<MovieBoxHomePayload> {
  if (inFlightMovieBoxHomePromise) {
    return inFlightMovieBoxHomePromise;
  }

  const task = (async (): Promise<MovieBoxHomePayload> => {
    try {
      const [ssrHtml] = await Promise.all([
        fetch(`${MOVIEBOX_ORIGIN}/`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8,hi;q=0.7',
          },
          signal: AbortSignal.timeout(5500),
        })
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => ''),
        getMovieBoxBearerToken().catch(() => ''),
      ]);

      const ssrOps = ssrHtml ? extractMovieBoxNuxtOperatingList(ssrHtml) : [];
      const banners: MovieCardItem[] = [];
      const seenBannerIds = new Set<string>();
      const comingSoon: MovieBoxComingSoonItem[] = [];
      const seenComingIds = new Set<string>();
      const shelves: MovieBoxHomeShelf[] = [];
      const seenShelfIds = new Set<string>();

      const defaultQuickCategories: MovieBoxQuickCategory[] = [
        {
          id: 'qc-hollywood',
          title: 'Hollywood',
          bnTitle: 'হলিউড মুভি',
          image: 'https://pbcdnw.aoneroom.com/image/2025/01/13/683063a45b61be3be1f9d7ef9b2d3072.png',
          path: '/language/english',
        },
        {
          id: 'qc-bollywood',
          title: 'Bollywood',
          bnTitle: 'বলিউড হিন্দি',
          image: 'https://pbcdnw.aoneroom.com/image/2025/01/13/95be398605ce21b60efbe7e7a5bf9fc2.png',
          path: '/bollywood',
        },
        {
          id: 'qc-bengali',
          title: 'Bengali Movies',
          bnTitle: 'বাংলা মুভি ও নাটক',
          image: 'https://pub-69b6234af505413bbeac2bbc8039195c.r2.dev/poster_4g8viv1792499980.jpg',
          path: '/language/bangla',
        },
        {
          id: 'qc-south',
          title: 'South Indian',
          bnTitle: 'সাউথ ইন্ডিয়ান',
          image: 'https://pub-69b6234af505413bbeac2bbc8039195c.r2.dev/poster_06g5z71792073020.jpg',
          path: '/southIndian',
        },
        {
          id: 'qc-kdrama',
          title: 'K-Drama',
          bnTitle: 'কোরিয়ান ড্রামা',
          image: 'https://pbcdnw.aoneroom.com/image/2025/01/13/1e5ef9bffd0b731d7eb4ef2c96ef7c77.png',
          path: '/drama',
        },
        {
          id: 'qc-western',
          title: 'Western TV',
          bnTitle: 'ওয়েস্টার্ন টিভি',
          image: 'https://pbcdnw.aoneroom.com/image/2025/01/13/3f4884c8e0f1fd7c92a4bf2c4a6b5e81.png',
          path: '/category/western-tv',
        },
        {
          id: 'qc-anime',
          title: 'Anime in Hindi',
          bnTitle: 'হিন্দি ও জাপানিজ অ্যানিমে',
          image: 'https://image.tmdb.org/t/p/original/n8rforZjHAB9uxqbwy7g6EdertA.jpg',
          path: '/category/anime-hindi',
        },
      ];

      const liveSports: MovieBoxLiveSportItem[] = [];

      for (const op of ssrOps) {
        const opType = String(op?.type || '').trim();
        const opTitle = String(op?.title || '').trim();

        if (opType === 'BANNER' && Array.isArray(op?.banner?.items)) {
          for (let idx = 0; idx < op.banner.items.length; idx++) {
            const raw = op.banner.items[idx];
            const rawSubj = raw?.subject || raw;
            const sid = String(rawSubj?.subjectId || raw?.subjectId || '').trim();
            if (!sid || seenBannerIds.has(sid)) continue;
            seenBannerIds.add(sid);
            const card = mapMovieBoxItemToCard(
              {
                ...rawSubj,
                subjectId: sid,
                title: rawSubj?.title || raw?.title,
                detailPath: rawSubj?.detailPath || raw?.detailPath,
                cover: raw?.image || rawSubj?.cover,
              },
              idx
            );
            if (card) banners.push(card);
          }
        } else if (opType === 'SPORT_LIVE' && (Array.isArray(op?.liveList) || opTitle)) {
          const liveArr = Array.isArray(op?.liveList) ? op.liveList : [];
          if (liveArr.length > 0) {
            for (const m of liveArr.slice(0, 10)) {
              const t1 = m?.team1?.name || 'Team A';
              const t2 = m?.team2?.name || 'Team B';
              const s1 = m?.team1?.score ?? '0';
              const s2 = m?.team2?.score ?? '0';
              const sportRaw = String(m?.team1?.type || opTitle || 'football').toLowerCase();
              const sportType: MovieBoxLiveSportItem['sportType'] = sportRaw.includes('cricket')
                ? 'cricket'
                : sportRaw.includes('basket')
                  ? 'basketball'
                  : sportRaw.includes('wwe')
                    ? 'wwe'
                    : 'football';
              liveSports.push({
                id: String(m?.matchId || `${t1}-${t2}`),
                title: `${t1} vs ${t2}`,
                bnTitle: `${t1} (${s1}) vs ${t2} (${s2})`,
                subtitle: `${opTitle || 'Live Match'} • ${s1} - ${s2}`,
                sportType,
                liveUrl: String(op?.url || 'https://sportsnow.top/live?tab=live&sportType=football'),
                categoryPath: '/',
                badge: 'LIVE',
                accentColor: '#e50914',
              });
            }
          } else {
            liveSports.push({
              id: String(op?.opId || `sport-${liveSports.length}`),
              title: opTitle || 'Football Live',
              bnTitle: `${opTitle || 'লাইভ স্পোর্টস'} (Live)`,
              subtitle: 'MovieBox Official Live Sports',
              sportType: /cricket/i.test(opTitle) ? 'cricket' : 'football',
              liveUrl: String(op?.url || 'https://sportsnow.top/live?tab=live&sportType=football'),
              categoryPath: '/',
              badge: 'LIVE',
              accentColor: '#e50914',
            });
          }
        } else if (opType === 'APPOINTMENT_LIST' && Array.isArray(op?.subjects)) {
          for (const raw of op.subjects) {
            const sid = String(raw?.subjectId || '').trim();
            const title = String(raw?.title || '').trim();
            const poster = String(raw?.cover?.url || '').trim();
            if (!sid || !title || !poster || seenComingIds.has(sid)) continue;
            seenComingIds.add(sid);
            const detailSlug = String(raw?.detailPath || title)
              .toLowerCase()
              .replace(/[^a-z0-9-]+/g, '-')
              .replace(/^-+|-+$/g, '');
            const releaseDate = String(raw?.releaseDate || raw?.appointmentDate || '').trim();
            let releaseBadge = releaseDate;
            if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
              const dt = new Date(`${releaseDate}T00:00:00Z`);
              if (!isNaN(dt.getTime())) {
                releaseBadge = dt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                });
              }
            }
            comingSoon.push({
              id: `mb_coming_${sid}`,
              title,
              releaseDate,
              releaseBadge: releaseBadge || 'Coming Soon',
              bookedCount: Number(raw?.appointmentCnt) || 120,
              poster,
              path: `/mb/${sid}/${detailSlug || 'movie'}`,
              genre: String(raw?.genre || 'Action, Drama'),
              country: String(raw?.countryName || ''),
            });
          }
        } else if (opType === 'SUBJECTS_MOVIE' && Array.isArray(op?.subjects) && opTitle) {
          const shelfKey = opTitle.toLowerCase().replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
          if (
            seenShelfIds.has(shelfKey) ||
            /nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|bl\s*series|girls\s*love|sport|football|cricket|mango|manga/i.test(
              opTitle.toLowerCase()
            )
          ) {
            continue;
          }
          const cards: MovieCardItem[] = [];
          const seenCardIds = new Set<string>();
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
              id: `mb-shelf-${shelfKey.replace(/[^a-z0-9]+/g, '-')}`,
              title: opTitle,
              bnTitle: meta.bnTitle,
              categoryPath: meta.categoryPath,
              badge: meta.badge,
              items: cards.slice(0, 18),
            });
          }
        }
      }

      // Supplement comingSoon from cachedMovieBoxHomeSections whenever SSR HTML omitted APPOINTMENT_LIST
      if (comingSoon.length === 0 && cachedMovieBoxHomeSections.length > 0) {
        for (const sec of cachedMovieBoxHomeSections) {
          if (sec.type === 'APPOINTMENT_LIST' && Array.isArray(sec.subjects)) {
            for (const raw of sec.subjects) {
              const sid = String(raw?.subjectId || '').trim();
              const t = String(raw?.title || '').trim();
              const p = String(raw?.cover?.url || '').trim();
              if (!sid || !t || !p || seenComingIds.has(sid)) continue;
              seenComingIds.add(sid);
              const detailSlug = String(raw?.detailPath || t).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
              const rd = String(raw?.releaseDate || raw?.appointmentDate || '').trim();
              comingSoon.push({
                id: `mb_coming_${sid}`,
                title: t,
                releaseDate: rd,
                releaseBadge: rd || 'Coming Soon',
                bookedCount: Number(raw?.appointmentCnt) || 120,
                poster: p,
                path: `/mb/${sid}/${detailSlug || 'movie'}`,
                genre: String(raw?.genre || 'Action, Drama'),
                country: String(raw?.countryName || ''),
              });
            }
          }
        }
      }

      // If SSR shelves missed any sections, supplement from cachedMovieBoxHomeSections
      if (shelves.length === 0 && cachedMovieBoxHomeSections.length > 0) {
        for (const sec of cachedMovieBoxHomeSections) {
          if (sec.type !== 'SUBJECTS_MOVIE' || !sec.title) continue;
          const shelfKey = sec.title.toLowerCase();
          if (
            seenShelfIds.has(shelfKey) ||
            /nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|sport|football|cricket|mango|manga/i.test(
              shelfKey
            )
          ) {
            continue;
          }
          const cards: MovieCardItem[] = [];
          for (let idx = 0; idx < sec.subjects.length; idx++) {
            const card = mapMovieBoxItemToCard(sec.subjects[idx], idx);
            if (card) cards.push(card);
          }
          if (cards.length > 0) {
            seenShelfIds.add(shelfKey);
            const meta = mapMovieBoxShelfTitleToMeta(sec.title);
            shelves.push({
              id: `mb-shelf-${shelfKey.replace(/[^a-z0-9]+/g, '-')}`,
              title: sec.title,
              bnTitle: meta.bnTitle,
              categoryPath: meta.categoryPath,
              badge: meta.badge,
              items: cards.slice(0, 18),
            });
          }
        }
      }

      // Always guarantee South Asian & Bengali shelves from MovieBox's direct catalog API regardless of server Geo-IP!
      const regionalCuratedSpecs = [
        {
          key: 'trending bengali movies',
          title: 'Trending Bengali Movies',
          bnTitle: 'ট্রেন্ডিং বাংলা মুভি ও নাটক',
          categoryPath: '/language/bangla',
          badge: 'BANGLA HIT',
          path: '/language/bangla',
        },
        {
          key: 'bollywood movie',
          title: 'Bollywood Movie',
          bnTitle: 'বলিউড ও ইন্ডিয়ান সিনেমা',
          categoryPath: '/bollywood',
          badge: 'BOLLYWOOD',
          path: '/bollywood',
        },
        {
          key: 'south indian movie',
          title: 'South Indian & Hindi Dubbed',
          bnTitle: 'সাউথ ইন্ডিয়ান ও হিন্দি ডাবিং',
          categoryPath: '/southIndian',
          badge: 'SOUTH DUB',
          path: '/southIndian',
        },
        {
          key: 'anime in hindi',
          title: 'Anime in Hindi',
          bnTitle: 'হিন্দি ডাবিং অ্যানিমে',
          categoryPath: '/category/anime-hindi',
          badge: 'HINDI ANIME',
          path: '/category/anime-hindi',
        },
      ];

      const missingRegional = regionalCuratedSpecs.filter((sp) => !seenShelfIds.has(sp.key));
      if (missingRegional.length > 0) {
        const regSettled = await Promise.allSettled(
          missingRegional.map((sp) => fetchMovieBoxCatalog(sp.path, 1, ''))
        );
        for (let i = 0; i < missingRegional.length; i++) {
          const sp = missingRegional[i];
          const r = regSettled[i];
          if (r.status === 'fulfilled' && r.value.items.length > 0) {
            seenShelfIds.add(sp.key);
            shelves.push({
              id: `mb-shelf-${sp.key.replace(/[^a-z0-9]+/g, '-')}`,
              title: sp.title,
              bnTitle: sp.bnTitle,
              categoryPath: sp.categoryPath,
              badge: sp.badge,
              items: r.value.items.slice(0, 18),
            });
            // Append top South Asian / Bengali hits after official MovieBox wide banners
            for (const bCard of r.value.items.slice(0, 2)) {
              if (!seenBannerIds.has(bCard.id)) {
                seenBannerIds.add(bCard.id);
                banners.push(bCard);
              }
            }
          }
        }
      }

      // Prioritize South Asian & Bengali shelves near the top for our users while keeping MovieBox's authentic order
      const priorityOrder = [
        'trending bengali movies',
        'bollywood movie',
        'south indian',
        'trending in indian cinema',
        'trending drama',
        'popular series',
        'trending movie',
        'popular movie',
        'hollywood movie',
        '🔥hot short tv',
        'k-drama',
        'asian drama',
        'anime in hindi',
        'anime',
        'western tv',
        'action',
      ];
      shelves.sort((a, b) => {
        const ia = priorityOrder.findIndex((k) => a.title.toLowerCase().includes(k));
        const ib = priorityOrder.findIndex((k) => b.title.toLowerCase().includes(k));
        const sa = ia === -1 ? 999 : ia;
        const sb = ib === -1 ? 999 : ib;
        return sa - sb;
      });

      const payload: MovieBoxHomePayload = {
        ok: true,
        banners: banners.slice(0, 12),
        liveSports,
        quickCategories: defaultQuickCategories,
        comingSoon: comingSoon.slice(0, 18),
        sections: shelves,
      };
      if (shelves.length > 0) {
        cachedMovieBoxHomePayload = payload;
        cachedMovieBoxHomePayloadExpiresAt = Date.now() + 600_000;
      }
      return payload;
    } finally {
      inFlightMovieBoxHomePromise = null;
    }
  })();

  inFlightMovieBoxHomePromise = task;
  return task;
}

function getMovieBoxHomeOperatingSubjects(rawPath: string): any[] {
  if (!cachedMovieBoxHomeSections.length) return [];
  const p = (rawPath || '/').toLowerCase().replace(/\/page\/\d+\/?$/, '').replace(/\/+$/, '') || '/';
  const matched: any[] = [];

  for (const sec of cachedMovieBoxHomeSections) {
    const t = sec.title.toLowerCase();
    if (/nollywood|black\s*shows|bet\+|banner_africa|bl\s*story|bl\s*series|girls\s*love|sport|football|cricket|mango|manga/i.test(t)) {
      continue;
    }
    const isMatch =
      p === '/' ||
      p === '/hot-dhamaka' ||
      (p === '/category/trending-drama' && t.includes('trending drama')) ||
      (p === '/category/indian-cinema' && (t.includes('indian cinema') || t.includes('trending india'))) ||
      (p === '/category/short-tv' && (t.includes('short tv') || t.includes('shorttv'))) ||
      (p === '/category/western-tv' && t.includes('western tv')) ||
      (p === '/category/anime-hindi' && t.includes('anime in hindi')) ||
      (p === '/category/indian-drama' && t.includes('indian drama')) ||
      (p === '/category/arabic-drama' && (t.includes('arabic') || t.includes('ramadan'))) ||
      ((p === '/language/bangla' || p.includes('bengali')) && t.includes('bengali')) ||
      (p === '/bollywood' && t.includes('bollywood')) ||
      (p === '/southindian' && t.includes('south indian')) ||
      (p === '/language/punjabi' && t.includes('punjabi')) ||
      (p === '/language/english' && (t.includes('hollywood') || t.includes('trending western'))) ||
      (p === '/anime' && (t.includes('animeverse') || t.includes('popular anime'))) ||
      (p === '/genre/animation' && t.includes('animated film')) ||
      ((p === '/drama' || p === '/language/korean') && (t.includes('k-drama') || t.includes('asian drama'))) ||
      (p === '/language/chinese' && t.includes('c-drama')) ||
      (p === '/genre/horror' && (t.includes('horror') || t.includes('frights')));

    if (isMatch) {
      matched.push(...sec.subjects);
    }
  }
  return matched;
}

function mapCategoryToMovieBoxFilter(rawPath: string, page = 1): Record<string, any> {
  const p = (rawPath || '/').toLowerCase().replace(/\/page\/\d+\/?$/, '').replace(/\/+$/, '') || '/';
  const payload: Record<string, any> = {
    page,
    perPage: 28,
    channelId: 1, // Default: Movies
    sort: 'Hottest',
  };

  if (p === '/' || p === '/hot-dhamaka' || p === '/mostwatch/7d' || p === '/ranking-list') {
    payload.channelId = 1;
    payload.sort = 'Hottest';
  } else if (p === '/type/movies' || p === '/movies' || p === '/web/movie') {
    payload.channelId = 1;
    payload.sort = 'Latest';
  } else if (p === '/type/series' || p === '/ongoing' || p === '/web/tv-series') {
    payload.channelId = 2;
    payload.sort = p === '/ongoing' ? 'Latest' : 'Hottest';
  } else if (p === '/web/animated-series') {
    payload.channelId = 1006;
    payload.sort = 'Hottest';
  } else if (p === '/new-uploads' || p === '/new-releases' || p === '/upcoming') {
    payload.channelId = 1;
    payload.sort = 'Latest';
  } else if (p === '/collection/bangla-web-series') {
    payload.channelId = 2;
    payload.country = 'Bangladesh';
    payload.sort = 'Hottest';
  } else if (p === '/collection/top-rated-hindi-dubbed-action') {
    payload.channelId = 1;
    payload.classify = 'Hindi dub';
    payload.genre = 'Action';
    payload.sort = 'Hottest';
  } else if (p === '/collection/korean-drama-must-watch') {
    payload.channelId = 2;
    payload.country = 'Korea';
    payload.sort = 'Hottest';
  } else if (p === '/category/trending-drama') {
    payload.channelId = 2;
    payload.sort = 'Hottest';
  } else if (p === '/category/indian-cinema') {
    payload.channelId = 1;
    payload.country = 'India';
    payload.sort = 'Hottest';
  } else if (p === '/category/short-tv') {
    payload.channelId = 7; // Dedicated ShortTV channel in MovieBox
    payload.sort = 'Hottest';
  } else if (p === '/category/western-tv') {
    payload.channelId = 2;
    payload.country = 'United States';
    payload.sort = 'Hottest';
  } else if (p === '/category/anime-hindi') {
    payload.channelId = 2;
    payload.genre = 'Anime';
    payload.classify = 'Hindi dub';
    payload.sort = 'Hottest';
  } else if (p === '/category/indian-drama') {
    payload.channelId = 2;
    payload.country = 'India';
    payload.sort = 'Hottest';
  } else if (p === '/category/arabic-drama') {
    payload.channelId = 2;
    payload.country = 'Egypt';
    payload.sort = 'Hottest';
  } else if (p === '/anime') {
    payload.channelId = 2;
    payload.genre = 'Anime';
    payload.sort = 'Hottest';
  } else if (p.includes('animation') || p.includes('family')) {
    payload.channelId = 1006;
    payload.sort = 'Hottest';
  } else if (p.includes('bangla-dubbed')) {
    payload.channelId = 1;
    payload.classify = 'Bengali dub';
  } else if (p.includes('bangla')) {
    payload.channelId = p.includes('series') || p.includes('natok') ? 2 : 1;
    payload.country = 'Bangladesh';
  } else if (p.includes('drama') || p.includes('korean')) {
    payload.channelId = 2;
    payload.country = 'Korea';
    payload.sort = 'Hottest';
  } else if (p.includes('chinese')) {
    payload.channelId = 2;
    payload.country = 'China';
  } else if (p.includes('japanese')) {
    payload.channelId = 2;
    payload.country = 'Japan';
  } else if (p.includes('turkish')) {
    payload.channelId = 2;
    payload.country = 'Turkey';
  } else if (p.includes('hindi-dubbed') || p.includes('dual-audio')) {
    payload.channelId = 1;
    payload.classify = 'Hindi dub';
  } else if (p.includes('south')) {
    payload.channelId = 1;
    payload.country = 'India';
    payload.classify = 'Hindi dub';
    payload.sort = 'Hottest';
  } else if (p.includes('bollywood') || p.includes('hindi')) {
    payload.channelId = 1;
    payload.country = 'India';
    payload.sort = 'Latest';
  } else if (p.includes('tamil') || p.includes('telugu') || p.includes('malayalam') || p.includes('kannada') || p.includes('punjabi') || p.includes('gujrati') || p.includes('marathi')) {
    payload.channelId = 1;
    payload.country = 'India';
  } else if (p.includes('english') || p.includes('hollywood') || p.includes('mcu') || p.includes('dc-universe')) {
    payload.channelId = 1;
    payload.country = 'United States';
  } else if (p.includes('indonesian')) {
    payload.channelId = 1;
    payload.country = 'Indonesia';
  } else if (p.includes('spanish')) {
    payload.channelId = 1;
    payload.country = 'Spain';
  } else if (p.includes('french')) {
    payload.channelId = 1;
    payload.country = 'France';
  } else if (p.includes('italian')) {
    payload.channelId = 1;
    payload.country = 'Italy';
  } else if (p.includes('malaysian')) {
    payload.channelId = 1;
    payload.country = 'Malaysia';
  } else if (p.includes('adult18plus') || p.includes('18plus') || p === '/genre/adult' || p === '/web/midnight') {
    payload.channelId = 1;
    payload.genre = 'Adult';
    payload.sort = 'Hottest';
  } else if (p === '/genre/erotic') {
    payload.channelId = 1;
    payload.genre = 'Erotic';
    payload.sort = 'Hottest';
  } else if (p.includes('action') || p.includes('superhero')) {
    payload.channelId = 1;
    payload.genre = 'Action';
  } else if (p.includes('thriller') || p.includes('suspense') || p.includes('survival')) {
    payload.channelId = 1;
    payload.genre = 'Thriller';
  } else if (p.includes('horror')) {
    payload.channelId = 1;
    payload.genre = 'Horror';
  } else if (p.includes('romance')) {
    payload.channelId = 1;
    payload.genre = 'Romance';
  } else if (p.includes('comedy')) {
    payload.channelId = 1;
    payload.genre = 'Comedy';
  } else if (p.includes('crime')) {
    payload.channelId = 1;
    payload.genre = 'Crime';
  } else if (p.includes('sci-fi')) {
    payload.channelId = 1;
    payload.genre = 'Sci-Fi';
  } else if (p.includes('adventure')) {
    payload.channelId = 1;
    payload.genre = 'Adventure';
  } else if (p.includes('fantasy')) {
    payload.channelId = 1;
    payload.genre = 'Fantasy';
  } else if (p.includes('mystery')) {
    payload.channelId = 1;
    payload.genre = 'Mystery';
  } else if (p.includes('historical')) {
    payload.channelId = 1;
    payload.genre = 'History';
  } else if (p.includes('war')) {
    payload.channelId = 1;
    payload.genre = 'War';
  } else if (p.includes('documentary')) {
    payload.channelId = 1;
    payload.genre = 'Documentary';
  } else if (p.includes('biographical')) {
    payload.channelId = 1;
    payload.genre = 'Biography';
  } else if (p.includes('music')) {
    payload.channelId = 1;
    payload.genre = 'Music';
  }

  return payload;
}

function mapMovieBoxItemToCard(raw: any, index = 0): MovieCardItem | null {
  if (!raw || !raw.subjectId || !raw.title) return null;
  if (Number(raw.subjectType) === 9) return null; // Exclude Sports clips
  const subjectId = String(raw.subjectId).trim();
  const detailSlug = raw.detailPath
    ? String(raw.detailPath).trim()
    : String(raw.title)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
  const itemPath = `/mb/${subjectId}/${detailSlug || 'movie'}`;
  const rawTitle = String(raw.title).trim();
  const year = raw.releaseDate ? String(raw.releaseDate).split('-')[0] : '';
  const hasYearInTitle = /\b(19|20)\d{2}\b/.test(rawTitle);
  const displayTitle = year && !hasYearInTitle ? `${rawTitle} (${year})` : rawTitle;

  const poster = String(
    raw.cover?.url || raw.image?.url || raw.stills?.url || raw.thumbnail || ''
  ).trim();
  if (!poster) return null;

  const ratingVal = parseFloat(String(raw.imdbRatingValue || raw.imdbRate || '8.2')) || 8.2;
  const subjectType = Number(raw.subjectType) || 1;
  const genreStr = String(raw.genre || '').toUpperCase();
  const countryStr = String(raw.countryName || '').toUpperCase();
  const cornerStr = String(raw.corner || '').trim().toUpperCase();

  let typeBadge: 'MOVIE' | 'SERIES' | 'ANIME' | 'DRAMA' = 'MOVIE';
  if (subjectType === 1006 || genreStr.includes('ANIME') || genreStr.includes('ANIMATION') || (countryStr === 'JAPAN' && subjectType === 2)) {
    typeBadge = subjectType === 2 ? 'ANIME' : 'MOVIE';
  } else if (subjectType === 7) {
    typeBadge = 'DRAMA';
  } else if (subjectType === 2) {
    if (countryStr.includes('KOREA') || countryStr.includes('CHINA') || countryStr.includes('TURKEY')) {
      typeBadge = 'DRAMA';
    } else {
      typeBadge = 'SERIES';
    }
  }

  const dubsList = Array.isArray(raw.dubs)
    ? raw.dubs.map((d: any) => String(d?.lanName || d || '')).filter(Boolean)
    : [];
  const subsStr = String(raw.subtitles || '');
  let language = 'ENGLISH';
  if (cornerStr.includes('BENGALI') || cornerStr.includes('BANGLA') || /\[(bengali|bangla)\]/i.test(rawTitle)) {
    language = /dub/i.test(rawTitle) || (!countryStr.includes('BANGLADESH') && !countryStr.includes('INDIA'))
      ? 'BANGLA DUBBED'
      : 'BANGLA';
  } else if (cornerStr.includes('HINDI') || /\[hindi\]/i.test(rawTitle)) {
    language = !countryStr.includes('INDIA') ? 'HINDI DUBBED' : 'HINDI';
  } else if (cornerStr) {
    language = cornerStr;
  } else if (dubsList.length > 0) {
    language = dubsList[0].toUpperCase();
  } else if (subsStr.includes('বাংলা') || countryStr.includes('BANGLADESH')) {
    language = countryStr.includes('BANGLADESH') ? 'BANGLA' : 'BANGLA SUB';
  } else if (countryStr.includes('INDIA')) {
    language = 'HINDI';
  } else if (countryStr.includes('KOREA')) {
    language = 'KOREAN';
  } else if (countryStr.includes('CHINA')) {
    language = 'CHINESE';
  } else if (countryStr.includes('JAPAN')) {
    language = 'JAPANESE';
  }

  const episodePill =
    subjectType === 7
      ? 'SHORT TV'
      : subjectType === 2
        ? /\bS\d+/i.test(rawTitle)
          ? rawTitle.match(/\bS\d+(?:-S?\d+)?/i)?.[0]?.toUpperCase() || 'SERIES'
          : 'FULL SERIES'
        : '';

  const releaseYearNum = parseInt(year, 10) || 0;
  const releaseEpochMs = raw.releaseDate ? Date.parse(String(raw.releaseDate)) : NaN;
  const nowMs = Date.now();

  let hash = 2166136261 >>> 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash ^= subjectId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  // Extract real CDN upload date from MovieBox poster URL: e.g. /image/2026/11/01/...
  const cdnDateMatch = poster.match(/\/image\/(\d{4})\/(\d{2})\/(\d{2})\//);
  const cdnDateStr = cdnDateMatch ? `${cdnDateMatch[1]}-${cdnDateMatch[2]}-${cdnDateMatch[3]}` : '';
  const cdnEpochMs = cdnDateStr ? Date.parse(`${cdnDateStr}T12:00:00Z`) : NaN;
  const isTodayOrYesterdayCdn =
    !isNaN(cdnEpochMs) && nowMs - cdnEpochMs <= 48 * 3600_000 && cdnEpochMs <= nowMs + 24 * 3600_000;

  let timeAgoLabel = year || 'HD Release';
  let uploadedAtMs = !isNaN(releaseEpochMs) && releaseEpochMs <= nowMs ? releaseEpochMs : 0;

  if (isTodayOrYesterdayCdn && releaseYearNum >= 2025) {
    // Uploaded to MovieBox CDN today or yesterday!
    const minsAgo = 12 + (hash % 380); // 12 mins to 6.5 hours ago
    timeAgoLabel =
      minsAgo < 60 ? `${minsAgo} mins ago` : `${Math.floor(minsAgo / 60)} hours ago`;
    uploadedAtMs = nowMs - minsAgo * 60_000;
  } else if (releaseYearNum >= 2025) {
    const spreadHours = 2 + (hash % 21);
    const spreadMins = spreadHours * 60 + ((hash >>> 8) % 53);
    timeAgoLabel = `${spreadHours} hours ago`;
    uploadedAtMs = nowMs - spreadMins * 60_000;
  } else if (!uploadedAtMs && releaseYearNum > 1900) {
    uploadedAtMs = new Date(`${releaseYearNum}-06-15T00:00:00Z`).getTime();
  }

  const previewImage = String(
    raw.trailer?.cover?.url || raw.stills?.url || raw.cover?.url || poster
  ).trim();
  const description = String(raw.description || '').trim();
  const country = String(raw.countryName || '').trim();
  const sportGenre = String(raw.genre || '').trim();

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
    quality: '1080p FHD',
    views: `★ ${ratingVal.toFixed(1)}`,
    rating: ratingVal.toFixed(1),
    language,
    typeBadge,
    timeAgo: timeAgoLabel,
    episodePill,
    isPinned: releaseYearNum >= 2025 && (isTodayOrYesterdayCdn || ratingVal >= 8.0),
    isAdult: Boolean(raw.isPornographic),
    uploadedAtMs,
  };
}

const mbSearchCache = new Map<string, { items: MovieCardItem[]; expiresAt: number }>();
const inFlightMbSearch = new Map<string, Promise<MovieCardItem[]>>();

function transliterateSearchKeyword(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed || !/[\u0980-\u09FF]/.test(trimmed)) return trimmed;

  const phraseMap: Array<[RegExp, string]> = [
    [/গোপাল\s*ভাঁড়|গোপাল\s*ভার|গোপাল/gi, 'Gopal'],
    [/গোলমাল/gi, 'Golmaal'],
    [/তুফান/gi, 'Toofan'],
    [/বহুরূপী/gi, 'Bohurupi'],
    [/বরবাদ/gi, 'Borbaad'],
    [/দাগি/gi, 'Daagi'],
    [/চক্কর/gi, 'Chokkor'],
    [/জংলি/gi, 'Jongli'],
    [/সুড়ঙ্গ|সুরঙ্গ/gi, 'Surongo'],
    [/প্রিয়তমা|প্রিয়তমা/gi, 'Priyotoma'],
    [/হাওয়া|হাওয়া/gi, 'Hawa'],
    [/পরাণ|পরান/gi, 'Poran'],
    [/মির্জাপুর/gi, 'Mirzapur'],
    [/পুষ্পা/gi, 'Pushpa'],
    [/স্কুইড\s*গেম/gi, 'Squid Game'],
    [/ওয়ান\s*পিস|ওয়ান\s*পিস/gi, 'One Piece'],
    [/নারুতো|নারুটো/gi, 'Naruto'],
    [/সোলো\s*লেভেলিং/gi, 'Solo Leveling'],
    [/ডেমন\s*স্লেয়ার|ডেমন\s*স্লেয়ার/gi, 'Demon Slayer'],
    [/ড্রাগন\s*বল/gi, 'Dragon Ball'],
    [/ব্ল্যাক\s*ক্লোভার/gi, 'Black Clover'],
    [/জুজুৎসু/gi, 'Jujutsu Kaisen'],
    [/অ্যানিমে|এনিমে/gi, 'Anime'],
    [/হিন্দি/gi, 'Hindi'],
    [/বাংলা/gi, 'Bengali'],
    [/নাটক/gi, 'Natok'],
    [/মুভি|সিনেমা/gi, 'Movie'],
    [/সিরিজ/gi, 'Series'],
  ];

  let out = trimmed;
  for (const [rx, rep] of phraseMap) {
    out = out.replace(rx, ` ${rep} `);
  }

  if (/[\u0980-\u09FF]/.test(out)) {
    const charMap: Record<string, string> = {
      'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
      'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
      'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
      'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
      'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
      'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
      'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
      'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': '',
      'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
      'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', '্': '', '়': '',
    };
    out = Array.from(out)
      .map((ch) => (charMap[ch] !== undefined ? charMap[ch] : ch))
      .join('');
  }

  return out.replace(/\s{2,}/g, ' ').trim() || trimmed;
}

async function fetchMovieBoxCatalog(
  rawPath: string,
  page = 1,
  search = ''
): Promise<{ items: MovieCardItem[]; maxPage: number }> {
  if (!cachedMovieBoxToken || cachedMovieBoxTokenExpiresAt <= Date.now()) {
    await getMovieBoxBearerToken(false).catch(() => {});
  }
  const token = cachedMovieBoxToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    'X-Vip-Restrict': '0',
    'X-No-High-Risk-Restrict': '1',
    'X-Request-Lang': 'en',
    Referer: 'https://movie-box.co/?utm_source=mb_app_inner_btmtip',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Client-Token'] = generateMovieBoxClientToken();
  }

  const normalizedRawPath = (rawPath || '/').toLowerCase();
  if (!search) {
    if (normalizedRawPath.includes('mcu-marvel')) {
      search = 'Avengers';
    } else if (normalizedRawPath.includes('dc-universe')) {
      search = 'Batman';
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

    const searchPromise = (async (): Promise<MovieCardItem[]> => {
      const searchEndpoints = [
        `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`,
        `${MOVIEBOX_API_ORIGIN}/wefeed-h5api-bff/subject/search`,
      ];
      const southAsiaHeaders: Record<string, string> = {
        ...headers,
        'X-Forwarded-For': '103.108.140.10',
        'X-Real-IP': '103.108.140.10',
        'X-Client-Info': JSON.stringify({ timezone: 'Asia/Kolkata' }),
        'Accept-Language': 'en-IN,en-US;q=0.9,hi;q=0.8,bn;q=0.7',
      };
      const wantHindiCompanion = page === 1 && !/hindi|bangla|bengali/i.test(cleanQ);
      const qLower = cleanQ.toLowerCase();
      const qWords = qLower.split(/\s+/).filter((w) => w.length >= 2);
      const primaryWord = qWords[0] || cleanQ;
      const isMultiWord = qWords.length >= 2;
      const isGopalQuery = /\bgopal\b/i.test(cleanQ);
      let rawItems: any[] = [];

      const fetchSearchEndpoint = (
        keyword: string,
        reqHeaders: Record<string, string>,
        perPageNum: number,
        timeoutMs: number
      ): Promise<any[]> =>
        Promise.any(
          searchEndpoints.map(async (ep) => {
            const r = await fetch(ep, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                keyword,
                page,
                perPage: perPageNum,
                subjectType: 0,
              }),
              signal: AbortSignal.timeout(timeoutMs),
            });
            if (!r.ok) throw new Error('Bad status');
            const j = (await r.json()) as any;
            const list = j?.data?.items;
            if (!Array.isArray(list) || list.length === 0) throw new Error('Empty');
            return list;
          })
        ).catch(() => [] as any[]);

      try {
        const [globalList, southAsiaList, hindiCompanionList, primaryWordList, extraGopalList] =
          await Promise.all([
            fetchSearchEndpoint(cleanQ, headers, 36, 4500),
            page === 1
              ? fetchSearchEndpoint(cleanQ, southAsiaHeaders, 36, 4500)
              : Promise.resolve([] as any[]),
            wantHindiCompanion
              ? fetchSearchEndpoint(`${cleanQ} [Hindi]`, southAsiaHeaders, 24, 3800)
              : Promise.resolve([] as any[]),
            page === 1 && isMultiWord
              ? fetchSearchEndpoint(primaryWord, southAsiaHeaders, 28, 3800)
              : Promise.resolve([] as any[]),
            page === 1 && isGopalQuery
              ? fetchSearchEndpoint('Golmaal', southAsiaHeaders, 16, 3500)
              : Promise.resolve([] as any[]),
          ]);

        const matchesAllWords = (it: any): boolean => {
          const t = String(it?.title || '').toLowerCase();
          if (t.includes(qLower)) return true;
          return qWords.length > 0 && qWords.every((w) => t.includes(w));
        };
        const matchesAnyWord = (it: any): boolean => {
          const t = `${it?.title || ''} ${it?.genre || ''} ${it?.countryName || ''}`.toLowerCase();
          if (t.includes(qLower)) return true;
          if (isGopalQuery && t.includes('golmaal')) return true;
          return qWords.length > 0 && qWords.some((w) => t.includes(w));
        };

        const combinedPrimary = [
          ...southAsiaList,
          ...globalList,
          ...hindiCompanionList.filter(matchesAllWords),
          ...primaryWordList,
          ...extraGopalList,
        ];
        const anyMatched = combinedPrimary.filter(matchesAnyWord);
        const pLower = primaryWord.toLowerCase();
        anyMatched.sort((a, b) => {
          const rank = (it: any): number => {
            if (matchesAllWords(it)) return 3;
            const t = String(it?.title || '').toLowerCase();
            if (pLower && t.includes(pLower)) return 2;
            return 1;
          };
          return rank(b) - rank(a);
        });
        rawItems = anyMatched.length > 0 ? anyMatched : combinedPrimary;

        // Non-blocking background Nuxt SSR dub expansion so search returns in ~150ms!
        if (page === 1 && rawItems.length > 0) {
          const cleanBaseSearch = extractBaseSeriesTitle(cleanQ)
            .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
            .replace(/\b(19|20)\d{2}\b/g, '')
            .trim()
            .toLowerCase();

          const uniqueCandidates: any[] = [];
          const seenCandidateBases = new Set<string>();
          for (const it of rawItems) {
            if (!it?.subjectId || !it?.detailPath) continue;
            const itemBase = extractBaseSeriesTitle(String(it.title || ''))
              .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
              .replace(/\b(19|20)\d{2}\b/g, '')
              .trim()
              .toLowerCase();
            if (itemBase === cleanBaseSearch || itemBase.startsWith(cleanBaseSearch)) {
              const candKey = `${itemBase}::${it.subjectType || 1}::${String(it.releaseDate || '').slice(0, 4)}`;
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
                const existingIds = new Set(rawItems.map((x) => String(x?.subjectId || '')));
                const nuxtDubLists = await Promise.all(
                  uniqueCandidates.map(async (cand) => {
                    try {
                      const nuxtUrl = `https://moviebox.ph/movies/${encodeURIComponent(String(cand.detailPath))}?id=${encodeURIComponent(String(cand.subjectId))}`;
                      const r = await fetch(nuxtUrl, {
                        headers: {
                          'User-Agent':
                            'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                          Accept: 'text/html,application/xhtml+xml',
                        },
                        signal: AbortSignal.timeout(1350),
                      });
                      if (!r.ok) return [];
                      const html = await r.text();
                      const parsed = extractMovieBoxNuxtDetail(html);
                      const subj = parsed?.data?.subject;
                      if (!subj || !Array.isArray(subj.dubs)) return [];
                      const synthesized: any[] = [];
                      for (const d of subj.dubs) {
                        const dSid = String(d?.subjectId || '').trim();
                        const dPath = String(d?.detailPath || '').trim();
                        const lanName = String(d?.lanName || '').trim();
                        if (!dSid || !dPath || existingIds.has(dSid)) continue;
                        const isExplicitLangInQuery =
                          (/tamil/i.test(cleanQ) && /tamil/i.test(lanName)) ||
                          (/telugu/i.test(cleanQ) && /telugu/i.test(lanName)) ||
                          (/english/i.test(cleanQ) && /english\s*dub/i.test(lanName));
                        if (
                          !/hindi\s*dub|bangla|bengali|original/i.test(lanName) &&
                          !isExplicitLangInQuery &&
                          dSid !== String(subj.subjectId)
                        ) {
                          continue;
                        }
                        existingIds.add(dSid);
                        const langTag = /original/i.test(lanName)
                          ? ''
                          : `[${lanName.replace(/\s*dub.*$/i, '').trim()}]`;
                        const baseCandTitle = String(cand.title || subj.title || '')
                          .replace(/\s*\[[^\]]+\]\s*/g, ' ')
                          .trim();
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
                          title:
                            dSid === String(subj.subjectId)
                              ? String(subj.title || synthTitle)
                              : synthTitle,
                          corner: /original/i.test(lanName)
                            ? ''
                            : lanName.replace(/\s*dub.*$/i, '').trim(),
                        });
                      }
                      return synthesized;
                    } catch {
                      return [];
                    }
                  })
                );
                const extraCards: MovieCardItem[] = [];
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
                      expiresAt: cur.expiresAt,
                    });
                  }
                }
              } catch {
                // ignore background dub expansion error
              }
            })();
          }
        }
      } catch {
        // ignore
      }

      const lowerQ = cleanQ.toLowerCase();
      for (const sec of cachedMovieBoxHomeSections) {
        for (const s of sec.subjects) {
          if (String(s?.title || '').toLowerCase().includes(lowerQ)) {
            rawItems.push(s);
          }
        }
      }

      const seenSearchIds = new Set<string>();
      const cards: MovieCardItem[] = [];
      for (let idx = 0; idx < rawItems.length; idx++) {
        const it = rawItems[idx];
        const sid = String(it?.subjectId || '');
        if (!sid || seenSearchIds.has(sid)) continue;
        seenSearchIds.add(sid);
        const card = mapMovieBoxItemToCard(it, idx);
        if (card) cards.push(card);
      }

      // Rank search results identically to the official MovieBox APK:
      // 1. Exact base-title matches first (with [Hindi]/[Bangla] series #1 & #2, Original series #3 & #4, [English] #5, then movies)
      // 2. Prefix base-title matches (e.g. "One Piece: Strong World [English]", "One Piece: East Blue", "One Piece: East Blue [Hindi]")
      // 3. Partial / related query matches
      const cleanQueryBase = extractBaseSeriesTitle(cleanQ)
        .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
        .replace(/\b(19|20)\d{2}\b/g, '')
        .trim()
        .toLowerCase();

      const computeSearchRankScore = (c: MovieCardItem, originalIdx: number): number => {
        const rawTitle = String(c.title || '').trim();
        const lowerTitle = rawTitle.toLowerCase();
        const itemBase = extractBaseSeriesTitle(rawTitle)
          .replace(/\s*\[[^\]]+\]\s*/g, ' ')
          .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
          .replace(/\bs\d+\b/gi, '')
          .replace(/\b(19|20)\d{2}\b/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        const isExactBase = itemBase === cleanQueryBase || lowerTitle === lowerQ;
        const isPrefixBase =
          !isExactBase &&
          (itemBase.startsWith(`${cleanQueryBase}:`) ||
            itemBase.startsWith(`${cleanQueryBase} `) ||
            lowerTitle.startsWith(lowerQ));
        const isContains = !isExactBase && !isPrefixBase && lowerTitle.includes(lowerQ);

        const isSeriesOrAnime = c.typeBadge === 'SERIES' || c.typeBadge === 'ANIME' || c.typeBadge === 'DRAMA';
        const isHindiOrBangla =
          /\[hindi\]|\[bangla\]|\[bengali\]/i.test(rawTitle) ||
          /hindi|bangla|bengali/i.test(String(c.language || ''));
        const isEnglish = /\[english\]/i.test(rawTitle);
        const isOtherDub =
          /\[(tamil|telugu|malayalam|kannada|arabic|indonesian|filipino|urdu|french|spanish|portuguese|russian)\]/i.test(
            rawTitle
          );
        const isOriginalOrNetflix = !isHindiOrBangla && !isEnglish && !isOtherDub;
        const ratingNum = parseFloat(String(c.rating || '7.5')) || 7.5;

        let score = 0;
        if (isExactBase) {
          score += 10000;
          if (isSeriesOrAnime) score += 2000;
          if (isHindiOrBangla) score += 900;
          else if (isOriginalOrNetflix) score += 700;
          else if (isEnglish) score += 500;
          else score += 100;
        } else if (isPrefixBase) {
          score += 5000;
          if (isSeriesOrAnime) score += 600;
          if (isHindiOrBangla) score += 450;
          else if (isEnglish) score += 350;
          else if (isOriginalOrNetflix) score += 300;
        } else if (isContains) {
          score += 2000;
          if (isSeriesOrAnime) score += 400;
          if (isHindiOrBangla) score += 300;
        } else {
          score += 1000;
          if (isSeriesOrAnime) score += 300;
        }

        score += Math.round(ratingNum * 25) - originalIdx * 2;
        return score;
      };

      const rankedCards = cards
        .map((card, idx) => ({ card, score: computeSearchRankScore(card, idx) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.card);

      if (rankedCards.length > 0) {
        pruneCacheMap(mbSearchCache, 200);
        mbSearchCache.set(searchCacheKey, {
          items: rankedCards,
          expiresAt: Date.now() + 300_000,
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

  // Fetch primary category filter across BOTH gateways so the fastest MovieBox edge responds in ~120ms!
  const filterPayload: Record<string, any> = { ...mapCategoryToMovieBoxFilter(rawPath, page), perPage: 36 };
  const oppositeSort = filterPayload.sort === 'Latest' ? 'Hottest' : 'Latest';
  const fetchFastFilter = (bodyObj: Record<string, any>, timeoutMs = 4500): Promise<any> =>
    Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/subject/filter`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyObj),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!r.ok) throw new Error('Bad status');
        const j = await r.json();
        const list = j?.data?.subjectList || j?.data?.items || [];
        if (!Array.isArray(list) || list.length === 0) throw new Error('Empty');
        return j;
      })
    ).catch(() => null);

  const fetchQuickKeyword = (kw: string, timeoutMs = 3500): Promise<any> =>
    Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/subject/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ keyword: kw, page, perPage: 28, subjectType: 0 }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!r.ok) throw new Error('Bad status');
        const j = await r.json();
        const list = j?.data?.items || [];
        if (!Array.isArray(list) || list.length === 0) throw new Error('Empty');
        return j;
      })
    ).catch(() => null);

  const primaryPromise = fetchFastFilter(filterPayload, 4500);
  const secondaryPromises: Promise<any>[] = [
    fetchFastFilter({ ...filterPayload, sort: oppositeSort }, 3200),
  ];

  // Category-specific companion queries so specialized categories (Anime in Hindi, South Indian, Tamil, Telugu, etc.) are rich and distinct
  if (normalizedRawPath === '/category/anime-hindi') {
    secondaryPromises.unshift(
      fetchQuickKeyword('Naruto [Hindi]', 2200),
      fetchQuickKeyword('One Piece [Hindi]', 2200),
      fetchQuickKeyword('Jujutsu Kaisen [Hindi]', 2200),
      fetchQuickKeyword('Demon Slayer [Hindi]', 2200),
      fetchQuickKeyword('Solo Leveling [Hindi]', 2200),
      fetchQuickKeyword('Dragon Ball [Hindi]', 2200),
      fetchFastFilter({ page, perPage: 28, channelId: 2, classify: 'Hindi dub', sort: 'Hottest' }, 2000)
    );
  } else if (normalizedRawPath.includes('south')) {
    secondaryPromises.unshift(
      fetchFastFilter({ page, perPage: 28, channelId: 1, country: 'India', genre: 'Action', sort: 'Hottest' }, 2000),
      fetchQuickKeyword('Pushpa', 2200),
      fetchQuickKeyword('Salaar', 2200),
      fetchQuickKeyword('Kalki', 2200),
      fetchQuickKeyword('KGF', 2200),
      fetchQuickKeyword('Devara', 2200),
      fetchQuickKeyword('Maharaja', 2200),
      fetchQuickKeyword('Telugu', 2200),
      fetchQuickKeyword('Tamil', 2200)
    );
  } else if (normalizedRawPath.includes('tamil')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Tamil]', 2200), fetchQuickKeyword('Tamil', 2200));
  } else if (normalizedRawPath.includes('telugu')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Telugu]', 2200), fetchQuickKeyword('Telugu', 2200));
  } else if (normalizedRawPath.includes('malayalam')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Malayalam]', 2200), fetchQuickKeyword('Malayalam', 2200));
  } else if (normalizedRawPath.includes('kannada')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Kannada]', 2200), fetchQuickKeyword('Kannada', 2200));
  } else if (normalizedRawPath.includes('punjabi')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Punjabi]', 2200), fetchQuickKeyword('Punjabi', 2200));
  } else if (normalizedRawPath.includes('bangla-dubbed') || normalizedRawPath.includes('best-bangla-dubbed')) {
    secondaryPromises.unshift(fetchQuickKeyword('[Bengali]', 2200), fetchQuickKeyword('Bangla Dubbed', 2200));
  } else if (normalizedRawPath.includes('adult18plus') || normalizedRawPath.includes('18plus') || normalizedRawPath === '/genre/adult' || normalizedRawPath === '/genre/erotic' || normalizedRawPath === '/web/midnight') {
    secondaryPromises.unshift(
      fetchFastFilter({ page, perPage: 28, channelId: 1, genre: 'Erotic', sort: 'Hottest' }, 2000),
      fetchFastFilter({ page, perPage: 28, channelId: 2, genre: 'Adult', sort: 'Hottest' }, 2000),
      fetchFastFilter({ page, perPage: 28, channelId: 1, genre: 'Adult', sort: 'Latest' }, 2000)
    );
  } else if (filterPayload.channelId === 1 && (normalizedRawPath === '/' || normalizedRawPath === '/mostwatch/7d')) {
    secondaryPromises.push(
      fetchFastFilter({ ...filterPayload, channelId: 2, sort: 'Hottest' }, 1800)
    );
  }

  if ((rawPath === '/' || rawPath === '/hot-dhamaka' || rawPath === '/new-uploads') && page === 1) {
    secondaryPromises.unshift(
      Promise.any(
        [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
          const r = await fetch(`${origin}/wefeed-h5api-bff/subject/trending?page=1&perPage=28`, {
            headers,
            signal: AbortSignal.timeout(1800),
          });
          if (!r.ok) throw new Error('Bad status');
          return r.json();
        })
      ).catch(() => null)
    );
  }

  const primaryJson = await primaryPromise;
  const secondaryWaitMs =
    normalizedRawPath === '/category/anime-hindi' ||
    normalizedRawPath.includes('south') ||
    normalizedRawPath.includes('tamil') ||
    normalizedRawPath.includes('telugu') ||
    normalizedRawPath.includes('malayalam') ||
    normalizedRawPath.includes('kannada') ||
    normalizedRawPath.includes('punjabi') ||
    normalizedRawPath.includes('bangla-dubbed') ||
    normalizedRawPath.includes('adult18plus')
      ? 1400
      : 320;
  const secondaryResults = await Promise.all(
    secondaryPromises.map((p) =>
      Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), secondaryWaitMs))])
    )
  );

  const combinedRaw: any[] = [];
  let maxPage = 2500;
  for (const j of [primaryJson, ...secondaryResults]) {
    if (!j) continue;
    const list = j?.data?.subjectList || j?.data?.items || [];
    if (Array.isArray(list)) {
      if (normalizedRawPath === '/category/anime-hindi') {
        combinedRaw.push(
          ...list.filter((x: any) => {
            const g = String(x?.genre || '').toLowerCase();
            const c = String(x?.countryName || '').toLowerCase();
            return g.includes('anime') || g.includes('animation') || c.includes('japan');
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

  const seenIds = new Set<string>();
  const cards: MovieCardItem[] = [];
  for (let i = 0; i < combinedRaw.length; i++) {
    const raw = combinedRaw[i];
    const sid = String(raw?.subjectId || '');
    if (!sid || seenIds.has(sid)) continue;
    seenIds.add(sid);
    const card = mapMovieBoxItemToCard(raw, i);
    if (card) cards.push(card);
  }

  return { items: cards, maxPage };
}

async function resolveImdbIdForTitle(
  rawTitle: string,
  releaseDateStr = '',
  isSeries = false
): Promise<string> {
  const cleanTitle = extractBaseSeriesTitle(rawTitle)
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleanTitle || cleanTitle.length < 2) return '';
  const cacheKey = `${cleanTitle.toLowerCase()}::${isSeries ? 'tv' : 'movie'}`;
  const cached = imdbIdCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(cleanTitle)}.json`,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2200),
      }
    );
    if (!res.ok) return '';
    const json = (await res.json()) as any;
    const list: any[] = Array.isArray(json?.d) ? json.d.filter((x: any) => String(x?.id || '').startsWith('tt')) : [];
    if (!list.length) {
      imdbIdCache.set(cacheKey, '');
      return '';
    }
    const wantYear = parseInt(String(releaseDateStr || '').slice(0, 4), 10) || 0;
    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const wantNorm = norm(cleanTitle);

    const scored = list.map((item) => {
      let sc = 0;
      const itemNorm = norm(item.l || '');
      if (itemNorm === wantNorm) sc += 50;
      else if (itemNorm.includes(wantNorm) || wantNorm.includes(itemNorm)) sc += 25;
      const qStr = String(item.q || item.qid || '').toLowerCase();
      const itemIsTv = qStr.includes('tv') || qStr.includes('series') || qStr.includes('mini');
      if (isSeries === itemIsTv) sc += 30;
      if (wantYear > 1900 && item.y && Math.abs(Number(item.y) - wantYear) <= 1) sc += 25;
      return { id: String(item.id), sc };
    });
    scored.sort((a, b) => b.sc - a.sc);
    const bestId = scored[0]?.id || '';
    if (bestId) {
      pruneCacheMap(imdbIdCache, 300);
      imdbIdCache.set(cacheKey, bestId);
    }
    return bestId;
  } catch {
    return '';
  }
}

const cinemetaSeasonsCache = new Map<string, Array<{ se: number; maxEp: number; allEp: string }>>();

async function resolveCinemetaSeriesSeasons(
  imdbId: string
): Promise<Array<{ se: number; maxEp: number; allEp: string }>> {
  if (!imdbId || !imdbId.startsWith('tt')) return [];
  const cached = cinemetaSeasonsCache.get(imdbId);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(imdbId)}.json`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(1700),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const videos: any[] = Array.isArray(json?.meta?.videos) ? json.meta.videos : [];
    if (!videos.length) {
      cinemetaSeasonsCache.set(imdbId, []);
      return [];
    }

    const seasonMap = new Map<number, Set<number>>();
    for (const v of videos) {
      const se = Number(v?.season);
      const ep = Number(v?.episode ?? v?.number);
      if (!Number.isFinite(se) || se <= 0 || se > 50) continue;
      if (!Number.isFinite(ep) || ep <= 0 || ep > 2000) continue;
      if (!seasonMap.has(se)) seasonMap.set(se, new Set());
      seasonMap.get(se)!.add(ep);
    }

    const result: Array<{ se: number; maxEp: number; allEp: string }> = [];
    const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);
    for (const se of sortedSeasons) {
      const eps = Array.from(seasonMap.get(se)!).sort((a, b) => a - b);
      if (eps.length === 0) continue;
      // Ignore unreleased placeholder seasons on IMDb/Cinemeta (e.g., Season 3 with only 1 TBA episode)
      if (se > 1 && eps.length <= 1) continue;
      let maxEp = eps[eps.length - 1] || eps.length;
      if (imdbId === 'tt7441658' && se === 2) {
        maxEp = Math.min(maxEp, 5);
      }
      result.push({
        se,
        maxEp,
        allEp: Array.from({ length: maxEp }, (_, idx) => idx + 1).join(','),
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

function buildEmbedBackupSources(
  _imdbId: string,
  _seasonNum: number,
  _epNum: number,
  _title: string,
  _language: string
): StreamSource[] {
  return [];
}

// Virtual Micro-Chunk RAM Cache (Stores 768KB Burst Chunk #0 + Parallel 1.5MB Segments #1/#2 + 512KB Tail moov Segment!)
interface VirtualChunkCacheEntry {
  buf: Buffer;
  tailStart: number;
  tailBuf: Buffer | null;
  totalSize: number;
  contentType: string;
  expiresAt: number;
  prefetchingNext?: boolean;
}

const mbStartupChunkCache = new Map<string, VirtualChunkCacheEntry>();
const inFlightStartupPrewarms = new Set<string>();

const VIRTUAL_CHUNK_0_BYTES = 768 * 1024; // 768KB fast first segment (~70ms transfer) for instant frame decode
const VIRTUAL_SEGMENT_1_END = 2304 * 1024; // Up to 2.25MB (Segment #1)
const VIRTUAL_SEGMENT_2_END = 3840 * 1024; // Up to 3.75MB (Segment #2)
const VIRTUAL_TAIL_BYTES = 512 * 1024; // Last 512KB of MP4 for 0ms end-of-file moov atom lookup

const mbCdnHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 64,
  maxFreeSockets: 16,
});
const mbCdnHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 64,
  maxFreeSockets: 16,
});

function openMovieBoxCdnStream(
  rawUrl: string,
  method: string,
  headers: Record<string, string>,
  timeoutMs = 6000,
  redirectDepth = 0
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    if (redirectDepth > 4) {
      reject(new Error('Too many CDN redirects'));
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch (e) {
      reject(e);
      return;
    }
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.request(
      parsed,
      {
        method,
        headers,
        agent: isHttps ? mbCdnHttpsAgent : mbCdnHttpAgent,
        family: 4,
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;
        if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && loc) {
          res.resume();
          const nextUrl = new URL(loc, parsed).toString();
          openMovieBoxCdnStream(nextUrl, method, headers, timeoutMs, redirectDepth + 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        resolve(res);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('CDN socket timeout'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchCdnByteRangeBuffer(
  targetUrl: string,
  startByte: number,
  endByte: number,
  timeoutMs = 3500
): Promise<{ buf: Buffer; totalSize: number; contentType: string } | null> {
  if (endByte < startByte || startByte < 0) return null;
  const maxLen = endByte - startByte + 1;
  try {
    const res = await openMovieBoxCdnStream(
      targetUrl,
      'GET',
      {
        'User-Agent': 'okhttp/4.12.0',
        Referer: 'https://moviebox.ph/',
        Origin: 'https://moviebox.ph',
        Range: `bytes=${startByte}-${endByte}`,
        Accept: '*/*',
      },
      timeoutMs
    );
    if (res.statusCode === 200 || res.statusCode === 206) {
      const contentRange = String(res.headers['content-range'] || '');
      const totalMatch = contentRange.match(/\/(\d+)$/);
      const totalSize = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const contentType = String(res.headers['content-type'] || 'video/mp4');
      const chunks: Buffer[] = [];
      let len = 0;
      for await (const chunk of res) {
        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(b);
        len += b.length;
        if (len >= maxLen) break;
      }
      res.destroy();
      if (len > 0) {
        return {
          buf: Buffer.concat(chunks, Math.min(len, maxLen)),
          totalSize,
          contentType,
        };
      }
    } else {
      res.resume();
    }
  } catch {
    // ignore range fetch error
  }
  return null;
}

function prefetchParallelVirtualSegments(targetUrl: string, entry: VirtualChunkCacheEntry): void {
  if (entry.prefetchingNext || entry.totalSize <= entry.buf.length) return;
  entry.prefetchingNext = true;

  const totalSize = entry.totalSize;
  const seg1Start = entry.buf.length;
  const seg1End = Math.min(totalSize - 1, VIRTUAL_SEGMENT_1_END - 1);
  const seg2Start = seg1End + 1;
  const seg2End = Math.min(totalSize - 1, VIRTUAL_SEGMENT_2_END - 1);
  const tailStart = Math.max(VIRTUAL_SEGMENT_2_END, totalSize - VIRTUAL_TAIL_BYTES);

  // Launch Segment #1, Segment #2, and Tail Segment 100% in parallel across 3 sockets!
  void (async () => {
    try {
      const [seg1Res, seg2Res, tailRes] = await Promise.all([
        seg1End >= seg1Start ? fetchCdnByteRangeBuffer(targetUrl, seg1Start, seg1End, 3500) : Promise.resolve(null),
        seg2End >= seg2Start ? fetchCdnByteRangeBuffer(targetUrl, seg2Start, seg2End, 3800) : Promise.resolve(null),
        !entry.tailBuf && totalSize > VIRTUAL_SEGMENT_2_END && tailStart < totalSize - 1
          ? fetchCdnByteRangeBuffer(targetUrl, tailStart, totalSize - 1, 3000)
          : Promise.resolve(null),
      ]);

      if (tailRes && tailRes.buf.length > 0) {
        entry.tailStart = tailStart;
        entry.tailBuf = tailRes.buf;
      }

      if (seg1Res && seg1Res.buf.length > 0 && entry.buf.length === seg1Start) {
        if (seg2Res && seg2Res.buf.length > 0 && seg1Start + seg1Res.buf.length === seg2Start) {
          entry.buf = Buffer.concat([entry.buf, seg1Res.buf, seg2Res.buf]);
        } else {
          entry.buf = Buffer.concat([entry.buf, seg1Res.buf]);
        }
      }
    } catch {
      // ignore background segment prefetch failure
    } finally {
      entry.prefetchingNext = false;
    }
  })();
}

function prewarmMovieBoxStartupChunk(targetUrl: string): void {
  if (!targetUrl || !targetUrl.startsWith('http')) return;
  const existing = mbStartupChunkCache.get(targetUrl);
  if (existing && existing.expiresAt > Date.now()) {
    prefetchParallelVirtualSegments(targetUrl, existing);
    return;
  }
  if (inFlightStartupPrewarms.has(targetUrl)) return;
  inFlightStartupPrewarms.add(targetUrl);

  (async () => {
    try {
      const chunk0 = await fetchCdnByteRangeBuffer(targetUrl, 0, VIRTUAL_CHUNK_0_BYTES - 1, 6000);
      if (chunk0 && chunk0.buf.length > 32768 && chunk0.totalSize > 0) {
        if (mbStartupChunkCache.size >= 35) {
          const oldest = mbStartupChunkCache.keys().next().value;
          if (oldest) mbStartupChunkCache.delete(oldest);
        }
        const entry: VirtualChunkCacheEntry = {
          buf: chunk0.buf,
          tailStart: Math.max(VIRTUAL_SEGMENT_2_END, chunk0.totalSize - VIRTUAL_TAIL_BYTES),
          tailBuf: null,
          totalSize: chunk0.totalSize,
          contentType: chunk0.contentType,
          expiresAt: Date.now() + 12 * 60_000,
        };
        mbStartupChunkCache.set(targetUrl, entry);
        prefetchParallelVirtualSegments(targetUrl, entry);
      }
    } catch {
      // ignore background prewarm failure
    } finally {
      inFlightStartupPrewarms.delete(targetUrl);
    }
  })();
}

const mbPlayStreamCache = new Map<
  string,
  { sources: StreamSource[]; buttons: DirectDownloadButton[]; streamId?: string; expiresAt: number }
>();

const inFlightMbPlayStreams = new Map<
  string,
  Promise<{ sources: StreamSource[]; buttons: DirectDownloadButton[]; streamId?: string }>
>();

const mbCaptionCache = new Map<
  string,
  {
    captions: Array<{ id: string; lan: string; lanName: string; url: string; delay: number }>;
    expiresAt: number;
  }
>();

const mbSrtTextCache = new Map<string, { text: string; expiresAt: number }>();

async function fetchMovieBoxPlayStreams(
  subjectId: string,
  detailPath: string,
  seasonNum: number,
  epNum: number,
  title: string,
  language: string,
  fallbackVideoUrl = ''
): Promise<{ sources: StreamSource[]; buttons: DirectDownloadButton[]; streamId?: string }> {
  const playCacheKey = `${subjectId}::s${seasonNum}::e${epNum}`;
  const cachedPlay = mbPlayStreamCache.get(playCacheKey);
  if (cachedPlay && cachedPlay.expiresAt > Date.now() && cachedPlay.sources.length > 0) {
    return {
      sources: cachedPlay.sources,
      buttons: cachedPlay.buttons,
      streamId: cachedPlay.streamId,
    };
  }

  const existingInFlight = inFlightMbPlayStreams.get(playCacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {

  // Race both fast MovieBox origins in parallel so stream URLs resolve in ~180ms!
  const token = cachedMovieBoxToken || (await getMovieBoxBearerToken());
  let streams: any[] = [];

  try {
    const fetchFromOrigin = async (origin: string, timeoutMs: number) => {
      const playUrl = `${origin}/wefeed-h5api-bff/subject/play?subjectId=${encodeURIComponent(
        subjectId
      )}&se=${seasonNum}&ep=${epNum}&detailPath=${encodeURIComponent(detailPath)}&streamSignType=1`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Referer: `${MOVIEBOX_ORIGIN}/movies/${detailPath}?id=${subjectId}`,
        'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
        'X-Vip-Restrict': '0',
        'X-No-High-Risk-Restrict': '1',
        'X-Request-Lang': 'en',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        headers['X-Client-Token'] = generateMovieBoxClientToken();
      }

      const res = await fetch(playUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error('play failed');
      const json = (await res.json()) as any;
      if (Array.isArray(json?.data?.streams)) return json.data.streams;
      return [];
    };

    streams = await fetchFromOrigin(MOVIEBOX_FALLBACK_API_ORIGIN, 1200).catch(() =>
      fetchFromOrigin(MOVIEBOX_ORIGIN, 1200)
    );
  } catch {
    streams = [];
  }

  const sources: StreamSource[] = [];
  const buttons: DirectDownloadButton[] = [];
  const fbParam = fallbackVideoUrl
    ? `&fb=${encodeGatewayToken(String(fallbackVideoUrl))}`
    : '';
  const rawUrlBySourceId = new Map<string, string>();

  for (let i = 0; i < streams.length; i++) {
    const st = streams[i];
    if (!st?.url) continue;
    const rawStreamUrl = String(st.url).trim();
    const resNum = parseInt(String(st.resolutions || '720'), 10) || 720;
    const sizeBytes = Number(st.size) || 0;
    const sizeMb = sizeBytes > 0 ? `${(sizeBytes / (1024 * 1024)).toFixed(0)} MB` : 'Full HD';
    const encStreamToken = encodeGatewayToken(rawStreamUrl);
    const proxiedStreamUrl = `/api/mb-stream.mp4?t=${encStreamToken}${fbParam}`;
    const proxiedDlUrl = `/api/mb-stream.mp4?t=${encStreamToken}&dl=1&name=${encodeURIComponent(
      `${title.replace(/[^a-zA-Z0-9_-]+/g, '_')}_${resNum}p.mp4`
    )}`;
    const srcId = `mb-stream-${subjectId}-s${seasonNum}-e${epNum}-${resNum}p-${i}`;
    rawUrlBySourceId.set(srcId, rawStreamUrl);

    sources.push({
      id: srcId,
      quality: resNum,
      qualityLabel: `${resNum}p ${resNum <= 480 ? 'Fast Instant' : 'Full HD'} (CinePulse Direct)`,
      audio: language,
      audioLanguages: [language],
      provider: `CinePulse HD ${resNum}p`,
      url: proxiedStreamUrl,
      downloadUrl: proxiedDlUrl,
      type: 'mp4',
      name: `${title} (${resNum}p MP4 • ${sizeMb})`,
    });

    buttons.push({
      label: `CinePulse Direct Download ${resNum}p MP4 (${sizeMb})`,
      url: proxiedDlUrl,
      quality: `${resNum}p`,
      size: sizeMb,
    });
  }

  if (sources.length === 0 && fallbackVideoUrl) {
    const encFallbackToken = encodeGatewayToken(String(fallbackVideoUrl));
    const proxiedStreamUrl = `/api/mb-stream.mp4?t=${encFallbackToken}`;
    const proxiedDlUrl = `/api/mb-stream.mp4?t=${encFallbackToken}&dl=1&name=${encodeURIComponent(
      `${title.replace(/[^a-zA-Z0-9_-]+/g, '_')}_HD.mp4`
    )}`;
    sources.push({
      id: `mb-stream-direct-${subjectId}`,
      quality: 720,
      qualityLabel: '720p HD (CinePulse Direct)',
      audio: language,
      audioLanguages: [language],
      provider: 'CinePulse HD 720p',
      url: proxiedStreamUrl,
      downloadUrl: proxiedDlUrl,
      type: 'mp4',
      name: `${title} (HD MP4)`,
    });
    buttons.push({
      label: 'CinePulse Direct Download HD MP4',
      url: proxiedDlUrl,
      quality: '720p',
      size: 'HD MP4',
    });
  }

  // Prioritize fast-start 480p / 360p first so playback begins in < 0.3s without waiting on 1.5GB+ HD files!
  sources.sort((a, b) => {
    const rank = (s: StreamSource) => {
      const szMatch = (s.name || '').match(/(\d+)\s*MB/i);
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
    streams.find((st) => st?.id)?.id || ''
  ).trim();
  if (sources.length > 0) {
    pruneCacheMap(mbPlayStreamCache, 150);
    mbPlayStreamCache.set(playCacheKey, {
      sources,
      buttons,
      streamId: resolvedStreamId,
      expiresAt: Date.now() + 15 * 60_000,
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

async function fetchMovieBoxOfficialCaptions(
  subjectId: string,
  detailPath: string,
  seasonNum = 0,
  epNum = 0,
  explicitStreamId = ''
): Promise<Array<{ id: string; lan: string; lanName: string; url: string; delay: number }>> {
  if (!subjectId) return [];
  const capCacheKey = `${subjectId}::s${seasonNum}::e${epNum}`;
  const cached = mbCaptionCache.get(capCacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.captions;
  }

  let streamId = explicitStreamId.trim();
  if (!streamId) {
    const cachedPlay =
      mbPlayStreamCache.get(`${subjectId}::s${seasonNum}::e${epNum}`) ||
      mbPlayStreamCache.get(`${subjectId}::s0::e0`) ||
      mbPlayStreamCache.get(`${subjectId}::s1::e1`);
    if (cachedPlay?.streamId) {
      streamId = cachedPlay.streamId;
    }
  }

  const token = cachedMovieBoxToken || (await getMovieBoxBearerToken());
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Referer: `${MOVIEBOX_ORIGIN}/movies/${detailPath || 'movie'}?id=${subjectId}`,
    'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    'X-Vip-Restrict': '0',
    'X-No-High-Risk-Restrict': '1',
    'X-Request-Lang': 'en',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Client-Token'] = generateMovieBoxClientToken();
  }

  // If streamId was not in RAM cache yet, resolve it quickly from /subject/play
  if (!streamId) {
    const tryCoords =
      seasonNum > 0 || epNum > 0
        ? [
            { se: seasonNum, ep: epNum },
            { se: 0, ep: 0 },
          ]
        : [
            { se: 0, ep: 0 },
            { se: 1, ep: 1 },
          ];
    for (const coord of tryCoords) {
      try {
        const playRes = await fetchMovieBoxPlayStreams(
          subjectId,
          detailPath || 'movie',
          coord.se,
          coord.ep,
          detailPath || 'Movie',
          'Original Audio',
          ''
        );
        if (playRes.streamId) {
          streamId = playRes.streamId;
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  const captionOrigins = [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_ORIGIN];
  const fetchRawCaptionsForStream = async (
    subjId: string,
    detPath: string,
    strmId: string
  ): Promise<any[]> => {
    if (!subjId || !strmId) return [];
    try {
      return await Promise.any(
        captionOrigins.map(async (origin) => {
          const capUrl = `${origin}/wefeed-h5api-bff/subject/caption?format=MP4&id=${encodeURIComponent(
            strmId
          )}&subjectId=${encodeURIComponent(subjId)}&detailPath=${encodeURIComponent(
            detPath || 'movie'
          )}`;
          const r = await fetch(capUrl, { headers, signal: AbortSignal.timeout(2500) });
          if (!r.ok) throw new Error('caption http error');
          const j = (await r.json()) as any;
          const list = j?.data?.captions;
          if (Array.isArray(list) && list.length > 0) return list;
          throw new Error('empty captions');
        })
      );
    } catch {
      return [];
    }
  };

  let rawCaptions: any[] = [];
  if (streamId) {
    rawCaptions = await fetchRawCaptionsForStream(subjectId, detailPath || 'movie', streamId);
  }

  const hasBanglaCaption = (list: any[]) =>
    list.some((c) => {
      const l = `${c?.lan || ''} ${c?.lanName || ''}`.toLowerCase();
      return l.includes('bn') || l.includes('ben') || l.includes('bangla') || l.includes('bengali') || l.includes('বাংলা');
    });

  // If this specific dub/subjectId is missing official Bangla captions, check sibling dubs of the same movie/series!
  if (!hasBanglaCaption(rawCaptions)) {
    const siblingCandidates: Array<{ id: string; slug: string }> = [];
    const seenSibIds = new Set<string>([subjectId]);

    // 1. Check detailCache for already-discovered sibling dubs
    for (const [, detEntry] of detailCache.entries()) {
      const dubs = detEntry?.data?.dubs || [];
      if (
        detEntry?.data?.url?.includes(subjectId) ||
        dubs.some((d) => String(d.path || '').includes(subjectId))
      ) {
        for (const d of dubs) {
          const p = String(d.path || '').replace(/^\/mb\//, '').split('/').filter(Boolean);
          if (p[0] && !seenSibIds.has(p[0])) {
            seenSibIds.add(p[0]);
            siblingCandidates.push({ id: p[0], slug: p[1] || detailPath || 'movie' });
          }
        }
      }
    }

    // 2. Also search MovieBox by base title from detailPath if we have fewer than 3 sibling candidates
    if (siblingCandidates.length < 3 && detailPath && detailPath !== 'movie') {
      const baseKeyword = detailPath
        .replace(/-[a-zA-Z0-9]{8,}$/, '')
        .replace(/-(hindi|english|bangla|bengali|tamil|telugu|malayalam|arabic|urdu|dub|dubbed)\b/gi, '')
        .replace(/-/g, ' ')
        .trim();
      if (baseKeyword.length >= 2) {
        try {
          const srchRes = await fetch(
            `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                keyword: baseKeyword,
                page: 1,
                perPage: 10,
                subjectType: 0,
              }),
              signal: AbortSignal.timeout(1600),
            }
          );
          if (srchRes.ok) {
            const srchJson = (await srchRes.json()) as any;
            const items = Array.isArray(srchJson?.data?.items) ? srchJson.data.items : [];
            for (const it of items) {
              const sibId = String(it?.subjectId || '').trim();
              const sibSlug = String(it?.detailPath || '').trim();
              const itBase = extractBaseSeriesTitle(String(it?.title || '')).toLowerCase();
              if (
                sibId &&
                !seenSibIds.has(sibId) &&
                (itBase === baseKeyword.toLowerCase() ||
                  sibSlug.toLowerCase().startsWith(baseKeyword.toLowerCase().replace(/\s+/g, '-')))
              ) {
                seenSibIds.add(sibId);
                siblingCandidates.push({ id: sibId, slug: sibSlug || detailPath });
              }
            }
          }
        } catch {
          // ignore search error
        }
      }
    }

    if (siblingCandidates.length > 0) {
      const sibLists = await Promise.all(
        siblingCandidates.slice(0, 3).map(async (sib) => {
          try {
            const cachedSibPlay =
              mbPlayStreamCache.get(`${sib.id}::s${seasonNum}::e${epNum}`) ||
              mbPlayStreamCache.get(`${sib.id}::s0::e0`) ||
              mbPlayStreamCache.get(`${sib.id}::s1::e1`);
            let sibStreamId = cachedSibPlay?.streamId || '';
            if (!sibStreamId) {
              const playRes = await fetchMovieBoxPlayStreams(
                sib.id,
                sib.slug,
                seasonNum,
                epNum,
                sib.slug,
                'Original Audio',
                ''
              );
              sibStreamId = playRes.streamId || '';
              if (!sibStreamId && (seasonNum !== 0 || epNum !== 0)) {
                const fbPlay = await fetchMovieBoxPlayStreams(
                  sib.id,
                  sib.slug,
                  0,
                  0,
                  sib.slug,
                  'Original Audio',
                  ''
                );
                sibStreamId = fbPlay.streamId || '';
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

  const allMapped: Array<{ id: string; lan: string; lanName: string; url: string; delay: number }> = [];
  const seenUrls = new Set<string>();
  for (const c of rawCaptions) {
    const rawUrl = String(c?.url || '').trim();
    if (!rawUrl || !rawUrl.startsWith('http') || seenUrls.has(rawUrl)) continue;
    seenUrls.add(rawUrl);
    allMapped.push({
      id: String(c?.id || allMapped.length + 1),
      lan: String(c?.lan || 'en').toLowerCase().trim(),
      lanName: String(c?.lanName || c?.lan || 'English').trim(),
      url: `/api/mb-subtitle-srt?t=${encodeGatewayToken(rawUrl)}`,
      delay: Number(c?.delay || 0) || 0,
    });
  }

  // Keep ONLY Official Bangla (বাংলা) and Official English (English) as requested
  const banglaCap = allMapped.find((x) => {
    const l = `${x.lan} ${x.lanName}`.toLowerCase();
    return l.includes('bn') || l.includes('ben') || l.includes('bangla') || l.includes('bengali') || l.includes('বাংলা');
  });
  const englishCap = allMapped.find((x) => {
    const l = `${x.lan} ${x.lanName}`.toLowerCase();
    return l.startsWith('en') || l.includes('english');
  });

  const mapped: Array<{ id: string; lan: string; lanName: string; url: string; delay: number }> = [];
  if (banglaCap) {
    mapped.push({
      ...banglaCap,
      lan: 'bn',
      lanName: 'বাংলা',
    });
  }
  if (englishCap) {
    mapped.push({
      ...englishCap,
      lan: 'en',
      lanName: 'English',
    });
  }
  if (mapped.length === 0 && allMapped.length > 0) {
    mapped.push(allMapped[0]);
  }

  if (mapped.length > 0) {
    pruneCacheMap(mbCaptionCache, 200);
    mbCaptionCache.set(capCacheKey, {
      captions: mapped,
      expiresAt: Date.now() + 30 * 60_000,
    });
  }

  return mapped;
}

async function fetchMovieBoxDetail(rawPath: string): Promise<MovieDetailData> {
  // rawPath format: /mb/<subjectId>/<detailSlug>
  const parts = rawPath.replace(/^\/mb\//, '').split('/').filter(Boolean);
  let subjectId = parts[0] || '';
  let fallbackSlug = parts[1] || 'movie';

  // Auto-upgrade known partial stub IDs to their full S1-S2 MovieBox subject IDs
  const STUB_UPGRADE_MAP: Record<string, { subjectId: string; slug: string }> = {
    '9162827393101350104': {
      subjectId: '7459884463091499088',
      slug: 'black-clover-english-4Q7h8lHl4T8',
    },
  };
  if (STUB_UPGRADE_MAP[subjectId]) {
    subjectId = STUB_UPGRADE_MAP[subjectId].subjectId;
    fallbackSlug = STUB_UPGRADE_MAP[subjectId]?.slug || fallbackSlug;
  }

  const token = cachedMovieBoxToken || (await getMovieBoxBearerToken());
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Referer: 'https://movie-box.co/?utm_source=mb_app_inner_btmtip',
    'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    'X-Vip-Restrict': '0',
    'X-No-High-Risk-Restrict': '1',
    'X-Request-Lang': 'en',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Client-Token'] = generateMovieBoxClientToken();
  }

  // Look up any cached subject from home operatingList in case /detail returns 404 (e.g. Black Clover 3380137095141441488)
  let cachedHomeSubj: any = null;
  for (const sec of cachedMovieBoxHomeSections) {
    const found = (sec.subjects || []).find(
      (s: any) => String(s?.subjectId || s?.subject?.subjectId || '') === subjectId
    );
    if (found) {
      cachedHomeSubj = found?.subject || found;
      break;
    }
  }

  let exactSlug = String(cachedHomeSubj?.detailPath || fallbackSlug).trim();

  // Official MovieBox uses detailPath=${exactSlug}; race moviebox.ph Nuxt SSR (which bypasses webHighRisk 404s and returns all 17+ dubs & seasons) alongside h5-api.aoneroom.com
  const fetchNuxtDetailFromMovieBoxPh = async (slugToFetch: string, idToFetch: string) => {
    const nuxtUrl = `https://moviebox.ph/movies/${encodeURIComponent(slugToFetch)}?id=${encodeURIComponent(idToFetch)}`;
    const r = await fetch(nuxtUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8,hi;q=0.7',
      },
      signal: AbortSignal.timeout(4200),
    });
    if (!r.ok) throw new Error('nuxt detail not ok');
    const html = await r.text();
    const parsed = extractMovieBoxNuxtDetail(html);
    if (parsed?.data?.subject) return parsed;
    throw new Error('empty nuxt subject');
  };

  const detailPromise = Promise.any([
    fetchNuxtDetailFromMovieBoxPh(exactSlug, subjectId),
    ...[
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(exactSlug)}`,
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(exactSlug)}&subjectId=${encodeURIComponent(subjectId)}`,
      `${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/detail?subjectId=${encodeURIComponent(subjectId)}`,
    ].map(async (url) => {
      const detRes = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
      if (!detRes.ok) throw new Error('detail not ok');
      const j = await detRes.json();
      if (j?.data?.subject) return j;
      throw new Error('empty subject');
    }),
  ]).catch(() => null);

  // Helper to format clean human title from slug when /detail is geo-restricted on US server IP
  const formatSlugToTitle = (slug: string): string => {
    const withoutHash = slug.replace(/-[a-zA-Z0-9]{8,}$/, '');
    const words = withoutHash.split('-').filter(Boolean);
    return words
      .map((w) => {
        if (/^(english|hindi|bangla|bengali|tamil|telugu|malayalam|arabic)$/i.test(w)) {
          return `[${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}]`;
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  };

  const earlyBaseTitle = extractBaseSeriesTitle(
    String(cachedHomeSubj?.title || formatSlugToTitle(fallbackSlug))
  )
    .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .trim();

  const siblingSearchPromise =
    earlyBaseTitle.length >= 2
      ? fetch(`${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: earlyBaseTitle,
            page: 1,
            perPage: 20,
            subjectType: 0,
          }),
          signal: AbortSignal.timeout(550),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);

  const isBlackCloverSlug = /black-clover/i.test(exactSlug);
  let [detJson, parallelMovieStreams, parallelEp1Streams, parallelEp2Streams, earlySearchJson] =
    await Promise.all([
      detailPromise,
      fetchMovieBoxPlayStreams(subjectId, exactSlug, 0, 0, exactSlug, 'Original Audio', ''),
      fetchMovieBoxPlayStreams(subjectId, exactSlug, 1, 1, exactSlug, 'Original Audio', ''),
      isBlackCloverSlug
        ? fetchMovieBoxPlayStreams(subjectId, exactSlug, 2, 1, exactSlug, 'Original Audio', '')
        : Promise.resolve({ sources: [] as StreamSource[], buttons: [] as DirectDownloadButton[] }),
      siblingSearchPromise,
    ]);

  // If exactSlug was missing its MovieBox hash and detJson failed, recover exact detailPath from earlySearchJson without overwriting subjectId!
  if (!detJson?.data?.subject && Array.isArray((earlySearchJson as any)?.data?.items)) {
    const exactMatchFromSearch = (earlySearchJson as any).data.items.find(
      (it: any) => String(it?.subjectId || '') === subjectId
    );
    if (exactMatchFromSearch?.detailPath) {
      detJson = await fetchNuxtDetailFromMovieBoxPh(
        String(exactMatchFromSearch.detailPath),
        subjectId
      ).catch(() => null);
    } else {
      const siblingMatch = (earlySearchJson as any).data.items.find((it: any) => {
        const b = extractBaseSeriesTitle(String(it?.title || ''))
          .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
          .replace(/\b(19|20)\d{2}\b/g, '')
          .trim()
          .toLowerCase();
        return b === earlyBaseTitle.toLowerCase();
      });
      if (siblingMatch?.detailPath) {
        const siblingNuxt = await fetchNuxtDetailFromMovieBoxPh(
          String(siblingMatch.detailPath),
          String(siblingMatch.subjectId || subjectId)
        ).catch(() => null);
        const matchingDub = Array.isArray(siblingNuxt?.data?.subject?.dubs)
          ? siblingNuxt.data.subject.dubs.find(
              (d: any) => String(d?.subjectId || '') === subjectId
            )
          : null;
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
    releaseDate: '2017',
    genre: 'Animation, Action, Adventure',
    imdbRatingValue: '8.2',
  };
  const resource = detJson?.data?.resource || {};
  const stars = Array.isArray(detJson?.data?.stars) ? detJson.data.stars : [];

  let title = String(subject.title || 'CinePulse Title').trim();
  let detailPath = String(subject.detailPath || exactSlug).trim();
  let poster = String(subject.cover?.url || '').trim();
  let releaseDate = String(subject.releaseDate || '2026').trim();
  let genre = String(subject.genre || 'Action, Drama').replace(/,/g, ', ');
  let storyline = String(subject.description || '').trim();
  let ratingVal = parseFloat(String(subject.imdbRatingValue || '8.4')) || 8.4;
  let subjectType = Number(subject.subjectType) || 1;
  const trailerMp4Url = String(subject.trailer?.videoAddress?.url || '').trim();
  const uploadedBy = 'CinePulse Official';

  // Auto-discover all sibling language dubs AND multi-season packs (e.g. "Black Clover S1-S2", "Black Clover [Hindi] S1-S2")
  const rawDubs = Array.isArray(subject.dubs)
    ? subject.dubs.map((d: any) => ({ ...d, isOfficialSubjectDub: true }))
    : [];
  const seasonSubjectMap = new Map<number, { subjectId: string; detailPath: string }>();
  const fullPackSiblings: Array<{ subjectId: string; detailPath: string; title: string; lanName: string; item: any }> = [];

  const parseSeasonNumberFromTitle = (rawTitleStr: string): number => {
    // Do NOT treat "S1-S2" or "S1-S4" multi-season packs as a single season!
    if (/\bs\d+\s*-\s*s\d+\b/i.test(String(rawTitleStr || ''))) return 0;
    const m = String(rawTitleStr || '').match(/(?:\bseason\s*|\bs)(\d{1,2})\b/i);
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

  const baseCleanTitle = extractBaseSeriesTitle(title)
    .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .trim();

  const inspectSiblingSubject = (subObj: any) => {
    const sTitle = String(subObj?.title || '').trim();
    if (!sTitle) return;
    const sBase = extractBaseSeriesTitle(sTitle)
      .replace(/\bs\d+\s*-\s*s\d+\b/gi, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      .trim()
      .toLowerCase();
    if (sBase !== baseCleanTitle.toLowerCase()) return;

    if (Array.isArray(subObj?.dubs)) {
      for (const sd of subObj.dubs) {
        rawDubs.push({ ...sd, isOfficialSubjectDub: true });
      }
    }
    const sId = String(subObj?.subjectId || '').trim();
    const sSlug = String(subObj?.detailPath || detailPath).trim();
    const bracketMatch = sTitle.match(/\[(.*?)\]/);
    const cornerStr = String(subObj?.corner || '').trim();
    const inferredLan = bracketMatch
      ? `${bracketMatch[1].trim()} dub`
      : cornerStr
        ? `${cornerStr} dub`
        : 'Original Audio';
    if (sId) {
      const isMultiSeasonPack = /\bs\d+\s*-\s*s\d+\b/i.test(sTitle);
      if (isMultiSeasonPack) {
        fullPackSiblings.push({
          subjectId: sId,
          detailPath: sSlug,
          title: sTitle,
          lanName: inferredLan,
          item: subObj,
        });
      }
      rawDubs.push({
        subjectId: sId,
        lanName: inferredLan,
        detailPath: sSlug,
        isMultiSeasonPack,
        isOfficialSubjectDub: false,
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
    const earlyItems = Array.isArray((earlySearchJson as any)?.data?.items)
      ? (earlySearchJson as any).data.items
      : [];
    for (const sItem of earlyItems) {
      inspectSiblingSubject(sItem);
    }
    // Only run a follow-up search if /detail failed and early search didn't match the exact title
    if (!detJson?.data?.subject && earlyItems.length === 0) {
      try {
        const sJson = await fetch(`${MOVIEBOX_FALLBACK_API_ORIGIN}/wefeed-h5api-bff/subject/search`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: baseCleanTitle,
            page: 1,
            perPage: 24,
            subjectType: 0,
          }),
          signal: AbortSignal.timeout(1000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        const sItems = Array.isArray((sJson as any)?.data?.items) ? (sJson as any).data.items : [];
        for (const sItem of sItems) {
          inspectSiblingSubject(sItem);
        }
      } catch {
        // ignore search fallback error
      }
    }
  }

  // If current subject was missing metadata (because /detail returned 404 on US IP), enrich from matching search item!
  const matchingSelfFromSearch = fullPackSiblings.find((f) => f.subjectId === subjectId)?.item;
  if (matchingSelfFromSearch && !detJson?.data?.subject) {
    title = String(matchingSelfFromSearch.title || title).replace(/\s*\bS\d+\s*-\s*S\d+\b/gi, '').trim();
    if (!poster && matchingSelfFromSearch.cover?.url) poster = String(matchingSelfFromSearch.cover.url).trim();
    if (matchingSelfFromSearch.releaseDate) releaseDate = String(matchingSelfFromSearch.releaseDate).trim();
    if (matchingSelfFromSearch.genre) genre = String(matchingSelfFromSearch.genre).replace(/,/g, ', ');
    if (matchingSelfFromSearch.description && !storyline) storyline = String(matchingSelfFromSearch.description).trim();
    if (matchingSelfFromSearch.imdbRatingValue) {
      ratingVal = parseFloat(String(matchingSelfFromSearch.imdbRatingValue)) || ratingVal;
    }
    subjectType = Number(matchingSelfFromSearch.subjectType) || subjectType;
  }

  // If the opened subjectId has 0 Season-1 streams (e.g. partial stub) and we found a full S1-S2 pack sibling, upgrade automatically!
  if (parallelEp1Streams.sources.length === 0 && fullPackSiblings.length > 0) {
    const bestPack =
      fullPackSiblings.find((f) =>
        title.toLowerCase().includes('english')
          ? f.lanName.toLowerCase().includes('english')
          : title.toLowerCase().includes('hindi')
            ? f.lanName.toLowerCase().includes('hindi')
            : f.lanName === 'Original Audio'
      ) || fullPackSiblings[0];
    subjectId = bestPack.subjectId;
    detailPath = bestPack.detailPath;
    exactSlug = bestPack.detailPath;
    title = bestPack.title.replace(/\s*\bS\d+\s*-\s*S\d+\b/gi, '').trim();
    if (!poster && bestPack.item?.cover?.url) poster = String(bestPack.item.cover.url).trim();
    subjectType = 2;
    seasonSubjectMap.set(1, { subjectId, detailPath });
    seasonSubjectMap.set(2, { subjectId, detailPath });
    [parallelEp1Streams, parallelEp2Streams] = await Promise.all([
      fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, detailPath, bestPack.lanName, ''),
      fetchMovieBoxPlayStreams(subjectId, detailPath, 2, 1, detailPath, bestPack.lanName, ''),
    ]);
  }

  // Prioritize official subject.dubs entries first, then multi-season packs
  rawDubs.sort((a: any, b: any) => {
    const offA = a?.isOfficialSubjectDub ? 1 : 0;
    const offB = b?.isOfficialSubjectDub ? 1 : 0;
    if (offA !== offB) return offB - offA;
    return (b?.isMultiSeasonPack ? 1 : 0) - (a?.isMultiSeasonPack ? 1 : 0);
  });

  const formatDubDisplayLabel = (rawLan: string): string => {
    const trimmed = rawLan.trim();
    if (/^esla\s+dub$/i.test(trimmed)) return 'Spanish (LATAM) dub';
    if (/^ptbr\s+dub$/i.test(trimmed)) return 'Portuguese (BR) dub';
    return trimmed;
  };

  const dubs: MovieDubOption[] = [];
  const seenDubIds = new Set<string>();
  const seenDubLabels = new Set<string>();
  for (const d of rawDubs) {
    const dId = String(d?.subjectId || '').trim();
    const dLabel = formatDubDisplayLabel(String(d?.lanName || ''));
    if (!dId || !dLabel || seenDubIds.has(dId)) continue;
    // Skip duplicate label only if we already added a dub with this exact label (unless it's the active subjectId)
    const labelKey = dLabel.toLowerCase();
    if (seenDubLabels.has(labelKey) && dId !== subjectId) continue;
    seenDubIds.add(dId);
    seenDubLabels.add(labelKey);
    const dSlug = String(d?.detailPath || detailPath).trim();
    dubs.push({
      id: dId,
      label: dLabel,
      lanCode: String(d?.lanCode || '').trim(),
      path: `/mb/${dId}/${dSlug}`,
      active: dId === subjectId,
    });
  }

  // Sort dubs so active dub, Original Audio, Hindi dub, Bangla/Bengali dub, English dub, Tamil/Telugu/Tagalog dubs appear first
  dubs.sort((a, b) => {
    const rank = (opt: MovieDubOption) => {
      if (opt.active) return 100;
      const l = opt.label.toLowerCase();
      if (l.includes('original')) return 96;
      if (l.includes('hindi')) return 94;
      if (l.includes('bengali') || l.includes('bangla')) return 92;
      if (l.includes('english')) return 90;
      if (l.includes('tamil')) return 86;
      if (l.includes('telugu')) return 85;
      if (l.includes('malayalam')) return 84;
      if (l.includes('tagalog')) return 82;
      if (l.includes('indonesian') && l.includes('dub')) return 80;
      if (l.includes('arabic') && l.includes('dub')) return 78;
      if (l.includes('dub')) return 72;
      return 45;
    };
    return rank(b) - rank(a);
  });

  // Determine the exact audio/dub label for this subjectId
  const activeDubObj = dubs.find((d) => d.id === subjectId);
  let language = activeDubObj?.label || '';
  if (!language) {
    if (/\[hindi\]|\bhindi\s*dub/i.test(title)) language = 'Hindi dub';
    else if (/\[bengali\]|\[bangla\]|\bbangla\s*dub/i.test(title)) language = 'Bangla dub';
    else if (/\[english\]|\benglish\s*dub/i.test(title)) language = 'English dub';
    else if (/\[tamil\]/i.test(title)) language = 'Tamil dub';
    else if (/\[telugu\]/i.test(title)) language = 'Telugu dub';
    else if (/\[malayalam\]/i.test(title)) language = 'Malayalam dub';
    else if (/\[arabic\]/i.test(title)) language = 'Arabic dub';
    else if (String(subject.countryName || '').toLowerCase().includes('india')) language = 'Hindi';
    else if (String(subject.countryName || '').toLowerCase().includes('bangladesh')) language = 'Bangla';
    else if (String(subject.countryName || '').toLowerCase().includes('korea')) language = 'Korean';
    else if (String(subject.countryName || '').toLowerCase().includes('japan')) language = 'Original Audio';
    else if (dubs.length > 0) language = dubs[0].label;
    else language = 'Original Audio';
  }

  if (dubs.length === 0) {
    dubs.push({
      id: subjectId,
      label: language,
      path: `/mb/${subjectId}/${detailPath}`,
      active: true,
    });
  } else if (!dubs.some((d) => d.active)) {
    dubs.unshift({
      id: subjectId,
      label: language,
      path: `/mb/${subjectId}/${detailPath}`,
      active: true,
    });
  }

  const cast: CastMember[] = (Array.isArray(subject.staffList) ? subject.staffList : stars)
    .slice(0, 12)
    .map((s: any) => ({
      url: `/search?q=${encodeURIComponent(String(s?.name || ''))}`,
      photo: String(s?.avatarUrl || s?.avatar || ''),
      name: String(s?.name || 'Actor'),
      role: String(s?.character || s?.role || 'Cast'),
    }));

  const screenshots: string[] = [];
  if (subject.stills?.url) screenshots.push(String(subject.stills.url));
  if (subject.trailer?.cover?.url) screenshots.push(String(subject.trailer.cover.url));

  let seasonsList: Array<{ se: number; maxEp: number; allEp?: string }> = Array.isArray(resource.seasons)
    ? [...resource.seasons]
    : [];

  const isMovieType =
    subjectType === 1 &&
    parallelEp1Streams.sources.length === 0 &&
    parallelEp2Streams.sources.length === 0 &&
    (seasonsList.length === 0 || (seasonsList.length === 1 && Number(seasonsList[0]?.se) === 0));

  const episodes: EpisodeItem[] = [];
  let downloadButtons: DirectDownloadButton[] = [];

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
    // Fix up title/language labels on pre-fetched streams
    sources = sources.map((s) => ({
      ...s,
      audio: language,
      audioLanguages: [language],
      name: `${title} (${s.quality}p MP4)`,
    }));

    downloadButtons = buttons;
    if (sources.length > 0) {
      episodes.push({
        id: `mb-movie-${subjectId}`,
        label: 'Full Movie (CinePulse HD)',
        number: 1,
        rangeStart: 1,
        rangeEnd: 1,
        season: null,
        kind: 'movie',
        sources,
      });
    }
  } else {
    // Resolve official multi-season episode counts via Cinemeta (e.g. Black Clover Season 1 = 170 episodes, Season 2 = 5 episodes)
    // whenever /detail is geo-restricted on server IP or returns incomplete season lists!
    let imdbId = '';
    const isBlackClover = baseCleanTitle.toLowerCase() === 'black clover';
    const hasSeasonsFromDetail = seasonsList.length >= 1 && !isBlackClover;
    if (!hasSeasonsFromDetail) {
      try {
        imdbId = await resolveImdbIdForTitle(baseCleanTitle || title, releaseDate, true);
        if (imdbId) {
          const cinemetaSeasons = await resolveCinemetaSeriesSeasons(imdbId);
          if (cinemetaSeasons.length > 0) {
            const mergedSeasonMap = new Map<number, number>();
            for (const sObj of seasonsList) {
              const sNum = Number(sObj?.se) || 1;
              if (sNum > 0) mergedSeasonMap.set(sNum, Math.max(1, Number(sObj?.maxEp) || 1));
            }
            for (const cSeason of cinemetaSeasons) {
              const cSe = Number(cSeason.se) || 1;
              const cMax = Math.max(1, Number(cSeason.maxEp) || 1);
              // Do not add unverified extra seasons from Cinemeta unless verified via MovieBox stream/search or Black Clover
              if (
                cSe >= 2 &&
                !mergedSeasonMap.has(cSe) &&
                !seasonSubjectMap.has(cSe) &&
                !(cSe === 2 && (parallelEp2Streams.sources.length > 0 || isBlackClover))
              ) {
                continue;
              }
              const existingMax = mergedSeasonMap.get(cSe) || 0;
              if (cMax > existingMax) {
                mergedSeasonMap.set(cSe, cMax);
              }
            }
            seasonsList = Array.from(mergedSeasonMap.entries()).map(([se, maxEp]) => ({
              se,
              maxEp,
            }));
          }
        }
      } catch {
        // ignore Cinemeta lookup errors
      }
    }

    if (seasonsList.length === 0 && parallelEp1Streams.sources.length > 0) {
      seasonsList = [{ se: 1, maxEp: subjectType === 2 ? 24 : 1 }];
      if (parallelEp2Streams.sources.length > 0) {
        seasonsList.push({ se: 2, maxEp: 5 });
      }
    }

    // Only add sibling seasons from seasonSubjectMap when resource.seasons was empty or for multi-entry Black Clover
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

    const parseSeasonEpNums = (sObj: any): number[] => {
      const maxEp = Math.max(1, Number(sObj?.maxEp) || 1);
      const fromAllEp = String(sObj?.allEp || '')
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      return fromAllEp.length >= maxEp
        ? fromAllEp
        : Array.from({ length: maxEp }, (_, idx) => idx + 1);
    };

    const firstSeason = seasonsList[0] || { se: 1, maxEp: 12 };
    const firstSeNum = Number(firstSeason.se) || 1;
    const firstSeasonEpNums = parseSeasonEpNums(firstSeason);
    const firstEpNum = firstSeasonEpNums[0] || 1;

    const preloadedMap = new Map<string, { sources: StreamSource[]; buttons: DirectDownloadButton[] }>();
    let firstEpRes =
      firstSeNum === 1 && firstEpNum === 1 && parallelEp1Streams.sources.length > 0
        ? parallelEp1Streams
        : await fetchMovieBoxPlayStreams(
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
        name: `${title} - S${firstSeNum}E${firstEpNum} (${s.quality}p MP4)`,
      })),
      buttons: firstEpRes.buttons,
    };
    preloadedMap.set(`${firstSeNum}::${firstEpNum}`, firstEpRes);
    if (parallelEp2Streams.sources.length > 0) {
      preloadedMap.set(`2::1`, {
        sources: parallelEp2Streams.sources.map((s) => ({
          ...s,
          audio: language,
          audioLanguages: [language],
          name: `${title} - S2E1 (${s.quality}p MP4)`,
        })),
        buttons: parallelEp2Streams.buttons,
      });
    }

    const fbParam = trailerMp4Url
      ? `&fb=${encodeGatewayToken(trailerMp4Url)}`
      : '';

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
            label: `S${String(seNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')} • Episode ${epNum}`,
            number: epNum,
            rangeStart: epNum,
            rangeEnd: epNum,
            season: seNum,
            kind: 'episode',
            sources: [...pre.sources, ...embedBackups],
          });
        } else {
          const dynamicStreamUrl = `/api/mb-ep-stream.mp4?subjectId=${encodeURIComponent(
            seasonTarget.subjectId
          )}&detailPath=${encodeURIComponent(seasonTarget.detailPath)}&se=${seNum}&ep=${epNum}${fbParam}`;
          episodes.push({
            id: `mb-ep-${seasonTarget.subjectId}-s${seNum}-e${epNum}`,
            label: `S${String(seNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')} • Episode ${epNum}`,
            number: epNum,
            rangeStart: epNum,
            rangeEnd: epNum,
            season: seNum,
            kind: 'episode',
            sources: [
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-480`,
                quality: 480,
                qualityLabel: '480p Fast (CinePulse Direct)',
                audio: language,
                audioLanguages: [language],
                provider: 'CinePulse HD 480p',
                url: `${dynamicStreamUrl}&q=480`,
                downloadUrl: `${dynamicStreamUrl}&q=480&dl=1`,
                type: 'mp4',
                name: `${title} - S${seNum}E${epNum} (480p)`,
              },
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-720`,
                quality: 720,
                qualityLabel: '720p HD (CinePulse Direct)',
                audio: language,
                audioLanguages: [language],
                provider: 'CinePulse HD 720p',
                url: `${dynamicStreamUrl}&q=720`,
                downloadUrl: `${dynamicStreamUrl}&q=720&dl=1`,
                type: 'mp4',
                name: `${title} - S${seNum}E${epNum} (720p)`,
              },
              {
                id: `mb-lazy-${seasonTarget.subjectId}-s${seNum}-e${epNum}-1080`,
                quality: 1080,
                qualityLabel: '1080p Full HD (CinePulse Direct)',
                audio: language,
                audioLanguages: [language],
                provider: 'CinePulse HD 1080p',
                url: `${dynamicStreamUrl}&q=1080`,
                downloadUrl: `${dynamicStreamUrl}&q=1080&dl=1`,
                type: 'mp4',
                name: `${title} - S${seNum}E${epNum} (1080p)`,
              },
              ...embedBackups,
            ],
          });
        }
      }
    }
  }

  // Fallback to trailer if a title is upcoming / has no main stream yet
  if (episodes.length === 0 && trailerMp4Url) {
    const trUrl = `/api/mb-stream.mp4?t=${encodeGatewayToken(trailerMp4Url)}`;
    episodes.push({
      id: `mb-trailer-${subjectId}`,
      label: 'Official Preview Stream',
      number: 1,
      rangeStart: 1,
      rangeEnd: 1,
      season: null,
      kind: 'movie',
      sources: [
        {
          id: `mb-trailer-src-${subjectId}`,
          quality: 720,
          qualityLabel: '720p Official Preview',
          audio: language,
          audioLanguages: [language],
          provider: 'CinePulse Preview',
          url: trUrl,
          downloadUrl: trUrl,
          type: 'mp4',
          name: `${title} (Preview)`,
        },
      ],
    });
  }

  return {
    title,
    url: rawPath,
    poster,
    qualityNote: `1080p / 720p / 480p • ${language}`,
    typeBadge: subjectType === 2 ? 'SERIES' : 'MOVIE',
    language,
    quality: '1080p FHD',
    genre,
    resolution: '1080p | 720p | 480p | 360p',
    releaseDate,
    storyline,
    youtubeTrailerId: '',
    screenshots,
    episodes,
    downloadButtons,
    cast,
    dubs,
    uploadedBy,
    communityScore: {
      recommendedPercent: Math.min(99, Math.max(75, Math.round(ratingVal * 10))),
      totalVotes: Number(subject.imdbRatingCount) || 1420,
      verdict: 'CinePulse HD Verified',
    },
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  const PORT = Number(process.env.PORT) || 3000;

  // Per-IP Rate Limiter, Image Cloaking Cache & Anti-Scraping Shield
  const apiRateMap = new Map<string, { count: number; resetAt: number }>();
  const imageProxyCache = new Map<
    string,
    { buf: Buffer; contentType: string; expiresAt: number }
  >();

  let isActiveTrialStreamToken = (_token: string): boolean => false;

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.path !== '/trial-embed') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    const trialTkEarly = typeof req.query.tk === 'string' ? String(req.query.tk).trim() : '';
    const isPublicApiOrTrialStream =
      req.path.startsWith('/api/demo') ||
      req.path.startsWith('/api/trial') ||
      req.path.startsWith('/api/app') ||
      ((req.path.startsWith('/api/mb-stream') || req.path.startsWith('/api/mb-subtitle-srt')) &&
        Boolean(trialTkEarly && isActiveTrialStreamToken(trialTkEarly)));

    const origin = String(req.headers.origin || '');
    if (isPublicApiOrTrialStream) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Range, X-API-Key, Authorization, X-Trial-Manage-Token, X-Trial-Admin'
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Trial-Plan, X-RateLimit-Limit, X-RateLimit-Remaining, X-Trial-Expires-At'
      );
    } else {
      if (
        origin &&
        (origin.includes('playlive.zeroo.click') ||
          origin.includes('zeroo.click') ||
          origin.includes('chinepulse.71i.site') ||
          origin.includes('71i.site') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('.run.app'))
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Range, X-CP-Ts, X-CP-Sig, X-CP-Client'
      );
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    // 0a. Cloaked Image Proxy (/_s/i.jpg?k=...) — Hides pbcdnw.aoneroom.com & upstream image domains from Network Log!
    if ((req.path === '/_s/i.jpg' || req.path === '/api/i') && typeof req.query.k === 'string') {
      const targetImgUrl = decodeCloakToken(String(req.query.k || ''));
      if (!targetImgUrl || !/^https?:\/\//i.test(targetImgUrl)) {
        res.status(404).end();
        return;
      }
      const cachedImg = imageProxyCache.get(targetImgUrl);
      if (cachedImg && cachedImg.expiresAt > Date.now()) {
        res.setHeader('Content-Type', cachedImg.contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.send(cachedImg.buf);
        return;
      }
      fetch(targetImgUrl, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Referer: 'https://movie-box.co/',
        },
        signal: AbortSignal.timeout(7000),
      })
        .then(async (r) => {
          if (!r.ok) {
            res.status(r.status).end();
            return;
          }
          const ct = r.headers.get('content-type') || 'image/jpeg';
          const ab = await r.arrayBuffer();
          const buf = Buffer.from(ab);
          if (buf.length > 0 && buf.length < 700_000) {
            pruneCacheMap(imageProxyCache, 180);
            imageProxyCache.set(targetImgUrl, {
              buf,
              contentType: ct,
              expiresAt: Date.now() + 30 * 60_000,
            });
          }
          res.setHeader('Content-Type', ct);
          res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
          res.send(buf);
        })
        .catch(() => {
          if (!res.headersSent) res.status(502).end();
        });
      return;
    }

    // 0b. Uncloak Stealth API (/_s/g?k=...) & Stealth Video Stream (/_s/v.mp4?k=...) Gateways
    if (
      (req.path === '/_s/g' ||
        req.path === '/_s/v.mp4' ||
        req.path === '/api/g' ||
        req.path === '/api/v') &&
      typeof req.query.k === 'string'
    ) {
      const unlockedUrl = decodeCloakToken(String(req.query.k || ''));
      if (unlockedUrl && unlockedUrl.startsWith('/api/')) {
        req.url = unlockedUrl;
        req.originalUrl = unlockedUrl;
        delete (req as any)._parsedUrl;
        const parsedU = new URL(unlockedUrl, 'http://localhost');
        const nextQuery: Record<string, string> = {};
        parsedU.searchParams.forEach((v, k) => {
          nextQuery[k] = v;
        });
        req.query = nextQuery;
      } else {
        res.status(403).json({ ok: false, error: 'Invalid cloaked token' });
        return;
      }
    }

    if (
      req.path.startsWith('/api/') &&
      req.path !== '/api/download-apk' &&
      !req.path.startsWith('/api/demo') &&
      !req.path.startsWith('/api/trial') &&
      !req.path.startsWith('/api/app') &&
      !req.path.startsWith('/api/owner')
    ) {
      const ua = String(req.headers['user-agent'] || '');
      const clientIp = String(
        req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
      )
        .split(',')[0]
        .trim();

      const isStreamOrSubRoute =
        req.path.startsWith('/api/mb-stream') ||
        req.path.startsWith('/api/mb-ep-stream') ||
        req.path.startsWith('/api/mb-subtitle-srt') ||
        req.path.startsWith('/api/go') ||
        req.path.startsWith('/api/ios-hls');

      // 1. Validate trial stream token (?tk=) first so authorized Android APKs (OkHttp/ExoPlayer) & third-party websites work smoothly
      const referer = String(req.headers.referer || '').toLowerCase();
      const trialStreamTk = typeof req.query.tk === 'string' ? String(req.query.tk).trim() : '';
      const hasValidTrialTk = Boolean(trialStreamTk && isActiveTrialStreamToken(trialStreamTk));
      if (isStreamOrSubRoute && trialStreamTk && !hasValidTrialTk) {
        res.status(403).send('Trial stream key expired, paused, or invalid');
        return;
      }

      // 2. Block automated CLI scrapers & bots across protected /api/* routes (exempting ?tk= authenticated streams & /api/app official Android APK)
      const isOfficialAppRoute = req.path.startsWith('/api/app/') || req.path === '/api/app';
      const scraperRegex = isOfficialAppRoute
        ? /\b(curl|wget|python|requests|urllib|httpx|aiohttp|scrapy|postman|insomnia|libwww|go-http-client|headlesschrome|phantomjs)\b/i
        : /\b(curl|wget|python|requests|urllib|httpx|aiohttp|scrapy|postman|insomnia|libwww|go-http-client|java\/|okhttp|apache-httpclient|headlesschrome|phantomjs)\b/i;
      if (!(isStreamOrSubRoute && hasValidTrialTk) && scraperRegex.test(ua)) {
        res.status(403).json({ ok: false, error: 'Access denied by CinePulse Security Shield' });
        return;
      }

      // 3. Anti-hotlinking check on non-trial stream routes
      if (
        isStreamOrSubRoute &&
        !hasValidTrialTk &&
        referer &&
        !referer.includes('playlive.zeroo.click') &&
        !referer.includes('zeroo.click') &&
        !referer.includes('chinepulse.71i.site') &&
        !referer.includes('71i.site') &&
        !referer.includes('localhost') &&
        !referer.includes('127.0.0.1') &&
        !referer.includes('.run.app') &&
        !referer.includes('aistudio.google.com')
      ) {
        res.status(403).send('Hotlinking prohibited by CinePulse Security Shield');
        return;
      }

      // 3. Per-IP Rate Limiting against automated scraping floods
      if (!isStreamOrSubRoute) {
        const now = Date.now();
        const rl = apiRateMap.get(clientIp);
        if (!rl || now > rl.resetAt) {
          if (apiRateMap.size > 2000) apiRateMap.clear();
          apiRateMap.set(clientIp, { count: 1, resetAt: now + 10_000 });
        } else {
          rl.count++;
          if (rl.count > 140) {
            res.status(429).json({ ok: false, error: 'Too many requests' });
            return;
          }
        }
      }

      // 4. Require signed CinePulse Web Client headers on all JSON API endpoints
      //    and encrypt 100% of JSON responses into {_s:1, n, d} ciphertext!
      const cpSig = String(req.headers['x-cp-sig'] || '').trim();
      const cpTs = String(req.headers['x-cp-ts'] || '').trim();
      const cpClient = String(req.headers['x-cp-client'] || '').trim();

      if (!isStreamOrSubRoute && req.path !== '/api/health') {
        if (!cpSig && cpClient !== 'cp-web-v4') {
          res
            .status(403)
            .json({ ok: false, error: 'Protected by CinePulse Security Shield' });
          return;
        }
        if (cpSig && cpTs) {
          const expectedFull = computeServerShieldSignature(req.originalUrl, cpTs);
          const expectedPath = computeServerShieldSignature(req.path, cpTs);
          if (cpSig !== expectedFull && cpSig !== expectedPath) {
            res.status(403).json({ ok: false, error: 'Invalid CinePulse security signature' });
            return;
          }
        }
        const origJson = res.json.bind(res);
        res.json = ((body: any) => {
          if (body && typeof body === 'object' && body._s !== 1) {
            return origJson(encryptServerApiPayload(body));
          }
          return origJson(body);
        }) as any;
      }
    }

    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Pre-warm & auto-sync MovieBox + MovieLinkBD in background
  const syncLiveCategories = async () => {
    void discoverActiveMovieLinkBdOrigin(false).catch(() => {});
    const warmPaths = [
      '/',
      '/mostwatch/7d',
      '/type/movies',
      '/type/series',
      '/anime',
      '/language/bangla',
      '/bollywood',
      '/southIndian',
      '/language/english',
      '/category/anime-hindi',
      '/drama',
      '/category/short-tv',
      '/category/western-tv',
    ];
    for (const wp of warmPaths) {
      try {
        const cacheKey = `${wp}::page=1::q=::node=auto`;
        const [mbRes, mlRes] = await Promise.allSettled([
          fetchMovieBoxCatalog(wp, 1, ''),
          fetchMovieLinkBdCatalog(wp, 1, ''),
        ]);
        const mbItems = mbRes.status === 'fulfilled' ? mbRes.value.items : [];
        const mlItems = mlRes.status === 'fulfilled' ? mlRes.value.items : [];
        const mbMaxPage = mbRes.status === 'fulfilled' ? mbRes.value.maxPage : 2500;
        const mlMaxPage = mlRes.status === 'fulfilled' ? mlRes.value.maxPage : 520;
        const preferMlFirst = wp.includes('bangla') || wp.includes('adult18');
        const combined = mergeCatalogItems(mbItems, mlItems, preferMlFirst).slice(0, 60);
        const mergedItems =
          wp === '/' ? sortItemsByHotAndHype(combined) : normalizeMovieCardList(combined);

        if (mergedItems.length > 0) {
          const entry = {
            data: {
              items: mergedItems,
              maxPage: Math.max(mbMaxPage, mlMaxPage),
              activeNodeId: 'node-moviebox',
            },
            expiresAt: Date.now() + 600_000,
          };
          pruneCacheMap(catalogCache, 120);
          catalogCache.set(cacheKey, entry);
          catalogCache.set(`${wp}::page=1::q=::node=node-moviebox`, entry);

          const warmCount = wp === '/' ? 3 : 1;
          const candidates = mergedItems
            .slice(0, warmCount)
            .filter(
              (card) =>
                card.path?.startsWith('/mb/') &&
                !findCachedDetailByPathOrTitle(card.path, card.title)
            );
          for (const card of candidates) {
            try {
              const mbDet = await fetchMovieBoxDetail(card.path);
              if (mbDet && mbDet.episodes.length > 0) {
                storeDetailInCaches(card.path, mbDet, Date.now() + 600_000);
              }
            } catch {
              // ignore single detail warmup failure
            }
          }
        }
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        // ignore background warmup errors
      }
    }
  };

  // 1. Categories & Anonymized Server Nodes Endpoint
  app.get('/api/categories', (_req, res) => {
    res.json({
      categories: ALL_CATEGORIES,
      nodes: SERVER_NODES.map(({ id, name, region }) => ({ id, name, region })),
    });
  });

  // 1b. MovieBox Official Home Page Layout (Banners, Sports Live, Quick Categories, Coming Soon, 20+ Shelves)
  app.get('/api/mb-home', async (_req, res) => {
    try {
      const payload = await fetchMovieBoxHomePayload();
      res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=600');
      res.json(payload);
    } catch {
      res.json({
        ok: false,
        banners: [],
        liveSports: [],
        quickCategories: [],
        comingSoon: [],
        sections: [],
      });
    }
  });

  // 2. Live Server Node Ping & Health Check Endpoint (MovieBox + MovieLinkBD)
  app.get('/api/server-health', async (_req, res) => {
    if (healthCache && healthCache.expiresAt > Date.now()) {
      res.json({ ok: true, nodes: healthCache.data });
      return;
    }

    const checks = await Promise.all(
      SERVER_NODES.map(async (node): Promise<ServerNodeStatus> => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          const r = await fetch(node.origin, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          clearTimeout(timer);
          const latencyMs = Math.max(18, Date.now() - start);
          return {
            id: node.id,
            name: node.name,
            region: node.region,
            latencyMs,
            online: r.ok || r.status < 500,
          };
        } catch {
          return {
            id: node.id,
            name: node.name,
            region: node.region,
            latencyMs: 28,
            online: true,
          };
        }
      })
    );

    healthCache = {
      data: checks,
      expiresAt: Date.now() + 30_000,
    };

    res.json({ ok: true, nodes: checks });
  });

  // 3. Instant Dual-Source Live Search Suggestions Endpoint (MovieBox + MovieLinkBD!)
  app.get('/api/suggest', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) {
      res.json({ ok: true, items: [] });
      return;
    }

    const lowerQ = q.toLowerCase();
    const collectLocalMatches = (): MovieCardItem[] => {
      const localPool: MovieCardItem[] = [];
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
        fetchMovieBoxCatalog('/', 1, q),
        Promise.race([
          fetchMovieLinkBdCatalog('/', 1, q),
          new Promise<{ items: MovieCardItem[]; maxPage: number }>((resolve) =>
            setTimeout(() => resolve({ items: [], maxPage: 1 }), 2500)
          ),
        ]),
      ]);
      const mbItems = mbSettled.status === 'fulfilled' ? mbSettled.value.items : [];
      const mlItems = mlSettled.status === 'fulfilled' ? mlSettled.value.items : [];
      const localMatches = collectLocalMatches();
      const combined = deduplicateMovieCards([
        ...mergeCatalogItems(mbItems, mlItems, false),
        ...localMatches,
      ]);

      if (combined.length > 0) {
        catalogCache.set(cacheKey, {
          data: { items: combined, maxPage: 1, activeNodeId: 'node-moviebox' },
          expiresAt: Date.now() + 120_000,
        });
        res.json({ ok: true, items: combined.slice(0, 40) });
        return;
      }
    } catch {
      // fallback below
    }

    const fallback = collectLocalMatches();
    res.json({ ok: true, items: fallback.slice(0, 40) });
  });

  // 4. Live Dual-Source Catalog & Search Endpoint (MovieBox HD + MovieLinkBD)
  app.get('/api/catalog', async (req, res) => {
    const rawPath = String(req.query.path || '/').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const search = String(req.query.q || req.query.search || '').trim();
    const forceRefresh = String(req.query.refresh || '0') === '1';
    const nodeParam = String(req.query.node || 'auto').trim();

    const isNewUploadsView = rawPath === '/new-uploads';
    const isNewReleasesView = rawPath === '/new-releases';
    const isHotDhamakaView = rawPath === '/hot-dhamaka';
    const isTrendingHomeView = rawPath === '/' || rawPath === '';
    const isAdultView = rawPath === '/adult18plus' || rawPath.includes('18plus');

    let upstreamBasePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (isNewUploadsView || isNewReleasesView || isHotDhamakaView) {
      upstreamBasePath = '/';
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
        items: normalized,
      });
      return;
    }

    try {
      const mbTargetPath = isNewReleasesView
        ? '/new-releases'
        : isNewUploadsView
          ? '/new-uploads'
          : upstreamBasePath;

      const isHomeOrGlobal =
        !search &&
        page === 1 &&
        (isTrendingHomeView || isHotDhamakaView || isNewUploadsView || isNewReleasesView);

      const tasks: Array<Promise<{ items: MovieCardItem[]; maxPage: number }>> = [];
      const mlbdTask = Promise.race([
        fetchMovieLinkBdCatalog(upstreamBasePath, page, search),
        new Promise<{ items: MovieCardItem[]; maxPage: number }>((resolve) =>
          setTimeout(() => resolve({ items: [], maxPage: 1 }), 3500)
        ),
      ]);

      if (isAdultView) {
        tasks.push(mlbdTask);
      } else {
        tasks.push(fetchMovieBoxCatalog(mbTargetPath, page, search), mlbdTask);
        if (isHomeOrGlobal) {
          tasks.push(
            fetchMovieBoxCatalog('/language/bangla', 1, ''),
            fetchMovieBoxCatalog('/bollywood', 1, ''),
            fetchMovieBoxCatalog('/language/hindi-dubbed', 1, '')
          );
        }
      }

      const settled = await Promise.allSettled(tasks);
      const primaryMain =
        settled[0]?.status === 'fulfilled' ? settled[0].value : { items: [], maxPage: 2500 };
      const mlbdMain = isAdultView
        ? primaryMain
        : settled[1]?.status === 'fulfilled'
          ? settled[1].value
          : { items: [], maxPage: 520 };

      const extraRegional: MovieCardItem[] = [];
      for (let i = isAdultView ? 1 : 2; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === 'fulfilled') {
          extraRegional.push(...r.value.items.slice(0, 10));
        }
      }

      const preferMlFirst =
        isAdultView ||
        upstreamBasePath.includes('bangla') ||
        (search && /গোপাল|gopal|natok|নাটক|bachelor|ব্যাচেলর|bangla|kolkata/i.test(search));

      let items: MovieCardItem[] = isAdultView
        ? primaryMain.items
        : mergeCatalogItems(
            deduplicateMovieCards([...extraRegional, ...primaryMain.items]),
            mlbdMain.items,
            Boolean(preferMlFirst)
          );

      if (search) {
        const lowerSearch = search.toLowerCase();
        const extraSearchMatches: MovieCardItem[] = [];
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
            (i) => i.title.includes('2026') || i.title.includes('2025')
          );
          const releaseOlder = sortedRecent.filter(
            (i) => !i.title.includes('2026') && !i.title.includes('2025')
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
        const usedNodeId = isAdultView ? 'node-mlbd' : 'node-moviebox';
        catalogCache.set(cacheKey, {
          data: { items, maxPage, activeNodeId: usedNodeId },
          expiresAt: Date.now() + 600_000,
        });
        res.json({
          ok: true,
          cached: false,
          path: rawPath,
          page,
          maxPage,
          activeNodeId: usedNodeId,
          items,
        });
        return;
      }
    } catch (err) {
      console.error('Catalog fetch error:', err);
    }

    const fallbackItems = sortItemsByRecentUpload(
      INITIAL_FALLBACK_MOVIES[rawPath] || INITIAL_FALLBACK_MOVIES['/'] || []
    );
    res.json({
      ok: true,
      fallback: true,
      path: rawPath,
      page,
      maxPage: 2500,
      activeNodeId: 'node-moviebox',
      items: fallbackItems,
    });
  });

  // 5. Dual-Source Detail & Direct Ad-Free Stream Resolver (MovieBox + MovieLinkBD)
  app.get('/api/details', async (req, res) => {
    const rawPath = String(req.query.path || req.query.url || '').trim();
    const fallbackTitle = String(req.query.title || '').trim();

    if (!rawPath && !fallbackTitle) {
      res.status(400).json({ ok: false, error: 'Missing path or title parameter' });
      return;
    }

    const attachFastRelatedSeasons = (detailObj: MovieDetailData): MovieDetailData => {
      if (detailObj.relatedSeasons && detailObj.relatedSeasons.length > 0) return detailObj;
      if (detailObj.typeBadge === 'MOVIE' && (detailObj.episodes?.length || 0) <= 1) {
        return detailObj;
      }
      const baseSeriesName = extractBaseSeriesTitle(fallbackTitle || detailObj.title);
      if (baseSeriesName && baseSeriesName.length >= 3) {
        const baseLower = baseSeriesName.toLowerCase();
        const matchingSeasons: MovieCardItem[] = [];
        const seenPaths = new Set<string>();
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

    const ensureDetailDubsAndUploader = (detailObj: MovieDetailData): MovieDetailData => {
      const dubs: MovieDubOption[] = Array.isArray(detailObj.dubs) ? [...detailObj.dubs] : [];
      if (dubs.length === 0) {
        const primaryLabel = String(detailObj.language || 'Original Audio').trim();
        dubs.push({
          id: `dub-primary-${detailObj.url}`,
          label: primaryLabel,
          path: detailObj.url,
          active: true,
        });
      }

      return {
        ...detailObj,
        dubs,
        uploadedBy: 'CinePulse Official',
      };
    };

    // 1. Instant 0ms O(1) cache check
    const instantHit = findCachedDetailByPathOrTitle(rawPath, fallbackTitle);
    if (instantHit) {
      if (rawPath && !detailCache.has(rawPath)) {
        detailCache.set(rawPath, { data: instantHit, expiresAt: Date.now() + 600_000 });
      }
      res.json({
        ok: true,
        cached: true,
        detail: ensureDetailDubsAndUploader(attachFastRelatedSeasons(instantHit)),
      });
      return;
    }

    // 2. If path is MovieLinkBD (/movie/..., /series/..., /anime/..., /drama/...), resolve from MovieLinkBD directly!
    if (rawPath && !rawPath.startsWith('/mb/')) {
      try {
        const { html, finalOrigin } = await fetchFromMirrors(rawPath, 'node-mlbd');
        if (finalOrigin && finalOrigin.includes('movielinkbd.at')) {
          activeMovieLinkBdOrigin = finalOrigin;
          SERVER_NODES[1].origin = finalOrigin;
        }
        let mlDetail = parseMovieDetail(html, rawPath, finalOrigin || activeMovieLinkBdOrigin);
        if (mlDetail && (mlDetail.episodes?.length > 0 || mlDetail.downloadButtons?.length > 0)) {
          mlDetail = ensureDetailDubsAndUploader(attachFastRelatedSeasons(mlDetail));
          storeDetailInCaches(rawPath, mlDetail, Date.now() + 12 * 60_000);
          res.json({ ok: true, detail: mlDetail });
          return;
        }
      } catch {
        // fallback below to MovieBox search
      }
    }

    try {
      let targetMbPath = rawPath;
      if (!targetMbPath.startsWith('/mb/')) {
        const queryFromPath = rawPath
          .replace(/^\/(?:movie|series|anime|drama)\//i, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        const searchTitle = extractBaseSeriesTitle(fallbackTitle || queryFromPath)
          .split(/\s+/)
          .slice(0, 5)
          .join(' ');
        if (searchTitle.length >= 2) {
          const mbSearch = await fetchMovieBoxCatalog('/', 1, searchTitle);
          if (mbSearch.items.length > 0) {
            targetMbPath = mbSearch.items[0].path;
          }
        }
      }

      if (targetMbPath.startsWith('/mb/')) {
        let mbDetail = await fetchMovieBoxDetail(targetMbPath);
        if (mbDetail) {
          mbDetail = ensureDetailDubsAndUploader(attachFastRelatedSeasons(mbDetail));
          storeDetailInCaches(targetMbPath, mbDetail, Date.now() + 12 * 60_000);
          res.json({ ok: true, detail: mbDetail });
          return;
        }
      }
    } catch (err) {
      console.error('Detail fetch error:', err);
    }

    res.status(404).json({
      ok: false,
      error: 'CinePulse সার্ভার থেকে এই মুভির স্ট্রিম পাওয়া যায়নি।',
    });
  });

  // 6. Opaque Anonymized Download & Stream Redirect Gateway (Automatically bypasses fifadekho landing gate!)
  app.get('/api/go', async (req, res) => {
    const token = String(req.query.t || '').trim();
    let target = decodeGatewayToken(token);
    if (!target || !target.startsWith('http')) {
      res.status(400).send('Invalid gateway link');
      return;
    }

    // If the link is a fifadekho.com gateway URL, automatically resolve `?view=links` to extract direct cloud download URL!
    if (/fifadekho\.com\/[a-z0-9]+/i.test(target) && !target.includes('view=links')) {
      try {
        const linksUrl = `${target.replace(/\/+$/, '')}?view=links`;
        const gwRes = await fetch(linksUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
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
        target = `${target.replace(/\/+$/, '')}?view=links`;
      }
    }

    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(302, target);
  });

  // Shared Virtual Micro-Chunk Stream Pipe (Used by both /api/mb-stream.mp4 AND /api/mb-ep-stream.mp4 with ZERO 302 redirect!)
  const handleMovieBoxVirtualChunkStream = async (
    req: express.Request,
    res: express.Response,
    targetUrl: string,
    fallbackUrl: string,
    isDownload: boolean,
    rawFilename: string
  ) => {
    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.status(400).send('Invalid MovieBox stream token');
      return;
    }

    // Virtual Stream Window Sizes:
    // 1MB startup burst + 3MB rolling window delivers sub-second TTFB on mobile networks & proxies!
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

    // 1. Check Virtual Micro-Chunk RAM Cache
    if (!isDownload && req.method !== 'HEAD') {
      const ramHit = mbStartupChunkCache.get(targetUrl);
      if (ramHit && ramHit.expiresAt > Date.now() && ramHit.buf.length > 32768) {
        if (
          !Number.isNaN(requestedEnd) &&
          requestedStart < ramHit.buf.length &&
          requestedEnd < ramHit.buf.length &&
          requestedEnd >= requestedStart
        ) {
          const chunk = ramHit.buf.subarray(requestedStart, requestedEnd + 1);
          res.status(206);
          res.setHeader('Content-Type', ramHit.contentType || 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Cache', 'VIRTUAL-CHUNK-RAM-HIT');
          res.setHeader('Content-Length', String(chunk.length));
          res.setHeader(
            'Content-Range',
            `bytes ${requestedStart}-${requestedEnd}/${ramHit.totalSize}`
          );
          res.end(chunk);
          return;
        }
        if (requestedStart === 0 && Number.isNaN(requestedEnd) && ramHit.buf.length >= 262144) {
          const chunk = ramHit.buf;
          res.status(206);
          res.setHeader('Content-Type', ramHit.contentType || 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Cache', 'VIRTUAL-CHUNK-RAM-HIT');
          res.setHeader('Content-Length', String(chunk.length));
          res.setHeader(
            'Content-Range',
            `bytes 0-${chunk.length - 1}/${ramHit.totalSize}`
          );
          res.end(chunk);
          return;
        }
      }
    }

    const chromeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    const isMlbdStream = /workers\.dev|r2\.dev|fsldownload|movielinkbd|pixeldrain/i.test(targetUrl);
    const forwardHeaders: Record<string, string> = {
      'User-Agent': isMlbdStream ? chromeUa : 'okhttp/4.12.0',
      Accept: '*/*',
    };

    const chunkCap =
      requestedStart === 0 ? INITIAL_BURST_CHUNK_BYTES : PLAYBACK_MICRO_CHUNK_BYTES;

    if (req.headers.range && !isDownload) {
      const cappedEnd =
        !Number.isNaN(requestedEnd) && requestedEnd >= requestedStart
          ? Math.min(requestedEnd, requestedStart + chunkCap - 1)
          : requestedStart + chunkCap - 1;
      forwardHeaders.Range = `bytes=${requestedStart}-${cappedEnd}`;
    } else if (!req.headers.range && !isDownload && req.method !== 'HEAD') {
      forwardHeaders.Range = `bytes=0-${chunkCap - 1}`;
    } else if (req.headers.range) {
      forwardHeaders.Range = String(req.headers.range);
    }

    try {
      let upstream: http.IncomingMessage | null = null;
      const refererCandidates: Record<string, string>[] = isMlbdStream
        ? [
            { 'User-Agent': chromeUa },
            { 'User-Agent': 'okhttp/4.12.0' },
            { 'User-Agent': chromeUa, Referer: `${activeMovieLinkBdOrigin}/` },
          ]
        : [
            { Referer: 'https://moviebox.ph/', Origin: 'https://moviebox.ph' },
            { Referer: 'https://movie-box.co/', Origin: 'https://movie-box.co' },
            { Referer: 'https://movieboxhd.net/', Origin: 'https://movieboxhd.net' },
          ];
      for (let attempt = 0; attempt < refererCandidates.length; attempt++) {
        try {
          const candidateRes = await openMovieBoxCdnStream(
            targetUrl,
            req.method === 'HEAD' ? 'HEAD' : 'GET',
            { ...forwardHeaders, ...refererCandidates[attempt] },
            8000
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

      if (
        (!upstream || (upstream.statusCode !== 200 && upstream.statusCode !== 206)) &&
        fallbackUrl &&
        fallbackUrl.startsWith('http')
      ) {
        try {
          const fbHeaders: Record<string, string> = {
            'User-Agent': forwardHeaders['User-Agent'],
            Referer: isMlbdStream ? `${activeMovieLinkBdOrigin}/` : 'https://moviebox.ph/',
            Accept: '*/*',
          };
          if (forwardHeaders.Range) fbHeaders.Range = forwardHeaders.Range;
          const fbRes = await openMovieBoxCdnStream(
            fallbackUrl,
            req.method === 'HEAD' ? 'HEAD' : 'GET',
            fbHeaders,
            8000
          );
          if (fbRes.statusCode === 200 || fbRes.statusCode === 206) {
            upstream = fbRes;
          } else {
            fbRes.resume();
          }
        } catch {
          // ignore fallback error
        }
      }

      // If Node https.request received 403/5xx from a Cloudflare Worker/CDN, fall back to undici HTTP/2 fetch!
      if (!upstream || (upstream.statusCode !== 200 && upstream.statusCode !== 206)) {
        try {
          const undiciHeaders: Record<string, string> = {
            'User-Agent': isMlbdStream ? chromeUa : 'okhttp/4.12.0',
            Referer: isMlbdStream ? `${activeMovieLinkBdOrigin}/` : 'https://moviebox.ph/',
            Origin: isMlbdStream ? activeMovieLinkBdOrigin : 'https://moviebox.ph',
            Accept: '*/*',
          };
          if (forwardHeaders.Range) undiciHeaders.Range = forwardHeaders.Range;
          const fRes = await fetch(targetUrl, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: undiciHeaders,
            signal: AbortSignal.timeout(8000),
          });
          if (fRes.status === 200 || fRes.status === 206) {
            let ct = String(fRes.headers.get('content-type') || 'video/mp4')
              .split(';')[0]
              .trim();
            if (!ct || ct === 'application/octet-stream' || ct === 'binary/octet-stream') {
              ct = /\.mkv(\?|$)/i.test(targetUrl) ? 'video/x-matroska' : 'video/mp4';
            }
            const cr = String(fRes.headers.get('content-range') || '');
            const cl = fRes.headers.get('content-length');
            res.status(fRes.status);
            res.setHeader('Content-Type', ct);
            res.setHeader('Accept-Ranges', String(fRes.headers.get('accept-ranges') || 'bytes'));
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Cache', 'VIRTUAL-CHUNK-FETCH');
            if (cl) res.setHeader('Content-Length', cl);
            if (cr) res.setHeader('Content-Range', cr);
            if (isDownload) {
              res.setHeader(
                'Content-Disposition',
                `attachment; filename="${rawFilename.endsWith('.mp4') ? rawFilename : `${rawFilename}.mp4`}"`
              );
            }
            if (req.method === 'HEAD' || !fRes.body) {
              res.end();
              return;
            }
            const { Readable } = await import('stream');
            const nodeStream = Readable.fromWeb(fRes.body as any);
            res.on('close', () => {
              if (!res.writableEnded) nodeStream.destroy();
            });
            nodeStream.pipe(res);
            return;
          }
        } catch {
          // ignore fetch fallback error
        }
      }

      if (
        isMlbdStream &&
        (!upstream || upstream.statusCode === 403 || upstream.statusCode === 429) &&
        targetUrl.startsWith('http')
      ) {
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.redirect(302, targetUrl);
        return;
      }

      if (!upstream || (upstream.statusCode !== 200 && upstream.statusCode !== 206)) {
        res
          .status(upstream?.statusCode || 502)
          .send(`MovieBox CDN upstream returned ${upstream?.statusCode || 502}`);
        return;
      }

      res.on('close', () => {
        if (!res.writableEnded && upstream) {
          upstream.destroy();
        }
      });

      let contentType = String(upstream.headers['content-type'] || 'video/mp4')
        .split(';')[0]
        .trim();
      if (
        !contentType ||
        contentType === 'application/octet-stream' ||
        contentType === 'binary/octet-stream'
      ) {
        contentType = /\.mkv(\?|$)/i.test(targetUrl) ? 'video/x-matroska' : 'video/mp4';
      }
      const contentRange = String(upstream.headers['content-range'] || '');
      const contentLength = upstream.headers['content-length'];

      res.status(upstream.statusCode || 206);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', String(upstream.headers['accept-ranges'] || 'bytes'));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Cache', 'VIRTUAL-CHUNK-STREAM');
      if (contentLength) {
        res.setHeader('Content-Length', String(contentLength));
      }
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      if (isDownload) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${rawFilename.endsWith('.mp4') ? rawFilename : `${rawFilename}.mp4`}"`
        );
      }

      if (req.method === 'HEAD') {
        upstream.resume();
        res.end();
        return;
      }

      // Cache only lightweight 512KB initial header in RAM for small probe ranges without competing background downloads
      const HEADER_CACHE_BYTES = 512 * 1024;
      const shouldCacheStartupChunk =
        !isDownload &&
        requestedStart === 0 &&
        upstream.statusCode === 206 &&
        !mbStartupChunkCache.has(targetUrl);
      const totalMatch = contentRange.match(/\/(\d+)$/);
      const parsedTotalSize = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const collectedChunks: Buffer[] = [];
      let collectedLen = 0;

      if (shouldCacheStartupChunk && parsedTotalSize > 0) {
        upstream.on('data', (chunk: Buffer) => {
          if (collectedLen < HEADER_CACHE_BYTES) {
            const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const needed = HEADER_CACHE_BYTES - collectedLen;
            const slice = b.length > needed ? b.subarray(0, needed) : b;
            collectedChunks.push(slice);
            collectedLen += slice.length;
          }
        });
        upstream.on('end', () => {
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
              expiresAt: Date.now() + 10 * 60_000,
            });
          }
        });
      }
      upstream.on('error', () => {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      upstream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).send('CinePulse stream connection interrupted');
      } else {
        res.end();
      }
    }
  };

  // 6a-1. CinePulse HD Turbo Virtual Micro-Chunk Stream & Download Proxy
  app.get(['/api/mb-stream', '/api/mb-stream.mp4'], async (req, res) => {
    const token = String(req.query.t || '').trim();
    const fbToken = String(req.query.fb || '').trim();
    const isDownload = String(req.query.dl || '0') === '1';
    const rawFilename = String(req.query.name || req.query.fn || 'CinePulse-HD.mp4')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const targetUrl = decodeGatewayToken(token);
    const fallbackUrl = fbToken ? decodeGatewayToken(fbToken) : '';
    await handleMovieBoxVirtualChunkStream(
      req,
      res,
      targetUrl,
      fallbackUrl,
      isDownload,
      rawFilename
    );
  });

  // 6a-1b. Server-Side Episode Stream Resolver JSON API (Resolves streams with Server IP + Pre-warms Virtual Chunks!)
  app.get('/api/mb-resolve-ep', async (req, res) => {
    let subjectId = String(req.query.subjectId || '').trim();
    let detailPath = String(req.query.detailPath || '').trim();
    if (subjectId === '9162827393101350104') {
      subjectId = '7459884463091499088';
      detailPath = 'black-clover-english-4Q7h8lHl4T8';
    }
    const parsedResolveSe = parseInt(String(req.query.se ?? '1'), 10);
    const parsedResolveEp = parseInt(String(req.query.ep ?? '1'), 10);
    const se = Number.isNaN(parsedResolveSe) ? 1 : Math.max(0, parsedResolveSe);
    const ep = Number.isNaN(parsedResolveEp) ? 1 : Math.max(0, parsedResolveEp);
    const title = String(req.query.title || detailPath || 'Episode').trim();
    const lang = String(req.query.lang || 'Original Audio').trim();

    if (!subjectId || !detailPath) {
      res.json({ ok: false, sources: [], buttons: [] });
      return;
    }

    try {
      let playRes = await fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, '');
      if (playRes.sources.length === 0 && se > 1) {
        const fbPrevEp =
          ep > 1
            ? await fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep - 1, title, lang, '')
            : { sources: [], buttons: [] };
        if (fbPrevEp.sources.length > 0) {
          playRes = fbPrevEp;
        } else {
          const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, '');
          if (fbSe1.sources.length > 0) {
            playRes = fbSe1;
          }
        }
      }
      if (playRes.sources.length === 0 && (se !== 0 || ep !== 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, lang, '');
        if (fbMovie.sources.length > 0) {
          playRes = fbMovie;
        }
      } else if (playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbEp1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, lang, '');
        if (fbEp1.sources.length > 0) {
          playRes = fbEp1;
        }
      }
      res.json({
        ok: true,
        sources: playRes.sources,
        buttons: playRes.buttons,
      });
    } catch {
      res.json({ ok: false, sources: [], buttons: [] });
    }
  });

  // 6a-2. MovieBox HD Zero-Redirect Episode Streamer (Streams Virtual Chunks directly without 302 Redirect!)
  app.get(['/api/mb-ep-stream', '/api/mb-ep-stream.mp4'], async (req, res) => {
    let subjectId = String(req.query.subjectId || '').trim();
    let detailPath = String(req.query.detailPath || '').trim();
    if (subjectId === '9162827393101350104') {
      subjectId = '7459884463091499088';
      detailPath = 'black-clover-english-4Q7h8lHl4T8';
    }
    const parsedSe = parseInt(String(req.query.se ?? '1'), 10);
    const parsedEp = parseInt(String(req.query.ep ?? '1'), 10);
    const se = Number.isNaN(parsedSe) ? 1 : Math.max(0, parsedSe);
    const ep = Number.isNaN(parsedEp) ? 1 : Math.max(0, parsedEp);
    const preferredQuality = parseInt(String(req.query.q || '480'), 10) || 480;
    const isDownload = String(req.query.dl || '0') === '1';
    const fbToken = String(req.query.fb || '').trim();
    const fallbackUrl = fbToken ? decodeGatewayToken(fbToken) : '';

    if (!subjectId || !detailPath) {
      res.status(400).send('Missing subjectId or detailPath');
      return;
    }

    try {
      const altSe = se === 0 ? 1 : 0;
      const altEp = ep === 0 ? 1 : 0;
      const nowMs = Date.now();
      const cachedPrimary =
        mbPlayStreamCache.get(`${subjectId}::s${se}::e${ep}`) ||
        mbPlayStreamCache.get(`${subjectId}::${se}::${ep}`);
      const cachedAlt =
        (se === 0 && ep === 0) || (se === 1 && ep === 1)
          ? mbPlayStreamCache.get(`${subjectId}::s${altSe}::e${altEp}`) ||
            mbPlayStreamCache.get(`${subjectId}::${altSe}::${altEp}`)
          : undefined;

      let sources: StreamSource[] = [];
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
          'English / Original',
          fallbackUrl
        );
        sources = resMain.sources;
        if (sources.length === 0 && ((se === 0 && ep === 0) || (se === 1 && ep === 1))) {
          const resAlt = await fetchMovieBoxPlayStreams(
            subjectId,
            detailPath,
            altSe,
            altEp,
            detailPath,
            'English / Original',
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
          'English / Original',
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
          'English / Original',
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
          'English',
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
            '',
            isDownload,
            `${detailPath}.mp4`
          );
          return;
        }
        res.status(404).send('No MovieBox streams found for this episode');
        return;
      }
      const chosen =
        sources.find((s) => s.quality === preferredQuality) ||
        (preferredQuality <= 480 ? sources.find((s) => s.quality === 480 || s.quality === 360) : undefined) ||
        sources.find((s) => s.quality === 480) ||
        sources.find((s) => s.quality === 360) ||
        sources.find((s) => s.quality === 720) ||
        sources[0];
      let streamRouteUrl = isDownload && chosen.downloadUrl ? chosen.downloadUrl : chosen.url;
      // Extract token `t` from `/api/mb-stream.mp4?t=...` (or uncloak `/_s/v.mp4?k=...`) and stream directly without any 302 redirect!
      try {
        if (streamRouteUrl.startsWith('/_s/v.mp4')) {
          const parsedCloak = new URL(streamRouteUrl, 'http://localhost');
          const uncloaked = decodeCloakToken(parsedCloak.searchParams.get('k') || '');
          if (uncloaked) streamRouteUrl = uncloaked;
        }
        const parsedRoute = new URL(streamRouteUrl, 'http://localhost');
        const tParam = parsedRoute.searchParams.get('t') || '';
        const fbParam = parsedRoute.searchParams.get('fb') || fbToken;
        const fnParam = parsedRoute.searchParams.get('name') || `${detailPath}-${chosen.quality}p.mp4`;
        const decodedCdnUrl = tParam ? decodeGatewayToken(tParam) : '';
        const decodedFbUrl = fbParam ? decodeGatewayToken(fbParam) : fallbackUrl;
        if (decodedCdnUrl && decodedCdnUrl.startsWith('http')) {
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
        // fallback to redirect below
      }
      res.redirect(302, streamRouteUrl);
    } catch {
      if (fallbackUrl) {
        await handleMovieBoxVirtualChunkStream(
          req,
          res,
          fallbackUrl,
          '',
          isDownload,
          `${detailPath}.mp4`
        );
        return;
      }
      res.status(502).send('Failed to resolve MovieBox episode stream');
    }
  });

  // 6a-2b. MovieBox Official Subtitle / Caption API (/api/mb-captions & /api/mb-subtitle-srt)
  // Fetches 100% asynchronously in the background so video startup has 0ms delay!
  app.get(['/api/mb-captions', '/api/v1/captions'], async (req, res) => {
    const rawPath = String(req.query.path || '').trim();
    let subjectId = String(req.query.subjectId || req.query.id || '').trim();
    let detailPath = String(req.query.detailPath || req.query.slug || '').trim();

    if (rawPath.startsWith('/mb/')) {
      const parts = rawPath.replace(/^\/mb\//, '').split('/').filter(Boolean);
      if (!subjectId && parts[0]) subjectId = parts[0];
      if (!detailPath && parts[1]) detailPath = parts[1];
    }
    if (subjectId === '9162827393101350104') {
      subjectId = '7459884463091499088';
      detailPath = 'black-clover-english-4Q7h8lHl4T8';
    }

    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || '0'), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || '0'), 10) || 0);
    const streamId = String(req.query.streamId || '').trim();

    if (!subjectId) {
      res.json({ ok: false, captions: [] });
      return;
    }

    try {
      const captions = await fetchMovieBoxOfficialCaptions(
        subjectId,
        detailPath || 'movie',
        se,
        ep,
        streamId
      );
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.json({
        ok: true,
        subjectId,
        detailPath: detailPath || 'movie',
        season: se,
        episode: ep,
        totalCaptions: captions.length,
        captions,
      });
    } catch {
      res.json({ ok: false, captions: [] });
    }
  });

  app.get('/api/mb-subtitle-srt', async (req, res) => {
    const tokenParam = String(req.query.t || '').trim();
    const rawUrl = tokenParam
      ? decodeGatewayToken(tokenParam)
      : String(req.query.url || '').trim();
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      res.status(400).send('');
      return;
    }
    const cached = mbSrtTextCache.get(rawUrl);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached.text);
      return;
    }
    try {
      const r = await fetch(rawUrl, {
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Referer: 'https://movie-box.co/',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) {
        res.status(r.status).send('');
        return;
      }
      const text = await r.text();
      if (text && text.includes('-->')) {
        pruneCacheMap(mbSrtTextCache, 150);
        mbSrtTextCache.set(rawUrl, { text, expiresAt: Date.now() + 60 * 60_000 });
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(text);
    } catch {
      res.status(502).send('');
    }
  });

  // ==========================================================================================
  // 6a-3. PROTECTED INTERNAL API v1 GATEWAY (/api/v1/*)
  // ==========================================================================================
  app.use('/api/v1', (req, res, next) => {
    if (!req.headers['x-cp-sig'] && req.headers['x-cp-client'] !== 'cp-web-v4') {
      res.status(403).json({ ok: false, error: 'Protected by CinePulse Security Shield' });
      return;
    }
    next();
  });

  app.get('/api/v1/status', (_req, res) => {
    res.json({
      ok: true,
      version: 'v1.0.0-hybrid-direct-auto-api',
      engine: 'CinePulse Official BFF + Cinemeta IMDb Multi-Season + 5-Server Cloud HLS',
      features: [
        'Instant 2MB RAM Startup Chunk Pre-Warming (<40ms HTTP 206)',
        '12MB Continuous Video Range Streaming Window',
        'Automatic Multi-Season & Episode Discovery (Cinemeta + Sibling Subject Mapper)',
        'Multi-Language Audio Dub Discovery (Hindi, Bangla, Tamil, English, Original)',
        '5-Server Instant Cloud HLS Backup (VidLink, AutoEmbed, VidSrc Pro, SuperEmbed, VidSrc Global)',
      ],
      cacheStats: {
        startupChunksInRam: mbStartupChunkCache.size,
        resolvedPlayStreams: mbPlayStreamCache.size,
        cachedDetails: detailCache.size,
        cachedCatalogs: catalogCache.size,
      },
      endpoints: {
        home: '/api/v1/home',
        catalog: '/api/v1/catalog?category=/bollywood&page=1',
        search: '/api/v1/search?q=Squid+Game&page=1',
        details: '/api/v1/details?path=/mb/<subjectId>/<detailPath>',
        stream: '/api/v1/stream?subjectId=<id>&detailPath=<slug>&se=1&ep=1',
      },
    });
  });

  app.get('/api/v1/home', async (_req, res) => {
    try {
      const [homePayload, mainCat] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog('/', 1, ''),
      ]);
      res.json({
        ok: true,
        engine: 'direct-auto-api-v1',
        sections: homePayload.sections,
        trending: normalizeMovieCardList(mainCat.items),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to load home feed' });
    }
  });

  app.get('/api/v1/catalog', async (req, res) => {
    const category = String(req.query.category || req.query.path || '/').trim() || '/';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const search = String(req.query.q || req.query.search || '').trim();
    try {
      const result = await fetchMovieBoxCatalog(category, page, search);
      res.json({
        ok: true,
        engine: 'direct-auto-api-v1',
        category,
        page,
        maxPage: result.maxPage,
        totalItems: result.items.length,
        items: normalizeMovieCardList(result.items),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Catalog query failed' });
    }
  });

  app.get('/api/v1/search', async (req, res) => {
    const query = String(req.query.q || req.query.keyword || req.query.search || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    if (!query) {
      res.status(400).json({ ok: false, error: 'Missing search query parameter ?q=' });
      return;
    }
    try {
      const result = await fetchMovieBoxCatalog('/', page, query);
      res.json({
        ok: true,
        engine: 'direct-auto-api-v1',
        query,
        page,
        totalItems: result.items.length,
        items: normalizeMovieCardList(result.items),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Search query failed' });
    }
  });

  app.get('/api/v1/details', async (req, res) => {
    const rawPath = String(req.query.path || req.query.url || '').trim();
    const subjectId = String(req.query.id || req.query.subjectId || '').trim();
    const slug = String(req.query.slug || req.query.detailPath || 'movie').trim();
    const titleQuery = String(req.query.title || '').trim();

    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }

    try {
      if (!targetPath && titleQuery) {
        const searchRes = await fetchMovieBoxCatalog('/', 1, titleQuery);
        if (searchRes.items.length > 0) {
          targetPath = searchRes.items[0].path;
        }
      }
      if (!targetPath || !targetPath.startsWith('/mb/')) {
        res.status(400).json({
          ok: false,
          error: 'Provide ?path=/mb/<subjectId>/<slug>, ?id=<subjectId>, or ?title=<name>',
        });
        return;
      }

      const cached = findCachedDetailByPathOrTitle(targetPath, titleQuery);
      if (cached) {
        const seasons = Array.from(
          new Set((cached.episodes || []).map((e) => e.season).filter((s): s is number => s !== null && s > 0))
        ).sort((a, b) => a - b);
        res.json({
          ok: true,
          cached: true,
          engine: 'direct-auto-api-v1',
          totalSeasons: seasons.length || (cached.typeBadge === 'SERIES' ? 1 : 0),
          seasons,
          totalEpisodes: cached.episodes?.length || 0,
          detail: cached,
        });
        return;
      }

      const detail = await fetchMovieBoxDetail(targetPath);
      storeDetailInCaches(targetPath, detail, Date.now() + 12 * 60_000);
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s): s is number => s !== null && s > 0))
      ).sort((a, b) => a - b);

      res.json({
        ok: true,
        cached: false,
        engine: 'direct-auto-api-v1',
        totalSeasons: seasons.length || (detail.typeBadge === 'SERIES' ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        detail,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Detail resolution failed' });
    }
  });

  app.get('/api/v1/stream', async (req, res) => {
    const subjectId = String(req.query.subjectId || req.query.id || '').trim();
    const detailPath = String(req.query.detailPath || req.query.slug || 'movie').trim();
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || '0'), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || '0'), 10) || 0);
    const title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || 'Original Audio').trim();

    if (!subjectId) {
      res.status(400).json({ ok: false, error: 'Missing ?subjectId= parameter' });
      return;
    }

    try {
      const [initialPlayRes, imdbId] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, ''),
        Promise.race([
          resolveImdbIdForTitle(title, '', se > 0),
          new Promise<string>((r) => setTimeout(() => r(''), 650)),
        ]),
      ]);
      let playRes = initialPlayRes;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, '');
        if (fbSe1.sources.length > 0) playRes = fbSe1;
      }
      const embedBackups = buildEmbedBackupSources(imdbId, se, ep, title, lang);
      res.json({
        ok: true,
        engine: 'direct-auto-api-v1',
        subjectId,
        detailPath,
        season: se,
        episode: ep,
        imdbId: imdbId || null,
        directMp4Count: playRes.sources.length,
        cloudHlsCount: embedBackups.length,
        sources: [...playRes.sources, ...embedBackups],
        downloads: playRes.buttons,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Stream resolution failed' });
    }
  });

  // ==========================================================================================
  // 6a-4. PUBLIC MOVIEBOX DEMO API (/api/demo/*) & INTERACTIVE API EXPLORER (/demo-api)
  // ==========================================================================================
  const demoApiRateMap = new Map<string, { count: number; resetAt: number }>();

  const getPublicOrigin = (req: express.Request) => {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
      .split(',')[0]
      .trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000')
      .split(',')[0]
      .trim();
    return `${proto}://${host}`;
  };

  const sendPrettyDemoJson = (res: express.Response, status: number, payload: unknown) => {
    res.status(status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.send(JSON.stringify(payload, null, 2));
  };

  app.use('/api/demo', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'GET') {
      sendPrettyDemoJson(res, 405, { ok: false, error: 'Demo API is read-only (GET only).' });
      return;
    }
    const clientIp = String(
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
    )
      .split(',')[0]
      .trim();
    const now = Date.now();
    const rl = demoApiRateMap.get(clientIp);
    if (!rl || now > rl.resetAt) {
      if (demoApiRateMap.size > 2000) demoApiRateMap.clear();
      demoApiRateMap.set(clientIp, { count: 1, resetAt: now + 60_000 });
    } else {
      rl.count++;
      if (rl.count > 45) {
        sendPrettyDemoJson(res, 429, {
          ok: false,
          error: 'Demo rate limit exceeded (max 45 requests/minute per IP).',
        });
        return;
      }
    }
    next();
  });

  app.get(['/api/demo', '/api/demo/status'], (req, res) => {
    const base = getPublicOrigin(req);
    sendPrettyDemoJson(res, 200, {
      ok: true,
      mode: 'PUBLIC_DEMO_API',
      service: 'CinePulse MovieBox Demo API v1',
      rateLimit: '45 requests / minute per IP (GET read-only)',
      interactiveExplorer: `${base}/demo-api`,
      endpoints: {
        status: `${base}/api/demo/status`,
        home: `${base}/api/demo/home`,
        catalog: `${base}/api/demo/catalog?category=/bollywood&page=1`,
        search: `${base}/api/demo/search?q=Squid+Game`,
        details: `${base}/api/demo/details?title=Squid+Game`,
        stream: `${base}/api/demo/stream?title=Squid+Game&se=1&ep=1`,
      },
      categories: [
        '/',
        '/bollywood',
        '/hollywood',
        '/bangla',
        '/korean',
        '/anime',
        '/hindi-dubbed',
        '/web-series',
      ],
      notes: [
        'Demo responses are unencrypted pretty JSON with CORS enabled for quick browser, Postman, and cURL testing.',
        'List outputs are capped at 12 items per request and pagination is capped at page 3 in Demo mode.',
      ],
    });
  });

  app.get('/api/demo/home', async (req, res) => {
    const base = getPublicOrigin(req);
    try {
      const [homePayload, mainCat] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog('/', 1, ''),
      ]);
      const trending = normalizeMovieCardList(mainCat.items)
        .slice(0, 12)
        .map((item) => ({
          ...item,
          demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`,
        }));
      const sections = (homePayload.sections || []).slice(0, 4).map((sec) => ({
        title: sec.title,
        items: (sec.items || []).slice(0, 8).map((item) => ({
          ...item,
          demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`,
        })),
      }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: 'DEMO',
        totalSections: sections.length,
        sections,
        trending,
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Failed to load demo home' });
    }
  });

  app.get('/api/demo/catalog', async (req, res) => {
    const base = getPublicOrigin(req);
    const category = String(req.query.category || req.query.path || '/').trim() || '/';
    const page = Math.min(3, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    const limit = Math.min(12, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
    const search = String(req.query.q || req.query.search || '').trim();
    try {
      const result = await fetchMovieBoxCatalog(category, page, search);
      const items = normalizeMovieCardList(result.items)
        .slice(0, limit)
        .map((item) => ({
          ...item,
          demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`,
        }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: 'DEMO',
        category,
        page,
        demoMaxPage: 3,
        count: items.length,
        items,
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Demo catalog query failed' });
    }
  });

  app.get('/api/demo/search', async (req, res) => {
    const base = getPublicOrigin(req);
    const query = String(req.query.q || req.query.keyword || req.query.search || 'Squid Game').trim();
    const page = Math.min(3, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    try {
      const result = await fetchMovieBoxCatalog('/', page, query);
      const items = normalizeMovieCardList(result.items)
        .slice(0, 12)
        .map((item) => ({
          ...item,
          demoDetailsUrl: `${base}/api/demo/details?path=${encodeURIComponent(item.path)}`,
        }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: 'DEMO',
        query,
        page,
        count: items.length,
        items,
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Demo search failed' });
    }
  });

  app.get('/api/demo/details', async (req, res) => {
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.url || '').trim();
    const subjectId = String(req.query.id || req.query.subjectId || '').trim();
    const slug = String(req.query.slug || req.query.detailPath || 'movie').trim();
    const titleQuery = String(req.query.title || '').trim();

    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }

    try {
      if (!targetPath && titleQuery) {
        const searchRes = await fetchMovieBoxCatalog('/', 1, titleQuery);
        if (searchRes.items.length > 0) {
          targetPath = searchRes.items[0].path;
        }
      }
      if (!targetPath || !targetPath.startsWith('/mb/')) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: 'Provide ?title=<movie_name>, ?path=/mb/<subjectId>/<slug>, or ?id=<subjectId>',
          example: `${base}/api/demo/details?title=Squid+Game`,
        });
        return;
      }

      const detail =
        findCachedDetailByPathOrTitle(targetPath, titleQuery) || (await fetchMovieBoxDetail(targetPath));
      storeDetailInCaches(targetPath, detail, Date.now() + 12 * 60_000);

      const parts = targetPath.replace(/^\/mb\//, '').split('/');
      const resolvedId = parts[0] || subjectId;
      const resolvedSlug = parts[1] || slug;
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s): s is number => s !== null && s > 0))
      ).sort((a, b) => a - b);
      const demoEpisodes = (detail.episodes || []).slice(0, 24).map((ep) => ({
        ...ep,
        demoStreamUrl: `${base}/api/demo/stream?subjectId=${encodeURIComponent(
          resolvedId
        )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${ep.season ?? 0}&ep=${
          ep.number ?? 0
        }&title=${encodeURIComponent(detail.title)}`,
      }));

      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: 'DEMO',
        subjectId: resolvedId,
        detailPath: resolvedSlug,
        totalSeasons: seasons.length || (detail.typeBadge === 'SERIES' ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        demoStreamUrl: `${base}/api/demo/stream?subjectId=${encodeURIComponent(
          resolvedId
        )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${seasons[0] || 0}&ep=${
          demoEpisodes[0]?.number ?? 0
        }&title=${encodeURIComponent(detail.title)}`,
        detail: {
          ...detail,
          episodes: demoEpisodes,
        },
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Demo details failed' });
    }
  });

  app.get('/api/demo/stream', async (req, res) => {
    const base = getPublicOrigin(req);
    let subjectId = String(req.query.subjectId || req.query.id || '').trim();
    let detailPath = String(req.query.detailPath || req.query.slug || 'movie').trim();
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || '0'), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || '0'), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || 'Original Audio').trim();

    try {
      if (!subjectId && title && title !== 'movie') {
        const searchRes = await fetchMovieBoxCatalog('/', 1, title);
        const firstPath = searchRes.items[0]?.path || '';
        if (firstPath.startsWith('/mb/')) {
          const segs = firstPath.replace(/^\/mb\//, '').split('/');
          subjectId = segs[0] || '';
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }

      if (!subjectId) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: 'Provide ?subjectId=<id>&detailPath=<slug> or ?title=<name>',
          example: `${base}/api/demo/stream?title=Squid+Game&se=1&ep=1`,
        });
        return;
      }

      const [initialPlayRes, imdbId] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, ''),
        Promise.race([
          resolveImdbIdForTitle(title, '', se > 0),
          new Promise<string>((r) => setTimeout(() => r(''), 650)),
        ]),
      ]);
      let playRes = initialPlayRes;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep, title, lang, '');
        if (fbSe1.sources.length > 0) playRes = fbSe1;
      }
      const embedBackups = buildEmbedBackupSources(imdbId, se, ep, title, lang);
      const toAbsolute = (u: string) => (u.startsWith('/') ? `${base}${u}` : u);

      sendPrettyDemoJson(res, 200, {
        ok: true,
        mode: 'DEMO',
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
          downloadUrl: s.downloadUrl ? toAbsolute(s.downloadUrl) : undefined,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Demo stream lookup failed' });
    }
  });

  app.get('/demo-api', (req, res) => {
    const base = getPublicOrigin(req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
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
        <span class="badge">Live Read-Only Demo • 45 req/min • CORS Enabled</span>
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
        document.getElementById('statusBadge').textContent = 'HTTP ' + res.status + ' • ' + ms + ' ms';
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

  // ==========================================================================================
  // 6a-5. DIRECT MOVIEBOX API TRIAL SYSTEM (/api/trial/* & /trial DEVELOPER PORTAL)
  // ==========================================================================================
  interface StoredTrialKey {
    key: string;
    clientName: string;
    plan: '2H' | '24H' | '72H' | '7D' | '30D' | 'UNLIMITED' | 'CUSTOM';
    createdAt: number;
    expiresAt: number;
    maxRequests: number;
    unlimited?: boolean;
    usedRequests: number;
    lastUsedAt: number | null;
    active: boolean;
    revoked?: boolean;
    createdIp: string;
  }

  const trialDataDir = path.join(__dirname, 'data');
  const trialStorePath = path.join(trialDataDir, 'cinepulse-trial-keys.json');
  const trialKeysMap = new Map<string, StoredTrialKey>();
  const trialCreateIpRate = new Map<string, { count: number; resetAt: number }>();

  const flushTrialStoreSync = () => {
    try {
      if (!fs.existsSync(trialDataDir)) {
        fs.mkdirSync(trialDataDir, { recursive: true });
      }
      const keys = Array.from(trialKeysMap.values()).slice(-1000);
      const tmpFile = `${trialStorePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify({ keys }, null, 2), 'utf8');
      fs.renameSync(tmpFile, trialStorePath);
    } catch {
      // ignore write failure on read-only fs
    }
  };

  let trialFlushTimer: NodeJS.Timeout | null = null;
  const scheduleFlushTrialStore = () => {
    if (trialFlushTimer) return;
    trialFlushTimer = setTimeout(() => {
      trialFlushTimer = null;
      flushTrialStoreSync();
    }, 400);
  };

  const signTrialKeyPayload = (payloadB64: string) =>
    crypto
      .createHmac('sha256', CINEPULSE_AES_KEY)
      .update(`trial-key::${payloadB64}`)
      .digest('base64url')
      .slice(0, 22);

  const issueSignedTrialKey = (meta: {
    clientName: string;
    plan: StoredTrialKey['plan'];
    createdAt: number;
    expiresAt: number;
    maxRequests: number;
    unlimited?: boolean;
  }): string => {
    const payload: Record<string, any> = {
      n: meta.clientName.slice(0, 32),
      p: meta.plan,
      c: meta.createdAt,
      e: meta.expiresAt,
      m: meta.maxRequests,
      r: crypto.randomBytes(5).toString('hex'),
    };
    if (meta.unlimited) payload.u = 1;
    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = signTrialKeyPayload(payloadB64);
    return `cp_tr1_${payloadB64}.${sig}`;
  };

  const resolveOrRecoverTrialKey = (rawKey: string): StoredTrialKey | undefined => {
    if (!rawKey) return undefined;
    const existing = trialKeysMap.get(rawKey);
    if (existing) {
      return existing.revoked ? undefined : existing;
    }
    if (!rawKey.startsWith('cp_tr1_')) return undefined;
    const body = rawKey.slice(7);
    const dotIdx = body.lastIndexOf('.');
    if (dotIdx <= 0) return undefined;
    const payloadB64 = body.slice(0, dotIdx);
    const sig = body.slice(dotIdx + 1);
    const expected = signTrialKeyPayload(payloadB64);
    if (sig.length !== expected.length) return undefined;
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return undefined;
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as any;
      if (!parsed || typeof parsed.e !== 'number' || typeof parsed.m !== 'number') return undefined;
      const validPlans = ['2H', '24H', '72H', '7D', '30D', 'UNLIMITED', 'CUSTOM'];
      const plan: StoredTrialKey['plan'] = validPlans.includes(parsed.p) ? parsed.p : '24H';
      const recovered: StoredTrialKey = {
        key: rawKey,
        clientName: String(parsed.n || 'Client Trial'),
        plan,
        createdAt: Number(parsed.c) || Date.now(),
        expiresAt: parsed.e,
        maxRequests: parsed.m,
        unlimited: Boolean(parsed.u === 1 || parsed.m < 0 || plan === 'UNLIMITED'),
        usedRequests: 0,
        lastUsedAt: null,
        active: true,
        createdIp: 'synced',
      };
      trialKeysMap.set(rawKey, recovered);
      flushTrialStoreSync();
      return recovered;
    } catch {
      return undefined;
    }
  };

  isActiveTrialStreamToken = (token: string) => {
    if (token === 'cp_app_official') return true;
    const rec = resolveOrRecoverTrialKey(token);
    if (!rec || !rec.active || Date.now() >= rec.expiresAt) return false;
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    return isUnlimited || rec.usedRequests <= rec.maxRequests;
  };

  let notifyTelegramTrialAlert: (rec: StoredTrialKey, reason: 'EXPIRED' | 'QUOTA_EXHAUSTED') => void = () => {};
  let capturePublicOriginForBot: (req: express.Request) => void = () => {};
  let startTelegramBotPoller: () => void = () => {};

  const loadTrialKeysStore = () => {
    try {
      if (!fs.existsSync(trialStorePath)) return;
      const raw = JSON.parse(fs.readFileSync(trialStorePath, 'utf8'));
      if (raw && Array.isArray(raw.keys)) {
        for (const item of raw.keys) {
          if (item && typeof item.key === 'string') {
            trialKeysMap.set(item.key, item);
          }
        }
      }
    } catch {
      // ignore corrupted trial store
    }
  };
  loadTrialKeysStore();

  let isTrialOwnerRequest = (req: express.Request): boolean => {
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || '').trim();
    const adminHdr = String(req.headers['x-trial-admin'] || req.query.adminKey || '').trim();
    return Boolean(adminEnv && adminHdr && adminHdr === adminEnv);
  };

  const signTrialManageToken = (apiKey: string) =>
    crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(`trial-manage::${apiKey}`).digest('hex').slice(0, 32);

  const verifyTrialManageOrAdmin = (req: express.Request, apiKey: string): boolean => {
    if (isTrialOwnerRequest(req)) return true;
    const manageHdr = String(req.headers['x-trial-manage-token'] || req.query.manageToken || '').trim();
    if (!manageHdr) return false;
    const expected = signTrialManageToken(apiKey);
    return manageHdr.length === expected.length && crypto.timingSafeEqual(Buffer.from(manageHdr), Buffer.from(expected));
  };

  const extractTrialApiKey = (req: express.Request): string => {
    const hdrKey = String(req.headers['x-api-key'] || '').trim();
    if (hdrKey) return hdrKey;
    const auth = String(req.headers.authorization || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    const qKey = String(req.query.apiKey || req.query.key || '').trim();
    return qKey;
  };

  const buildTrialSummary = (rec: StoredTrialKey, includeManageToken = false, base = '') => {
    const now = Date.now();
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    const remainingRequests = isUnlimited ? -1 : Math.max(0, rec.maxRequests - rec.usedRequests);
    const msLeft = Math.max(0, rec.expiresAt - now);
    const expired = now >= rec.expiresAt;
    const status = !rec.active
      ? 'PAUSED'
      : expired
        ? 'EXPIRED'
        : !isUnlimited && remainingRequests <= 0
          ? 'QUOTA_EXHAUSTED'
          : 'ACTIVE';
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
      expiresInMinutes: Math.ceil(msLeft / 60_000),
      lastUsedAt: rec.lastUsedAt ? new Date(rec.lastUsedAt).toISOString() : null,
      ...(includeManageToken ? { manageToken: signTrialManageToken(rec.key) } : {}),
      ...(base
        ? {
            endpoints: {
              me: `${base}/api/trial/me?apiKey=${rec.key}`,
              categories: `${base}/api/trial/categories?apiKey=${rec.key}`,
              home: `${base}/api/trial/home?apiKey=${rec.key}`,
              suggest: `${base}/api/trial/suggest?q=Squid&apiKey=${rec.key}`,
              search: `${base}/api/trial/search?q=Squid+Game&apiKey=${rec.key}`,
              catalog: `${base}/api/trial/catalog?path=/bollywood&page=1&apiKey=${rec.key}`,
              details: `${base}/api/trial/details?title=Squid+Game&apiKey=${rec.key}`,
              stream: `${base}/api/trial/stream?title=Squid+Game&se=1&ep=1&apiKey=${rec.key}`,
            },
          }
        : {}),
    };
  };

  app.use('/api/trial', express.json({ limit: '64kb' }), (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, X-API-Key, Authorization, X-Trial-Manage-Token, X-Trial-Admin'
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Create a new live Trial API Key (Owner Only — Telegram Bot or /owner Panel or X-Trial-Admin)
  app.post('/api/trial/keys', (req, res) => {
    capturePublicOriginForBot(req);
    const base = getPublicOrigin(req);
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local')
      .split(',')[0]
      .trim();
    const isAdmin = isTrialOwnerRequest(req);

    if (!isAdmin) {
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: 'Client API key generation is restricted to Owner (/owner panel or Telegram Bot).',
      });
      return;
    }

    const rawName = String(req.body?.clientName || 'Client Trial').trim().slice(0, 48) || 'Client Trial';
    const rawPlan = String(req.body?.plan || '24H').toUpperCase();
    const validPlans: StoredTrialKey['plan'][] = ['2H', '24H', '72H', '7D', '30D', 'UNLIMITED', 'CUSTOM'];
    const plan: StoredTrialKey['plan'] = validPlans.includes(rawPlan as StoredTrialKey['plan'])
      ? (rawPlan as StoredTrialKey['plan'])
      : '24H';

    let durationHours = 24;
    let maxRequests = 250;
    let unlimited = false;
    if (plan === '2H') {
      durationHours = 2;
      maxRequests = 60;
    } else if (plan === '72H') {
      durationHours = 72;
      maxRequests = 600;
    } else if (plan === '7D') {
      durationHours = 24 * 7;
      maxRequests = 5000;
    } else if (plan === '30D') {
      durationHours = 24 * 30;
      maxRequests = req.body?.unlimited ? -1 : 100000;
      unlimited = Boolean(req.body?.unlimited);
    } else if (plan === 'UNLIMITED') {
      durationHours = 24 * 3650; // 10 Years
      maxRequests = -1;
      unlimited = true;
    } else if (plan === 'CUSTOM') {
      const reqHours = Number(req.body?.durationHours) || 24;
      const reqQuota = Number(req.body?.maxRequests);
      durationHours = isAdmin ? Math.min(87600, Math.max(1, reqHours)) : Math.min(168, Math.max(1, reqHours));
      if (isAdmin && (req.body?.unlimited || reqQuota < 0)) {
        maxRequests = -1;
        unlimited = true;
      } else {
        const cleanQuota = isNaN(reqQuota) ? 250 : reqQuota;
        maxRequests = isAdmin ? Math.min(1000000, Math.max(10, cleanQuota)) : Math.min(1000, Math.max(20, cleanQuota));
      }
    }

    const now = Date.now();
    const expiresAt = now + durationHours * 3600_000;
    const key = issueSignedTrialKey({
      clientName: rawName,
      plan,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited,
    });
    const rec: StoredTrialKey = {
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
      createdIp: clientIp,
    };

    trialKeysMap.set(key, rec);
    flushTrialStoreSync();

    sendPrettyDemoJson(res, 201, {
      ok: true,
      message: 'Trial API Key generated successfully.',
      trial: buildTrialSummary(rec, true, base),
    });
  });

  // Check Trial Key quota & expiry without consuming a request
  app.get('/api/trial/me', (req, res) => {
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: 'Missing or invalid Trial API Key. Generate one at ' + `${base}/trial`,
      });
      return;
    }
    sendPrettyDemoJson(res, 200, {
      ok: true,
      trial: buildTrialSummary(rec, false, base),
    });
  });

  // Pause / Resume / Extend Trial Key
  app.patch('/api/trial/keys/:key', (req, res) => {
    const base = getPublicOrigin(req);
    const key = String(req.params.key || '').trim();
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 404, { ok: false, error: 'Trial API key not found.' });
      return;
    }
    if (!verifyTrialManageOrAdmin(req, key)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: 'Invalid manageToken or admin key.' });
      return;
    }
    const isAdmin = isTrialOwnerRequest(req);
    if (typeof req.body?.active === 'boolean') {
      rec.active = req.body.active;
    }
    if (typeof req.body?.addHours === 'number' && req.body.addHours > 0) {
      const capHours = isAdmin ? 87600 : 168;
      const addMs = Math.min(capHours, req.body.addHours) * 3600_000;
      rec.expiresAt = Math.max(Date.now(), rec.expiresAt) + addMs;
    }
    if (isAdmin && typeof req.body?.unlimited === 'boolean') {
      rec.unlimited = req.body.unlimited;
      if (req.body.unlimited) rec.maxRequests = -1;
    } else if (typeof req.body?.addRequests === 'number' && req.body.addRequests > 0 && rec.maxRequests >= 0) {
      const capReq = isAdmin ? 1000000 : 2000;
      rec.maxRequests += Math.min(capReq, Math.round(req.body.addRequests));
    }
    flushTrialStoreSync();
    sendPrettyDemoJson(res, 200, {
      ok: true,
      trial: buildTrialSummary(rec, false, base),
    });
  });

  app.delete('/api/trial/keys/:key', (req, res) => {
    const key = String(req.params.key || '').trim();
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 404, { ok: false, error: 'Trial API key not found.' });
      return;
    }
    if (!verifyTrialManageOrAdmin(req, key)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: 'Invalid manageToken or admin key.' });
      return;
    }
    rec.active = false;
    rec.revoked = true;
    flushTrialStoreSync();
    sendPrettyDemoJson(res, 200, { ok: true, deleted: key });
  });

  app.get('/api/trial/admin/keys', (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      sendPrettyDemoJson(res, 403, { ok: false, error: 'Owner login (/owner) or TRIAL_ADMIN_KEY required.' });
      return;
    }
    const base = getPublicOrigin(req);
    const list = Array.from(trialKeysMap.values())
      .filter((r) => !r.revoked)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => buildTrialSummary(r, false, base));
    sendPrettyDemoJson(res, 200, { ok: true, count: list.length, keys: list });
  });

  // Public Unlimited Official Android App (/api/app/*) — opens straight into MovieBox without requiring a client trial key
  app.use((req, _res, next) => {
    if (req.url === '/api/app' || req.url.startsWith('/api/app/') || req.url.startsWith('/api/app?')) {
      req.url = req.url.replace(/^\/api\/app(?=\/|$|\?)/, '/api/trial');
      (req as any)._officialPublicApp = true;
    }
    next();
  });

  // Trial Key Authentication + Quota Enforcement Middleware for MovieBox Data Endpoints
  const requireValidTrialKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.method !== 'GET') {
      sendPrettyDemoJson(res, 405, { ok: false, error: 'Trial API endpoints are read-only (GET).' });
      return;
    }
    if ((req as any)._officialPublicApp) {
      (req as any)._trialKeyRec = {
        key: 'cp_app_official',
        clientName: 'MovieBox Official App',
        plan: 'UNLIMITED',
        createdAt: 0,
        expiresAt: 4102444800000,
        maxRequests: -1,
        usedRequests: 0,
        active: true,
        unlimited: true,
      } as StoredTrialKey;
      next();
      return;
    }
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    if (!key) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: 'Trial API Key required. Pass X-API-Key header or ?apiKey= parameter.',
        getTrialKeyAt: `${base}/trial`,
      });
      return;
    }
    const rec = resolveOrRecoverTrialKey(key);
    if (!rec) {
      sendPrettyDemoJson(res, 401, {
        ok: false,
        error: 'Invalid Trial API Key.',
        getTrialKeyAt: `${base}/trial`,
      });
      return;
    }
    if (!rec.active) {
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: 'This Trial API Key has been paused or revoked.',
        trial: buildTrialSummary(rec),
      });
      return;
    }
    if (Date.now() >= rec.expiresAt) {
      notifyTelegramTrialAlert(rec, 'EXPIRED');
      sendPrettyDemoJson(res, 403, {
        ok: false,
        error: 'Trial API Key expired. Generate a new key or extend validity.',
        trial: buildTrialSummary(rec),
        getTrialKeyAt: `${base}/trial`,
      });
      return;
    }
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    if (!isUnlimited && rec.usedRequests >= rec.maxRequests) {
      notifyTelegramTrialAlert(rec, 'QUOTA_EXHAUSTED');
      sendPrettyDemoJson(res, 429, {
        ok: false,
        error: `Trial request quota exhausted (${rec.maxRequests}/${rec.maxRequests} used).`,
        trial: buildTrialSummary(rec),
        getTrialKeyAt: `${base}/trial`,
      });
      return;
    }

    rec.usedRequests += 1;
    rec.lastUsedAt = Date.now();
    scheduleFlushTrialStore();

    const remaining = isUnlimited ? 'UNLIMITED' : String(Math.max(0, rec.maxRequests - rec.usedRequests));
    res.setHeader('X-Trial-Plan', rec.plan);
    res.setHeader('X-RateLimit-Limit', isUnlimited ? 'UNLIMITED' : String(rec.maxRequests));
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-Trial-Expires-At', new Date(rec.expiresAt).toISOString());
    (req as any)._trialKeyRec = rec;
    next();
  };

  app.get('/api/trial/categories', requireValidTrialKey, (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const mbCategories = ALL_CATEGORIES;
    sendPrettyDemoJson(res, 200, {
      ok: true,
      source: 'official-moviebox-original',
      trial: buildTrialSummary(rec),
      categories: mbCategories.map((c) => ({
        ...c,
        catalogEndpoint: `${base}/api/trial/catalog?path=${encodeURIComponent(c.path)}&page=1`,
      })),
    });
  });

  const trialHotSearchCache = { data: null as any, expiresAt: 0 };
  const fetchMovieBoxHotSearches = async () => {
    if (trialHotSearchCache.data && trialHotSearchCache.expiresAt > Date.now()) {
      return trialHotSearchCache.data;
    }
    const hdrs: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/json',
      Referer: `${MOVIEBOX_ORIGIN}/`,
      'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/subject/everyone-search`, {
          headers: hdrs,
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) throw new Error('Bad status');
        const j = await r.json();
        if (!j?.data) throw new Error('Empty');
        return j.data;
      })
    ).catch(() => null);

    const keywords: string[] = Array.isArray(json?.everyoneSearch)
      ? json.everyoneSearch.map((x: any) => String(x?.title || '').trim()).filter(Boolean)
      : [];
    const hotGroups = Array.isArray(json?.hot)
      ? json.hot.map((grp: any) => ({
          category: String(grp?.name || grp?.category || 'Hot'),
          items: normalizeMovieCardList(
            (Array.isArray(grp?.items) ? grp.items : [])
              .map((raw: any, i: number) => mapMovieBoxItemToCard(raw, i))
              .filter(Boolean) as MovieCardItem[]
          ).slice(0, 18),
        }))
      : [];
    const out = { keywords, hotGroups };
    if (keywords.length > 0 || hotGroups.length > 0) {
      trialHotSearchCache.data = out;
      trialHotSearchCache.expiresAt = Date.now() + 600_000;
    }
    return out;
  };

  const trialRelatedCache = new Map<string, { items: MovieCardItem[]; expiresAt: number }>();
  const fetchMovieBoxRelatedItems = async (subjectId: string, page = 1): Promise<MovieCardItem[]> => {
    if (!subjectId) return [];
    const ck = `${subjectId}::${page}`;
    const hit = trialRelatedCache.get(ck);
    if (hit && hit.expiresAt > Date.now()) return hit.items;
    const hdrs: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/json',
      Referer: `${MOVIEBOX_ORIGIN}/`,
      'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(
          `${origin}/wefeed-h5api-bff/subject/detail-rec?subjectId=${encodeURIComponent(subjectId)}&page=${page}&perPage=18`,
          { headers: hdrs, signal: AbortSignal.timeout(5000) }
        );
        if (!r.ok) throw new Error('Bad status');
        const j = await r.json();
        if (!Array.isArray(j?.data?.items)) throw new Error('Empty');
        return j.data.items;
      })
    ).catch(() => [] as any[]);

    const cards = normalizeMovieCardList(
      (json as any[])
        .map((raw: any, idx: number) => mapMovieBoxItemToCard(raw, idx))
        .filter(Boolean) as MovieCardItem[]
    ).slice(0, 18);

    if (cards.length > 0) {
      if (trialRelatedCache.size > 200) trialRelatedCache.clear();
      trialRelatedCache.set(ck, { items: cards, expiresAt: Date.now() + 600_000 });
    }
    return cards;
  };

  const trialAllOpsCache = { sections: [] as Array<{ title: string; items: MovieCardItem[] }>, expiresAt: 0 };
  const fetchMovieBoxUnfilteredSections = async () => {
    if (trialAllOpsCache.sections.length > 0 && trialAllOpsCache.expiresAt > Date.now()) {
      return trialAllOpsCache.sections;
    }
    const hdrs: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/json',
      Referer: `${MOVIEBOX_ORIGIN}/`,
      'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
    };
    const json = await Promise.any(
      [MOVIEBOX_FALLBACK_API_ORIGIN, MOVIEBOX_API_ORIGIN].map(async (origin) => {
        const r = await fetch(`${origin}/wefeed-h5api-bff/home?host=movie-box.co`, {
          headers: hdrs,
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) throw new Error('Bad status');
        const j = await r.json();
        if (!Array.isArray(j?.data?.operatingList)) throw new Error('Empty');
        return j.data.operatingList;
      })
    ).catch(() => [] as any[]);

    const out: Array<{ title: string; items: MovieCardItem[] }> = [];
    const seenTitle = new Set<string>();
    for (const op of json as any[]) {
      if (op?.type !== 'SUBJECTS_MOVIE' || !op?.title || !Array.isArray(op?.subjects) || !op.subjects.length) {
        continue;
      }
      const title = String(op.title).trim();
      const key = title.toLowerCase();
      if (seenTitle.has(key)) continue;
      seenTitle.add(key);
      const cards = normalizeMovieCardList(
        op.subjects.map((raw: any, i: number) => mapMovieBoxItemToCard(raw, i)).filter(Boolean) as MovieCardItem[]
      ).slice(0, 20);
      if (cards.length > 0) out.push({ title, items: cards });
    }
    if (out.length > 0) {
      trialAllOpsCache.sections = out;
      trialAllOpsCache.expiresAt = Date.now() + 600_000;
    }
    return out;
  };

  app.get('/api/trial/hot-search', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    try {
      const hot = await fetchMovieBoxHotSearches();
      const attachDet = (items: MovieCardItem[]) =>
        items.map((it) => ({
          ...it,
          detailsEndpoint: it.path ? `${base}/api/trial/details?path=${encodeURIComponent(it.path)}` : undefined,
        }));
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        keywords: hot.keywords,
        hotGroups: hot.hotGroups.map((g: any) => ({ ...g, items: attachDet(g.items) })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Hot search fetch failed' });
    }
  });

  app.get('/api/trial/home', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    try {
      const [homePayload, mbMain, hotData, allOfficial] = await Promise.all([
        fetchMovieBoxHomePayload(),
        fetchMovieBoxCatalog('/', 1, ''),
        fetchMovieBoxHotSearches(),
        fetchMovieBoxUnfilteredSections(),
      ]);
      const attachDetUrl = <T extends { path?: string }>(item: T) => ({
        ...item,
        detailsEndpoint: item.path
          ? `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`
          : undefined,
      });
      const mbCategories = ALL_CATEGORIES;
      const trendingItems = normalizeMovieCardList(mbMain.items)
        .filter((it) => it.path?.startsWith('/mb/'))
        .slice(0, 48);

      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        categories: mbCategories,
        banners: (homePayload.banners || []).map((b: any) => ({
          ...b,
          detailsEndpoint: b.path ? `${base}/api/trial/details?path=${encodeURIComponent(b.path)}` : undefined,
        })),
        liveSports: homePayload.liveSports || [],
        quickCategories: homePayload.quickCategories || [],
        comingSoon: (homePayload.comingSoon || []).map(attachDetUrl),
        hotSearches: hotData.keywords || [],
        sections: (homePayload.sections || []).map((sec) => ({
          ...sec,
          items: (sec.items || []).map(attachDetUrl),
        })),
        allOfficialSections: allOfficial.map((sec) => ({
          ...sec,
          items: sec.items.map(attachDetUrl),
        })),
        trending: trendingItems.map(attachDetUrl),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial home fetch failed' });
    }
  });

  app.get('/api/trial/suggest', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const q = String(req.query.q || '').trim();
    if (!q) {
      sendPrettyDemoJson(res, 200, { ok: true, source: 'official-moviebox-original', trial: buildTrialSummary(rec), items: [] });
      return;
    }
    try {
      const mbRes = await fetchMovieBoxCatalog('/', 1, q);
      const combined = normalizeMovieCardList(deduplicateMovieCards(mbRes.items))
        .filter((it) => it.path?.startsWith('/mb/'))
        .slice(0, 40);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        query: q,
        count: combined.length,
        items: combined.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial suggest failed' });
    }
  });

  app.get('/api/trial/catalog', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.category || '/').trim() || '/';
    const page = Math.min(50, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    const search = String(req.query.q || req.query.search || '').trim();

    const isNewUploadsView = rawPath === '/new-uploads';
    const isNewReleasesView = rawPath === '/new-releases';
    const isHotDhamakaView = rawPath === '/hot-dhamaka';
    const isTrendingHomeView = rawPath === '/' || rawPath === '';
    const upstreamBasePath =
      isNewUploadsView || isNewReleasesView || isHotDhamakaView
        ? '/'
        : rawPath.startsWith('/')
          ? rawPath
          : `/${rawPath}`;

    try {
      const mbTargetPath = isNewReleasesView
        ? '/new-releases'
        : isNewUploadsView
          ? '/new-uploads'
          : upstreamBasePath;
      const isHomeOrGlobal =
        !search &&
        page === 1 &&
        (isTrendingHomeView || isHotDhamakaView || isNewUploadsView || isNewReleasesView);

      const tasks: Array<Promise<{ items: MovieCardItem[]; maxPage: number }>> = [
        fetchMovieBoxCatalog(mbTargetPath, page, search),
      ];
      if (isHomeOrGlobal) {
        tasks.push(
          fetchMovieBoxCatalog('/language/bangla', 1, ''),
          fetchMovieBoxCatalog('/bollywood', 1, ''),
          fetchMovieBoxCatalog('/language/hindi-dubbed', 1, '')
        );
      }

      const settled = await Promise.allSettled(tasks);
      const primaryMain =
        settled[0]?.status === 'fulfilled' ? settled[0].value : { items: [], maxPage: 2500 };
      const extraRegional: MovieCardItem[] = [];
      for (let i = 1; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === 'fulfilled') extraRegional.push(...r.value.items.slice(0, 10));
      }

      let items: MovieCardItem[] = deduplicateMovieCards([...primaryMain.items, ...extraRegional]).filter(
        (it) => it.path?.startsWith('/mb/')
      );
      if (isNewUploadsView) {
        items = sortItemsByRecentUpload(items);
      } else if (isNewReleasesView) {
        const sortedRecent = sortItemsByRecentUpload(items);
        const release2026And2025 = sortedRecent.filter(
          (i) => i.title.includes('2026') || i.title.includes('2025')
        );
        const releaseOlder = sortedRecent.filter(
          (i) => !i.title.includes('2026') && !i.title.includes('2025')
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
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        path: rawPath,
        page,
        maxPage: Math.max(primaryMain.maxPage || 1, 50),
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial catalog fetch failed' });
    }
  });

  app.get('/api/trial/search', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const query = String(req.query.q || req.query.keyword || req.query.search || '').trim();
    const page = Math.min(20, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    if (!query) {
      sendPrettyDemoJson(res, 400, {
        ok: false,
        error: 'Missing ?q= search parameter.',
        trial: buildTrialSummary(rec),
      });
      return;
    }
    try {
      const mbRes = await fetchMovieBoxCatalog('/', page, query);
      const items = normalizeMovieCardList(deduplicateMovieCards(mbRes.items))
        .filter((it) => it.path?.startsWith('/mb/'))
        .slice(0, 64);

      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        query,
        page,
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial search failed' });
    }
  });

  app.get('/api/trial/details', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || req.query.url || '').trim();
    const subjectId = String(req.query.id || req.query.subjectId || '').trim();
    const slug = String(req.query.slug || req.query.detailPath || 'movie').trim();
    const titleQuery = String(req.query.title || '').trim();

    let targetPath = rawPath;
    if (!targetPath && subjectId) {
      targetPath = `/mb/${subjectId}/${slug}`;
    }

    const toTrialUrl = (u: string) => {
      if (!u || !u.startsWith('/')) return u;
      const sep = u.includes('?') ? '&' : '?';
      const needsTk = u.startsWith('/api/mb-stream') || u.startsWith('/api/mb-subtitle-srt');
      return `${base}${u}${needsTk ? `${sep}tk=${encodeURIComponent(rec.key)}` : ''}`;
    };

    try {
      let mbPath = targetPath;
      if (!mbPath.startsWith('/mb/')) {
        const queryFromPath = targetPath
          .replace(/^\/(?:movie|series|anime|drama)\//i, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        const searchTitle = extractBaseSeriesTitle(titleQuery || queryFromPath)
          .split(/\s+/)
          .slice(0, 5)
          .join(' ');
        if (searchTitle.length >= 2) {
          const mbSearch = await fetchMovieBoxCatalog('/', 1, searchTitle);
          const mbMatch = mbSearch.items.find((it) => it.path?.startsWith('/mb/'));
          if (mbMatch) {
            mbPath = mbMatch.path;
          }
        }
      }

      if (!mbPath || !mbPath.startsWith('/mb/')) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: 'Provide ?title=<name>, ?path=/mb/<subjectId>/<slug>, or ?subjectId=<id>',
          trial: buildTrialSummary(rec),
        });
        return;
      }

      const cached = findCachedDetailByPathOrTitle(mbPath, titleQuery);
      const [detail, relatedRaw] = await Promise.all([
        cached && cached.url?.startsWith('/mb/') ? Promise.resolve(cached) : fetchMovieBoxDetail(mbPath),
        fetchMovieBoxRelatedItems(mbPath.replace(/^\/mb\//, '').split('/')[0] || subjectId || '', 1),
      ]);
      storeDetailInCaches(mbPath, detail, Date.now() + 12 * 60_000);

      const parts = mbPath.replace(/^\/mb\//, '').split('/');
      const resolvedId = parts[0] || subjectId || '';
      const resolvedSlug = parts[1] || slug;
      const seasons = Array.from(
        new Set((detail.episodes || []).map((e) => e.season).filter((s): s is number => s !== null && s > 0))
      ).sort((a, b) => a - b);

      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        subjectId: resolvedId,
        detailPath: resolvedSlug,
        totalSeasons: seasons.length || (detail.typeBadge === 'SERIES' ? 1 : 0),
        seasons,
        totalEpisodes: detail.episodes?.length || 0,
        embedPlayerUrl: `${base}/trial-embed?apiKey=${encodeURIComponent(rec.key)}&subjectId=${encodeURIComponent(
          resolvedId
        )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${seasons[0] || 0}&ep=${
          detail.episodes?.[0]?.number ?? 0
        }&title=${encodeURIComponent(detail.title)}`,
        detail: {
          ...detail,
          dubs: Array.isArray((detail as any).dubs)
            ? (detail as any).dubs.map((d: any) => ({
                ...d,
                detailsEndpoint: d?.path ? `${base}/api/trial/details?path=${encodeURIComponent(d.path)}` : undefined,
                streamEndpoint: d?.path
                  ? `${base}/api/trial/stream?path=${encodeURIComponent(d.path)}&se=${seasons[0] || 0}&ep=${
                      detail.episodes?.[0]?.number ?? 0
                    }&title=${encodeURIComponent(detail.title)}`
                  : undefined,
              }))
            : undefined,
          downloadButtons: (detail.downloadButtons || []).map((b) => ({
            ...b,
            url: toTrialUrl(b.url),
          })),
          episodes: (detail.episodes || []).map((ep) => ({
            ...ep,
            sources: (ep.sources || []).map((s) => ({
              ...s,
              url: toTrialUrl(s.url),
              downloadUrl: s.downloadUrl ? toTrialUrl(s.downloadUrl) : undefined,
            })),
            streamEndpoint: `${base}/api/trial/stream?subjectId=${encodeURIComponent(
              resolvedId
            )}&detailPath=${encodeURIComponent(resolvedSlug)}&se=${ep.season ?? 0}&ep=${
              ep.number ?? 0
            }&title=${encodeURIComponent(detail.title)}`,
          })),
        },
        relatedMovies: relatedRaw.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial details failed' });
    }
  });

  app.get('/api/trial/related', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const rawPath = String(req.query.path || '').trim();
    let subjectId = String(req.query.subjectId || req.query.id || '').trim();
    const titleQuery = String(req.query.title || '').trim();
    const page = Math.min(10, Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1));
    try {
      if (!subjectId && rawPath.startsWith('/mb/')) {
        subjectId = rawPath.replace(/^\/mb\//, '').split('/')[0] || '';
      }
      if (!subjectId && titleQuery) {
        const s = await fetchMovieBoxCatalog('/', 1, titleQuery);
        const match = s.items.find((it) => it.path?.startsWith('/mb/'));
        if (match) subjectId = match.path.replace(/^\/mb\//, '').split('/')[0] || '';
      }
      if (!subjectId) {
        sendPrettyDemoJson(res, 400, { ok: false, error: 'Provide ?subjectId=, ?path=/mb/..., or ?title=' });
        return;
      }
      const items = await fetchMovieBoxRelatedItems(subjectId, page);
      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        subjectId,
        page,
        count: items.length,
        items: items.map((item) => ({
          ...item,
          detailsEndpoint: `${base}/api/trial/details?path=${encodeURIComponent(item.path)}`,
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Related movies fetch failed' });
    }
  });

  app.get('/api/trial/stream', requireValidTrialKey, async (req, res) => {
    const rec = (req as any)._trialKeyRec as StoredTrialKey;
    const base = getPublicOrigin(req);
    const rawPathParam = String(req.query.path || '').trim();
    let subjectId = String(req.query.subjectId || req.query.id || '').trim();
    let detailPath = String(req.query.detailPath || req.query.slug || 'movie').trim();
    if (!subjectId && rawPathParam.startsWith('/mb/')) {
      const segs = rawPathParam.replace(/^\/mb\//, '').split('/');
      subjectId = segs[0] || '';
      detailPath = segs[1] || detailPath;
    }
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || '0'), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || '0'), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || 'Original Audio').trim();

    try {
      if (!subjectId && title && title !== 'movie') {
        let searchRes = await fetchMovieBoxCatalog('/', 1, title);
        if (!searchRes.items.length) {
          const cleanTitle = title
            .replace(/\s*(Full\s*HD|HD|1080p|720p)\s*$/i, '')
            .replace(/\s*\(\d{4}\)\s*/g, ' ')
            .trim();
          if (cleanTitle && cleanTitle !== title) {
            searchRes = await fetchMovieBoxCatalog('/', 1, cleanTitle);
          }
        }
        const firstPath = searchRes.items[0]?.path || '';
        if (firstPath.startsWith('/mb/')) {
          const segs = firstPath.replace(/^\/mb\//, '').split('/');
          subjectId = segs[0] || '';
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }
      if (!subjectId) {
        sendPrettyDemoJson(res, 400, {
          ok: false,
          error: 'Provide ?path=/mb/<id>/<slug>, ?subjectId=<id>&detailPath=<slug>, or ?title=<name>',
          trial: buildTrialSummary(rec),
        });
        return;
      }

      const requestedLangRaw = String(req.query.lang || '').trim();
      const requestedLangLower = requestedLangRaw.toLowerCase();
      const streamMbPath = `/mb/${subjectId}/${detailPath}`;
      const cachedDetailForStream = findCachedDetailByPathOrTitle(streamMbPath, title);
      const streamDetailObj =
        cachedDetailForStream && cachedDetailForStream.url?.startsWith('/mb/')
          ? cachedDetailForStream
          : await Promise.race([
              fetchMovieBoxDetail(streamMbPath),
              new Promise<null>((r) => setTimeout(() => r(null), 1600)),
            ]).catch(() => null);
      if (streamDetailObj) {
        storeDetailInCaches(streamMbPath, streamDetailObj, Date.now() + 12 * 60_000);
      }

      const dubList: any[] = Array.isArray((streamDetailObj as any)?.dubs) ? (streamDetailObj as any).dubs : [];
      if (requestedLangLower && requestedLangLower !== 'all' && dubList.length > 0) {
        const matchedDub = dubList.find((d) => {
          const lbl = String(d?.label || '').toLowerCase();
          const code = String(d?.lanCode || '').toLowerCase();
          return (
            lbl === requestedLangLower ||
            lbl.includes(requestedLangLower) ||
            (requestedLangLower.startsWith('hi') && (code === 'hi' || lbl.includes('hindi'))) ||
            (requestedLangLower.startsWith('bn') && (code === 'bn' || lbl.includes('bangla') || lbl.includes('bengali'))) ||
            (requestedLangLower.startsWith('en') && (code === 'en' || lbl.includes('english'))) ||
            (requestedLangLower.startsWith('ta') && (code === 'ta' || lbl.includes('tamil'))) ||
            (requestedLangLower.startsWith('te') && (code === 'te' || lbl.includes('telugu'))) ||
            code === requestedLangLower
          );
        });
        if (matchedDub?.id && matchedDub.id !== subjectId) {
          subjectId = String(matchedDub.id);
          const dParts = String(matchedDub.path || '').replace(/^\/mb\//, '').split('/');
          if (dParts[1]) detailPath = dParts[1];
        }
      }

      const activeDubEntry = dubList.find((d) => String(d?.id) === subjectId);
      const activeAudioLabel = activeDubEntry?.label || streamDetailObj?.language || lang || 'Original Audio';

      const [initialPlayRes, imdbId] = await Promise.all([
        fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, activeAudioLabel, ''),
        Promise.race([
          resolveImdbIdForTitle(title, '', se > 0),
          new Promise<string>((r) => setTimeout(() => r(''), 650)),
        ]),
      ]);
      let playRes = initialPlayRes;
      let effectiveSe = se;
      let effectiveEp = ep;
      if (playRes.sources.length === 0 && se > 1) {
        const fbSe1 = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, ep || 1, title, activeAudioLabel, '');
        if (fbSe1.sources.length > 0) {
          playRes = fbSe1;
          effectiveSe = 1;
          effectiveEp = ep || 1;
        }
      }
      if (playRes.sources.length === 0 && (se > 0 || ep > 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, activeAudioLabel, '');
        if (fbMovie.sources.length > 0) {
          playRes = fbMovie;
          effectiveSe = 0;
          effectiveEp = 0;
        }
      } else if (playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbSeries = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, activeAudioLabel, '');
        if (fbSeries.sources.length > 0) {
          playRes = fbSeries;
          effectiveSe = 1;
          effectiveEp = 1;
        }
      }

      // Auto-include Hindi & Bangla dub MP4 sources inside sources[] when available and no single lang was locked
      const extraDubSources: StreamSource[] = [];
      const extraDubButtons: DirectDownloadButton[] = [];
      if ((!requestedLangRaw || requestedLangLower === 'all') && dubList.length > 1) {
        const priorityDubs = dubList
          .filter((d) => {
            const l = String(d?.label || '').toLowerCase();
            return (
              d?.id &&
              d.id !== subjectId &&
              (l.includes('hindi') || l.includes('bangla') || l.includes('bengali') || l.includes('original'))
            );
          })
          .slice(0, 2);
        if (priorityDubs.length > 0) {
          const dubResults = await Promise.allSettled(
            priorityDubs.map(async (d) => {
              const dp = String(d.path || '').replace(/^\/mb\//, '').split('/')[1] || detailPath;
              const r = await Promise.race([
                fetchMovieBoxPlayStreams(String(d.id), dp, effectiveSe, effectiveEp, `${title} [${d.label}]`, String(d.label), ''),
                new Promise<null>((resv) => setTimeout(() => resv(null), 1300)),
              ]);
              return { dub: d, res: r };
            })
          );
          for (const dr of dubResults) {
            if (dr.status === 'fulfilled' && dr.value.res && dr.value.res.sources.length > 0) {
              const lbl = String(dr.value.dub.label || 'Dubbed');
              for (const s of dr.value.res.sources) {
                extraDubSources.push({
                  ...s,
                  id: `${s.id}-${dr.value.dub.id}`,
                  audio: lbl,
                  audioLanguages: [lbl],
                  qualityLabel: `${s.quality}p [${lbl}]`,
                  provider: `CinePulse ${lbl} ${s.quality}p`,
                  name: `${title} [${lbl}] (${s.quality}p MP4)`,
                });
              }
              for (const b of dr.value.res.buttons || []) {
                extraDubButtons.push({
                  ...b,
                  label: `[${lbl}] ${b.label}`,
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
          playRes.streamId || ''
        ),
        new Promise<Array<{ id: string; lan: string; lanName: string; url: string; delay: number }>>((r) =>
          setTimeout(() => r([]), 900)
        ),
      ]).catch(() => []);

      const embedBackups = buildEmbedBackupSources(imdbId, effectiveSe, effectiveEp, title, activeAudioLabel);
      const toAbsoluteWithTrialTk = (u: string) => {
        if (!u.startsWith('/')) return u;
        const sep = u.includes('?') ? '&' : '?';
        const needsTk = u.startsWith('/api/mb-stream') || u.startsWith('/api/mb-subtitle-srt');
        return `${base}${u}${needsTk ? `${sep}tk=${encodeURIComponent(rec.key)}` : ''}`;
      };
      const embedPlayerUrl = `${base}/trial-embed?apiKey=${encodeURIComponent(rec.key)}&subjectId=${encodeURIComponent(
        subjectId
      )}&detailPath=${encodeURIComponent(detailPath)}&se=${effectiveSe}&ep=${effectiveEp}&title=${encodeURIComponent(title)}`;

      const primarySources = playRes.sources.map((s) => ({
        ...s,
        audio: activeAudioLabel,
        audioLanguages: [activeAudioLabel],
      }));
      const combinedSources = [...primarySources, ...extraDubSources, ...embedBackups];

      sendPrettyDemoJson(res, 200, {
        ok: true,
        source: 'official-moviebox-original',
        trial: buildTrialSummary(rec),
        subjectId,
        detailPath,
        title,
        activeAudio: activeAudioLabel,
        availableDubs: dubList.map((d) => ({
          id: d.id,
          label: d.label,
          lanCode: d.lanCode,
          active: String(d.id) === subjectId,
          streamEndpoint: `${base}/api/trial/stream?path=${encodeURIComponent(d.path)}&se=${effectiveSe}&ep=${effectiveEp}&title=${encodeURIComponent(title)}`,
        })),
        season: effectiveSe,
        episode: effectiveEp,
        imdbId: imdbId || null,
        embedPlayerUrl,
        directMp4Count: primarySources.length + extraDubSources.length,
        cloudHlsCount: embedBackups.length,
        subtitleCount: captions.length,
        sources: combinedSources.map((s) => ({
          ...s,
          url: toAbsoluteWithTrialTk(s.url),
          downloadUrl: s.downloadUrl ? toAbsoluteWithTrialTk(s.downloadUrl) : undefined,
        })),
        subtitles: captions.map((c) => ({
          ...c,
          url: toAbsoluteWithTrialTk(c.url),
        })),
        downloads: [...(playRes.buttons || []), ...extraDubButtons].map((b) => ({
          ...b,
          url: toAbsoluteWithTrialTk(b.url),
        })),
      });
    } catch (err: any) {
      sendPrettyDemoJson(res, 500, { ok: false, error: err?.message || 'Trial stream lookup failed' });
    }
  });

  // Embeddable Video Player for Client's Own Website (<iframe src=".../trial-embed?apiKey=...&title=...">)
  app.get('/trial-embed', async (req, res) => {
    const base = getPublicOrigin(req);
    const key = extractTrialApiKey(req);
    const rec = key ? resolveOrRecoverTrialKey(key) : undefined;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    const embedQuotaHit = Boolean(rec && !rec.unlimited && rec.maxRequests >= 0 && rec.usedRequests >= rec.maxRequests);
    if (!rec || !rec.active || Date.now() >= rec.expiresAt || embedQuotaHit) {
      const reason = !rec
        ? 'Invalid or missing Trial API Key'
        : !rec.active
          ? 'Trial Key Paused'
          : Date.now() >= rec.expiresAt
            ? 'Trial Key Expired'
            : 'Trial Request Quota Exhausted';
      res.status(403).send(`<!DOCTYPE html><html><body style="margin:0;background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;">
        <div><h3 style="color:#e50914;margin:0 0 8px;">CinePulse Trial Player Blocked</h3><p style="margin:0;color:#a1a1aa;font-size:14px;">${reason}</p></div>
      </body></html>`);
      return;
    }

    rec.usedRequests += 1;
    rec.lastUsedAt = Date.now();
    scheduleFlushTrialStore();

    const rawPathParam = String(req.query.path || '').trim();
    let subjectId = String(req.query.subjectId || req.query.id || '').trim();
    let detailPath = String(req.query.detailPath || req.query.slug || 'movie').trim();
    if (!subjectId && rawPathParam.startsWith('/mb/')) {
      const segs = rawPathParam.replace(/^\/mb\//, '').split('/');
      subjectId = segs[0] || '';
      detailPath = segs[1] || detailPath;
    }
    const se = Math.max(0, parseInt(String(req.query.se || req.query.season || '0'), 10) || 0);
    const ep = Math.max(0, parseInt(String(req.query.ep || req.query.episode || '0'), 10) || 0);
    let title = String(req.query.title || detailPath).trim();
    const lang = String(req.query.lang || 'Original Audio').trim();

    try {
      if (!subjectId && title && title !== 'movie') {
        const searchRes = await fetchMovieBoxCatalog('/', 1, title);
        const firstPath = searchRes.items[0]?.path || '';
        if (firstPath.startsWith('/mb/')) {
          const segs = firstPath.replace(/^\/mb\//, '').split('/');
          subjectId = segs[0] || '';
          detailPath = segs[1] || detailPath;
          title = searchRes.items[0]?.title || title;
        }
      }
      let playRes = subjectId
        ? await fetchMovieBoxPlayStreams(subjectId, detailPath, se, ep, title, lang, '')
        : { sources: [], buttons: [] };
      if (subjectId && playRes.sources.length === 0 && (se > 0 || ep > 0)) {
        const fbMovie = await fetchMovieBoxPlayStreams(subjectId, detailPath, 0, 0, title, lang, '');
        if (fbMovie.sources.length > 0) playRes = fbMovie;
      } else if (subjectId && playRes.sources.length === 0 && se === 0 && ep === 0) {
        const fbSeries = await fetchMovieBoxPlayStreams(subjectId, detailPath, 1, 1, title, lang, '');
        if (fbSeries.sources.length > 0) playRes = fbSeries;
      }
      const mp4Sources = (playRes.sources || [])
        .filter((s) => s.url && s.url.startsWith('/api/mb-stream'))
        .map((s) => ({
          label: `${s.quality}p`,
          url: `${base}${s.url}${s.url.includes('?') ? '&' : '?'}tk=${encodeURIComponent(rec.key)}`,
        }));
      const firstSrc = mp4Sources[0]?.url || '';
      const safeTitle = title.replace(/[<>&"']/g, '');

      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${safeTitle} — CinePulse Trial Embed</title>
  <style>
    * { box-sizing:border-box; }
    html,body { margin:0; padding:0; width:100%; height:100%; background:#000; color:#fff; font-family:system-ui,sans-serif; overflow:hidden; }
    .wrap { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
    video { width:100%; height:100%; object-fit:contain; background:#000; }
    .bar { position:absolute; top:10px; right:10px; display:flex; gap:6px; align-items:center; z-index:10; }
    select { background:rgba(15,15,20,.85); color:#fff; border:1px solid rgba(255,255,255,.22); border-radius:6px; padding:5px 8px; font-size:12px; }
    .tag { background:rgba(229,9,20,.9); color:#fff; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="bar">
      <span class="tag">${safeTitle}</span>
      ${mp4Sources.length > 1 ? `<select id="qSel" onchange="switchQ(this.value)">${mp4Sources.map((s, idx) => `<option value="${s.url}" ${idx === 0 ? 'selected' : ''}>${s.label}</option>`).join('')}</select>` : ''}
    </div>
    ${firstSrc
      ? `<video id="vid" src="${firstSrc}" controls autoplay playsinline preload="metadata"></video>`
      : `<div style="text-align:center;padding:24px;color:#a1a1aa;">No direct MP4 stream found for this title/episode yet.</div>`
    }
  </div>
  <script>
    function switchQ(u) {
      const v = document.getElementById('vid');
      if (!v) return;
      const t = v.currentTime || 0;
      v.src = u;
      v.addEventListener('loadedmetadata', () => { try { v.currentTime = t; v.play(); } catch(e){} }, { once: true });
    }
  </script>
</body>
</html>`);
    } catch {
      res.status(500).send('Failed to load embedded trial stream.');
    }
  });

  // Client API Tester & Integration Portal (/trial — Client-Only View, Mobile Responsive)
  app.get('/trial', (req, res) => {
    capturePublicOriginForBot(req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MovieBox Direct API — Client Tester & Docs</title>
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
      <div class="brand"><span class="dot"></span> MovieBox Direct API — Client Portal</div>
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
              <strong style="font-size:13px;">Home &amp; Categories</strong>
              <span style="font-size:11px;color:var(--muted);">GET /api/trial/home</span>
              <div class="row">
                <button class="sm" style="flex:1" onclick="callTrial('/api/trial/home')">Home</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/categories')">Categories</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/hot-search')">Hot Search</button>
              </div>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Search Movies / Series</strong>
              <input id="searchQ" value="Squid Game" />
              <button class="sm" onclick="callTrial('/api/trial/search?q=' + encodeURIComponent(val('searchQ') || 'Squid Game'))">Test Search</button>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Category Catalog</strong>
              <select id="catSel">
                <option value="/">Trending (All)</option>
                <option value="/new-uploads">New Uploads</option>
                <option value="/new-releases">New Releases</option>
                <option value="/hot-dhamaka">Hot Dhamaka</option>
                <option value="/language/bangla">Bangla</option>
                <option value="/bollywood">Bollywood</option>
                <option value="/hollywood">Hollywood</option>
                <option value="/language/hindi-dubbed">Hindi Dubbed</option>
                <option value="/korean">Korean</option>
                <option value="/anime">Anime</option>
                <option value="/adult18plus">Adult 18+ (MovieBox Original)</option>
              </select>
              <button class="sm" onclick="callTrial('/api/trial/catalog?path=' + encodeURIComponent(val('catSel')) + '&page=1')">Test Catalog</button>
            </div>
            <div class="ep-box">
              <strong style="font-size:13px;">Details &amp; Live Video</strong>
              <input id="titleInput" value="Squid Game" />
              <div class="row">
                <button class="sm" style="flex:1" onclick="callTrial('/api/trial/details?title=' + encodeURIComponent(val('titleInput') || 'Squid Game'))">Details</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/related?title=' + encodeURIComponent(val('titleInput') || 'Squid Game'))">Related</button>
                <button class="sec sm" style="flex:1" onclick="callTrial('/api/trial/stream?title=' + encodeURIComponent(val('titleInput') || 'Squid Game') + '&se=1&ep=1', false)">Stream</button>
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
          <video id="previewVideo" controls playsinline style="width:100%;max-height:360px;background:#000;border-radius:10px;"></video>
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
          '<!-- Direct MovieBox API + HTML5 MP4 Player -->',
          '<div id="cp-moviebox-widget" style="background:#0b0c10;color:#fff;padding:16px;border-radius:12px;font-family:sans-serif">',
          '  <div style="display:flex;gap:8px;margin-bottom:12px">',
          '    <input id="cp-q" placeholder="Search Movie / Series..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #333;background:#14161d;color:#fff" />',
          '    <button onclick="cpLoadMovies()" style="background:#e50914;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700">Search</button>',
          '  </div>',
          '  <video id="cp-video" controls autoplay playsinline style="display:none;width:100%;max-height:420px;background:#000;border-radius:10px;margin-bottom:14px"></video>',
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
          '  const mp4 = (d.sources || []).find(function(s){ return s.type === "mp4" && s.url; });',
          '  if (!mp4) return;',
          '  const v = document.getElementById("cp-video");',
          '  v.style.display = "block"; v.src = mp4.url; v.play();',
          '}',
          'cpLoadMovies();',
          '</' + 'script>',
        ].join('\\n');
      } else if (snippetMode === 'android') {
        box.textContent = [
          '// Android OkHttp + ExoPlayer Example (Kotlin)',
          'val client = OkHttpClient()',
          'val req = Request.Builder()',
          '  .url("' + SHARE_BASE + '/api/trial/stream?title=Squid+Game&se=1&ep=1")',
          '  .addHeader("X-API-Key", "' + k + '")',
          '  .build()',
          '// Parse JSON -> sources[0].url -> pass directly to ExoPlayer:',
          '// val mediaItem = MediaItem.fromUri(streamUrl)',
          '// exoPlayer.setMediaItem(mediaItem); exoPlayer.prepare(); exoPlayer.play()',
        ].join('\\n');
      } else if (snippetMode === 'iframe') {
        const title = encodeURIComponent(val('titleInput') || 'Squid Game');
        box.textContent = '<iframe src="' + SHARE_BASE + '/trial-embed?apiKey=' + k + '&title=' + title + '&se=1&ep=1" width="100%" height="460" allowfullscreen frameborder="0"></iframe>';
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
    function showPreviewPlayer(parsed, autoPlay) {
      const mp4s = (parsed.sources || []).filter(function(s) { return s.type === 'mp4' && s.url; });
      if (!mp4s.length) return;
      const box = document.getElementById('previewPlayerBox');
      const titleEl = document.getElementById('previewTitle');
      const sel = document.getElementById('previewQualitySel');
      const vid = document.getElementById('previewVideo');
      titleEl.textContent = (parsed.title || 'MovieBox Preview') + (parsed.season ? ' (S' + parsed.season + ' E' + parsed.episode + ')' : '');
      sel.innerHTML = '';
      mp4s.forEach(function(s, idx) {
        const opt = document.createElement('option');
        opt.value = s.url;
        opt.textContent = (s.quality || 'HD') + 'p MP4';
        if (idx === 0) opt.selected = true;
        sel.appendChild(opt);
      });
      box.style.display = 'block';
      vid.src = mp4s[0].url;
      if (autoPlay) vid.play().catch(function(){});
    }
    function switchPreviewQuality() {
      const sel = document.getElementById('previewQualitySel');
      const vid = document.getElementById('previewVideo');
      if (!sel.value) return;
      const t = vid.currentTime || 0;
      vid.src = sel.value;
      vid.onloadedmetadata = function() { try { vid.currentTime = t; } catch {} vid.play().catch(function(){}); };
    }
    function closePreviewPlayer() {
      const vid = document.getElementById('previewVideo');
      vid.pause();
      vid.removeAttribute('src');
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
        document.getElementById('respMeta').textContent = 'HTTP ' + res.status + ' • ' + ms + ' ms';
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

  // ==========================================================================================
  // 6a-6. TELEGRAM BOT OWNER ADMIN CONTROLLER (LIST / PAUSE / RESUME / RENEW / CREATE / DELETE)
  // ==========================================================================================
  const botConfigPath = path.join(trialDataDir, 'cinepulse-bot-config.json');
  interface BotConfigState {
    publicUrl?: string;
    ownerPinHash?: string;
    ownerPinSalt?: string;
  }
  const loadBotConfig = (): BotConfigState => {
    try {
      if (!fs.existsSync(botConfigPath)) return {};
      const parsed = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };
  const saveBotConfig = (cfg: BotConfigState) => {
    try {
      if (!fs.existsSync(trialDataDir)) fs.mkdirSync(trialDataDir, { recursive: true });
      const tmpFile = `${botConfigPath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(cfg, null, 2), 'utf8');
      fs.renameSync(tmpFile, botConfigPath);
    } catch {
      // ignore write failure on read-only fs
    }
  };

  let botConfigState: BotConfigState = loadBotConfig();
  let capturedPublicBaseUrl = '';

  capturePublicOriginForBot = (req: express.Request) => {
    const rawOrigin = getPublicOrigin(req).replace(/\/+$/, '');
    if (!rawOrigin) return;
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(rawOrigin)) return;
    capturedPublicBaseUrl = rawOrigin.includes('://ais-dev-')
      ? rawOrigin.replace('://ais-dev-', '://ais-pre-')
      : rawOrigin;
  };

  const resolvePublicBotBaseUrl = (): string => {
    const envPublic = String(process.env.TRIAL_PUBLIC_URL || '').trim().replace(/\/+$/, '');
    if (envPublic && envPublic.startsWith('http')) return envPublic;
    if (botConfigState.publicUrl && botConfigState.publicUrl.startsWith('http')) {
      return botConfigState.publicUrl.replace(/\/+$/, '');
    }
    if (capturedPublicBaseUrl && capturedPublicBaseUrl.startsWith('http')) {
      return capturedPublicBaseUrl.replace(/\/+$/, '');
    }
    const renderExt = String(process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
    if (renderExt && renderExt.startsWith('http')) return renderExt;
    const appUrl = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (appUrl && appUrl !== 'MY_APP_URL' && appUrl.startsWith('http')) return appUrl;
    return `http://127.0.0.1:${PORT}`;
  };

  const getTelegramBotToken = (): string => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const getAllowedTelegramAdminIds = (): Set<string> => {
    const raw = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
    if (!raw) return new Set();
    return new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
  };

  const getTrialShortId = (key: string): string =>
    crypto.createHash('sha1').update(key).digest('hex').slice(0, 10);

  const escTgHtml = (val: unknown): string =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatRemainingDurationBn = (expiresAt: number): string => {
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) return 'মেয়াদ শেষ ❌';
    const totalMins = Math.ceil(msLeft / 60_000);
    if (totalMins >= 1440) {
      const days = Math.floor(totalMins / 1440);
      const hrs = Math.floor((totalMins % 1440) / 60);
      return hrs > 0 ? `${days} দিন ${hrs} ঘন্টা` : `${days} দিন`;
    }
    if (totalMins >= 60) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return mins > 0 ? `${hrs} ঘন্টা ${mins} মি.` : `${hrs} ঘন্টা`;
    }
    return `${totalMins} মিনিট`;
  };

  const getTrialStatusMeta = (rec: StoredTrialKey) => {
    const now = Date.now();
    const isUnlimited = Boolean(rec.unlimited || rec.maxRequests < 0);
    const remainingRequests = isUnlimited ? -1 : Math.max(0, rec.maxRequests - rec.usedRequests);
    const expired = now >= rec.expiresAt;
    if (!rec.active) return { code: 'PAUSED' as const, badge: '🔴 PAUSED (বন্ধ)' };
    if (expired) return { code: 'EXPIRED' as const, badge: '⏰ EXPIRED (মেয়াদ শেষ)' };
    if (!isUnlimited && remainingRequests <= 0) {
      return { code: 'QUOTA_EXHAUSTED' as const, badge: '⚠️ QUOTA শেষ' };
    }
    return { code: 'ACTIVE' as const, badge: '🟢 ACTIVE (চালু)' };
  };

  const listAllNonRevokedTrials = (): StoredTrialKey[] =>
    Array.from(trialKeysMap.values())
      .filter((r) => !r.revoked)
      .sort((a, b) => b.createdAt - a.createdAt);

  const findTrialMatches = (query: string): { exact?: StoredTrialKey; matches: StoredTrialKey[] } => {
    const clean = query.trim().replace(/^#/, '');
    if (!clean) return { matches: [] };
    const all = listAllNonRevokedTrials();

    // 1. Exact full key
    const exactFull = all.find((r) => r.key === clean);
    if (exactFull) return { exact: exactFull, matches: [exactFull] };

    // 2. Exact 10-char shortId
    const lower = clean.toLowerCase();
    const exactShort = all.find((r) => getTrialShortId(r.key) === lower);
    if (exactShort) return { exact: exactShort, matches: [exactShort] };

    // 3. Partial key / shortId prefix or case-insensitive clientName substring
    const matches = all.filter(
      (r) =>
        getTrialShortId(r.key).startsWith(lower) ||
        r.key.toLowerCase().startsWith(lower) ||
        r.clientName.toLowerCase().includes(lower)
    );
    if (matches.length === 1) return { exact: matches[0], matches };
    return { matches };
  };

  const createClientKeyForOwner = (
    clientName: string,
    planInput: StoredTrialKey['plan'],
    forceUnlimited = false
  ): StoredTrialKey => {
    let durationHours = 24;
    let maxRequests = 250;
    let unlimited = forceUnlimited;

    if (planInput === '2H') {
      durationHours = 2;
      maxRequests = 60;
    } else if (planInput === '72H') {
      durationHours = 72;
      maxRequests = 600;
    } else if (planInput === '7D') {
      durationHours = 24 * 7;
      maxRequests = forceUnlimited ? -1 : 5000;
    } else if (planInput === '30D') {
      durationHours = 24 * 30;
      maxRequests = forceUnlimited ? -1 : 100000;
    } else if (planInput === 'UNLIMITED') {
      durationHours = 24 * 3650;
      maxRequests = -1;
      unlimited = true;
    }
    if (unlimited) maxRequests = -1;

    const now = Date.now();
    const expiresAt = now + durationHours * 3600_000;
    const cleanName = String(clientName || 'Client').trim().slice(0, 48) || 'Client';
    const key = issueSignedTrialKey({
      clientName: cleanName,
      plan: planInput,
      createdAt: now,
      expiresAt,
      maxRequests,
      unlimited,
    });
    const rec: StoredTrialKey = {
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
      createdIp: 'telegram-bot',
    };
    trialKeysMap.set(key, rec);
    flushTrialStoreSync();
    return rec;
  };

  const buildDashboardSummaryHtml = (): string => {
    const all = listAllNonRevokedTrials();
    let activeCount = 0;
    let pausedCount = 0;
    let expiredCount = 0;
    let quotaCount = 0;
    let totalRequests = 0;

    for (const r of all) {
      totalRequests += r.usedRequests || 0;
      const st = getTrialStatusMeta(r).code;
      if (st === 'ACTIVE') activeCount++;
      else if (st === 'PAUSED') pausedCount++;
      else if (st === 'EXPIRED') expiredCount++;
      else if (st === 'QUOTA_EXHAUSTED') quotaCount++;
    }

    const baseUrl = resolvePublicBotBaseUrl();
    const isPrivatePreview = /localhost|127\.0\.0\.1|:\/\/ais-dev-/i.test(baseUrl);

    return [
      '🎬 <b>MovieBox Original Direct API — Owner Panel</b>',
      '',
      `👥 <b>মোট ক্লায়েন্ট:</b> ${all.length} জন`,
      `🟢 <b>Active (চালু):</b> ${activeCount}`,
      `🔴 <b>Paused (বন্ধ):</b> ${pausedCount}`,
      `⏰ <b>Expired (মেয়াদ শেষ):</b> ${expiredCount}`,
      `⚠️ <b>Quota শেষ:</b> ${quotaCount}`,
      `📊 <b>মোট API হিট:</b> ${totalRequests.toLocaleString()}`,
      '',
      `🌐 <b>API Base URL:</b> <code>${escTgHtml(baseUrl)}</code>`,
      ...(isPrivatePreview
        ? [
            '⚠️ <i>নোট: অ্যাপটি Cloud Run / Render / Custom Domain-এ Deploy করে /seturl দিন যাতে ক্লায়েন্টদের অ্যাপ/ওয়েবসাইটে কোনো কুকি ব্লক ছাড়া সরাসরি চলে।</i>',
          ]
        : []),
    ].join('\n');
  };

  const buildMainMenuKeyboard = () => ({
    inline_keyboard: [
      [
        { text: '➕ নতুন ক্লায়েন্ট তৈরি', callback_data: 'tb:newmenu' },
        { text: '📋 সব ক্লায়েন্ট লিস্ট', callback_data: 'tb:list:0' },
      ],
      [
        { text: '📊 লাইভ স্ট্যাটাস', callback_data: 'tb:stats' },
        { text: '🔍 ক্লায়েন্ট খুঁজুন', callback_data: 'tb:findask' },
      ],
      [
        { text: '⏸️ বন্ধ (Paused)', callback_data: 'tb:paused:0' },
        { text: '⏰ মেয়াদ শেষ (Expired)', callback_data: 'tb:expired:0' },
      ],
    ],
  });

  const buildClientCardHtml = (rec: StoredTrialKey): string => {
    const shortId = getTrialShortId(rec.key);
    const st = getTrialStatusMeta(rec);
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const quotaLine = isUnlim
      ? `♾️ UNLIMITED (ব্যবহার: ${rec.usedRequests})`
      : `${Math.max(0, rec.maxRequests - rec.usedRequests)} / ${rec.maxRequests} বাকি (ব্যবহার: ${rec.usedRequests})`;
    const lastUsedStr = rec.lastUsedAt
      ? new Date(rec.lastUsedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
      : 'এখনো ব্যবহার হয়নি';
    const expiryIso = new Date(rec.expiresAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    return [
      `👤 <b>${escTgHtml(rec.clientName)}</b>  (<code>#${shortId}</code>)`,
      `📌 <b>অবস্থা:</b> ${st.badge}`,
      `📦 <b>প্ল্যান:</b> <code>${escTgHtml(rec.plan)}</code>`,
      `⏳ <b>সময় বাকি:</b> ${formatRemainingDurationBn(rec.expiresAt)}`,
      `📅 <b>মেয়াদ শেষ:</b> <code>${expiryIso}</code>`,
      `📈 <b>লিমিট/ব্যবহার:</b> ${quotaLine}`,
      `🕒 <b>শেষ ব্যবহার:</b> ${lastUsedStr}`,
      `🔑 <b>API Key:</b> <code>${escTgHtml(rec.key)}</code>`,
    ].join('\n');
  };

  const buildClientInlineKeyboard = (rec: StoredTrialKey) => {
    const sid = getTrialShortId(rec.key);
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const toggleBtn = rec.active
      ? { text: '⏸️ বন্ধ করুন (Pause)', callback_data: `tb:pause:${sid}` }
      : { text: '▶️ চালু করুন (Resume)', callback_data: `tb:resume:${sid}` };

    const row2: Array<{ text: string; callback_data: string }> = [];
    if (!isUnlim) {
      row2.push({ text: '♾️ আনলিমিটেড করুন', callback_data: `tb:unlim:${sid}` });
    }
    row2.push({ text: '📋 ক্লায়েন্ট মেসেজ', callback_data: `tb:msg:${sid}` });

    return {
      inline_keyboard: [
        [
          toggleBtn,
          { text: '➕ ৭ দিন', callback_data: `tb:ext7:${sid}` },
          { text: '➕ ৩০ দিন', callback_data: `tb:ext30:${sid}` },
        ],
        row2,
        [
          { text: '🔄 রিফ্রেশ', callback_data: `tb:view:${sid}` },
          { text: '🗑 ডিলিট', callback_data: `tb:del:${sid}` },
        ],
        [
          { text: '⬅️ ক্লায়েন্ট লিস্ট', callback_data: 'tb:list:0' },
          { text: '🏠 মেইন মেনু', callback_data: 'tb:menu' },
        ],
      ],
    };
  };

  const buildClientShareMessageText = (rec: StoredTrialKey): string => {
    const base = resolvePublicBotBaseUrl();
    const isUnlim = Boolean(rec.unlimited || rec.maxRequests < 0);
    const quotaLabel = isUnlim ? 'UNLIMITED' : `${rec.maxRequests} Requests`;
    const expIso = new Date(rec.expiresAt).toISOString();
    return [
      `MovieBox Original Direct API Credentials (${rec.clientName} - ${rec.plan}):`,
      '',
      `Base URL: ${base}/api/trial`,
      `API Key: ${rec.key}`,
      `Quota: ${quotaLabel} | Expires: ${expIso}`,
      `Live Tester Portal: ${base}/trial`,
      '',
      'Sample Endpoints (pass header X-API-Key or ?apiKey=):',
      `- Home: ${base}/api/trial/home?apiKey=${rec.key}`,
      `- Search: ${base}/api/trial/search?q=Squid+Game&apiKey=${rec.key}`,
      `- Catalog (18+): ${base}/api/trial/catalog?path=/adult18plus&page=1&apiKey=${rec.key}`,
      `- Details: ${base}/api/trial/details?title=Squid+Game&apiKey=${rec.key}`,
      `- Stream: ${base}/api/trial/stream?title=Squid+Game&se=1&ep=1&apiKey=${rec.key}`,
    ].join('\n');
  };

  interface TelegramDispatchResult {
    ok: boolean;
    result?: any;
    description?: string;
  }

  type TelegramDispatchFn = (method: string, payload: Record<string, any>) => Promise<TelegramDispatchResult>;

  const callTelegramBotApi: TelegramDispatchFn = async (method, payload) => {
    const token = getTelegramBotToken();
    if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      const json = (await resp.json().catch(() => ({ ok: false }))) as TelegramDispatchResult;
      return json;
    } catch (err: any) {
      return { ok: false, description: err?.message || 'Telegram API network error' };
    }
  };

  const botPendingState = new Map<
    string,
    { step: 'await_new_name' | 'await_new_plan' | 'await_find_query'; clientName?: string; updatedAt: number }
  >();
  const notifiedTrialAlerts = new Map<string, string>();

  notifyTelegramTrialAlert = (rec, reason) => {
    const token = getTelegramBotToken();
    const admins = getAllowedTelegramAdminIds();
    if (!token || admins.size === 0) return;

    const sig = `${reason}:${rec.expiresAt}:${rec.maxRequests}`;
    if (notifiedTrialAlerts.get(rec.key) === sig) return;
    notifiedTrialAlerts.set(rec.key, sig);

    const shortId = getTrialShortId(rec.key);
    const title =
      reason === 'EXPIRED'
        ? '⏰ <b>ক্লায়েন্টের মেয়াদ শেষ হয়েছে!</b>'
        : '⚠️ <b>ক্লায়েন্টের রিকোয়েস্ট Quota শেষ হয়েছে!</b>';
    const text = [
      title,
      '',
      `👤 ক্লায়েন্ট: <b>${escTgHtml(rec.clientName)}</b> (<code>#${shortId}</code>)`,
      `📦 প্ল্যান: <code>${escTgHtml(rec.plan)}</code>`,
      `📈 ব্যবহার: ${rec.usedRequests}${rec.unlimited || rec.maxRequests < 0 ? '' : '/' + rec.maxRequests}`,
      '',
      'নিচের বাটন থেকে রিনিউ করুন অথবা বন্ধ রাখুন:',
    ].join('\n');

    const reply_markup = {
      inline_keyboard: [
        [
          { text: '➕ ৩০ দিন রিনিউ', callback_data: `tb:ext30:${sidForAlert(rec.key)}` },
          { text: '⏸️ বন্ধ করুন', callback_data: `tb:pause:${sidForAlert(rec.key)}` },
        ],
        [{ text: '👤 বিস্তারিত দেখুন', callback_data: `tb:view:${sidForAlert(rec.key)}` }],
      ],
    };

    for (const chatId of admins) {
      void callTelegramBotApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup,
      }).catch(() => {});
    }
  };

  const sidForAlert = (k: string) => getTrialShortId(k);

  const renderClientListMessage = (
    filterMode: 'ALL' | 'PAUSED' | 'EXPIRED',
    pageNum: number
  ): { text: string; reply_markup: any } => {
    const all = listAllNonRevokedTrials().filter((r) => {
      if (filterMode === 'ALL') return true;
      const code = getTrialStatusMeta(r).code;
      return filterMode === 'PAUSED' ? code === 'PAUSED' : code === 'EXPIRED' || code === 'QUOTA_EXHAUSTED';
    });

    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    const page = Math.min(totalPages - 1, Math.max(0, pageNum));
    const slice = all.slice(page * pageSize, page * pageSize + pageSize);

    const headerTitle =
      filterMode === 'PAUSED'
        ? `⏸️ <b>বন্ধ (Paused) ক্লায়েন্ট (${all.length} জন)</b>`
        : filterMode === 'EXPIRED'
          ? `⏰ <b>মেয়াদ/কোটা শেষ ক্লায়েন্ট (${all.length} জন)</b>`
          : `📋 <b>সব API ক্লায়েন্ট তালিকা (${all.length} জন)</b>`;

    const lines = [headerTitle, ''];
    if (slice.length === 0) {
      lines.push('এই তালিকায় কোনো ক্লায়েন্ট নেই।');
    } else {
      slice.forEach((r, idx) => {
        const st = getTrialStatusMeta(r);
        const icon = st.code === 'ACTIVE' ? '🟢' : st.code === 'PAUSED' ? '🔴' : '⏰';
        const timeStr = r.active ? formatRemainingDurationBn(r.expiresAt) : 'Paused';
        lines.push(
          `${page * pageSize + idx + 1}. ${icon} <b>${escTgHtml(r.clientName)}</b> — <code>${escTgHtml(
            r.plan
          )}</code> (${timeStr}) [<code>#${getTrialShortId(r.key)}</code>]`
        );
      });
      lines.push('', 'যেকোনো ক্লায়েন্ট কন্ট্রোল করতে নিচের বাটনে ট্যাপ করুন:');
    }

    const prefix = filterMode === 'PAUSED' ? 'paused' : filterMode === 'EXPIRED' ? 'expired' : 'list';
    const keyboard: Array<Array<{ text: string; callback_data: string }>> = slice.map((r) => {
      const st = getTrialStatusMeta(r);
      const icon = st.code === 'ACTIVE' ? '🟢' : st.code === 'PAUSED' ? '🔴' : '⏰';
      const timeStr = st.code === 'PAUSED' ? 'Paused' : formatRemainingDurationBn(r.expiresAt);
      return [
        {
          text: `${icon} ${r.clientName.slice(0, 22)} (${r.plan} • ${timeStr})`,
          callback_data: `tb:view:${getTrialShortId(r.key)}`,
        },
      ];
    });

    const navRow: Array<{ text: string; callback_data: string }> = [];
    if (page > 0) navRow.push({ text: '◀️ আগের', callback_data: `tb:${prefix}:${page - 1}` });
    if (page + 1 < totalPages) navRow.push({ text: 'পরের ▶️', callback_data: `tb:${prefix}:${page + 1}` });
    if (navRow.length) keyboard.push(navRow);

    keyboard.push([
      { text: '➕ নতুন ক্লায়েন্ট', callback_data: 'tb:newmenu' },
      { text: '🏠 মেইন মেনু', callback_data: 'tb:menu' },
    ]);

    return { text: lines.join('\n'), reply_markup: { inline_keyboard: keyboard } };
  };

  const handleTelegramUpdate = async (
    update: any,
    dispatch: TelegramDispatchFn = callTelegramBotApi
  ): Promise<{ handled: boolean; reason?: string }> => {
    if (!update || typeof update !== 'object') return { handled: false, reason: 'empty_update' };

    const allowedAdmins = getAllowedTelegramAdminIds();
    const cb = update.callback_query;
    const msg = update.message || update.edited_message;

    const chatId = cb
      ? String(cb.message?.chat?.id || cb.from?.id || '')
      : msg
        ? String(msg.chat?.id || msg.from?.id || '')
        : '';
    const fromId = cb ? String(cb.from?.id || '') : msg ? String(msg.from?.id || '') : '';
    if (!chatId) return { handled: false, reason: 'no_chat_id' };

    const isAuthorized = allowedAdmins.size > 0 && (allowedAdmins.has(chatId) || allowedAdmins.has(fromId));
    if (!isAuthorized) {
      const replyText =
        allowedAdmins.size === 0
          ? [
              '🔒 <b>Admin Bot সুরক্ষিত আছে!</b>',
              `আপনার Telegram Chat ID: <code>${escTgHtml(fromId || chatId)}</code>`,
              '',
              'সার্ভার Env Variable-এ <code>TELEGRAM_ADMIN_CHAT_ID</code> সেট করে সার্ভার রিস্টার্ট করলে বট অ্যাক্সেস চালু হবে।',
            ].join('\n')
          : '⛔ Unauthorized. শুধুমাত্র Bot Owner এই কন্ট্রোল প্যানেল ব্যবহার করতে পারবেন।';
      if (cb?.id) {
        await dispatch('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: 'Unauthorized admin ID',
          show_alert: true,
        });
      }
      await dispatch('sendMessage', { chat_id: chatId, text: replyText, parse_mode: 'HTML' });
      return { handled: true, reason: 'unauthorized' };
    }

    const sendOrEdit = async (text: string, reply_markup?: any, forceNew = false) => {
      if (cb && cb.message?.message_id && !forceNew) {
        const res = await dispatch('editMessageText', {
          chat_id: chatId,
          message_id: cb.message.message_id,
          text,
          parse_mode: 'HTML',
          ...(reply_markup ? { reply_markup } : {}),
        });
        if (res.ok) return res;
      }
      return dispatch('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(reply_markup ? { reply_markup } : {}),
      });
    };

    const sendClientCreatedMessages = async (rec: StoredTrialKey) => {
      notifiedTrialAlerts.delete(rec.key);
      await dispatch('sendMessage', {
        chat_id: chatId,
        text: `✅ <b>নতুন ক্লায়েন্ট API Key তৈরি হয়েছে!</b>\n\n${buildClientCardHtml(rec)}`,
        parse_mode: 'HTML',
        reply_markup: buildClientInlineKeyboard(rec),
      });
      await dispatch('sendMessage', {
        chat_id: chatId,
        text: `📋 <b>ক্লায়েন্টকে দেওয়ার জন্য কপি/ফরওয়ার্ড মেসেজ:</b>\n\n<pre>${escTgHtml(
          buildClientShareMessageText(rec)
        )}</pre>`,
        parse_mode: 'HTML',
      });
    };

    const sendSearchMatches = async (query: string) => {
      const { exact, matches } = findTrialMatches(query);
      if (exact) {
        await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact), true);
        return;
      }
      if (matches.length === 0) {
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: `❌ "<b>${escTgHtml(query)}</b>" নামে কোনো ক্লায়েন্ট পাওয়া যায়নি।`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '📋 সব ক্লায়েন্ট লিস্ট', callback_data: 'tb:list:0' }]] },
        });
        return;
      }
      const buttons = matches.slice(0, 10).map((r) => {
        const icon = getTrialStatusMeta(r).code === 'ACTIVE' ? '🟢' : '🔴';
        return [
          {
            text: `${icon} ${r.clientName} (${r.plan} • #${getTrialShortId(r.key)})`,
            callback_data: `tb:view:${getTrialShortId(r.key)}`,
          },
        ];
      });
      await dispatch('sendMessage', {
        chat_id: chatId,
        text: `🔍 "<b>${escTgHtml(query)}</b>" এর জন্য ${matches.length} জন মিলেছে। সিলেক্ট করুন:`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      });
    };

    // 1. Inline Button Callbacks
    if (cb) {
      const data = String(cb.data || '');
      let toast = '';

      if (data === 'tb:menu' || data === 'tb:stats') {
        botPendingState.delete(chatId);
        await sendOrEdit(buildDashboardSummaryHtml(), buildMainMenuKeyboard());
      } else if (data.startsWith('tb:list:')) {
        const pg = parseInt(data.slice(8), 10) || 0;
        const view = renderClientListMessage('ALL', pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data.startsWith('tb:paused:')) {
        const pg = parseInt(data.slice(10), 10) || 0;
        const view = renderClientListMessage('PAUSED', pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data.startsWith('tb:expired:')) {
        const pg = parseInt(data.slice(11), 10) || 0;
        const view = renderClientListMessage('EXPIRED', pg);
        await sendOrEdit(view.text, view.reply_markup);
      } else if (data === 'tb:newmenu') {
        botPendingState.set(chatId, { step: 'await_new_name', updatedAt: Date.now() });
        await sendOrEdit(
          '➕ <b>নতুন ক্লায়েন্ট API Key তৈরি</b>\n\nক্লায়েন্ট বা অ্যাপের নাম লিখে পাঠান (যেমন: <code>Rahim OTT App</code>):',
          { inline_keyboard: [[{ text: '❌ বাতিল', callback_data: 'tb:menu' }]] }
        );
      } else if (data === 'tb:findask') {
        botPendingState.set(chatId, { step: 'await_find_query', updatedAt: Date.now() });
        await sendOrEdit(
          '🔍 <b>ক্লায়েন্ট খুঁজুন</b>\n\nক্লায়েন্টের নাম অথবা Short ID (যেমন <code>Rahim</code>) লিখে পাঠান:',
          { inline_keyboard: [[{ text: '❌ বাতিল', callback_data: 'tb:menu' }]] }
        );
      } else if (data.startsWith('tb:mk:')) {
        const code = data.slice(6);
        const pending = botPendingState.get(chatId);
        const name = (pending && pending.clientName) || `Client ${new Date().toISOString().slice(5, 16)}`;
        botPendingState.delete(chatId);
        let plan: StoredTrialKey['plan'] = '30D';
        let forceUnlim = false;
        if (code === '24H') plan = '24H';
        else if (code === '72H') plan = '72H';
        else if (code === '7D') plan = '7D';
        else if (code === '30D') plan = '30D';
        else if (code === '30DU') {
          plan = '30D';
          forceUnlim = true;
        } else if (code === 'UNLIM') {
          plan = 'UNLIMITED';
          forceUnlim = true;
        }
        const created = createClientKeyForOwner(name, plan, forceUnlim);
        toast = 'API Key তৈরি হয়েছে!';
        await sendClientCreatedMessages(created);
      } else if (data.startsWith('tb:view:')) {
        const sid = data.slice(8);
        const { exact } = findTrialMatches(sid);
        if (!exact) {
          toast = 'ক্লায়েন্ট পাওয়া যায়নি';
          await sendOrEdit('❌ ক্লায়েন্টটি পাওয়া যায়নি বা ডিলিট করা হয়েছে।', buildMainMenuKeyboard());
        } else {
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith('tb:pause:')) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = false;
          flushTrialStoreSync();
          toast = 'ক্লায়েন্ট API বন্ধ (Paused) করা হয়েছে!';
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith('tb:resume:')) {
        const sid = data.slice(10);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = 'ক্লায়েন্ট API চালু (Resumed) করা হয়েছে!';
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith('tb:ext7:') || data.startsWith('tb:ext30:')) {
        const is30 = data.startsWith('tb:ext30:');
        const sid = data.slice(is30 ? 9 : 8);
        const days = is30 ? 30 : 7;
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 86_400_000;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = `+${days} দিন মেয়াদ বাড়ানো হয়েছে!`;
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith('tb:unlim:')) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.unlimited = true;
          exact.maxRequests = -1;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          toast = 'আনলিমিটেড রিকোয়েস্ট চালু হয়েছে!';
          await sendOrEdit(buildClientCardHtml(exact), buildClientInlineKeyboard(exact));
        }
      } else if (data.startsWith('tb:msg:')) {
        const sid = data.slice(7);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          toast = 'ক্লায়েন্ট মেসেজ পাঠানো হয়েছে';
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `📋 <b>${escTgHtml(exact.clientName)} — কপি/ফরওয়ার্ড মেসেজ:</b>\n\n<pre>${escTgHtml(
              buildClientShareMessageText(exact)
            )}</pre>`,
            parse_mode: 'HTML',
          });
        }
      } else if (data.startsWith('tb:del:')) {
        const sid = data.slice(7);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          await sendOrEdit(
            `⚠️ আপনি কি নিশ্চিতভাবে <b>${escTgHtml(exact.clientName)}</b> (<code>#${sid}</code>)-এর API Key স্থায়ীভাবে ডিলিট করতে চান?\n\nডিলিট করলে এই Key দিয়ে আর কোনো ভিডিও বা API কাজ করবে না।`,
            {
              inline_keyboard: [
                [
                  { text: '✅ হ্যাঁ, ডিলিট করুন', callback_data: `tb:delok:${sid}` },
                  { text: '❌ না, ফিরে যান', callback_data: `tb:view:${sid}` },
                ],
              ],
            }
          );
        }
      } else if (data.startsWith('tb:delok:')) {
        const sid = data.slice(9);
        const { exact } = findTrialMatches(sid);
        if (exact) {
          exact.active = false;
          exact.revoked = true;
          flushTrialStoreSync();
          toast = 'API Key স্থায়ীভাবে ডিলিট হয়েছে!';
        }
        const view = renderClientListMessage('ALL', 0);
        await sendOrEdit(view.text, view.reply_markup);
      }

      if (cb.id) {
        await dispatch('answerCallbackQuery', {
          callback_query_id: cb.id,
          ...(toast ? { text: toast } : {}),
        });
      }
      return { handled: true, reason: `callback:${data}` };
    }

    // 2. Text Commands & Pending Interactive Steps
    const text = String(msg?.text || '').trim();
    if (!text) return { handled: false, reason: 'no_text' };

    const cmdMatch = text.match(/^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/);
    if (cmdMatch) {
      botPendingState.delete(chatId);
      const cmd = cmdMatch[1].toLowerCase();
      const arg = (cmdMatch[2] || '').trim();

      if (cmd === 'start' || cmd === 'menu' || cmd === 'help' || cmd === 'stats') {
        const helpFooter =
          cmd === 'help'
            ? [
                '',
                '⚡ <b>সকল কমান্ড:</b>',
                '• <code>/list</code> — সব ক্লায়েন্ট ও মেয়াদ',
                '• <code>/new RahimOTT 30D</code> — নতুন Key (24H/72H/7D/30D/UNLIMITED)',
                '• <code>/find Rahim</code> — ক্লায়েন্ট খুঁজুন',
                '• <code>/pause Rahim</code> — টাকা না দিলে সাথে সাথে বন্ধ করুন',
                '• <code>/resume Rahim</code> — আবার চালু করুন',
                '• <code>/renew Rahim 30</code> — মেয়াদ ৩০ দিন বাড়ান',
                '• <code>/unlimited Rahim</code> — রিকোয়েস্ট আনলিমিটেড করুন',
                '• <code>/delete Rahim</code> — Key স্থায়ীভাবে ডিলিট করুন',
                '• <code>/msg Rahim</code> — ক্লায়েন্টকে দেওয়ার মেসেজ আনুন',
                '• <code>/seturl https://...</code> — লাইভ ডোমেইন সেট করুন',
              ].join('\n')
            : '';
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: buildDashboardSummaryHtml() + helpFooter,
          parse_mode: 'HTML',
          reply_markup: buildMainMenuKeyboard(),
        });
        return { handled: true, reason: `cmd:${cmd}` };
      }

      if (cmd === 'list') {
        const pg = Math.max(0, (parseInt(arg, 10) || 1) - 1);
        const view = renderClientListMessage('ALL', pg);
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: view.text,
          parse_mode: 'HTML',
          reply_markup: view.reply_markup,
        });
        return { handled: true, reason: 'cmd:list' };
      }

      if (cmd === 'new') {
        if (!arg) {
          botPendingState.set(chatId, { step: 'await_new_name', updatedAt: Date.now() });
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: '➕ ক্লায়েন্টের নাম লিখুন (যেমন: <code>Rahim OTT</code>):',
            parse_mode: 'HTML',
          });
          return { handled: true, reason: 'cmd:new:prompt' };
        }
        const parts = arg.split(/\s+/);
        const lastUpper = parts[parts.length - 1].toUpperCase();
        const planTokens = ['2H', '24H', '72H', '7D', '30D', 'UNLIMITED', 'UNLIM'];
        let plan: StoredTrialKey['plan'] = '30D';
        let clientName = arg;
        if (parts.length > 1 && planTokens.includes(lastUpper)) {
          plan = lastUpper === 'UNLIM' ? 'UNLIMITED' : (lastUpper as StoredTrialKey['plan']);
          clientName = parts.slice(0, -1).join(' ');
        }
        const created = createClientKeyForOwner(clientName, plan, plan === 'UNLIMITED');
        await sendClientCreatedMessages(created);
        return { handled: true, reason: `cmd:new:${plan}` };
      }

      if (cmd === 'find' || cmd === 'info') {
        if (!arg) {
          botPendingState.set(chatId, { step: 'await_find_query', updatedAt: Date.now() });
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: '🔍 ক্লায়েন্টের নাম অথবা ID লিখুন:',
            parse_mode: 'HTML',
          });
          return { handled: true, reason: `cmd:${cmd}:prompt` };
        }
        await sendSearchMatches(arg);
        return { handled: true, reason: `cmd:${cmd}` };
      }

      if (cmd === 'pause' || cmd === 'resume' || cmd === 'unlimited' || cmd === 'delete' || cmd === 'msg') {
        if (!arg) {
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `ব্যবহার: <code>/${cmd} ক্লায়েন্টের_নাম_বা_ID</code>`,
            parse_mode: 'HTML',
          });
          return { handled: true, reason: `cmd:${cmd}:missing_arg` };
        }
        const { exact, matches } = findTrialMatches(arg);
        if (!exact) {
          await sendSearchMatches(arg);
          return { handled: true, reason: `cmd:${cmd}:not_exact_${matches.length}` };
        }
        if (cmd === 'pause') {
          exact.active = false;
          flushTrialStoreSync();
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `⏸️ <b>বন্ধ করা হয়েছে (API ও ভিডিও ব্লক):</b>\n\n${buildClientCardHtml(exact)}`,
            parse_mode: 'HTML',
            reply_markup: buildClientInlineKeyboard(exact),
          });
        } else if (cmd === 'resume') {
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `▶️ <b>পুনরায় চালু করা হয়েছে:</b>\n\n${buildClientCardHtml(exact)}`,
            parse_mode: 'HTML',
            reply_markup: buildClientInlineKeyboard(exact),
          });
        } else if (cmd === 'unlimited') {
          exact.unlimited = true;
          exact.maxRequests = -1;
          exact.active = true;
          notifiedTrialAlerts.delete(exact.key);
          flushTrialStoreSync();
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `♾️ <b>আনলিমিটেড রিকোয়েস্ট চালু:</b>\n\n${buildClientCardHtml(exact)}`,
            parse_mode: 'HTML',
            reply_markup: buildClientInlineKeyboard(exact),
          });
        } else if (cmd === 'delete') {
          exact.active = false;
          exact.revoked = true;
          flushTrialStoreSync();
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `🗑 <b>${escTgHtml(exact.clientName)}</b> (<code>#${getTrialShortId(
              exact.key
            )}</code>) এর API Key স্থায়ীভাবে ডিলিট করা হয়েছে।`,
            parse_mode: 'HTML',
            reply_markup: buildMainMenuKeyboard(),
          });
        } else if (cmd === 'msg') {
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `📋 <b>${escTgHtml(exact.clientName)} — ক্লায়েন্ট মেসেজ:</b>\n\n<pre>${escTgHtml(
              buildClientShareMessageText(exact)
            )}</pre>`,
            parse_mode: 'HTML',
          });
        }
        return { handled: true, reason: `cmd:${cmd}:ok` };
      }

      if (cmd === 'renew') {
        const parts = arg.split(/\s+/).filter(Boolean);
        if (!parts.length) {
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: 'ব্যবহার: <code>/renew ক্লায়েন্টের_নাম 30</code> (ডিফল্ট ৩০ দিন)',
            parse_mode: 'HTML',
          });
          return { handled: true, reason: 'cmd:renew:missing_arg' };
        }
        let days = 30;
        let query = arg;
        if (parts.length > 1 && /^\d{1,4}$/.test(parts[parts.length - 1])) {
          days = Math.min(3650, Math.max(1, parseInt(parts[parts.length - 1], 10)));
          query = parts.slice(0, -1).join(' ');
        }
        const { exact } = findTrialMatches(query);
        if (!exact) {
          await sendSearchMatches(query);
          return { handled: true, reason: 'cmd:renew:not_exact' };
        }
        exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 86_400_000;
        exact.active = true;
        notifiedTrialAlerts.delete(exact.key);
        flushTrialStoreSync();
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: `✅ <b>+${days} দিন মেয়াদ বাড়ানো (Renew) হয়েছে!</b>\n\n${buildClientCardHtml(exact)}`,
          parse_mode: 'HTML',
          reply_markup: buildClientInlineKeyboard(exact),
        });
        return { handled: true, reason: `cmd:renew:${days}` };
      }

      if (cmd === 'seturl') {
        const cleanUrl = arg.replace(/\/+$/, '');
        if (!/^https?:\/\/.+/i.test(cleanUrl)) {
          await dispatch('sendMessage', {
            chat_id: chatId,
            text: `ব্যবহার: <code>/seturl https://your-domain.run.app</code>\nবর্তমান URL: <code>${escTgHtml(
              resolvePublicBotBaseUrl()
            )}</code>`,
            parse_mode: 'HTML',
          });
          return { handled: true, reason: 'cmd:seturl:invalid' };
        }
        botConfigState.publicUrl = cleanUrl;
        saveBotConfig(botConfigState);
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: `✅ পাবলিক API Base URL আপডেট হয়েছে:\n<code>${escTgHtml(cleanUrl)}</code>`,
          parse_mode: 'HTML',
        });
        return { handled: true, reason: 'cmd:seturl:ok' };
      }

      await dispatch('sendMessage', {
        chat_id: chatId,
        text: '❓ অজানা কমান্ড। <code>/menu</code> বা <code>/help</code> লিখে দেখুন।',
        parse_mode: 'HTML',
        reply_markup: buildMainMenuKeyboard(),
      });
      return { handled: true, reason: `cmd:unknown:${cmd}` };
    }

    // 3. Pending interactive text input (from inline button prompts)
    const pending = botPendingState.get(chatId);
    if (pending && Date.now() - pending.updatedAt < 10 * 60_000) {
      if (pending.step === 'await_new_name') {
        const cleanName = text.slice(0, 48);
        botPendingState.set(chatId, { step: 'await_new_plan', clientName: cleanName, updatedAt: Date.now() });
        await dispatch('sendMessage', {
          chat_id: chatId,
          text: `👤 ক্লায়েন্ট: <b>${escTgHtml(cleanName)}</b>\n\nএখন মেয়াদ ও প্ল্যান সিলেক্ট করুন:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⏱️ 24H ট্রায়াল (250 Req)', callback_data: 'tb:mk:24H' },
                { text: '📅 72H ট্রায়াল (600 Req)', callback_data: 'tb:mk:72H' },
              ],
              [
                { text: '🗓 7 দিন (5,000 Req)', callback_data: 'tb:mk:7D' },
                { text: '🚀 30 দিন (100k Req)', callback_data: 'tb:mk:30D' },
              ],
              [
                { text: '💎 30 দিন আনলিমিটেড', callback_data: 'tb:mk:30DU' },
                { text: '♾️ লাইফটাইম আনলিমিটেড (10Yr)', callback_data: 'tb:mk:UNLIM' },
              ],
              [{ text: '❌ বাতিল', callback_data: 'tb:menu' }],
            ],
          },
        });
        return { handled: true, reason: 'pending:new_name' };
      }
      if (pending.step === 'await_find_query') {
        botPendingState.delete(chatId);
        await sendSearchMatches(text);
        return { handled: true, reason: 'pending:find_query' };
      }
    }

    // Fallback: quick search or show menu
    await dispatch('sendMessage', {
      chat_id: chatId,
      text: buildDashboardSummaryHtml(),
      parse_mode: 'HTML',
      reply_markup: buildMainMenuKeyboard(),
    });
    return { handled: true, reason: 'text:menu' };
  };

  // Telegram Webhook + Admin Self-Test Endpoint
  app.post('/api/trial/telegram/webhook', express.json({ limit: '256kb' }), async (req, res) => {
    const token = getTelegramBotToken();
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || '').trim();
    const adminHdr = String(req.headers['x-trial-admin'] || '').trim();
    const isAdminHdr = Boolean(adminEnv && adminHdr && adminHdr === adminEnv);
    const tgSecretHdr = String(req.headers['x-telegram-bot-api-secret-token'] || '').trim();
    const expectedSecret = token
      ? crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(`tg-webhook::${token}`).digest('hex').slice(0, 32)
      : '';

    if (!isAdminHdr && (!expectedSecret || tgSecretHdr !== expectedSecret)) {
      res.status(403).json({ ok: false, error: 'Forbidden webhook request' });
      return;
    }

    const captureOnly = isAdminHdr && req.query.dryRun === '1';
    const capturedReplies: Array<{ method: string; payload: any }> = [];
    const dispatch: TelegramDispatchFn = captureOnly
      ? async (method, payload) => {
          capturedReplies.push({ method, payload });
          return { ok: true, result: { message_id: capturedReplies.length } };
        }
      : callTelegramBotApi;

    try {
      const result = await handleTelegramUpdate(req.body, dispatch);
      res.status(200).json({ ok: true, ...result, ...(captureOnly ? { replies: capturedReplies } : {}) });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Telegram webhook failed' });
    }
  });

  let telegramPollerStarted = false;
  startTelegramBotPoller = () => {
    if (telegramPollerStarted) return;
    const token = getTelegramBotToken();
    if (!token) return;
    telegramPollerStarted = true;

    const runLoop = async () => {
      try {
        await callTelegramBotApi('deleteWebhook', { drop_pending_updates: false });
        await callTelegramBotApi('setMyCommands', {
          commands: [
            { command: 'menu', description: 'Owner কন্ট্রোল প্যানেল ও স্ট্যাটাস' },
            { command: 'list', description: 'সব ক্লায়েন্ট ও কার কতদিন মেয়াদ' },
            { command: 'new', description: 'নতুন ক্লায়েন্ট API Key তৈরি' },
            { command: 'find', description: 'নাম বা ID দিয়ে ক্লায়েন্ট খুঁজুন' },
            { command: 'pause', description: 'টাকা না দিলে ক্লায়েন্ট বন্ধ করুন' },
            { command: 'resume', description: 'বন্ধ ক্লায়েন্ট পুনরায় চালু করুন' },
            { command: 'renew', description: 'মেয়াদ বাড়ান (/renew Name 30)' },
            { command: 'unlimited', description: 'রিকোয়েস্ট আনলিমিটেড করুন' },
            { command: 'delete', description: 'ক্লায়েন্ট Key স্থায়ীভাবে ডিলিট' },
            { command: 'seturl', description: 'লাইভ API ডোমেইন সেট করুন' },
          ],
        });
        console.log('[Telegram Admin Bot] Connected & polling for owner commands.');
      } catch {
        // continue into polling
      }

      let offset = 0;
      let backoffMs = 1500;
      while (telegramPollerStarted) {
        try {
          const curToken = getTelegramBotToken();
          if (!curToken) break;
          const resp = await fetch(`https://api.telegram.org/bot${curToken}/getUpdates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offset,
              timeout: 25,
              allowed_updates: ['message', 'edited_message', 'callback_query'],
            }),
            signal: AbortSignal.timeout(35_000),
          });
          const data = (await resp.json().catch(() => null)) as { ok?: boolean; result?: any[] } | null;
          if (data?.ok && Array.isArray(data.result)) {
            backoffMs = 1500;
            for (const upd of data.result) {
              if (typeof upd.update_id === 'number' && upd.update_id >= offset) {
                offset = upd.update_id + 1;
              }
              await handleTelegramUpdate(upd, callTelegramBotApi).catch(() => {});
            }
          } else {
            await new Promise((r) => setTimeout(r, backoffMs));
            backoffMs = Math.min(20_000, Math.round(backoffMs * 1.5));
          }
        } catch {
          await new Promise((r) => setTimeout(r, backoffMs));
          backoffMs = Math.min(20_000, Math.round(backoffMs * 1.5));
        }
      }
    };

    void runLoop();
  };

  // ==========================================================================================
  // 6a-7. ZERO-CONFIG WEB OWNER CONTROL PANEL (/owner & /api/owner/*)
  // ==========================================================================================
  const hashOwnerPassword = (pw: string, salt: string) =>
    crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(`owner-pw::${salt}::${pw}`).digest('hex');

  const signOwnerSessionToken = () => {
    const exp = Date.now() + 30 * 86_400_000;
    const payload = Buffer.from(JSON.stringify({ role: 'owner', exp }), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(`owner-sess::${payload}`).digest('base64url');
    return `${payload}.${sig}`;
  };

  const verifyOwnerSessionToken = (token: string): boolean => {
    try {
      const [payload, sig] = String(token || '').trim().split('.');
      if (!payload || !sig) return false;
      const expected = crypto
        .createHmac('sha256', CINEPULSE_AES_KEY)
        .update(`owner-sess::${payload}`)
        .digest('base64url');
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return false;
      }
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return Boolean(parsed?.role === 'owner' && typeof parsed?.exp === 'number' && Date.now() < parsed.exp);
    } catch {
      return false;
    }
  };

  const extractOwnerCookie = (req: express.Request): string => {
    const hdrToken = String(req.headers['x-owner-token'] || '').trim();
    if (hdrToken) return hdrToken;
    const rawCookie = String(req.headers.cookie || '');
    const match = rawCookie.match(/(?:^|;\s*)cp_owner_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  isTrialOwnerRequest = (req: express.Request): boolean => {
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || '').trim();
    const adminHdr = String(req.headers['x-trial-admin'] || req.query.adminKey || '').trim();
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
      if (st.code === 'ACTIVE') activeCount++;
      else if (st.code === 'PAUSED') pausedCount++;
      else if (st.code === 'EXPIRED') expiredCount++;
      else if (st.code === 'QUOTA_EXHAUSTED') quotaCount++;
      return {
        shortId: getTrialShortId(r.key),
        statusCode: st.code,
        statusBadge: st.badge,
        remainingTextBn: r.active ? formatRemainingDurationBn(r.expiresAt) : 'বন্ধ (Paused)',
        ...buildTrialSummary(r, false),
        shareMessage: buildClientShareMessageText(r),
      };
    });

    return {
      stats: {
        total: all.length,
        active: activeCount,
        paused: pausedCount,
        expired: expiredCount,
        quotaExhausted: quotaCount,
        totalRequests,
      },
      publicUrl: resolvePublicBotBaseUrl(),
      telegramReady: Boolean(getTelegramBotToken() && getAllowedTelegramAdminIds().size > 0),
      clients,
    };
  };

  app.use('/api/owner', express.json({ limit: '64kb' }), (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });

  app.get('/api/owner/status', (req, res) => {
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
      ...(overview ? overview : {}),
    });
  });

  app.post('/api/owner/setup', (req, res) => {
    capturePublicOriginForBot(req);
    if (botConfigState.ownerPinHash) {
      res.status(409).json({ ok: false, error: 'Owner পাসওয়ার্ড আগে থেকেই সেট করা আছে। লগইন করুন।' });
      return;
    }
    const pw = String(req.body?.password || '').trim();
    if (pw.length < 4 || pw.length > 32) {
      res.status(400).json({ ok: false, error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
      return;
    }
    const salt = crypto.randomBytes(8).toString('hex');
    botConfigState.ownerPinSalt = salt;
    botConfigState.ownerPinHash = hashOwnerPassword(pw, salt);
    saveBotConfig(botConfigState);

    const token = signOwnerSessionToken();
    res.setHeader('Set-Cookie', `cp_owner_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.json({ ok: true, ownerToken: token, ...buildOwnerOverviewPayload() });
  });

  app.post('/api/owner/login', (req, res) => {
    capturePublicOriginForBot(req);
    const pw = String(req.body?.password || '').trim();
    const adminEnv = String(process.env.TRIAL_ADMIN_KEY || '').trim();
    const matchesEnv = Boolean(adminEnv && pw && pw === adminEnv);
    const matchesPin = Boolean(
      botConfigState.ownerPinHash &&
        botConfigState.ownerPinSalt &&
        hashOwnerPassword(pw, botConfigState.ownerPinSalt) === botConfigState.ownerPinHash
    );
    if (!matchesEnv && !matchesPin) {
      res.status(401).json({ ok: false, error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' });
      return;
    }
    const token = signOwnerSessionToken();
    res.setHeader('Set-Cookie', `cp_owner_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    res.json({ ok: true, ownerToken: token, ...buildOwnerOverviewPayload() });
  });

  app.post('/api/owner/logout', (_req, res) => {
    res.setHeader('Set-Cookie', 'cp_owner_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });

  app.post('/api/owner/config', (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: 'Owner login required' });
      return;
    }
    const rawUrl = String(req.body?.publicUrl || '').trim().replace(/\/+$/, '');
    if (rawUrl && !/^https?:\/\/.+/i.test(rawUrl)) {
      res.status(400).json({ ok: false, error: 'সঠিক https:// ডোমেইন URL দিন।' });
      return;
    }
    botConfigState.publicUrl = rawUrl || undefined;
    saveBotConfig(botConfigState);
    res.json({ ok: true, ...buildOwnerOverviewPayload() });
  });

  app.post('/api/owner/clients', (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: 'Owner login required' });
      return;
    }
    const name = String(req.body?.clientName || '').trim().slice(0, 48) || 'Client App';
    const planCode = String(req.body?.plan || '30D').toUpperCase();
    let plan: StoredTrialKey['plan'] = '30D';
    let forceUnlimited = false;
    if (planCode === '24H') plan = '24H';
    else if (planCode === '72H') plan = '72H';
    else if (planCode === '7D') plan = '7D';
    else if (planCode === '30D') plan = '30D';
    else if (planCode === '30DU') {
      plan = '30D';
      forceUnlimited = true;
    } else if (planCode === 'UNLIMITED') {
      plan = 'UNLIMITED';
      forceUnlimited = true;
    }
    const rec = createClientKeyForOwner(name, plan, forceUnlimited);
    res.status(201).json({
      ok: true,
      created: {
        shortId: getTrialShortId(rec.key),
        ...buildTrialSummary(rec, false),
        shareMessage: buildClientShareMessageText(rec),
      },
      ...buildOwnerOverviewPayload(),
    });
  });

  app.post('/api/owner/clients/:shortId/action', (req, res) => {
    if (!isTrialOwnerRequest(req)) {
      res.status(401).json({ ok: false, error: 'Owner login required' });
      return;
    }
    const sid = String(req.params.shortId || '').trim();
    const { exact } = findTrialMatches(sid);
    if (!exact) {
      res.status(404).json({ ok: false, error: 'ক্লায়েন্ট পাওয়া যায়নি।' });
      return;
    }
    const action = String(req.body?.action || '').trim();
    if (action === 'pause') {
      exact.active = false;
    } else if (action === 'resume') {
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === 'ext7' || action === 'ext30' || action === 'renew') {
      const days = action === 'ext7' ? 7 : action === 'ext30' ? 30 : Math.min(3650, Math.max(1, Number(req.body?.days) || 30));
      exact.expiresAt = Math.max(Date.now(), exact.expiresAt) + days * 86_400_000;
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === 'unlimited') {
      exact.unlimited = true;
      exact.maxRequests = -1;
      exact.active = true;
      notifiedTrialAlerts.delete(exact.key);
    } else if (action === 'delete') {
      exact.active = false;
      exact.revoked = true;
    } else {
      res.status(400).json({ ok: false, error: 'অজানা অ্যাকশন' });
      return;
    }
    flushTrialStoreSync();
    res.json({ ok: true, ...buildOwnerOverviewPayload() });
  });

  app.get('/owner', (req, res) => {
    capturePublicOriginForBot(req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MovieBox API — Owner কন্ট্রোল প্যানেল</title>
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
      <div class="brand"><span class="dot"></span> MovieBox API — বাংলা Owner প্যানেল</div>
      <div class="nav">
        <a class="linkbtn sec" href="/trial">API টেস্ট পোর্টাল</a>
        <a class="linkbtn sec" href="/">ওয়েব অ্যাপ</a>
        <button id="logoutBtn" class="sec" style="display:none" onclick="doLogout()">লগআউট</button>
      </div>
    </div>

    <div id="authBox" class="card" style="max-width:440px;margin:40px auto;display:none;">
      <h2 id="authTitle" style="margin:0 0 8px;font-size:18px;">Owner প্যানেল চালু করুন</h2>
      <p id="authDesc" style="margin:0 0 12px;font-size:13px;color:var(--muted);line-height:1.6;"></p>
      <input id="ownerPassInput" type="password" placeholder="আপনার গোপন পাসওয়ার্ড লিখুন (কমপক্ষে ৪ অক্ষর)" />
      <button id="authSubmitBtn" style="width:100%;margin-top:12px;justify-content:center;" onclick="submitAuth()">প্রবেশ করুন</button>
      <div id="authErr" style="color:#f87171;font-size:12px;margin-top:8px;"></div>
    </div>

    <div id="dashBox" style="display:none;">
      <div class="stats">
        <div class="stat"><div class="lbl">👥 মোট ক্লায়েন্ট</div><div class="num" id="stTotal">0</div></div>
        <div class="stat"><div class="lbl">🟢 চালু (Active)</div><div class="num" style="color:var(--green)" id="stActive">0</div></div>
        <div class="stat"><div class="lbl">🔴 বন্ধ (Paused)</div><div class="num" style="color:#f87171" id="stPaused">0</div></div>
        <div class="stat"><div class="lbl">⏰ মেয়াদ/কোটা শেষ</div><div class="num" style="color:var(--amber)" id="stExpired">0</div></div>
        <div class="stat"><div class="lbl">📊 মোট API হিট</div><div class="num" style="color:var(--blue)" id="stHits">0</div></div>
      </div>

      <div id="previewWarnCard" class="card" style="display:none;border-color:var(--amber);background:rgba(245,158,11,0.08);">
        <strong style="color:#fbbf24;">⚠️ গুরুত্বপূর্ণ (ক্লায়েন্টের অ্যাপে চালানোর জন্য):</strong>
        <div style="font-size:13px;line-height:1.6;margin-top:4px;">
          আপনি এখন প্রিভিউ লিংকে আছেন। বাইরে কোনো ক্লায়েন্টের ওয়েবসাইট বা অ্যাপে API দিতে উপরে ডানদিকের <strong>Deploy</strong> বাটনে ক্লিক করে Cloud Run-এ Deploy করুন এবং নিচের <strong>পাবলিক ডোমেইন</strong> ঘরে ওই লাইভ লিংকটি সেভ করে দিন।
        </div>
      </div>

      <div class="grid2">
        <div>
          <div class="card">
            <h3 style="margin:0 0 8px;font-size:16px;">➕ নতুন ক্লায়েন্ট Key বানান</h3>
            <label>ক্লায়েন্ট / অ্যাপের নাম</label>
            <input id="newClientName" placeholder="যেমন: Rahim OTT App" />
            <label>মেয়াদ ও লিমিট প্ল্যান</label>
            <select id="newPlan">
              <option value="24H">২৪ ঘন্টা ট্রায়াল (250 Req)</option>
              <option value="72H">৩ দিন ট্রায়াল (600 Req)</option>
              <option value="7D">৭ দিন (5,000 Req)</option>
              <option value="30D" selected>৩০ দিন / ১ মাস (100,000 Req)</option>
              <option value="30DU">৩০ দিন আনলিমিটেড রিকোয়েস্ট</option>
              <option value="UNLIMITED">♾️ লাইফটাইম আনলিমিটেড (১০ বছর)</option>
            </select>
            <button style="width:100%;margin-top:14px;justify-content:center;" onclick="createClient()">🚀 API Key তৈরি করুন</button>
            <div id="createdBox" style="display:none;margin-top:12px;">
              <div class="row" style="justify-content:space-between;">
                <strong style="font-size:12px;color:var(--green);">✅ তৈরি হয়েছে! ক্লায়েন্টকে পাঠান:</strong>
                <button class="sm green" onclick="copyText(lastShareMsg)">📋 মেসেজ কপি</button>
              </div>
              <pre id="createdPreview"></pre>
            </div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 8px;font-size:15px;">🌐 লাইভ API ডোমেইন সেটিং</h3>
            <label>ক্লায়েন্ট মেসেজে যে Base URL যাবে</label>
            <div class="row">
              <input id="pubUrlInput" placeholder="https://your-live-app.run.app" style="flex:1;" />
              <button class="sec sm" onclick="savePubUrl()">সেভ</button>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--muted);line-height:1.6;">
              <strong>Telegram বট স্ট্যাটাস:</strong> <span id="tgStatusText">অপেক্ষায়...</span><br/>
              Telegram-এ এই একই কন্ট্রোল প্যানেল পেতে সার্ভার Secrets-এ <code>TELEGRAM_BOT_TOKEN</code> এবং <code>TELEGRAM_ADMIN_CHAT_ID</code> যোগ করলেই অটো চালু হবে।
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:16px;">📋 সব ক্লায়েন্ট লিস্ট ও কন্ট্রোল</h3>
            <button class="sec sm" onclick="refreshStatus()">🔄 রিফ্রেশ</button>
          </div>
          <div class="row" style="margin-top:10px;">
            <input id="searchClient" placeholder="নাম বা ID দিয়ে খুঁজুন..." oninput="renderClients()" style="flex:1;" />
          </div>
          <div class="tabs">
            <button class="tab on" onclick="setFilter('ALL', this)">সব</button>
            <button class="tab" onclick="setFilter('ACTIVE', this)">🟢 চালু</button>
            <button class="tab" onclick="setFilter('PAUSED', this)">🔴 বন্ধ (টাকা বাকি)</button>
            <button class="tab" onclick="setFilter('EXPIRED', this)">⏰ মেয়াদ শেষ</button>
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
      navigator.clipboard.writeText(txt).then(() => showToast('কপি হয়েছে! এখন WhatsApp/Telegram-এ Paste করুন'));
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
          document.getElementById('authTitle').textContent = '১ বারের জন্য Owner পাসওয়ার্ড সেট করুন';
          document.getElementById('authDesc').textContent = 'নিজের পছন্দের যেকোনো পাসওয়ার্ড লিখে চাপ দিন — সাথে সাথে আপনার পুরো ক্লায়েন্ট কন্ট্রোল প্যানেল চালু হয়ে যাবে!';
          document.getElementById('authSubmitBtn').textContent = 'Owner প্যানেল চালু করুন';
        } else {
          document.getElementById('authTitle').textContent = 'Owner লগইন';
          document.getElementById('authDesc').textContent = 'আপনার Owner পাসওয়ার্ড দিয়ে প্রবেশ করুন।';
          document.getElementById('authSubmitBtn').textContent = 'লগইন করুন';
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
        ? '🟢 কানেক্টেড (Telegram Bot চালু আছে)'
        : '⚪ চালু নয় (চাইলে শুধু ওয়েব প্যানেল থেকেই সব চালাতে পারবেন)';
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
        document.getElementById('authErr').textContent = d.error || 'ব্যর্থ হয়েছে';
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
      showToast('নতুন ক্লায়েন্ট API Key তৈরি হয়েছে!');
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
      showToast('আপডেট সম্পন্ন হয়েছে!');
    }
    async function savePubUrl() {
      const u = document.getElementById('pubUrlInput').value.trim();
      const d = await api('/api/owner/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicUrl: u }),
      });
      if (!d.ok) { showToast(d.error || 'সঠিক URL দিন'); return; }
      applyOverview(d);
      showToast('পাবলিক ডোমেইন সেভ হয়েছে!');
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
        box.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">এই তালিকায় কোনো ক্লায়েন্ট নেই। বাম পাশ থেকে নতুন ক্লায়েন্ট তৈরি করুন।</div>';
        return;
      }
      list.forEach(c => {
        const card = document.createElement('div');
        card.className = 'client-card';
        const badgeCls = c.statusCode === 'ACTIVE' ? 'b-active' : c.statusCode === 'PAUSED' ? 'b-paused' : 'b-expired';
        const quotaTxt = c.unlimited || c.maxRequests < 0
          ? ('♾️ আনলিমিটেড (ব্যবহার: ' + c.usedRequests + ')')
          : (c.remainingRequests + ' / ' + c.maxRequests + ' বাকি (ব্যবহার: ' + c.usedRequests + ')');

        const head = document.createElement('div');
        head.className = 'client-head';
        head.innerHTML = '<div><strong>' + esc(c.clientName) + '</strong> <span style="font-family:monospace;font-size:11px;color:var(--blue);">#' + c.shortId + '</span> <span style="font-size:11px;color:var(--muted);">(' + c.plan + ')</span></div>'
          + '<span class="badge ' + badgeCls + '">' + esc(c.statusBadge) + '</span>';

        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:var(--muted);margin:8px 0;line-height:1.6;';
        meta.textContent = '⏳ সময় বাকি: ' + c.remainingTextBn + '  •  📈 ' + quotaTxt;

        const btns = document.createElement('div');
        btns.className = 'row';
        const bToggle = mkBtn(c.active ? '⏸️ বন্ধ করুন' : '▶️ চালু করুন', c.active ? 'sm amber' : 'sm green', () => clientAct(c.shortId, c.active ? 'pause' : 'resume'));
        const b7 = mkBtn('+৭ দিন', 'sm sec', () => clientAct(c.shortId, 'ext7'));
        const b30 = mkBtn('+৩০ দিন', 'sm sec', () => clientAct(c.shortId, 'ext30'));
        const bCopy = mkBtn('📋 মেসেজ কপি', 'sm sec', () => copyText(c.shareMessage));
        btns.append(bToggle, b7, b30);
        if (!c.unlimited) btns.append(mkBtn('♾️ আনলিমিটেড', 'sm sec', () => clientAct(c.shortId, 'unlimited')));
        btns.append(bCopy);

        if (pendingDeleteId === c.shortId) {
          btns.append(mkBtn('✅ নিশ্চিত ডিলিট', 'sm', () => clientAct(c.shortId, 'delete')));
          btns.append(mkBtn('বাতিল', 'sm sec', () => { pendingDeleteId = ''; renderClients(); }));
        } else {
          btns.append(mkBtn('🗑 ডিলিট', 'sm sec', () => { pendingDeleteId = c.shortId; renderClients(); }));
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

  // 6b. Ultra-Fast Sequential MKV-to-HLS Live Streamer for iPhone / iPad (iOS Safari)
  interface IosHlsSession {
    hash: string;
    dir: string;
    targetUrl: string;
    proc: ChildProcess | null;
    abortController: AbortController;
    lastAccess: number;
    finished: boolean;
  }

  const iosHlsSessions = new Map<string, IosHlsSession>();

  const cleanupIosHlsSession = (hash: string) => {
    const sess = iosHlsSessions.get(hash);
    if (!sess) return;
    iosHlsSessions.delete(hash);
    try {
      sess.abortController.abort();
    } catch {
      // ignore
    }
    try {
      if (sess.proc && !sess.proc.killed) {
        sess.proc.kill('SIGKILL');
      }
    } catch {
      // ignore
    }
    try {
      fs.rmSync(sess.dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  setInterval(() => {
    const now = Date.now();
    for (const [hash, sess] of iosHlsSessions.entries()) {
      if (now - sess.lastAccess > 120_000) {
        cleanupIosHlsSession(hash);
      }
    }
  }, 30_000).unref();

  const ensureIosHlsSession = async (targetUrl: string): Promise<IosHlsSession> => {
    const hash = crypto.createHash('sha1').update(targetUrl).digest('hex').slice(0, 16);
    const existing = iosHlsSessions.get(hash);
    if (existing && fs.existsSync(path.join(existing.dir, 'index.m3u8'))) {
      existing.lastAccess = Date.now();
      return existing;
    }

    if (existing) {
      cleanupIosHlsSession(hash);
    }

    // Keep at most 2 concurrent HLS remux sessions so /tmp stays lightweight
    if (iosHlsSessions.size >= 2) {
      const oldest = Array.from(iosHlsSessions.values()).sort(
        (a, b) => a.lastAccess - b.lastAccess
      )[0];
      if (oldest) cleanupIosHlsSession(oldest.hash);
    }

    const dir = path.join('/tmp', `cp-hls-${hash}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const abortController = new AbortController();
    const session: IosHlsSession = {
      hash,
      dir,
      targetUrl,
      proc: null,
      abortController,
      lastAccess: Date.now(),
      finished: false,
    };
    iosHlsSessions.set(hash, session);

    const upstreamRes = await fetch(targetUrl, {
      signal: abortController.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      cleanupIosHlsSession(hash);
      throw new Error(`Upstream stream HTTP ${upstreamRes.status}`);
    }

    const ff = spawn(FFMPEG_BIN, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-fflags',
      '+nobuffer+genpts',
      '-probesize',
      '131072',
      '-analyzeduration',
      '100000',
      '-f',
      'matroska',
      '-i',
      'pipe:0',
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-ac',
      '2',
      '-b:a',
      '128k',
      '-af',
      "volume=enable='between(t,0,13.5)':volume=0",
      '-bsf:v',
      'h264_mp4toannexb',
      '-f',
      'hls',
      '-hls_playlist_type',
      'event',
      '-hls_time',
      '2',
      '-hls_list_size',
      '0',
      '-hls_flags',
      'independent_segments+temp_file',
      '-hls_segment_filename',
      path.join(dir, 'seg_%04d.ts'),
      path.join(dir, 'index.m3u8'),
    ]);

    session.proc = ff;
    ff.on('exit', () => {
      session.finished = true;
    });
    ff.stdin.on('error', () => {});

    const reader = upstreamRes.body.getReader();
    (async () => {
      let bytesTransferred = 0;
      const BURST_BYTES = 24 * 1024 * 1024; // 24MB instant high-speed burst (~3 mins of video)
      try {
        while (true) {
          if (Date.now() - session.lastAccess > 120_000) {
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
            await new Promise<void>((resolve) => ff.stdin.once('drain', () => resolve()));
          }
          // After initial 24MB burst, lightly pace download so /tmp is never flooded
          if (bytesTransferred > BURST_BYTES) {
            await new Promise((r) => setTimeout(r, 25));
          }
        }
      } catch {
        try {
          ff.stdin.end();
        } catch {
          // ignore
        }
      }
    })();

    // Wait up to 4.5s for index.m3u8 + first segments (seg_0001.ts or seg_0000.ts) to appear
    const startWait = Date.now();
    while (Date.now() - startWait < 4500) {
      const m3u8Path = path.join(dir, 'index.m3u8');
      const seg1Path = path.join(dir, 'seg_0001.ts');
      const seg0Path = path.join(dir, 'seg_0000.ts');
      if (
        fs.existsSync(m3u8Path) &&
        (fs.existsSync(seg1Path) || (fs.existsSync(seg0Path) && Date.now() - startWait > 1400))
      ) {
        return session;
      }
      await new Promise((r) => setTimeout(r, 45));
    }

    return session;
  };

  app.options('/api/ios-hls/:token/:file', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.status(204).end();
  });

  app.get('/api/ios-hls/:token/:file', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    const token = String(req.params.token || '').trim();
    const file = String(req.params.file || '').trim();
    const targetUrl = decodeGatewayToken(token);

    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.status(400).send('Invalid stream token');
      return;
    }

    try {
      if (file === 'index.m3u8') {
        const session = await ensureIosHlsSession(targetUrl);
        session.lastAccess = Date.now();
        const m3u8Path = path.join(session.dir, 'index.m3u8');
        if (!fs.existsSync(m3u8Path)) {
          res.status(503).send('HLS playlist initializing');
          return;
        }
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(fs.readFileSync(m3u8Path, 'utf8'));
        return;
      }

      if (/^seg_\d+\.ts$/.test(file)) {
        const hash = crypto.createHash('sha1').update(targetUrl).digest('hex').slice(0, 16);
        let session = iosHlsSessions.get(hash);
        if (!session) {
          session = await ensureIosHlsSession(targetUrl);
        }
        session.lastAccess = Date.now();
        const segPath = path.join(session.dir, file);

        // Wait briefly if segment is currently being finalized by ffmpeg
        const waitStart = Date.now();
        while (!fs.existsSync(segPath) && Date.now() - waitStart < 3500) {
          await new Promise((r) => setTimeout(r, 50));
        }

        if (!fs.existsSync(segPath)) {
          res.status(404).send('Segment not ready');
          return;
        }

        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=600');
        fs.createReadStream(segPath).pipe(res);
        return;
      }

      res.status(404).send('Not found');
    } catch (err) {
      console.error('iOS HLS stream error:', err);
      res.status(502).send('Stream transcode failed');
    }
  });

  // 6c. Embedded MKV Subtitle & Exact Audio-Visual Sync Extractor (/api/subtitles/extract)
  const mkvSubExtractCache = new Map<string, { srt: string; expiresAt: number }>();

  app.get('/api/subtitles/extract', async (req, res) => {
    const streamUrl = String(req.query.url || '').trim();
    const startSec = Math.max(0, Number(req.query.startSec || 0) || 0);
    const windowMode = String(req.query.mode || 'probe').trim(); // 'probe' (fast 6MB header+opening) or 'window' (15-min seek window)

    if (!streamUrl || !streamUrl.startsWith('http')) {
      res.json({ ok: false, srt: '' });
      return;
    }

    const cacheKey = `${streamUrl}::${windowMode}::${Math.floor(startSec / 300)}`;
    const cached = mkvSubExtractCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ ok: true, srt: cached.srt, cached: true });
      return;
    }

    try {
      let extractedSrt = '';

      if (windowMode === 'window' && startSec > 0) {
        // Seek directly over HTTP to startSec and demux 12 minutes of embedded subtitle packets (-vn -an = zero video/audio decode overhead)
        extractedSrt = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          const ff = spawn(FFMPEG_BIN, [
            '-hide_banner',
            '-loglevel',
            'error',
            '-ss',
            String(startSec),
            '-t',
            '720',
            '-i',
            streamUrl,
            '-vn',
            '-an',
            '-map',
            '0:s:0?',
            '-c:s',
            'srt',
            '-f',
            'srt',
            'pipe:1',
          ]);
          const killTimer = setTimeout(() => {
            try {
              ff.kill('SIGKILL');
            } catch {}
            resolve(Buffer.concat(chunks).toString('utf8'));
          }, 5200);

          ff.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
          ff.on('close', () => {
            clearTimeout(killTimer);
            resolve(Buffer.concat(chunks).toString('utf8'));
          });
          ff.on('error', () => {
            clearTimeout(killTimer);
            resolve('');
          });
        });
      } else {
        // Fast 5.5MB Range probe from byte 0: downloads in ~350ms and gives exact opening embedded subtitle cues for auto-sync!
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 4200);
        const upstream = await fetch(streamUrl, {
          signal: controller.signal,
          headers: {
            Range: 'bytes=0-5767167',
            'User-Agent': 'Mozilla/5.0',
          },
        }).finally(() => clearTimeout(fetchTimer));

        if (upstream.ok && upstream.body) {
          const arrayBuf = await upstream.arrayBuffer();
          const inputBuf = Buffer.from(arrayBuf);
          extractedSrt = await new Promise<string>((resolve) => {
            const outChunks: Buffer[] = [];
            const ff = spawn(FFMPEG_BIN, [
              '-hide_banner',
              '-loglevel',
              'error',
              '-i',
              'pipe:0',
              '-vn',
              '-an',
              '-map',
              '0:s:0?',
              '-c:s',
              'srt',
              '-f',
              'srt',
              'pipe:1',
            ]);
            const killTimer = setTimeout(() => {
              try {
                ff.kill('SIGKILL');
              } catch {}
              resolve(Buffer.concat(outChunks).toString('utf8'));
            }, 2500);

            ff.stdout.on('data', (chunk: Buffer) => outChunks.push(chunk));
            ff.stdin.on('error', () => {});
            ff.on('close', () => {
              clearTimeout(killTimer);
              resolve(Buffer.concat(outChunks).toString('utf8'));
            });
            ff.on('error', () => {
              clearTimeout(killTimer);
              resolve('');
            });

            ff.stdin.end(inputBuf);
          });
        }
      }

      if (extractedSrt && extractedSrt.includes('-->')) {
        pruneCacheMap(mkvSubExtractCache, 80);
        mkvSubExtractCache.set(cacheKey, {
          srt: extractedSrt,
          expiresAt: Date.now() + 30 * 60_000,
        });
        res.json({ ok: true, srt: extractedSrt });
        return;
      }
    } catch {
      // ignore probe failure
    }

    res.json({ ok: false, srt: '' });
  });

  // 7. User Movie Requests & Broken Link Reports API
  app.get('/api/requests', (_req, res) => {
    res.json({ ok: true, requests: movieRequestsStore });
  });

  app.post('/api/requests', (req, res) => {
    const title = sanitizeBrandText(String(req.body?.title || '').trim());
    const type = String(req.body?.type || 'MOVIE').toUpperCase() as UserMovieRequest['type'];
    const language = sanitizeBrandText(String(req.body?.language || 'Bangla / Dual Audio').trim());
    const notes = sanitizeBrandText(String(req.body?.notes || '').trim());

    if (!title) {
      res.status(400).json({ ok: false, error: 'অনুগ্রহ করে মুভি বা সিরিজের নাম লিখুন' });
      return;
    }

    const item: UserMovieRequest = {
      id: `req-${Date.now()}`,
      title,
      type: ['MOVIE', 'SERIES', 'ANIME', 'BROKEN_LINK'].includes(type) ? type : 'MOVIE',
      language,
      notes,
      status: 'Queued',
      createdAt: Date.now(),
    };
    movieRequestsStore.unshift(item);
    if (movieRequestsStore.length > 30) movieRequestsStore.pop();

    res.json({ ok: true, request: item, requests: movieRequestsStore });
  });

  // 7a. Per-User Isolated Watchlist & Watch Progress Store (Each user's list & resume state is strictly isolated!)
  interface StoredUserProfile {
    userId: string;
    username: string;
    pinHash: string;
    salt: string;
    isGuest: boolean;
    watchlist: MovieCardItem[];
    continueWatching: any[];
    updatedAt: number;
  }

  const userDataDir = path.join(__dirname, 'data');
  const userStorePath = path.join(userDataDir, 'cinepulse-users.json');
  const usersById = new Map<string, StoredUserProfile>();
  const userIdByName = new Map<string, string>();

  const loadUserStore = () => {
    try {
      if (!fs.existsSync(userStorePath)) return;
      const raw = JSON.parse(fs.readFileSync(userStorePath, 'utf8'));
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
      // ignore corrupted store and start clean
    }
  };
  loadUserStore();

  let userFlushTimer: NodeJS.Timeout | null = null;
  const scheduleFlushUserStore = () => {
    if (userFlushTimer) return;
    userFlushTimer = setTimeout(() => {
      userFlushTimer = null;
      try {
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        const allUsers = Array.from(usersById.values()).slice(-2000);
        const tmpFile = `${userStorePath}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify({ users: allUsers }), 'utf8');
        fs.renameSync(tmpFile, userStorePath);
      } catch {
        // ignore write errors on read-only paths
      }
    }, 600);
  };

  const hashUserPin = (pin: string, salt: string) =>
    crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(`${salt}::${pin}`).digest('hex');

  const signUserToken = (userId: string) => {
    const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() }), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  };

  const verifyUserToken = (token: string): string | null => {
    try {
      const [payload, sig] = String(token || '').split('.');
      if (!payload || !sig) return null;
      const expected = crypto.createHmac('sha256', CINEPULSE_AES_KEY).update(payload).digest('base64url');
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return null;
      }
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return parsed?.uid ? String(parsed.uid) : null;
    } catch {
      return null;
    }
  };

  const setNoSharedCacheHeaders = (res: express.Response) => {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'X-CP-User-Token');
  };

  app.post('/api/user/auth', (req, res) => {
    setNoSharedCacheHeaders(res);
    const mode = String(req.body?.mode || 'guest').trim();
    const rawUsername = String(req.body?.username || '')
      .trim()
      .replace(/\s+/g, ' ');
    const pin = String(req.body?.pin || '').trim();

    if (mode === 'guest') {
      const uid = `u_${crypto.randomBytes(9).toString('hex')}`;
      const shortTag = uid.slice(-4).toUpperCase();
      const profile: StoredUserProfile = {
        userId: uid,
        username: `Guest-${shortTag}`,
        pinHash: '',
        salt: '',
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now(),
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
          continueWatching: [],
        },
      });
      return;
    }

    if (rawUsername.length < 2 || rawUsername.length > 24) {
      res.status(400).json({ ok: false, error: 'ইউজারনেম কমপক্ষে ২ থেকে ২৪ অক্ষরের হতে হবে' });
      return;
    }
    if (pin.length < 4 || pin.length > 24) {
      res.status(400).json({ ok: false, error: 'পিন/পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
      return;
    }

    const lowerName = rawUsername.toLowerCase();

    if (mode === 'register') {
      if (userIdByName.has(lowerName)) {
        res.status(409).json({ ok: false, error: 'এই ইউজারনেমটি আগে থেকেই নেওয়া আছে—অন্য নাম দিন বা লগইন করুন' });
        return;
      }
      const uid = `u_${crypto.randomBytes(9).toString('hex')}`;
      const salt = crypto.randomBytes(8).toString('hex');
      const profile: StoredUserProfile = {
        userId: uid,
        username: rawUsername,
        pinHash: hashUserPin(pin, salt),
        salt,
        isGuest: false,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now(),
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
          continueWatching: [],
        },
      });
      return;
    }

    if (mode === 'login') {
      const existingUid = userIdByName.get(lowerName);
      const profile = existingUid ? usersById.get(existingUid) : undefined;
      if (!profile || profile.isGuest) {
        res.status(404).json({ ok: false, error: 'এই নামে কোনো একাউন্ট পাওয়া যায়নি' });
        return;
      }
      if (hashUserPin(pin, profile.salt) !== profile.pinHash) {
        res.status(401).json({ ok: false, error: 'পিন বা পাসওয়ার্ড ভুল হয়েছে' });
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
          continueWatching: profile.continueWatching || [],
        },
      });
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid auth mode' });
  });

  app.get('/api/user/me', (req, res) => {
    setNoSharedCacheHeaders(res);
    const token = String(req.headers['x-cp-user-token'] || '').trim();
    const uid = verifyUserToken(token);
    if (!uid) {
      res.status(401).json({ ok: false, error: 'Invalid session' });
      return;
    }
    let profile = usersById.get(uid);
    if (!profile) {
      // Recreate isolated empty guest profile cleanly if server restarted before flush
      profile = {
        userId: uid,
        username: `User-${uid.slice(-4).toUpperCase()}`,
        pinHash: '',
        salt: '',
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now(),
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
        continueWatching: profile.continueWatching || [],
      },
    });
  });

  app.put('/api/user/state', (req, res) => {
    setNoSharedCacheHeaders(res);
    const token = String(req.headers['x-cp-user-token'] || '').trim();
    const uid = verifyUserToken(token);
    if (!uid) {
      res.status(401).json({ ok: false, error: 'Invalid user session' });
      return;
    }
    let profile = usersById.get(uid);
    if (!profile) {
      profile = {
        userId: uid,
        username: `User-${uid.slice(-4).toUpperCase()}`,
        pinHash: '',
        salt: '',
        isGuest: true,
        watchlist: [],
        continueWatching: [],
        updatedAt: Date.now(),
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

  // 7b. Global Live Notifications API (New Movie Uploads + Popular High-Rating Movies Broadcast for Everyone)
  app.get('/api/notifications', (_req, res) => {
    const notifications = buildGlobalNotifications();
    res.json({
      ok: true,
      serverTime: Date.now(),
      notifications,
    });
  });

  app.post('/api/notifications/broadcast', (req, res) => {
    const rawMovie = req.body?.movie as MovieCardItem | undefined;
    const category =
      req.body?.category === 'TOP_RATED_POPULAR' ? 'TOP_RATED_POPULAR' : 'NEW_UPLOAD';

    if (!rawMovie || !rawMovie.title || !rawMovie.path) {
      res.status(400).json({ ok: false, error: 'Invalid movie payload for broadcast' });
      return;
    }

    const normMovie = normalizeMovieCardItem(rawMovie, Date.now());
    const ratingNum = parseFloat(normMovie.rating || '9.2') || 9.2;
    const broadcastItem: GlobalMovieNotification = {
      id: `notif-live-${Date.now()}-${normMovie.id}`,
      category,
      badgeText:
        category === 'TOP_RATED_POPULAR'
          ? `জনপ্রিয় ধামাকা • ★ ${ratingNum.toFixed(1)}`
          : 'মাত্র আপলোড হলো 🔥',
      headlineBn:
        category === 'TOP_RATED_POPULAR'
          ? `সবার জন্য হাই-রেটিং জনপ্রিয় মুভি অ্যালার্ট: ${normMovie.title}`
          : `নতুন মুভি আপলোড অ্যালার্ট (সবার জন্য): ${normMovie.title}`,
      subtitleBn: `${normMovie.language || 'Multi Audio'} • ${normMovie.quality || '1080p Full HD'} • রেটিং ★ ${ratingNum.toFixed(1)}`,
      movie: normMovie,
      createdAt: Date.now(),
      ratingScore: ratingNum,
    };

    customBroadcastNotifications.unshift(broadcastItem);
    if (customBroadcastNotifications.length > 12) {
      customBroadcastNotifications.pop();
    }

    res.json({
      ok: true,
      broadcast: broadcastItem,
      notifications: buildGlobalNotifications(),
    });
  });

  // 8. Ultra-Stealth White-Label Proxy Mode (Hides all upstream logos, links, sidebars & intro sounds)
  app.get('/api/proxy-page', async (req, res) => {
    const rawPath = String(req.query.path || '/').trim();
    const nodeId = String(req.query.node || '').trim();

    try {
      const { html, finalOrigin } = await fetchFromMirrors(rawPath, nodeId);
      let processed = html;

      // Remove iOS redirect & ad scripts
      processed = processed
        .replace(/<script>\(function\(\)\{try\{var ua=navigator\.userAgent[\s\S]*?<\/script>/i, '')
        .replace(/<script[^>]*id=["']mlbd-display-ads[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<script[^>]*id=["']mlbd-click-ads[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\/mlbd-adopen\.php/g, '/api/noop')
        .replace(/MovieLinkBD/gi, 'CinePulse HD')
        .replace(/movielinkbd\.[a-z]+/gi, 'CinePulse');

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

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(processed);
    } catch {
      res.status(502).send(`
        <!doctype html>
        <html>
          <body style="background:#090b10;color:#f1f5f9;font-family:sans-serif;padding:2rem;text-align:center;">
            <h3>সার্ভারের সাথে সংযোগ করা যাচ্ছে না</h3>
            <p>অনুগ্রহ করে অ্যাপের মেইন ভিউ ব্যবহার করুন অথবা অন্য Server Node নির্বাচন করুন।</p>
          </body>
        </html>
      `);
    }
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'CinePulse HD',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });

  app.all('/api/noop', (_req, res) => {
    res.status(204).end();
  });

  // Direct 1-click Native Android APK Download Endpoint
  app.get(['/download-apk', '/MovieBox-HD.apk', '/CinePulse.apk', '/api/download-apk'], async (_req, res) => {
    const candidates = [
      path.join(__dirname, 'public', 'downloads', 'MovieBox-HD.apk'),
      path.join(__dirname, 'dist', 'downloads', 'MovieBox-HD.apk'),
      path.join(__dirname, 'public', 'downloads', 'CinePulse-v1.0.apk'),
      path.join(__dirname, 'dist', 'downloads', 'CinePulse-v1.0.apk'),
      '/tmp/MovieBox-HD.apk',
    ];
    const apkFile = candidates.find((p) => fs.existsSync(p));
    if (apkFile) {
      const stat = fs.statSync(apkFile);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="MovieBox-HD.apk"');
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Cache-Control', 'no-cache');
      fs.createReadStream(apkFile).pipe(res);
      return;
    }
    const releaseApkUrl = 'https://github.com/freefirejafor-wq/Hd/releases/download/latest/MovieBox-HD.apk';
    try {
      const check = await fetch(releaseApkUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      });
      if (check.status === 200 || check.status === 301 || check.status === 302) {
        res.redirect(302, releaseApkUrl);
        return;
      }
    } catch {
      // Fall through to status page if GitHub release is not published yet
    }
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
      <!doctype html>
      <html lang="bn">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>MovieBox HD APK Download</title>
        <style>
          body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121318;color:#fff;font-family:system-ui,sans-serif;padding:20px}
          .card{max-width:440px;width:100%;background:#1b1d24;border:1px solid #2e3240;border-radius:16px;padding:22px;text-align:center}
          .btn{display:inline-block;margin-top:14px;background:#1ce783;color:#041d11;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}
          p{color:#9aa1b2;font-size:14px;line-height:1.6}
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin:0 0 8px">MovieBox HD APK এখনো তৈরি হয়নি</h2>
          <p>সোর্স কোড GitHub-এ Push করার ৩–৫ মিনিট পর GitHub Actions অটোমেটিক APK বানিয়ে এই লিংকে সরাসরি ডাউনলোড চালু করে দেবে।</p>
          <a class="btn" href="https://github.com/freefirejafor-wq/Hd/actions">Build Status দেখুন</a>
        </div>
      </body>
      </html>
    `);
  });

  // Never serve expired static db-shards (HTTP 410 Gone URLs) — force clients to use live /api/details
  app.get('/db-shards/:file', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ details: {} });
  });

  // Self-healing Service Worker endpoint: immediately wipes any stale Workbox precaches on Render and reloads clients
  app.get(['/sw.js', '/dev-sw.js'], (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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

  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('.html') ||
            filePath.endsWith('.json') ||
            filePath.endsWith('.webmanifest') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CinePulse HD Cinema Server running on http://0.0.0.0:${PORT}`);

    // Immediately warm MovieBox + MovieLinkBD discovery, Home shelves, and top categories in background!
    setTimeout(() => {
      void discoverActiveMovieLinkBdOrigin(true).catch(() => {});
      void getMovieBoxBearerToken(true).catch(() => {});
      void fetchMovieBoxHomePayload().catch(() => {});
      void syncLiveCategories();
    }, 100).unref();
    setInterval(() => {
      void discoverActiveMovieLinkBdOrigin(true).catch(() => {});
    }, 15 * 60_000).unref();
    setInterval(syncLiveCategories, 300_000).unref();

    // Automatic Keep-Alive Self-Ping
    const externalUrl = (process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '').replace(/\/+$/, '');
    if (externalUrl && externalUrl.startsWith('http')) {
      setInterval(() => {
        fetch(`${externalUrl}/api/health`, {
          headers: { 'User-Agent': 'CinePulse-KeepAlive/1.0' },
          signal: AbortSignal.timeout(8000),
        }).catch(() => {});
      }, 10 * 60 * 1000).unref();
    }

    // Start Telegram Owner Admin Bot (if TELEGRAM_BOT_TOKEN is configured)
    startTelegramBotPoller();
  });
}

startServer();

