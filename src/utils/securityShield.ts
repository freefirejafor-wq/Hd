// CinePulse High-Security Anti-Scraper, Anti-DevTools & Full URL-Cloaking Shield

const SHIELD_SECRET = 'CP_SHIELD_v4_9x7A2mK8pQ4wL1zR6vN3jH5bT0yF';
const CLOAK_KEY = 'CP_CLOAK_v4_7x9M2pL5qW8zR1vK4jH6nB3tY0fD';

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const clean = (b64url || '').trim();
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64url'));
  }
  const b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i) & 0xff;
  }
  return out;
}

export function encodeCloakToken(plainText: string): string {
  if (!plainText) return '';
  try {
    const utf8Bytes = new TextEncoder().encode(plainText);
    const len = utf8Bytes.length;
    let nonce = 0x5a3c;
    for (let i = 0; i < len; i++) {
      nonce = ((nonce << 5) - nonce + utf8Bytes[i]) & 0xffff;
    }
    const out = new Uint8Array(len + 2);
    out[0] = (nonce >>> 8) & 0xff;
    out[1] = nonce & 0xff;

    let state = (0x811c9dc5 ^ nonce) >>> 0;
    for (let i = 0; i < CLOAK_KEY.length; i++) {
      state = (Math.imul(state ^ CLOAK_KEY.charCodeAt(i), 1664525) + 1013904223) >>> 0;
    }
    for (let i = 0; i < len; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const kChar = CLOAK_KEY.charCodeAt(i % CLOAK_KEY.length);
      const mask = ((state >>> 16) ^ kChar ^ (i & 0xff)) & 0xff;
      out[i + 2] = utf8Bytes[i] ^ mask;
    }
    return bytesToBase64Url(out);
  } catch {
    return '';
  }
}

export function decodeCloakToken(token: string): string {
  if (!token) return '';
  try {
    const raw = base64UrlToBytes(token);
    if (raw.length <= 2) return '';
    const nonce = ((raw[0] << 8) | raw[1]) & 0xffff;
    const len = raw.length - 2;
    const out = new Uint8Array(len);

    let state = (0x811c9dc5 ^ nonce) >>> 0;
    for (let i = 0; i < CLOAK_KEY.length; i++) {
      state = (Math.imul(state ^ CLOAK_KEY.charCodeAt(i), 1664525) + 1013904223) >>> 0;
    }
    for (let i = 0; i < len; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const kChar = CLOAK_KEY.charCodeAt(i % CLOAK_KEY.length);
      const mask = ((state >>> 16) ^ kChar ^ (i & 0xff)) & 0xff;
      out[i] = raw[i + 2] ^ mask;
    }
    return new TextDecoder('utf-8').decode(out);
  } catch {
    return '';
  }
}

export function cloakApiUrl(apiPathAndQuery: string): string {
  if (!apiPathAndQuery || apiPathAndQuery.startsWith('/_s/')) return apiPathAndQuery;
  return `/_s/g?k=${encodeCloakToken(apiPathAndQuery)}`;
}

export function cloakStreamUrl(streamUrl: string): string {
  if (!streamUrl) return '';
  if (streamUrl.startsWith('/_s/v.mp4')) return streamUrl;
  if (
    streamUrl.startsWith('/api/mb-stream') ||
    streamUrl.startsWith('/api/mb-ep-stream') ||
    streamUrl.startsWith('/api/go')
  ) {
    return `/_s/v.mp4?k=${encodeCloakToken(streamUrl)}`;
  }
  return streamUrl;
}

export function cloakImageUrl(imgUrl?: string): string {
  if (!imgUrl) return '';
  return imgUrl.trim();
}

export function cloakPayloadDeep(val: any): any {
  if (!val) return val;
  if (typeof val === 'string') {
    if (
      val.startsWith('/api/mb-stream') ||
      val.startsWith('/api/mb-ep-stream') ||
      val.startsWith('/api/go')
    ) {
      return cloakStreamUrl(val);
    }
    if (val.startsWith('/api/mb-subtitle-srt')) {
      return cloakApiUrl(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    const out = new Array(val.length);
    for (let i = 0; i < val.length; i++) {
      out[i] = cloakPayloadDeep(val[i]);
    }
    return out;
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      out[k] = cloakPayloadDeep(val[k]);
    }
    return out;
  }
  return val;
}

export function computeShieldSignature(pathAndQuery: string, timestampStr: string): string {
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

export function buildSecurityHeaders(endpointUrl: string): Record<string, string> {
  let pathAndQuery = endpointUrl;
  try {
    const u = new URL(
      endpointUrl,
      typeof window !== 'undefined' ? window.location.origin : 'https://playlive.zeroo.click'
    );
    pathAndQuery = `${u.pathname}${u.search}`;
    if ((u.pathname === '/_s/g' || u.pathname === '/_s/v.mp4') && u.searchParams.get('k')) {
      const uncloaked = decodeCloakToken(u.searchParams.get('k') || '');
      if (uncloaked) pathAndQuery = uncloaked;
    }
  } catch {
    // keep as-is
  }
  const ts = String(Date.now());
  const sig = computeShieldSignature(pathAndQuery, ts);
  return {
    'X-CP-Ts': ts,
    'X-CP-Sig': sig,
    'X-CP-Client': 'cp-web-v4',
  };
}

export function decryptApiPayload(nonce: string, encodedBase64: string): any {
  const binaryStr = atob(encodedBase64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  const keyStr = `${SHIELD_SECRET}::${nonce}`;
  const keyBytes = new Uint8Array(keyStr.length);
  for (let i = 0; i < keyStr.length; i++) {
    keyBytes[i] = keyStr.charCodeAt(i) & 0xff;
  }
  const kLen = keyBytes.length;
  let state = 0x5a3c9e17 >>> 0;
  for (let i = 0; i < kLen; i++) {
    state = (Math.imul(state ^ keyBytes[i], 1664525) + 1013904223) >>> 0;
  }
  for (let i = 0; i < len; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const mask = ((state >>> 16) ^ keyBytes[i % kLen] ^ (i & 0xff)) & 0xff;
    bytes[i] = binaryStr.charCodeAt(i) ^ mask;
  }
  const jsonText = new TextDecoder('utf-8').decode(bytes);
  return cloakPayloadDeep(JSON.parse(jsonText));
}

export function unwrapSecureJson(data: any): any {
  if (
    data &&
    typeof data === 'object' &&
    data._s === 1 &&
    typeof data.d === 'string' &&
    typeof data.n === 'string'
  ) {
    try {
      return decryptApiPayload(data.n, data.d);
    } catch {
      return data;
    }
  }
  return cloakPayloadDeep(data);
}

let shieldInitialized = false;

export function initClientSecurityShield(): void {
  if (typeof window === 'undefined' || shieldInitialized) return;
  shieldInitialized = true;

  // 1. Intercept all /api/* and /_s/* fetch calls, cloak the URL to /_s/g?k=..., sign headers, and decrypt JSON
  const nativeFetch = window.fetch.bind(window);
  const shieldedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlStr = '';
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input && typeof (input as Request).url === 'string') {
      urlStr = (input as Request).url;
    }

    const originPrefix = typeof window !== 'undefined' ? window.location.origin : '';
    let relUrl = urlStr;
    if (originPrefix && urlStr.startsWith(originPrefix)) {
      relUrl = urlStr.slice(originPrefix.length);
    }

    const isLocalApi = relUrl.startsWith('/api/') || relUrl.startsWith('/_s/');

    let finalInput: RequestInfo | URL = input;
    let nextInit = init;

    if (isLocalApi) {
      let cloakedRel = relUrl;
      if (relUrl.startsWith('/api/mb-stream') || relUrl.startsWith('/api/mb-ep-stream')) {
        cloakedRel = cloakStreamUrl(relUrl);
      } else if (relUrl.startsWith('/api/')) {
        cloakedRel = cloakApiUrl(relUrl);
      }
      finalInput = cloakedRel;

      const secHeaders = buildSecurityHeaders(relUrl);
      const mergedHeaders = new Headers(init?.headers || {});
      for (const [k, v] of Object.entries(secHeaders)) {
        mergedHeaders.set(k, v);
      }
      nextInit = {
        ...init,
        headers: mergedHeaders,
      };
    }

    const response = await nativeFetch(finalInput, nextInit);

    if (isLocalApi) {
      const origJson = response.json.bind(response);
      response.json = async () => {
        const raw = await origJson();
        return unwrapSecureJson(raw);
      };
    }

    return response;
  };
  try {
    Object.defineProperty(window, 'fetch', {
      value: shieldedFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      (window as any).fetch = shieldedFetch;
    } catch {
      // ignore if read-only in sandbox
    }
  }

  // 2. Disable Right-Click Context Menu
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { capture: true }
  );

  // 3. Block DevTools, Network Inspector & View-Source Keyboard Shortcuts
  window.addEventListener(
    'keydown',
    (e) => {
      const key = (e.key || '').toUpperCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (ctrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (e.metaKey && e.altKey && (key === 'I' || key === 'J' || key === 'C' || key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (ctrlOrCmd && (key === 'U' || key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 4. Disable dragging of images/videos
  window.addEventListener(
    'dragstart',
    (e) => {
      e.preventDefault();
    },
    { capture: true }
  );

  // 5. Silence console output in production
  try {
    const noop = () => {};
    if (typeof console !== 'undefined') {
      console.clear();
      console.log = noop;
      console.info = noop;
      console.debug = noop;
      console.table = noop;
      console.dir = noop;
    }
  } catch {
    // ignore
  }
}
