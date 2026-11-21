/**
 * CinePulse / MovieBox Commercial API — Free Cloudflare Worker Video & Subtitle Edge Proxy (v2)
 *
 * HOW TO DEPLOY / UPDATE (30 SECONDS — $0 FREE UNLIMITED BANDWIDTH):
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> your Worker (`mb-stream`) -> Edit Code
 * 2. Select ALL old code, delete it, paste THIS entire file, and click "Deploy"
 */

const MASTER_SECRET = 'CinePulse_AES256_Master_Key_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedAesKeyPromise = null;
let cachedHmacKeyPromise = null;

function b64urlToBytes(str) {
  const clean = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = clean.length % 4 === 0 ? '' : '='.repeat(4 - (clean.length % 4));
  const bin = atob(clean + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getRawMasterKeyBytes() {
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(MASTER_SECRET));
  return new Uint8Array(hash);
}

async function getAesKey() {
  if (!cachedAesKeyPromise) {
    cachedAesKeyPromise = getRawMasterKeyBytes().then((raw) =>
      crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
    );
  }
  return cachedAesKeyPromise;
}

async function getHmacKey() {
  if (!cachedHmacKeyPromise) {
    cachedHmacKeyPromise = getRawMasterKeyBytes().then((raw) =>
      crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    );
  }
  return cachedHmacKeyPromise;
}

async function verifyTrialApiKey(rawKey) {
  const key = String(rawKey || '').trim();
  if (!key.startsWith('cp_tr1_')) return false;
  const body = key.slice(7);
  const dot = body.indexOf('.');
  if (dot <= 0) return false;
  const payloadB64 = body.slice(0, dot);
  const sig = body.slice(dot + 1);
  if (!payloadB64 || !sig) return false;

  try {
    const hmacKey = await getHmacKey();
    const mac = await crypto.subtle.sign('HMAC', hmacKey, textEncoder.encode(`trial-key::${payloadB64}`));
    const expectedSig = bytesToB64url(new Uint8Array(mac)).slice(0, 22);
    if (sig !== expectedSig) return false;

    const parsed = JSON.parse(textDecoder.decode(b64urlToBytes(payloadB64)));
    if (!parsed || typeof parsed.e !== 'number') return false;
    if (Date.now() >= parsed.e) return false;
    return true;
  } catch {
    return false;
  }
}

async function decodeGatewayToken(token) {
  const trimmed = String(token || '').trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('cp1.')) {
      const parts = trimmed.split('.');
      if (parts.length === 4) {
        const iv = b64urlToBytes(parts[1]);
        const tag = b64urlToBytes(parts[2]);
        const cipher = b64urlToBytes(parts[3]);
        const combined = new Uint8Array(cipher.length + tag.length);
        combined.set(cipher, 0);
        combined.set(tag, cipher.length);
        const aesKey = await getAesKey();
        const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, combined);
        return textDecoder.decode(plainBuf);
      }
    }
    return textDecoder.decode(b64urlToBytes(trimmed));
  } catch {
    return '';
  }
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, X-API-Key',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...extra,
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/health') {
      return new Response(
        JSON.stringify({ ok: true, service: 'MovieBox Cloudflare Edge Stream Proxy', version: 2, status: 'ACTIVE' }),
        { status: 200, headers: corsHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    const isVideo = path === '/api/mb-stream' || path === '/api/mb-stream.mp4';
    const isSub = path === '/api/mb-subtitle-srt';

    if (!isVideo && !isSub) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid edge stream route' }), {
        status: 404,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
      });
    }

    // 1. Verify active paid/trial API key (?tk=) right at Cloudflare Edge
    const tk = url.searchParams.get('tk') || request.headers.get('X-API-Key') || '';
    const validKey = await verifyTrialApiKey(tk);
    if (!validKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Valid active API key (?tk=) required for media streams and subtitles.' }),
        { status: 403, headers: corsHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // 2. Decrypt AES-256-GCM gateway token (never exposes raw upstream CDN URL!)
    const primaryUrl = await decodeGatewayToken(url.searchParams.get('t') || '');
    const fallbackUrl = await decodeGatewayToken(url.searchParams.get('fb') || '');
    const candidates = [primaryUrl, fallbackUrl].filter((u) => /^https?:\/\//i.test(u));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired media token' }), {
        status: 400,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
      });
    }

    const chromeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const rangeHdr = request.headers.get('Range');
    const baseReqHdr = isVideo && rangeHdr ? { Range: rangeHdr, Accept: '*/*' } : { Accept: '*/*' };

    // MovieBox enacdn/Tengine accepts movie-box.co, 123movienow.cc, and movieboxhd.net (moviebox.ph now returns 429!)
    const headerVariants = [
      {
        ...baseReqHdr,
        'User-Agent': chromeUa,
        Referer: 'https://movie-box.co/',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': isVideo ? 'video' : 'empty',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      {
        ...baseReqHdr,
        'User-Agent': chromeUa,
        Referer: 'https://123movienow.cc/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      {
        ...baseReqHdr,
        'User-Agent': chromeUa,
        Referer: 'https://movieboxhd.net/',
      },
      {
        ...baseReqHdr,
        'User-Agent': 'okhttp/4.12.0',
        Referer: 'https://movie-box.co/',
      },
      {
        ...baseReqHdr,
        'User-Agent': chromeUa,
        Referer: 'https://moviebox.ph/',
      },
    ];

    let upstreamRes = null;
    let lastStatus = 0;
    outer: for (const target of candidates) {
      for (const hdrs of headerVariants) {
        try {
          const res = await fetch(target, {
            method: request.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: hdrs,
            redirect: 'follow',
            cf: { cacheTtl: 0, cacheEverything: false },
          });
          if (res.ok || res.status === 206) {
            upstreamRes = res;
            break outer;
          }
          lastStatus = res.status;
          try {
            await res.body?.cancel();
          } catch {
            // ignore cancel error
          }
        } catch {
          // try next variant
        }
      }
    }

    if (!upstreamRes) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Upstream media unavailable',
          upstreamStatus: lastStatus || 502,
        }),
        {
          status: 502,
          headers: corsHeaders({ 'Content-Type': 'application/json' }),
        }
      );
    }

    const outHeaders = new Headers(corsHeaders());
    if (isSub) {
      outHeaders.set('Content-Type', 'text/plain; charset=utf-8');
      outHeaders.set('Cache-Control', 'public, max-age=86400');
      const body = await upstreamRes.text();
      return new Response(body, { status: 200, headers: outHeaders });
    }

    // Video MP4 stream / 1-click download
    const ct = upstreamRes.headers.get('content-type') || 'video/mp4';
    outHeaders.set('Content-Type', ct.includes('octet-stream') ? 'video/mp4' : ct);
    const cl = upstreamRes.headers.get('content-length');
    if (cl) outHeaders.set('Content-Length', cl);
    const cr = upstreamRes.headers.get('content-range');
    if (cr) outHeaders.set('Content-Range', cr);
    outHeaders.set('Accept-Ranges', 'bytes');
    outHeaders.set('Cache-Control', 'public, max-age=3600');

    const isDl = url.searchParams.get('dl') === '1';
    if (isDl) {
      const rawName = (url.searchParams.get('name') || 'movie.mp4').replace(/[^a-zA-Z0-9._-]+/g, '_');
      const finalName = rawName.toLowerCase().endsWith('.mp4') ? rawName : `${rawName}.mp4`;
      outHeaders.set('Content-Disposition', `attachment; filename="${finalName}"`);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  },
};
