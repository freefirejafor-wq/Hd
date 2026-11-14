import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Film,
  Flame,
  FolderHeart,
  History,
  Home,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Mic,
  Play,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Trophy,
  Tv,
  Upload,
  User,
  UserPlus,
  WifiOff,
  X,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  INITIAL_FALLBACK_MOVIES,
  TOP_10_THIS_WEEK_ITEMS,
} from './data/categories';
import type {
  CategoryOption,
  EpisodeItem,
  GlobalMovieNotification,
  MovieBoxHomePayload,
  MovieCardItem,
  StreamSource,
  UserAccountSession,
  UserMovieRequest,
  WatchlistFolder,
  WatchProgressItem,
} from './types/cinema';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  getInstantCatalogCache,
  getInstantSuggestCache,
  prefetchMovieDetails,
  universalApiFetch,
} from './services/liveClientEngine';
import {
  deduplicateMovieCards,
  getItemMinutesAgo,
  isUploadedWithinMinutes,
  normalizeMovieCardItem,
  normalizeMovieCardList,
  sortItemsByHighRating,
  sortItemsByHotAndHype,
  sortItemsByRecentUpload,
} from './utils/timeAgo';

const MovieDetailModal = React.lazy(() =>
  import('./components/MovieDetailModal').then((m) => ({ default: m.MovieDetailModal }))
);
const PWAInstallModal = React.lazy(() =>
  import('./components/PWAInstallModal').then((m) => ({ default: m.PWAInstallModal }))
);
const MovieRequestModal = React.lazy(() =>
  import('./components/MovieRequestModal').then((m) => ({ default: m.MovieRequestModal }))
);

const USER_SESSION_STORAGE_KEY = 'cp_user_session_v3';
const WATCHLIST_LEGACY_KEY = 'cp_iphone_watchlist_v2';
const CONTINUE_LEGACY_KEY = 'cp_iphone_continue_v2';
const getUserWatchlistKey = (uid: string) => `cp_watchlist_u_${uid}`;
const getUserContinueKey = (uid: string) => `cp_continue_u_${uid}`;
const RECENT_SEARCH_STORAGE_KEY = 'cp_recent_searches_v1';
const ACTIVE_NODE_STORAGE_KEY = 'cp_active_node_v1';
const READ_NOTIFS_STORAGE_KEY = 'cp_read_notifications_v1';

function parseViewsCount(viewsStr: string): number {
  if (!viewsStr) return 0;
  const clean = viewsStr.toUpperCase().replace(/[^0-9.KM]/g, '');
  const num = parseFloat(clean) || 0;
  if (clean.includes('M')) return num * 1_000_000;
  if (clean.includes('K')) return num * 1_000;
  return num;
}

function formatResumeTime(sec?: number): string {
  if (!sec || sec < 5) return 'Resume';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatShortLanguage(lang: string): string {
  const up = (lang || '').toUpperCase();
  if (up.includes('BANGLA') || up.includes('BENGALI')) return 'Bengali';
  if (up.includes('HINDI')) return 'Hindi';
  if (up.includes('TAMIL')) return 'Tamil';
  if (up.includes('TELUGU')) return 'Telugu';
  if (up.includes('JAP')) return 'Anime';
  if (up.includes('KOR')) return 'Korean';
  if (up.includes('DUAL') || up.includes('MULTI')) return 'Dual Audio';
  return 'English';
}

function getCardSourceInfo(path?: string): { id: 'MOVIEBOX' | 'MOVIELINKBD'; label: string; badgeClass: string } {
  const isMb = Boolean(path && path.startsWith('/mb/'));
  return {
    id: isMb ? 'MOVIEBOX' : 'MOVIELINKBD',
    label: 'CinePulse',
    badgeClass: 'bg-emerald-600/90 text-white border-emerald-400/40',
  };
}

function transliterateClientQuery(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (!/[\u0980-\u09FF]/.test(trimmed)) return trimmed.toLowerCase();
  const dict: Array<[RegExp, string]> = [
    [/গোপাল\s*ভাঁড়|গোপাল\s*ভার/g, 'gopal bhar'],
    [/গোপাল/g, 'gopal'],
    [/গোলমাল/g, 'golmaal'],
    [/তুফান/g, 'toofan'],
    [/বহুরূপী/g, 'bohurupi'],
    [/বরবাদ/g, 'borbaad'],
    [/দাগি/g, 'daagi'],
    [/চক্কর/g, 'chokkor'],
    [/জংলি/g, 'jongli'],
    [/তাণ্ডব/g, 'tandob'],
    [/মির্জাপুর/g, 'mirzapur'],
    [/পুষ্পা/g, 'pushpa'],
    [/স্কুইড\s*গেম/g, 'squid game'],
    [/ওয়ান\s*পিস|ওয়ান\s*পিস/g, 'one piece'],
    [/নারুতো/g, 'naruto'],
    [/পঞ্চায়েত|পঞ্চায়েত/g, 'panchayat'],
    [/অ্যানিম্যাল|এনিমেল/g, 'animal'],
    [/পাঠান/g, 'pathaan'],
    [/জওয়ান|জওয়ান/g, 'jawan'],
    [/কল্কি/g, 'kalki'],
    [/স্ত্রী/g, 'stree'],
    [/দৃশ্যম/g, 'drishyam'],
    [/কেজিএফ/g, 'kgf'],
    [/বাহুবলী/g, 'baahubali'],
    [/সালার/g, 'salaar'],
    [/লিও/g, 'leo'],
    [/জেলার/g, 'jailer'],
    [/ব্যাচেলর\s*পয়েন্ট|ব্যাচেলর\s*পয়েন্ট/g, 'bachelor point'],
    [/হাওয়া|হাওয়া/g, 'hawa'],
    [/সুড়ঙ্গ|সুড়ঙ্গ/g, 'surongo'],
    [/প্রিয়তমা|প্রিয়তমা/g, 'priyotoma'],
    [/রাজকুমার/g, 'rajkumar'],
    [/দরদ/g, 'dorod'],
  ];
  let out = trimmed;
  for (const [rx, rep] of dict) {
    out = out.replace(rx, ` ${rep} `);
  }
  const charMap: Record<string, string> = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
    'ং': 'ng', 'ঃ': 'h', 'ঁ': '', '্': '', '়': '',
  };
  let mapped = '';
  for (const ch of out) {
    mapped += charMap[ch] !== undefined ? charMap[ch] : ch;
  }
  return mapped.replace(/\s+/g, ' ').trim().toLowerCase();
}

export default function App() {
  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'browse' | 'categories' | 'watchlist' | 'me'>('browse');
  const [currentCategory, setCurrentCategory] = useState<CategoryOption>(ALL_CATEGORIES[0]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [maxPage, setMaxPage] = useState<number>(520);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Search & Instant Live Suggestions
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<MovieCardItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [searchTabFilter, setSearchTabFilter] = useState<
    'ALL' | 'MOVIE_SERIES' | 'SHORT_TV' | 'MUSIC'
  >('ALL');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : ['Tower of God [Hindi]', 'Bohurupi', 'Mirzapur', 'One Piece'];
    } catch {
      return ['Tower of God [Hindi]', 'Bohurupi', 'Mirzapur'];
    }
  });
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Advanced Filters & Sorting (Default: HOT_HYPE so popular, high-rating, dhamaka items stay on top)
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'MOVIEBOX' | 'MOVIELINKBD'>('ALL');
  const [audioFilter, setAudioFilter] = useState<'ALL' | 'BANGLA' | 'HINDI' | 'DUAL' | 'SUB'>('ALL');
  const [qualityFilter, setQualityFilter] = useState<'ALL' | '4K' | '1080P' | 'WEBDL' | 'HDTC'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | '2026' | '2025' | 'OLDER'>('ALL');
  const [sortBy, setSortBy] = useState<'HOT_HYPE' | 'LATEST' | 'RATING' | 'VIEWS' | 'TITLE'>('HOT_HYPE');

  // Anonymized Server Node Selection (Default: MovieBox HD Server)
  const [activeNodeId, setActiveNodeId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_NODE_STORAGE_KEY) || 'node-moviebox';
    } catch {
      return 'node-moviebox';
    }
  });

  // Catalog Items State
  const [items, setItems] = useState<MovieCardItem[]>(() =>
    sortItemsByHotAndHype(INITIAL_FALLBACK_MOVIES['/'])
  );
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Modals, Mini-Player & Entry Splash Screen State
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieCardItem | null>(null);
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [liveClockNow, setLiveClockNow] = useState<number>(() => Date.now());
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestPrefillTitle, setRequestPrefillTitle] = useState<string>('');
  const [requestPrefillType, setRequestPrefillType] = useState<UserMovieRequest['type']>('MOVIE');

  // Silent Automatic Phone OS Push Notification State (Zero in-app UI clutter — goes directly to Phone Status Bar)
  const [serverNotifications, setServerNotifications] = useState<GlobalMovieNotification[]>([]);
  const [pushedPhoneNotifIds, setPushedPhoneNotifIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const pushedSetRef = useRef<Set<string>>(new Set(pushedPhoneNotifIds));

  // Tick live clock every 3 minutes so upload times update gently without causing frequent full-tree re-renders
  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setLiveClockNow(Date.now());
    }, 180_000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplashScreen(false);
    }, 1350);
    return () => window.clearTimeout(timer);
  }, []);

  // Watchlist & Custom Folders + Backup/Restore
  const [watchlistFolderTab, setWatchlistFolderTab] = useState<'all' | WatchlistFolder>('all');
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [latest3SiteUploads, setLatest3SiteUploads] = useState<MovieCardItem[]>([]);
  const [refreshing24h, setRefreshing24h] = useState(false);
  const [mbHomeData, setMbHomeData] = useState<MovieBoxHomePayload | null>(null);
  const [bookedComingSoonIds, setBookedComingSoonIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('cp_mb_booked_coming_soon_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleBookComingSoon = useCallback((id: string) => {
    setBookedComingSoonIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('cp_mb_booked_coming_soon_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await universalApiFetch('/api/mb-home')) as MovieBoxHomePayload;
        if (!cancelled && res && res.ok) {
          setMbHomeData(res);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLatest3SiteUploads = useCallback(async (force = false) => {
    setRefreshing24h(true);
    try {
      const qs = force ? '?path=/new-uploads&page=1&refresh=1' : '?path=/new-uploads&page=1';
      const data = await universalApiFetch(`/api/catalog${qs}`);
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        setLatest3SiteUploads(data.items);
      }
    } catch {
      // ignore
    } finally {
      setRefreshing24h(false);
    }
  }, []);

  useEffect(() => {
    if (showRequestModal) {
      refreshLatest3SiteUploads(true);
    }
  }, [showRequestModal, refreshLatest3SiteUploads]);

  // Strictly Isolated Per-User Account Session + Watchlist & Continue Watching
  const [userSession, setUserSession] = useState<UserAccountSession | null>(() => {
    try {
      const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.userId && parsed?.token ? parsed : null;
    } catch {
      return null;
    }
  });
  const [authPanelOpen, setAuthPanelOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPin, setAuthPin] = useState<string>('');
  const [authCarryGuestData, setAuthCarryGuestData] = useState<boolean>(false);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const hydratingUserRef = useRef<boolean>(true);
  const userSyncTimerRef = useRef<number | null>(null);

  const [watchlist, setWatchlist] = useState<MovieCardItem[]>(() => {
    try {
      const rawSess = localStorage.getItem(USER_SESSION_STORAGE_KEY);
      const sess = rawSess ? JSON.parse(rawSess) : null;
      if (sess?.userId) {
        const raw = localStorage.getItem(getUserWatchlistKey(sess.userId));
        return raw ? JSON.parse(raw) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [continueWatching, setContinueWatching] = useState<WatchProgressItem[]>(() => {
    try {
      const rawSess = localStorage.getItem(USER_SESSION_STORAGE_KEY);
      const sess = rawSess ? JSON.parse(rawSess) : null;
      if (sess?.userId) {
        const raw = localStorage.getItem(getUserContinueKey(sess.userId));
        const parsed: WatchProgressItem[] = raw ? JSON.parse(raw) : [];
        return parsed.map((entry) => ({
          ...entry,
          movie: {
            ...entry.movie,
            uploadedAtMs: undefined,
          },
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const persistUserSessionLocal = useCallback(
    (sess: UserAccountSession | null, wl: MovieCardItem[], cw: WatchProgressItem[]) => {
      try {
        if (sess?.userId && sess?.token) {
          localStorage.setItem(
            USER_SESSION_STORAGE_KEY,
            JSON.stringify({
              userId: sess.userId,
              username: sess.username,
              isGuest: sess.isGuest,
              token: sess.token,
            })
          );
          localStorage.setItem(getUserWatchlistKey(sess.userId), JSON.stringify(wl));
          localStorage.setItem(getUserContinueKey(sess.userId), JSON.stringify(cw));
        }
      } catch {
        // ignore
      }
    },
    []
  );

  // Initialize or restore strictly isolated per-user session on boot
  useEffect(() => {
    let cancelled = false;
    hydratingUserRef.current = true;

    const applySessionFromServer = (serverUser: any, fallbackLocalWl: MovieCardItem[], fallbackLocalCw: WatchProgressItem[]) => {
      if (cancelled || !serverUser?.userId || !serverUser?.token) return;
      const serverWl: MovieCardItem[] = Array.isArray(serverUser.watchlist) ? serverUser.watchlist : [];
      const serverCw: WatchProgressItem[] = Array.isArray(serverUser.continueWatching)
        ? serverUser.continueWatching
        : [];
      const finalWl =
        serverUser.isGuest && serverWl.length === 0 && fallbackLocalWl.length > 0
          ? fallbackLocalWl
          : serverWl;
      const finalCw =
        serverUser.isGuest && serverCw.length === 0 && fallbackLocalCw.length > 0
          ? fallbackLocalCw
          : serverCw;

      const nextSess: UserAccountSession = {
        userId: serverUser.userId,
        username: serverUser.username,
        isGuest: Boolean(serverUser.isGuest),
        token: serverUser.token,
        watchlist: finalWl,
        continueWatching: finalCw,
      };
      setUserSession(nextSess);
      setWatchlist(finalWl);
      setContinueWatching(finalCw);
      persistUserSessionLocal(nextSess, finalWl, finalCw);
      window.setTimeout(() => {
        hydratingUserRef.current = false;
      }, 60);
    };

    const bootUserSession = async () => {
      const existingToken = userSession?.token || '';
      const existingUid = userSession?.userId || '';
      if (existingToken && existingUid) {
        try {
          const res = await fetch('/api/user/me', {
            headers: { 'X-CP-User-Token': existingToken },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.ok && data?.user) {
              let localWl: MovieCardItem[] = [];
              let localCw: WatchProgressItem[] = [];
              try {
                const rawW = localStorage.getItem(getUserWatchlistKey(existingUid));
                const rawC = localStorage.getItem(getUserContinueKey(existingUid));
                localWl = rawW ? JSON.parse(rawW) : [];
                localCw = rawC ? JSON.parse(rawC) : [];
              } catch {
                // ignore
              }
              applySessionFromServer(data.user, localWl, localCw);
              return;
            }
          }
        } catch {
          if (!cancelled) {
            window.setTimeout(() => {
              hydratingUserRef.current = false;
            }, 60);
          }
          return;
        }
      }

      // First visit or expired token: mint a fresh isolated private guest session
      try {
        const res = await fetch('/api/user/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'guest' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data?.user) {
            let legacyWl: MovieCardItem[] = [];
            let legacyCw: WatchProgressItem[] = [];
            try {
              const rawLegacyW = localStorage.getItem(WATCHLIST_LEGACY_KEY);
              const rawLegacyC = localStorage.getItem(CONTINUE_LEGACY_KEY);
              legacyWl = rawLegacyW ? JSON.parse(rawLegacyW) : [];
              legacyCw = rawLegacyC ? JSON.parse(rawLegacyC) : [];
              localStorage.removeItem(WATCHLIST_LEGACY_KEY);
              localStorage.removeItem(CONTINUE_LEGACY_KEY);
            } catch {
              // ignore
            }
            applySessionFromServer(data.user, legacyWl, legacyCw);
            return;
          }
        }
      } catch {
        // ignore offline fallback
      }

      if (!cancelled) {
        const offlineUid = `local_${Math.random().toString(36).slice(2, 10)}`;
        setUserSession({
          userId: offlineUid,
          username: `Guest-${offlineUid.slice(-4).toUpperCase()}`,
          isGuest: true,
          token: '',
          watchlist: [],
          continueWatching: [],
        });
        window.setTimeout(() => {
          hydratingUserRef.current = false;
        }, 60);
      }
    };

    void bootUserSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save per-user local cache & sync to isolated server profile
  useEffect(() => {
    const uid = userSession?.userId;
    if (!uid) return;
    try {
      localStorage.setItem(getUserWatchlistKey(uid), JSON.stringify(watchlist));
      localStorage.setItem(getUserContinueKey(uid), JSON.stringify(continueWatching));
    } catch {
      // ignore
    }

    if (hydratingUserRef.current || !userSession?.token) return;
    if (userSyncTimerRef.current) window.clearTimeout(userSyncTimerRef.current);
    const activeToken = userSession.token;
    const wlSnapshot = watchlist;
    const cwSnapshot = continueWatching;
    userSyncTimerRef.current = window.setTimeout(() => {
      fetch('/api/user/state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CP-User-Token': activeToken,
        },
        body: JSON.stringify({
          watchlist: wlSnapshot,
          continueWatching: cwSnapshot,
        }),
      }).catch(() => {});
    }, 550);

    return () => {
      if (userSyncTimerRef.current) window.clearTimeout(userSyncTimerRef.current);
    };
  }, [watchlist, continueWatching, userSession?.userId, userSession?.token]);

  // Flush user state immediately when user minimizes/closes browser (crucial for iPhone Safari!)
  const latestStateRef = useRef<{
    token: string;
    watchlist: MovieCardItem[];
    continueWatching: WatchProgressItem[];
  }>({
    token: '',
    watchlist: [],
    continueWatching: [],
  });
  useEffect(() => {
    latestStateRef.current = {
      token: userSession?.token || '',
      watchlist,
      continueWatching,
    };
  }, [userSession?.token, watchlist, continueWatching]);

  useEffect(() => {
    const flushUserStateOnHide = () => {
      const snap = latestStateRef.current;
      if (!snap.token || hydratingUserRef.current) return;
      try {
        fetch('/api/user/state', {
          method: 'PUT',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CP-User-Token': snap.token,
          },
          body: JSON.stringify({
            watchlist: snap.watchlist,
            continueWatching: snap.continueWatching,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushUserStateOnHide();
    };
    window.addEventListener('pagehide', flushUserStateOnHide);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('pagehide', flushUserStateOnHide);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  const handleAccountAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = authUsername.trim();
    const cleanPin = authPin.trim();
    if (cleanName.length < 2) {
      setAuthMessage({ type: 'err', text: 'কমপক্ষে ২ অক্ষরের ইউজারনেম লিখুন' });
      return;
    }
    if (cleanPin.length < 4) {
      setAuthMessage({ type: 'err', text: 'কমপক্ষে ৪ সংখ্যার পিন/পাসওয়ার্ড দিন' });
      return;
    }

    setAuthBusy(true);
    setAuthMessage(null);
    try {
      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: authMode,
          username: cleanName,
          pin: cleanPin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.user) {
        setAuthMessage({
          type: 'err',
          text: data?.error || 'লগইন বা রেজিস্ট্রেশন ব্যর্থ হয়েছে',
        });
        return;
      }

      if (userSyncTimerRef.current) window.clearTimeout(userSyncTimerRef.current);
      hydratingUserRef.current = true;

      let nextWl: MovieCardItem[] = Array.isArray(data.user.watchlist) ? data.user.watchlist : [];
      let nextCw: WatchProgressItem[] = Array.isArray(data.user.continueWatching)
        ? data.user.continueWatching
        : [];

      // Only carry over guest items into newly registered account if user explicitly opted in
      if (authMode === 'register' && authCarryGuestData && nextWl.length === 0 && nextCw.length === 0) {
        nextWl = [...watchlist];
        nextCw = [...continueWatching];
        if (nextWl.length > 0 || nextCw.length > 0) {
          fetch('/api/user/state', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CP-User-Token': data.user.token,
            },
            body: JSON.stringify({ watchlist: nextWl, continueWatching: nextCw }),
          }).catch(() => {});
        }
      }

      const nextSess: UserAccountSession = {
        userId: data.user.userId,
        username: data.user.username,
        isGuest: false,
        token: data.user.token,
        watchlist: nextWl,
        continueWatching: nextCw,
      };
      setUserSession(nextSess);
      setWatchlist(nextWl);
      setContinueWatching(nextCw);
      persistUserSessionLocal(nextSess, nextWl, nextCw);
      setAuthPin('');
      setAuthPanelOpen(false);
      setAuthMessage({
        type: 'ok',
        text:
          authMode === 'register'
            ? `@${nextSess.username} একাউন্ট তৈরি হয়েছে — এখন শুধু আপনার ওয়াচলিস্ট আলাদা থাকবে!`
            : `স্বাগতম @${nextSess.username}! আপনার ব্যক্তিগত ওয়াচলিস্ট ও প্লেব্যাক হিস্ট্রি লোড হয়েছে।`,
      });
      window.setTimeout(() => {
        hydratingUserRef.current = false;
      }, 80);
    } catch {
      setAuthMessage({ type: 'err', text: 'সার্ভারের সাথে সংযোগ করা যায়নি, আবার চেষ্টা করুন' });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogoutToNewGuest = async () => {
    setAuthBusy(true);
    setAuthMessage(null);
    if (userSyncTimerRef.current) window.clearTimeout(userSyncTimerRef.current);
    hydratingUserRef.current = true;
    try {
      const res = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'guest' }),
      });
      const data = await res.json();
      if (data?.ok && data?.user) {
        const nextSess: UserAccountSession = {
          userId: data.user.userId,
          username: data.user.username,
          isGuest: true,
          token: data.user.token,
          watchlist: [],
          continueWatching: [],
        };
        setUserSession(nextSess);
        setWatchlist([]);
        setContinueWatching([]);
        persistUserSessionLocal(nextSess, [], []);
        setAuthUsername('');
        setAuthPin('');
        setAuthMessage({
          type: 'ok',
          text: `নতুন আলাদা প্রোফাইল (${nextSess.username}) চালু হয়েছে।`,
        });
      }
    } catch {
      // ignore
    } finally {
      setAuthBusy(false);
      window.setTimeout(() => {
        hydratingUserRef.current = false;
      }, 80);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch {
      // ignore
    }
  }, [recentSearches]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_NODE_STORAGE_KEY, activeNodeId);
    } catch {
      // ignore
    }
  }, [activeNodeId]);

  useEffect(() => {
    if (showSearchDropdown) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    }
  }, [showSearchDropdown]);

  const localSearchPool = useMemo<MovieCardItem[]>(() => {
    return deduplicateMovieCards([
      ...items,
      ...(mbHomeData?.banners || []),
      ...(mbHomeData?.sections || []).flatMap((s) => s.items || []),
      ...TOP_10_THIS_WEEK_ITEMS,
      ...Object.values(INITIAL_FALLBACK_MOVIES).flat(),
    ]);
  }, [items, mbHomeData]);

  // 0ms Instant Local + Cached Prefix Search + 15ms Live MovieBox Suggest (Supports English, Phonetic & Bengali script!)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const lower = q.toLowerCase();
    const romanQ = transliterateClientQuery(q);
    const qWords = Array.from(
      new Set(
        `${lower} ${romanQ}`
          .split(/\s+/)
          .map((w) => w.replace(/[^a-z0-9\u0980-\u09FF]/gi, ''))
          .filter((w) => w.length >= 2)
      )
    );
    const cachedSuggest = getInstantSuggestCache(q) || getInstantSuggestCache(romanQ) || [];
    const localInstant = deduplicateMovieCards([
      ...cachedSuggest,
      ...localSearchPool.filter((item) => {
        const hay = `${item?.title || ''} ${item?.language || ''} ${item?.sportGenre || ''}`.toLowerCase();
        if (hay.includes(lower) || (romanQ && hay.includes(romanQ))) return true;
        return qWords.length > 0 && qWords.some((w) => w.length >= 3 && hay.includes(w));
      }),
    ]).slice(0, 36);

    if (localInstant.length > 0) {
      setSuggestions(localInstant);
    }

    let cancelled = false;
    const abortCtrl = new AbortController();
    setLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, node: activeNodeId });
        const data = await universalApiFetch(`/api/suggest?${params.toString()}`, {
          signal: abortCtrl.signal,
        });
        if (!cancelled && data && Array.isArray(data.items) && data.items.length > 0) {
          const mergedAllSites = deduplicateMovieCards([...data.items, ...localInstant]).slice(
            0,
            48
          );
          setSuggestions(mergedAllSites);
        }
      } catch {
        // ignore aborted or network errors
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 15);

    return () => {
      cancelled = true;
      abortCtrl.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, activeNodeId, localSearchPool]);

  // Fetch Live Catalog from Express Server or GitHub Live Engine (18+ Always Unlocked + Live Auto-Sync)
  const fetchCatalog = useCallback(
    async (path: string, page: number, query: string, nodeId: string, forceRefresh = false, silent = false) => {
      if (!silent) setLoadingCatalog(true);
      try {
        const params = new URLSearchParams({
          path,
          page: String(page),
          q: query,
          node: nodeId,
          ...(forceRefresh ? { refresh: '1' } : {}),
        });
        const data = await universalApiFetch(`/api/catalog?${params.toString()}`);
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setItems(normalizeMovieCardList(data.items));
          if (data.maxPage) setMaxPage(data.maxPage);
          if (!silent) setLoadingCatalog(false);
          return;
        }
      } catch {
        // Keep fallback items if offline
      } finally {
        if (!silent) setLoadingCatalog(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCatalog(currentCategory.path, currentPage, submittedSearch, activeNodeId);
  }, [currentCategory.path, currentPage, submittedSearch, activeNodeId, fetchCatalog]);

  // Gentle Visibility Sync Only (Zero wasteful 45s background polling!)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeTab === 'browse' && !selectedMovie) {
        setLiveClockNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeTab, selectedMovie]);

  // Prevent background page rubber-banding / scrolling when Fullscreen Movie Player or Modals are open
  // (Keep scrolling UNLOCKED when player is minimized to Floating Mini Player!)
  useEffect(() => {
    if ((selectedMovie && !isMiniPlayer) || showInstallModal || showRequestModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedMovie, isMiniPlayer, showInstallModal, showRequestModal]);

  useEffect(() => {
    pushedSetRef.current = new Set(pushedPhoneNotifIds);
    try {
      localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(pushedPhoneNotifIds.slice(-150)));
    } catch {
      // ignore
    }
  }, [pushedPhoneNotifIds]);

  // Register Service Worker (/sw-push.js) & listen for Phone Notification tap to open movie directly
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw-push.js').catch(() => {
      // ignore if main PWA SW is already controlling
    });

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CINEPULSE_OPEN_MOVIE' && event.data.movie) {
        setIsMiniPlayer(false);
        setSelectedMovie(normalizeMovieCardItem(event.data.movie));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  // Helper to send Native Phone OS Notification (Status Bar / Lock Screen) with CinePulse Name, Logo & Right-Side Movie Poster
  const sendNativePhoneNotification = useCallback((notif: GlobalMovieNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const deepLinkUrl = `${window.location.origin}${window.location.pathname}?watch=${encodeURIComponent(
      notif.movie.path
    )}&title=${encodeURIComponent(notif.movie.title)}`;

    const options: NotificationOptions & Record<string, any> = {
      body: notif.subtitleBn,
      icon: notif.movie.poster || './pwa-192x192.png',
      badge: './pwa-192x192.png',
      tag: notif.id,
      renotify: true,
      vibrate: [180, 80, 180],
      data: {
        url: deepLinkUrl,
        movie: notif.movie,
      },
    };

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (reg.active) {
              reg.active.postMessage({
                type: 'CINEPULSE_SHOW_OS_NOTIFICATION',
                notif,
                url: deepLinkUrl,
              });
            } else {
              reg.showNotification(notif.headlineBn, options);
            }
          })
          .catch(() => {
            const n = new Notification(notif.headlineBn, options);
            n.onclick = () => {
              window.focus();
              setIsMiniPlayer(false);
              setSelectedMovie(notif.movie);
              n.close();
            };
          });
      } else {
        const n = new Notification(notif.headlineBn, options);
        n.onclick = () => {
          window.focus();
          setIsMiniPlayer(false);
          setSelectedMovie(notif.movie);
          n.close();
        };
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Fetch Global Notifications (New Movie Uploads + Popular High-Rated Movies) from Server & Auto-Poll every 35s
  const fetchGlobalNotifications = useCallback(async () => {
    try {
      const data = await universalApiFetch('/api/notifications');
      if (data && Array.isArray(data.notifications) && data.notifications.length > 0) {
        setServerNotifications(data.notifications);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (selectedMovie) return;
    fetchGlobalNotifications();
    const timer = window.setInterval(() => {
      fetchGlobalNotifications();
    }, 35_000);
    return () => window.clearInterval(timer);
  }, [fetchGlobalNotifications, selectedMovie]);

  // Synthesize complete live notifications list (MovieBox-style headlines + synopses + right-side poster)
  const allNotifications = useMemo<GlobalMovieNotification[]>(() => {
    const merged: GlobalMovieNotification[] = [...serverNotifications];
    const seenIds = new Set<string>(merged.map((n) => n.id));
    const seenMoviePaths = new Set<string>(merged.map((n) => n.movie.path));

    const cleanItems = normalizeMovieCardList(
      [...(mbHomeData?.banners || []), ...items, ...TOP_10_THIS_WEEK_ITEMS].filter(
        (i) => !i.isAdult
      ),
      liveClockNow
    );
    const recentList = sortItemsByRecentUpload(cleanItems, liveClockNow).slice(0, 10);
    const popularHighRated = sortItemsByHighRating(cleanItems, liveClockNow).slice(0, 10);
    const minsList = [12, 23, 35, 43, 58, 75, 95, 120, 165, 210];

    const createClientNotif = (
      it: MovieCardItem,
      idx: number,
      category: 'NEW_UPLOAD' | 'TOP_RATED_POPULAR'
    ): GlobalMovieNotification => {
      const cleanTitle = it.title
        .replace(/\s*\((?:19|20)\d{2}\)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const rawDesc = String(it.description || '').trim();
      const isSeries =
        it.typeBadge === 'SERIES' ||
        it.typeBadge === 'ANIME' ||
        it.typeBadge === 'DRAMA' ||
        Boolean(it.episodePill);
      const ratingNum = parseFloat(it.rating || '8.8') || 8.8;
      const pattern = idx % 3;
      const headline =
        isSeries && pattern === 0
          ? `${cleanTitle} is back—what will happen next?`
          : isSeries && pattern === 1
            ? `“${cleanTitle}” is heating up—tap to find out what happens next!`
            : rawDesc
              ? `${cleanTitle}: ${rawDesc.length > 68 ? `${rawDesc.slice(0, 65).trim()}...` : rawDesc}`
              : `“${cleanTitle}” is now streaming in Full HD—tap to watch!`;
      const synopsis = rawDesc
        ? `${cleanTitle}: ${rawDesc}`
        : `${cleanTitle}: Stream in ${formatShortLanguage(it.language)} • ${it.quality || '1080p HD'} • ★ ${ratingNum.toFixed(1)} (${it.sportGenre || it.typeBadge || 'Cinema'}).`;
      const mins = minsList[idx % minsList.length];
      const timeBadge =
        mins < 60
          ? `${mins} min ago`
          : `${Math.floor(mins / 60)} hr ${mins % 60 > 0 ? `${mins % 60} min ` : ''}ago`;

      return {
        id: `notif-${category === 'NEW_UPLOAD' ? 'new' : 'pop'}-${it.id}`,
        category,
        badgeText: timeBadge,
        headlineBn: headline,
        subtitleBn: synopsis,
        movie: it,
        createdAt: Math.max(liveClockNow - mins * 60_000, liveClockNow - 24 * 3600_000),
        ratingScore: ratingNum,
      };
    };

    const maxLen = Math.max(recentList.length, popularHighRated.length);
    let synthIdx = merged.length;
    for (let i = 0; i < maxLen; i++) {
      const newIt = recentList[i];
      if (newIt && !seenMoviePaths.has(newIt.path)) {
        const notif = createClientNotif(newIt, synthIdx++, 'NEW_UPLOAD');
        if (!seenIds.has(notif.id)) {
          seenIds.add(notif.id);
          seenMoviePaths.add(newIt.path);
          merged.push(notif);
        }
      }

      const popIt = popularHighRated[i];
      if (popIt && !seenMoviePaths.has(popIt.path)) {
        const notif = createClientNotif(popIt, synthIdx++, 'TOP_RATED_POPULAR');
        if (!seenIds.has(notif.id)) {
          seenIds.add(notif.id);
          seenMoviePaths.add(popIt.path);
          merged.push(notif);
        }
      }
    }

    return merged.slice(0, 30);
  }, [serverNotifications, mbHomeData, items, liveClockNow]);

  // Automatically request Phone OS Notification permission on first user touch & deliver unseen notifications directly to Phone Status Bar!
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || allNotifications.length === 0) return;

    const deliverNextUnseenPhoneNotification = () => {
      if (Notification.permission !== 'granted') return;
      const nextUnseen = allNotifications.find((n) => !pushedSetRef.current.has(n.id));
      if (!nextUnseen) return;

      pushedSetRef.current.add(nextUnseen.id);
      setPushedPhoneNotifIds((prev) =>
        prev.includes(nextUnseen.id) ? prev : [...prev, nextUnseen.id]
      );
      sendNativePhoneNotification(nextUnseen);
    };

    if (Notification.permission === 'granted') {
      const timer = window.setTimeout(deliverNextUnseenPhoneNotification, 1800);
      return () => window.clearTimeout(timer);
    }

    if (Notification.permission === 'default') {
      const requestOnFirstGesture = () => {
        Notification.requestPermission()
          .then((perm) => {
            if (perm === 'granted') {
              deliverNextUnseenPhoneNotification();
            }
          })
          .catch(() => {});
        window.removeEventListener('pointerdown', requestOnFirstGesture);
        window.removeEventListener('keydown', requestOnFirstGesture);
      };
      window.addEventListener('pointerdown', requestOnFirstGesture, { once: true, passive: true });
      window.addEventListener('keydown', requestOnFirstGesture, { once: true, passive: true });
      return () => {
        window.removeEventListener('pointerdown', requestOnFirstGesture);
        window.removeEventListener('keydown', requestOnFirstGesture);
      };
    }
  }, [allNotifications, sendNativePhoneNotification]);

  // Support Direct Shared Movie Links (?watch=/path/to/movie&title=...) on App Load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const watchPath = params.get('watch');
      const watchTitle = params.get('title') || 'Featured Stream';
      if (watchPath) {
        const matched =
          items.find((m) => m.path === watchPath) ||
          TOP_10_THIS_WEEK_ITEMS.find((m) => m.path === watchPath);
        if (matched) {
          setSelectedMovie(matched);
        } else {
          setSelectedMovie({
            id: watchPath.replace(/[^a-zA-Z0-9_-]/g, '_'),
            title: watchTitle,
            url: watchPath,
            path: watchPath,
            poster: '',
            quality: '1080p Full HD',
            views: 'Live',
            language: 'Multi Audio',
            typeBadge: watchPath.includes('/anime') ? 'ANIME' : 'MOVIE',
            timeAgo: 'Shared Link',
            episodePill: '',
            isPinned: false,
            isAdult: false,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Mobile / Browser Hardware Back Button Support: Minimize player to Floating Mini Player or close modal
  useEffect(() => {
    const anyModalOpen = Boolean(
      (selectedMovie && !isMiniPlayer) || showInstallModal || showRequestModal
    );
    if (anyModalOpen) {
      window.history.pushState({ cinepulseModal: true }, '');
    }
    const handlePopState = () => {
      if (selectedMovie && !isMiniPlayer) {
        setIsMiniPlayer(true);
      } else if (showRequestModal) {
        setShowRequestModal(false);
      } else if (showInstallModal) {
        setShowInstallModal(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedMovie, isMiniPlayer, showInstallModal, showRequestModal]);

  const saveRecentSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecentSearches((prev) => [cleaned, ...prev.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8));
  };

  const handleSelectCategory = (cat: CategoryOption) => {
    setCurrentCategory(cat);
    setCurrentPage(1);
    setSubmittedSearch('');
    setSearchQuery('');
    setAudioFilter('ALL');
    setQualityFilter('ALL');
    setYearFilter('ALL');
    setShowSearchDropdown(false);
    setActiveTab('browse');

    // 0ms Instant Category Seed from RAM cache or Home Shelves so switching tabs & Hero Banner has zero lag!
    const ramHit = getInstantCatalogCache(cat.path, 1, '', activeNodeId);
    if (ramHit && ramHit.items.length > 0) {
      setItems(normalizeMovieCardList(ramHit.items));
      setMaxPage(ramHit.maxPage);
      return;
    }
    const allHomeSections = mbHomeData?.sections || [];
    const matchingShelves = allHomeSections
      .filter((s) => {
        if (s.categoryPath === cat.path) return true;
        const st = (s.title || '').toLowerCase();
        const cp = cat.path.toLowerCase();
        if (cp === '/mostwatch/7d') return /trending|hot|popular|top/i.test(st);
        if (cp === '/type/movies') return /movie|bollywood|hollywood|bengali|south/i.test(st);
        if (cp === '/type/series') return /series|drama|tv|show/i.test(st);
        if (cp === '/anime' || cp === '/category/anime-hindi') return /anime|animation/i.test(st);
        if (cp === '/language/bangla') return /bengali|bangla/i.test(st);
        if (cp === '/bollywood') return /bollywood|hindi/i.test(st);
        if (cp === '/southindian') return /south|tamil|telugu/i.test(st);
        if (cp === '/language/english') return /hollywood|english|western/i.test(st);
        if (cp === '/drama') return /drama|korean|k-drama|asian/i.test(st);
        if (cp === '/category/short-tv') return /short|drama/i.test(st);
        if (cp === '/category/western-tv') return /western|hollywood|series/i.test(st);
        return false;
      })
      .flatMap((s) => s.items || []);
    const fallbackSeed = INITIAL_FALLBACK_MOVIES[cat.path] || [];
    const instantSeed = deduplicateMovieCards([...matchingShelves, ...fallbackSeed]);
    if (instantSeed.length > 0) {
      setItems(normalizeMovieCardList(instantSeed));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setSourceFilter('ALL');
    setSubmittedSearch(trimmed);
    if (trimmed) {
      saveRecentSearch(trimmed);
      if (suggestions.length > 0) {
        setItems(normalizeMovieCardList(suggestions));
      }
    }
    setCurrentPage(1);
    setShowSearchDropdown(false);
    setActiveTab('browse');
  };

  const handleTriggerActorSearch = (actorName: string) => {
    setSourceFilter('ALL');
    setSearchQuery(actorName);
    setSubmittedSearch(actorName);
    saveRecentSearch(actorName);
    setCurrentPage(1);
    setActiveTab('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(maxPage, newPage));
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      handlePageChange(parsed);
      setJumpPageInput('');
    }
  };

  const handleToggleWatchlist = useCallback((movie: MovieCardItem, folder: WatchlistFolder = 'favorites') => {
    setWatchlist((prev) => {
      const existing = prev.find((m) => m.path === movie.path || m.title === movie.title);
      if (existing) {
        if (existing.folder !== folder) {
          return prev.map((m) =>
            m.path === movie.path || m.title === movie.title ? { ...m, folder } : m
          );
        }
        return prev.filter((m) => m.path !== movie.path && m.title !== movie.title);
      }
      const defaultFolder: WatchlistFolder =
        movie.typeBadge === 'ANIME' || movie.typeBadge === 'SERIES' || movie.typeBadge === 'DRAMA'
          ? 'anime_series'
          : folder;
      return [{ ...movie, folder: defaultFolder }, ...prev];
    });
  }, []);

  const handleRecordWatchProgress = useCallback(
    (
      movie: MovieCardItem,
      episode?: EpisodeItem,
      episodeIdx?: number,
      source?: StreamSource,
      seconds?: number,
      duration?: number
    ) => {
      setContinueWatching((prev) => {
        const existing = prev.find((p) => p.movie.path === movie.path || p.movie.title === movie.title);
        const filtered = prev.filter((p) => p.movie.path !== movie.path && p.movie.title !== movie.title);

        const resolvedDuration =
          typeof duration === 'number' && duration > 0 ? Math.floor(duration) : existing?.durationSeconds || 0;

        let resolvedSeconds = existing?.progressSeconds || 0;
        if (typeof seconds === 'number' && seconds > 0) {
          const floored = Math.floor(seconds);
          // If finished within last 15 seconds of a full-length video, reset resume marker cleanly to 0
          if (resolvedDuration > 60 && floored >= resolvedDuration - 15) {
            resolvedSeconds = 0;
          } else {
            resolvedSeconds = floored;
          }
        }

        const entry: WatchProgressItem = {
          movie,
          episodeId: episode?.id ?? existing?.episodeId,
          episodeIdx: episodeIdx ?? existing?.episodeIdx ?? 0,
          episodeLabel: episode?.label ?? existing?.episodeLabel,
          quality: source?.quality ?? existing?.quality,
          audio: source?.audio ?? existing?.audio,
          updatedAt: Date.now(),
          progressSeconds: resolvedSeconds,
          durationSeconds: resolvedDuration,
        };
        return [entry, ...filtered].slice(0, 24);
      });
    },
    []
  );

  // Automatically add opened movie/series to Watch History while preserving exact saved resume timestamp
  useEffect(() => {
    if (selectedMovie) {
      handleRecordWatchProgress(selectedMovie);
    }
  }, [selectedMovie, handleRecordWatchProgress]);

  const handleExportWatchlist = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      watchlist,
      continueWatching,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CinePulse_Backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportWatchlist = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.watchlist)) {
        setWatchlist(parsed.watchlist);
      }
      if (Array.isArray(parsed.continueWatching)) {
        setContinueWatching(parsed.continueWatching);
      }
    } catch {
      // ignore
    }
  };

  const [audioPoolItems, setAudioPoolItems] = useState<MovieCardItem[]>([]);

  useEffect(() => {
    if (audioFilter === 'ALL') {
      setAudioPoolItems([]);
      return;
    }
    const langPathMap: Record<string, string> = {
      BANGLA: '/language/bangla',
      HINDI: '/language/hindi',
      DUAL: '/category/dual-audio',
      SUB: '/genre/animation',
    };
    const targetPath = langPathMap[audioFilter];
    if (!targetPath) return;

    let cancelled = false;
    const params = new URLSearchParams({
      path: targetPath,
      page: String(currentPage),
      q: submittedSearch,
      node: activeNodeId,
    });
    universalApiFetch(`/api/catalog?${params.toString()}`)
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.items) && data.items.length > 0) {
          setAudioPoolItems(normalizeMovieCardList(data.items));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [audioFilter, currentPage, submittedSearch, activeNodeId]);

  const displayedItems = useMemo(() => {
    const basePool =
      audioFilter === 'ALL'
        ? items
        : deduplicateMovieCards([
            ...items,
            ...audioPoolItems,
            ...(mbHomeData?.sections || []).flatMap((s) => s.items || []),
            ...Object.values(INITIAL_FALLBACK_MOVIES).flat(),
          ]);
    let list = normalizeMovieCardList(basePool, liveClockNow);

    if (sourceFilter !== 'ALL') {
      list = list.filter((i) => getCardSourceInfo(i.path).id === sourceFilter);
    }

    if (audioFilter !== 'ALL') {
      list = list.filter((i) => {
        const lang = (i.language + ' ' + i.title).toUpperCase();
        if (audioFilter === 'BANGLA') return lang.includes('BANGLA') || lang.includes('BENGALI');
        if (audioFilter === 'HINDI') return lang.includes('HINDI');
        if (audioFilter === 'DUAL') return lang.includes('DUAL') || lang.includes('MULTI');
        if (audioFilter === 'SUB')
          return (
            lang.includes('SUB') ||
            lang.includes('JAP') ||
            lang.includes('KOR') ||
            i.typeBadge === 'ANIME'
          );
        return true;
      });
    }

    if (qualityFilter !== 'ALL') {
      list = list.filter((i) => {
        const q = (i.quality + ' ' + i.title).toUpperCase();
        if (qualityFilter === '4K') return q.includes('4K') || q.includes('2160P') || q.includes('UHD');
        if (qualityFilter === '1080P') return q.includes('1080P') || q.includes('FULL HD') || q.includes('FHD');
        if (qualityFilter === 'WEBDL') return q.includes('WEB-DL') || q.includes('WEBRIP') || q.includes('BLURAY');
        if (qualityFilter === 'HDTC') return q.includes('HDTC') || q.includes('CAM') || q.includes('HDTS');
        return true;
      });
    }

    if (yearFilter !== 'ALL') {
      list = list.filter((i) => {
        const t = i.title;
        if (yearFilter === '2026') return t.includes('2026');
        if (yearFilter === '2025') return t.includes('2025');
        if (yearFilter === 'OLDER') return !t.includes('2026') && !t.includes('2025');
        return true;
      });
    }

    const isActivelySearching = Boolean(submittedSearch.trim() || searchQuery.trim());
    if (sortBy === 'HOT_HYPE') {
      if (!isActivelySearching) {
        list = sortItemsByHotAndHype(list, liveClockNow);
      }
    } else if (sortBy === 'LATEST') {
      list.sort((a, b) => getItemMinutesAgo(a, 0, liveClockNow) - getItemMinutesAgo(b, 0, liveClockNow));
    } else if (sortBy === 'RATING') {
      list = sortItemsByHighRating(list, liveClockNow);
    } else if (sortBy === 'VIEWS') {
      list.sort((a, b) => parseViewsCount(b.views) - parseViewsCount(a.views));
    } else if (sortBy === 'TITLE') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [items, audioPoolItems, mbHomeData, sourceFilter, audioFilter, qualityFilter, yearFilter, sortBy, submittedSearch, searchQuery, liveClockNow]);

  const heroSlides = useMemo(() => {
    const seen = new Set<string>();
    const slides: MovieCardItem[] = [];

    const pushUnique = (list: MovieCardItem[]) => {
      for (const item of list) {
        if (!item?.title || !item?.path) continue;
        const img = item.previewImage || item.poster;
        if (!img || brokenImages[item.id]) continue;
        if (currentCategory.path !== '/adult18plus' && item.isAdult) continue;
        const tk = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(item.path) && !seen.has(tk)) {
          seen.add(item.path);
          seen.add(tk);
          slides.push(item);
          if (slides.length >= 10) break;
        }
      }
    };

    if (currentCategory.path === '/') {
      const mbBanners = mbHomeData?.banners || [];
      const sectionLeads = (mbHomeData?.sections || []).flatMap((s) => (s.items || []).slice(0, 2));
      pushUnique(
        normalizeMovieCardList([
          ...mbBanners,
          ...sectionLeads,
          ...TOP_10_THIS_WEEK_ITEMS,
          ...displayedItems,
          ...(INITIAL_FALLBACK_MOVIES['/'] || []),
        ])
      );
    } else {
      // Category-specific Hero Banner: dynamically adapts to whichever tab is active after Homepage!
      const fallbackCat = INITIAL_FALLBACK_MOVIES[currentCategory.path] || [];
      pushUnique(normalizeMovieCardList([...displayedItems, ...fallbackCat]));
    }

    return slides.length > 0 ? slides.slice(0, 10) : displayedItems.slice(0, 10);
  }, [mbHomeData, displayedItems, brokenImages, currentCategory.path]);

  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const heroTouchStartXRef = useRef<number | null>(null);
  const heroMiniStripRef = useRef<HTMLDivElement | null>(null);

  // Reset slide index when category changes
  useEffect(() => {
    setHeroSlideIdx(0);
  }, [currentCategory.path]);

  // Preload Hero slide images in browser cache so auto-sliding never flashes blank frames
  useEffect(() => {
    heroSlides.slice(0, 6).forEach((slide) => {
      const src = slide.previewImage || slide.poster;
      if (src) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = src;
      }
    });
  }, [heroSlides]);

  // Auto-advance Hero Background Cover smoothly every 3.2s on Home AND all Category Tabs
  useEffect(() => {
    if (activeTab !== 'browse' || selectedMovie || submittedSearch || currentPage !== 1) return;
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % heroSlides.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [activeTab, selectedMovie, submittedSearch, currentPage, heroSlides.length, currentCategory.path]);

  const safeSlideIdx = heroSlides.length > 0 ? heroSlideIdx % heroSlides.length : 0;

  // Smoothly scroll the mini-cards strip horizontally to keep the active slide visible
  useEffect(() => {
    const strip = heroMiniStripRef.current;
    if (!strip || heroSlides.length <= 1) return;
    const activeEl = strip.children[safeSlideIdx] as HTMLElement | undefined;
    if (activeEl) {
      const targetLeft = Math.max(
        0,
        activeEl.offsetLeft - strip.clientWidth / 2 + activeEl.clientWidth / 2
      );
      strip.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [safeSlideIdx, heroSlides.length]);

  const spotlightItem = useMemo(() => {
    return (
      heroSlides[safeSlideIdx] ||
      displayedItems.find((i) => i.poster) ||
      displayedItems[0] ||
      INITIAL_FALLBACK_MOVIES['/'][0]
    );
  }, [heroSlides, safeSlideIdx, displayedItems]);

  const heroMiniCards = useMemo(() => {
    if (heroSlides.length === 0) return displayedItems.slice(0, 6);
    return heroSlides.slice(0, 10);
  }, [heroSlides, displayedItems]);

  const top10ThisWeekItems = useMemo(() => {
    const merged: MovieCardItem[] = [];
    const seen = new Set<string>();
    const combined = normalizeMovieCardList([...TOP_10_THIS_WEEK_ITEMS, ...displayedItems]);
    for (const item of combined) {
      const tk = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(item.path) && !seen.has(tk) && item.poster && !brokenImages[item.id]) {
        seen.add(item.path);
        seen.add(tk);
        merged.push(item);
        if (merged.length >= 10) break;
      }
    }
    return merged.slice(0, 10);
  }, [displayedItems, brokenImages]);

  // Last 24 Hours updated movies, series, and anime across all 3 sites
  const last24hItems = useMemo(() => {
    const recentPool: MovieCardItem[] = [];
    const seen = new Set<string>();
    const combined = normalizeMovieCardList(
      [
        ...latest3SiteUploads,
        ...items,
        ...TOP_10_THIS_WEEK_ITEMS,
        ...INITIAL_FALLBACK_MOVIES['/'],
      ],
      liveClockNow
    );
    for (let idx = 0; idx < combined.length; idx++) {
      const item = combined[idx];
      if (!item?.title || !item?.path) continue;
      if (seen.has(item.path)) continue;
      const yearMatch = item.title.match(/\((19\d{2}|20[0-2]\d)\)/);
      if (yearMatch) {
        const yr = parseInt(yearMatch[1], 10);
        if (yr <= 2024 && !item.episodePill) continue;
      }
      const mins = getItemMinutesAgo(item, idx, liveClockNow);
      if (mins <= 1440 || item.title.includes('2026') || item.title.includes('2025')) {
        seen.add(item.path);
        recentPool.push(item);
      }
    }
    const mb = recentPool.filter((i) => i.path?.startsWith('/mb/'));
    const mlbd = recentPool.filter((i) => !i.path?.startsWith('/mb/'));
    const interleaved: MovieCardItem[] = [];
    const maxLen = Math.max(mb.length, mlbd.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < mlbd.length) interleaved.push(mlbd[i]);
      if (i < mb.length) interleaved.push(mb[i]);
    }
    const baseList = interleaved.length >= 8 ? interleaved : combined.slice(0, 36);
    return baseList;
  }, [latest3SiteUploads, items, liveClockNow]);

  // Gently pre-warm active Hero slide + top 3 visible movies after initial page load settles
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const toWarm = [spotlightItem, ...displayedItems.slice(0, 3)].filter(Boolean);
      const seen = new Set<string>();
      toWarm.forEach((m, idx) => {
        if (m?.path && !seen.has(m.path)) {
          seen.add(m.path);
          prefetchMovieDetails(m.path, m.title, activeNodeId, idx === 0);
        }
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [currentCategory.path, activeNodeId]);

  const isMovieInWatchlist = useCallback(
    (movie: MovieCardItem | null) => {
      if (!movie) return false;
      return watchlist.some((m) => m.path === movie.path || m.title === movie.title);
    },
    [watchlist]
  );

  const getMovieWatchlistFolder = useCallback(
    (movie: MovieCardItem | null): WatchlistFolder => {
      if (!movie) return 'favorites';
      const found = watchlist.find((m) => m.path === movie.path || m.title === movie.title);
      return found?.folder || 'favorites';
    },
    [watchlist]
  );

  const selectedMovieProgress = useMemo(() => {
    if (!selectedMovie) return undefined;
    return continueWatching.find(
      (p) => p.movie.path === selectedMovie.path || p.movie.title === selectedMovie.title
    );
  }, [selectedMovie, continueWatching]);

  const filteredWatchlist = useMemo(() => {
    if (watchlistFolderTab === 'all') return watchlist;
    return watchlist.filter((item) => (item.folder || 'favorites') === watchlistFolderTab);
  }, [watchlist, watchlistFolderTab]);

  const findCat = (path: string) =>
    ALL_CATEGORIES.find((c) => c.path === path) || ALL_CATEGORIES[0];

  const topNavTabs = [
    { label: 'Home', cat: findCat('/') },
    { label: 'Trending', cat: findCat('/mostwatch/7d') },
    { label: 'Movie', cat: findCat('/type/movies') },
    { label: 'TV Show', cat: findCat('/type/series') },
    { label: 'Anime', cat: findCat('/anime') },
    { label: 'Trending Bengali', cat: findCat('/language/bangla') },
    { label: 'Bollywood', cat: findCat('/bollywood') },
    { label: 'South Indian', cat: findCat('/southIndian') },
    { label: 'Hollywood', cat: findCat('/language/english') },
    { label: 'Anime in Hindi', cat: findCat('/category/anime-hindi') },
    { label: 'Asian Drama', cat: findCat('/drama') },
    { label: '🔥Hot Short TV', cat: findCat('/category/short-tv') },
    { label: 'Western TV', cat: findCat('/category/western-tv') },
    { label: 'Midnight 18+', cat: findCat('/adult18plus') },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#e5e5e5] flex flex-col pb-24">
      {/* App Entry Splash Screen with Crimson Red CinePulse Logo */}
      {showSplashScreen && (
        <div
          onClick={() => setShowSplashScreen(false)}
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-between py-14 px-6 select-none animate-fade-in"
        >
          <div className="h-8" />

          {/* Center Crimson Red CinePulse Logo */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-[32px] bg-gradient-to-tr from-[#7f1d1d] via-[#dc2626] to-[#ef4444] p-1 shadow-[0_18px_45px_rgba(220,38,38,0.35)] flex items-center justify-center">
              <div className="w-full h-full bg-[#050505] rounded-[28px] flex items-center justify-center">
                <Play className="w-16 h-16 text-[#ef4444] fill-current ml-1.5 drop-shadow-[0_0_16px_rgba(220,38,38,0.55)]" />
              </div>
            </div>
          </div>

          {/* Bottom Brand Name & Tagline */}
          <div className="text-center space-y-1 pb-4">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
              CINE<span className="text-[#dc2626]">PULSE</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-400 tracking-wide">
              Box of Movies and TV shows
            </p>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#dc2626] text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 z-50">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Mode — ক্যাশ করা মুভি তালিকা এবং আপনার ওয়াচলিস্ট দেখানো হচ্ছে</span>
        </div>
      )}

      {/* TOP SEARCH BAR & MAIN CONTENT CONTAINER */}
      <div className="relative w-full max-w-7xl mx-auto">
        {/* Sticky Top Search Bar + Clean Pill Category Strip (Hidden on full-screen Me tab) */}
        {activeTab !== 'me' && (
          <header className="sticky top-0 z-30 bg-[#0d0f12]/95 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-8 pt-2.5 pb-0 shadow-lg">
            {Boolean(searchQuery.trim() || submittedSearch.trim() || showSearchDropdown) ? (
              /* MOVIEBOX-STYLE SEARCH HEADER + CATEGORY TABS (Exact Match to Screenshot) */
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 w-full">
                  {/* Left Back Chevron (<) */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSubmittedSearch('');
                      setSuggestions([]);
                      setShowSearchDropdown(false);
                      setSearchTabFilter('ALL');
                    }}
                    aria-label="Back"
                    className="w-8 h-10 flex items-center justify-center text-gray-200 hover:text-white shrink-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                  </button>

                  {/* Rounded Dark-Gray Search Box */}
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex-1 min-w-0 flex items-center h-11 rounded-xl bg-[#22252b] border border-white/10 focus-within:border-white/25 px-3.5 gap-2.5 transition-colors"
                  >
                    <Search className="w-5 h-5 text-gray-300 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchDropdown(true);
                        setActiveTab('browse');
                      }}
                      style={{
                        color: '#ffffff',
                        WebkitTextFillColor: '#ffffff',
                        opacity: 1,
                      }}
                      placeholder="Tower of God [Hindi] বা মুভি খুঁজুন..."
                      className="flex-1 w-full min-w-0 bg-transparent text-sm sm:text-[15px] font-normal text-white placeholder:text-gray-400 focus:outline-none truncate"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSubmittedSearch('');
                          setSuggestions([]);
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="w-5 h-5 rounded-full bg-gray-400/90 hover:bg-gray-300 text-[#121418] flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.8]" />
                      </button>
                    )}
                  </form>

                  {/* Right Voice / Mic Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const SpeechRec =
                        (window as any).SpeechRecognition ||
                        (window as any).webkitSpeechRecognition;
                      if (SpeechRec) {
                        try {
                          const rec = new SpeechRec();
                          rec.lang = 'en-US';
                          rec.onresult = (ev: any) => {
                            const transcript = ev?.results?.[0]?.[0]?.transcript;
                            if (transcript) {
                              setSearchQuery(transcript);
                              setSubmittedSearch(transcript);
                              setActiveTab('browse');
                            }
                          };
                          rec.start();
                          return;
                        } catch {
                          // fallback to focus
                        }
                      }
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Voice Search"
                    className="w-9 h-10 flex items-center justify-center text-gray-200 hover:text-white shrink-0 cursor-pointer"
                  >
                    <Mic className="w-5 h-5 stroke-[2]" />
                  </button>
                </div>

                {/* MovieBox Search Filter Tabs: All | Movie/Series | ShortTV | Music */}
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pt-1 px-1">
                  {(
                    [
                      { id: 'ALL', label: 'All' },
                      { id: 'MOVIE_SERIES', label: 'Movie/Series' },
                      { id: 'SHORT_TV', label: 'ShortTV' },
                      { id: 'MUSIC', label: 'Music' },
                    ] as const
                  ).map((tab) => {
                    const isActive = searchTabFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSearchTabFilter(tab.id)}
                        className={`relative pb-2.5 text-sm sm:text-[15px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'text-white font-bold'
                            : 'text-gray-400 hover:text-gray-200 font-medium'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {isActive && (
                          <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-6 bg-white rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* DEFAULT HOME HEADER (Brand + Search Pill + Category Strip) */
              <div className="space-y-2.5 pb-2.5">
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(ALL_CATEGORIES[0])}
                    aria-label="Home"
                    className="h-10 px-2.5 sm:px-3 rounded-xl bg-[#121212] border border-white/10 hover:border-[#dc2626]/60 shrink-0 flex items-center gap-2 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#dc2626] flex items-center justify-center text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <span className="hidden md:inline text-sm font-black tracking-wider text-white font-display">
                      CINE<span className="text-[#dc2626]">PULSE</span>
                    </span>
                  </button>

                  <div ref={searchContainerRef} className="relative flex-1 min-w-0">
                    <form
                      onSubmit={handleSearchSubmit}
                      className="flex items-center w-full h-10 rounded-full bg-[#121212] border border-white/15 focus-within:border-[#dc2626] pl-3 pr-1 overflow-hidden transition-colors"
                    >
                      <Search className="w-4 h-4 text-[#ef4444] shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onFocus={() => {
                          setShowSearchDropdown(true);
                          setActiveTab('browse');
                        }}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchDropdown(true);
                          setActiveTab('browse');
                        }}
                        style={{
                          color: '#ffffff',
                          WebkitTextFillColor: '#ffffff',
                          opacity: 1,
                        }}
                        placeholder="মুভি বা সিরিজ খুঁজুন..."
                        className="flex-1 w-full min-w-0 bg-transparent px-2 text-xs sm:text-sm font-semibold text-white placeholder:text-gray-400 placeholder:font-normal caret-[#ef4444] focus:outline-none truncate"
                      />
                      <button
                        type="submit"
                        aria-label="Search"
                        className="h-8 w-9 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-colors"
                      >
                        <Search className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Row 2: MovieBox Style Category Strip (Football | Trending | MangoTV | Anime | Cricket | Movie | TV Show...) */}
                <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar pt-1 px-1">
                  {topNavTabs.map((t) => {
                    const isActive =
                      activeTab === 'browse' &&
                      currentCategory.path === t.cat.path &&
                      !submittedSearch;
                    return (
                      <button
                        key={t.cat.path + t.label}
                        type="button"
                        onClick={() => handleSelectCategory(t.cat)}
                        className={`relative py-1 text-sm sm:text-[15px] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'text-white font-extrabold scale-[1.03]'
                            : 'text-gray-400 hover:text-gray-200 font-semibold'
                        }`}
                      >
                        {(t as any).isMango && (
                          <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-orange-600 to-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                            M
                          </span>
                        )}
                        <span>{t.label}</span>
                        {isActive && (
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-[3px] w-5 rounded-full bg-[#00e68a]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </header>
        )}

        {/* MAIN VIEW 1: HOME & BROWSE */}
        {activeTab === 'browse' && (
          <main className="space-y-6 px-3 sm:px-8 pt-3">
            {Boolean(searchQuery.trim() || submittedSearch.trim() || showSearchDropdown) ? (
              /* MOVIEBOX-STYLE VERTICAL SEARCH RESULTS SCREEN (Exact Match to Screenshot) */
              <section className="space-y-3 pb-10">
                {/* Recent Searches Chips when input is empty */}
                {!searchQuery.trim() && !submittedSearch.trim() && recentSearches.length > 0 && (
                  <div className="space-y-2 pt-1 pb-2 border-b border-white/[0.07]">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-semibold text-gray-300">Recent Searches</span>
                      <button
                        type="button"
                        onClick={() => setRecentSearches([])}
                        className="text-[11px] text-gray-400 hover:text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setSearchQuery(term);
                            setSubmittedSearch(term);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1c1f26] hover:bg-[#262a34] text-xs font-medium text-gray-200 transition-colors cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(loadingSuggestions || loadingCatalog) && (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Searching CinePulse HD...</span>
                  </div>
                )}

                {(() => {
                  const rawActiveQ = searchQuery.trim() || submittedSearch.trim();
                  const activeQ = rawActiveQ.toLowerCase();
                  const romanActiveQ = transliterateClientQuery(rawActiveQ);
                  const activeWords = Array.from(
                    new Set(
                      `${activeQ} ${romanActiveQ}`
                        .split(/\s+/)
                        .map((w) => w.replace(/[^a-z0-9\u0980-\u09FF]/gi, ''))
                        .filter((w) => w.length >= 2)
                    )
                  );
                  const rawPool = activeQ
                    ? deduplicateMovieCards([
                        ...normalizeMovieCardList(suggestions, liveClockNow),
                        ...(submittedSearch.trim() ? normalizeMovieCardList(items, liveClockNow) : []),
                        ...localSearchPool.filter((i) => {
                          const hay = `${i.title} ${i.language} ${i.sportGenre || ''}`.toLowerCase();
                          if (hay.includes(activeQ) || (romanActiveQ && hay.includes(romanActiveQ))) {
                            return true;
                          }
                          return (
                            activeWords.length > 0 &&
                            activeWords.some((w) => w.length >= 3 && hay.includes(w))
                          );
                        }),
                      ])
                    : deduplicateMovieCards([
                        ...displayedItems.slice(0, 24),
                        ...normalizeMovieCardList(TOP_10_THIS_WEEK_ITEMS, liveClockNow),
                      ]);

                  const filteredRows = rawPool.filter((item) => {
                    if (searchTabFilter === 'ALL') return true;
                    const t = `${item.title} ${item.typeBadge}`.toLowerCase();
                    if (searchTabFilter === 'SHORT_TV') {
                      return /short|drama|ep|s0\d|series/i.test(t);
                    }
                    if (searchTabFilter === 'MUSIC') {
                      return /music|song|concert|audio|musical/i.test(t);
                    }
                    return true;
                  });

                  if (filteredRows.length === 0 && !loadingSuggestions && !loadingCatalog) {
                    return (
                      <div className="py-14 text-center space-y-3">
                        <Film className="w-10 h-10 text-gray-500 mx-auto" />
                        <p className="text-sm text-gray-300 font-medium">
                          No results found for "{searchQuery || submittedSearch}"
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-white/[0.04]">
                      {filteredRows.slice(0, 48).map((item, idx) => {
                        const hasBrokenImg = brokenImages[item.id] || !item.poster;
                        const langShort = formatShortLanguage(item.language);
                        const yearMatch =
                          item.title.match(/\((20\d{2}|19\d{2})\)/) ||
                          item.title.match(/\b(20\d{2}|19\d{2})\b/) ||
                          String(item.timeAgo || '').match(/\b(20\d{2}|19\d{2})\b/);
                        const yearStr = yearMatch ? yearMatch[1] : '2026';
                        const isSeriesItem =
                          item.typeBadge === 'SERIES' ||
                          item.typeBadge === 'ANIME' ||
                          item.typeBadge === 'DRAMA' ||
                          Boolean(item.episodePill) ||
                          /\bS0?\d|\bSeason|\bEp/i.test(item.title);

                        const cleanBaseTitle = item.title
                          .replace(/\s*\(\d{4}\)/g, '')
                          .replace(
                            /\s*(?:1080p|720p|480p|4K|WEB-DL|WEBRip|Full HD|HDTC|BluRay|Dual Audio|Multi Audio).*$/i,
                            ''
                          )
                          .trim();

                        let rowTitle = cleanBaseTitle || item.title;
                        if (!item.path?.startsWith('/mb/')) {
                          const seasonMatch = item.title.match(
                            /\b(S\d+(?:-S?\d+)?|Season\s*\d+)\b/i
                          );
                          const seasonSuffix = seasonMatch ? ` ${seasonMatch[1].toUpperCase()}` : '';
                          const hasBracketLang = /\[[^\]]+\]/.test(cleanBaseTitle);
                          const bracketLang =
                            !hasBracketLang && langShort && langShort !== 'English'
                              ? ` [${langShort}]`
                              : '';
                          const baseWithoutSeason = cleanBaseTitle
                            .replace(/\b(S\d+(?:-S?\d+)?|Season\s*\d+)\b/gi, '')
                            .trim();
                          rowTitle = `${baseWithoutSeason || item.title}${bracketLang}${seasonSuffix}`;
                        }

                        const rawPrimaryGenre = item.sportGenre
                          ? item.sportGenre.split(',')[0].trim()
                          : '';
                        const isAnime =
                          item.typeBadge === 'ANIME' ||
                          rawPrimaryGenre.toLowerCase() === 'anime' ||
                          rawPrimaryGenre.toLowerCase() === 'animation' ||
                          item.country?.toLowerCase() === 'japan' ||
                          /anime|black clover|tower of god|one piece|naruto|solo|bleach|demon|dragon|high school|garden of words|black torch|overgeared|tomb raider/i.test(
                            item.title
                          );
                        const genreLabel =
                          rawPrimaryGenre && rawPrimaryGenre.toLowerCase() !== 'animation'
                            ? rawPrimaryGenre
                            : isAnime
                              ? 'Anime'
                              : /action|war|pushpa|jailer|toofan|marco|king|raider/i.test(item.title)
                                ? 'Action'
                                : /thriller|crime|mirzapur|squid/i.test(item.title)
                                  ? 'Thriller'
                                  : /romance|love|heart/i.test(item.title)
                                    ? 'Romance'
                                    : isSeriesItem
                                      ? 'Drama'
                                      : 'Movie';

                        const middleMeta =
                          item.country ||
                          (isAnime
                            ? 'Japan'
                            : langShort === 'Bengali'
                              ? 'Bangladesh'
                              : langShort === 'Korean'
                                ? 'Korea'
                                : 'India');

                        const ratingVal = item.rating
                          ? Number(item.rating).toFixed(1)
                          : (7.1 + ((idx * 3) % 18) / 10).toFixed(1);

                        return (
                          <div
                            key={`${item.path}-${item.id}-${idx}`}
                            onMouseEnter={() =>
                              prefetchMovieDetails(item.path, item.title, activeNodeId, true)
                            }
                            onTouchStart={() =>
                              prefetchMovieDetails(item.path, item.title, activeNodeId, true)
                            }
                            onClick={() => {
                              if (searchQuery.trim()) {
                                saveRecentSearch(searchQuery.trim());
                              }
                              setSelectedMovie(item);
                            }}
                            className="group py-2.5 flex items-center gap-3.5 cursor-pointer hover:bg-white/[0.03] rounded-xl px-1 transition-colors"
                          >
                            {/* Left Vertical Poster with Bottom Language Strip */}
                            <div className="relative w-[62px] h-[84px] sm:w-[68px] sm:h-[92px] rounded-lg overflow-hidden bg-[#161920] shrink-0">
                              {!hasBrokenImg ? (
                                <img
                                  src={item.poster}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  onError={() =>
                                    setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                                  }
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-6 h-6 text-gray-500" />
                                </div>
                              )}

                              {langShort && (
                                <div className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-[11px] font-medium text-gray-100 leading-tight truncate px-1">
                                  {langShort}
                                </div>
                              )}
                            </div>

                            {/* Middle Column: Title + TV/Film | ★ Rating | Year | Region/Context | Genre */}
                            <div className="flex-1 min-w-0 pr-1">
                              <h3 className="text-[15px] sm:text-base font-medium text-white truncate mb-1.5 group-hover:text-gray-100">
                                {rowTitle}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-gray-400 truncate">
                                {isSeriesItem ? (
                                  <Tv className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                ) : (
                                  <Film className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                )}
                                <span className="text-gray-600">|</span>
                                <span className="inline-flex items-center gap-1 text-amber-400 font-medium shrink-0">
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>{ratingVal}</span>
                                </span>
                                <span className="text-gray-600">|</span>
                                <span className="shrink-0">{yearStr}</span>
                                <span className="text-gray-600">|</span>
                                <span className="truncate">{middleMeta}</span>
                                <span className="text-gray-600">|</span>
                                <span className="truncate">{genreLabel}</span>
                              </div>
                            </div>

                            {/* Right Circular Light Play Button */}
                            <div className="w-8 h-8 rounded-full bg-[#d1d5db] group-hover:bg-white text-[#0f1115] flex items-center justify-center shrink-0 transition-transform active:scale-95">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            ) : (
              <>
            {/* Clean Cinema Hero Cover + MovieBox-Style Bottom Compact Cards (Page 1 & Not Searching) */}
            {!submittedSearch && currentPage === 1 && spotlightItem && (
              <section className="select-none">
                <div
                  onClick={() => setSelectedMovie(spotlightItem)}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      heroTouchStartXRef.current = e.touches[0].clientX;
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (heroTouchStartXRef.current !== null && e.changedTouches.length === 1) {
                      const deltaX = e.changedTouches[0].clientX - heroTouchStartXRef.current;
                      heroTouchStartXRef.current = null;
                      if (Math.abs(deltaX) > 40 && heroSlides.length > 1) {
                        if (deltaX < 0) {
                          setHeroSlideIdx((prev) => (prev + 1) % heroSlides.length);
                        } else {
                          setHeroSlideIdx(
                            (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
                          );
                        }
                      }
                    }
                  }}
                  className="relative aspect-[16/10] sm:aspect-[21/9] w-full rounded-2xl sm:rounded-3xl bg-[#0a0a0a] border border-white/10 cursor-pointer overflow-hidden shadow-2xl group"
                >
                  {(spotlightItem.previewImage || spotlightItem.poster) &&
                  !brokenImages[spotlightItem.id] ? (
                    <img
                      src={spotlightItem.previewImage || spotlightItem.poster}
                      alt={spotlightItem.title}
                      referrerPolicy="no-referrer"
                      decoding="async"
                      fetchPriority="high"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [spotlightItem.id]: true }))
                      }
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-500 ease-out will-change-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a0b0b] to-[#050505]">
                      <Film className="w-14 h-14 text-gray-600" />
                    </div>
                  )}

                  {/* Top-left Active Category Badge + Top-right Slide Indicator Dots */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                    <span className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/15 text-[11px] font-bold text-[#00e68a] tracking-wide uppercase">
                      {currentCategory.path === '/' ? '🔥 Spotlight' : currentCategory.label}
                    </span>
                    {heroSlides.length > 1 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md pointer-events-auto">
                        {heroSlides.slice(0, 8).map((s, dotIdx) => (
                          <button
                            key={s.id + dotIdx}
                            type="button"
                            aria-label={`Slide ${dotIdx + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHeroSlideIdx(dotIdx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              dotIdx === safeSlideIdx
                                ? 'w-5 bg-[#00e68a]'
                                : 'w-1.5 bg-white/40 hover:bg-white/70'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Smooth bottom fade into the compact card strip */}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" />

                  {/* Live Slide Title & Metadata above the mini-cards strip */}
                  <div className="absolute inset-x-3 sm:inset-x-5 bottom-9 sm:bottom-11 z-10 pointer-events-none flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-2xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] truncate">
                        {spotlightItem.title}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-200 font-semibold mt-0.5 drop-shadow">
                        {spotlightItem.rating && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {Number(spotlightItem.rating).toFixed(1)}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[#00e68a]">
                          {formatShortLanguage(spotlightItem.language)}
                        </span>
                        {spotlightItem.quality && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/15 text-white text-[10px] font-bold">
                              {spotlightItem.quality}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MovieBox-Style Compact Floating Cards Strip Under Cover */}
                <div
                  ref={heroMiniStripRef}
                  className="relative z-20 -mt-8 sm:-mt-10 px-2 flex items-end gap-2 overflow-x-auto no-scrollbar pt-3 pb-1 scroll-smooth"
                >
                  {heroMiniCards.map((card, idx) => {
                    const isCurrentSlide = idx === safeSlideIdx;
                    const yearMatch = card.title.match(/\b(20\d{2}|19\d{2})\b/);
                    const yearStr = yearMatch ? yearMatch[1] : '2026';
                    const isSeriesCard =
                      card.typeBadge === 'SERIES' ||
                      card.typeBadge === 'DRAMA' ||
                      Boolean(card.episodePill) ||
                      /\bS0?\d|\bSeason|\bEp/i.test(card.title);
                    const genreLabel =
                      card.typeBadge === 'ANIME'
                        ? 'Anime'
                        : isSeriesCard
                        ? 'Series'
                        : /action|fight|war|king|pushpa|jailer|toofan|marco/i.test(card.title)
                        ? 'Action'
                        : /drama|love|akka|bachelor/i.test(card.title)
                        ? 'Drama'
                        : 'Thriller';
                    const cleanShortTitle = card.title
                      .replace(/\s*\(\d{4}\).*$/i, '')
                      .replace(/\s*S\d+.*$/i, '')
                      .replace(/\s*(?:1080p|720p|480p|4K|WEB-DL|WEBRip|Full HD|HDTC).*$/i, '')
                      .trim();
                    const langShort = formatShortLanguage(card.language);
                    const displayTitle =
                      cleanShortTitle.length <= 16 && langShort !== 'English'
                        ? `${cleanShortTitle} [${langShort}]`
                        : cleanShortTitle || card.title;

                    return (
                      <div
                        key={card.path + card.id + idx}
                        onMouseEnter={() => prefetchMovieDetails(card.path, card.title, activeNodeId)}
                        onTouchStart={() => prefetchMovieDetails(card.path, card.title, activeNodeId)}
                        onClick={() => {
                          setHeroSlideIdx(idx);
                          setSelectedMovie(card);
                        }}
                        className={`w-[196px] sm:w-[220px] shrink-0 rounded-xl backdrop-blur-md border px-2.5 py-2 flex items-center gap-2.5 cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.6)] active:scale-[0.98] transition-all duration-300 ${
                          isCurrentSlide
                            ? 'bg-[#1e232c] border-[#00e68a]/80 shadow-[0_0_16px_rgba(0,230,138,0.22)]'
                            : 'bg-[#181a20]/95 border-white/[0.08] opacity-85 hover:opacity-100'
                        }`}
                      >
                        {/* Protruding Mini Poster Thumbnail */}
                        <div className="relative -mt-5 w-10 h-14 sm:w-11 sm:h-15 rounded-lg overflow-hidden bg-[#0a0a0a] shrink-0 shadow-md border border-white/15">
                          {card.poster ? (
                            <img
                              src={card.poster}
                              alt={card.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* Clean Title + Icon | Year | Genre */}
                        <div className="min-w-0 flex-1">
                          <h2 className="text-[11px] sm:text-xs font-bold text-white truncate">
                            {displayTitle}
                          </h2>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5 flex items-center gap-1 font-medium">
                            {isSeriesCard ? (
                              <Tv className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            ) : (
                              <Film className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            )}
                            <span>|</span>
                            <span>{yearStr}</span>
                            <span>|</span>
                            <span className="truncate">{genreLabel}</span>
                          </div>
                        </div>

                        {/* Circular Gradient Play Button */}
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00e68a] to-[#12d6df] text-[#050505] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,230,138,0.3)]">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* MOVIEBOX OFFICIAL HOME PAGE SHELVES (100% Movies & Series — No Sports Clutter on Home!) */}
            {!submittedSearch && currentPage === 1 && currentCategory.path === '/' && (
              <div className="space-y-6">
                {/* 1. MovieBox Official "Categories" Visual Strip */}
                {mbHomeData?.quickCategories && mbHomeData.quickCategories.length > 0 && (
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#00e68a]" />
                        <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                          Categories <span className="text-xs font-normal text-gray-400">· ক্যাটাগরি সমূহ</span>
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('categories')}
                        className="text-xs font-bold text-[#00e68a] hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>All Categories</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                      {mbHomeData.quickCategories
                        .filter((qc) => qc.id !== 'qc-sports')
                        .map((qc) => (
                          <button
                            key={qc.id}
                            type="button"
                            onClick={() => handleSelectCategory(findCat(qc.path))}
                            className="group relative w-[124px] sm:w-[144px] h-[58px] sm:h-[64px] shrink-0 rounded-xl overflow-hidden bg-[#14171d] border border-white/10 hover:border-[#00e68a]/50 flex items-center justify-between px-3 text-left transition-all active:scale-95 cursor-pointer"
                          >
                            <img
                              src={qc.image}
                              alt={qc.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 group-hover:opacity-50 transition-all duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e12]/95 via-[#0c0e12]/70 to-transparent" />
                            <div className="relative z-10 min-w-0">
                              <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                                {qc.title}
                              </div>
                              <div className="text-[10px] text-gray-300 truncate mt-0.5">
                                {qc.bnTitle}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                  {/* 3. MovieBox Official "Coming Soon" (APPOINTMENT_LIST) Shelf */}
                  {currentCategory.path === '/' && mbHomeData?.comingSoon && mbHomeData.comingSoon.length > 0 && (
                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                            Coming Soon <span className="text-xs font-normal text-gray-400">· আপকামিং রিলিজ</span>
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(findCat('/upcoming'))}
                          className="text-xs font-bold text-[#00e68a] hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>More</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1">
                        {mbHomeData.comingSoon.map((item) => {
                          const isBooked = Boolean(bookedComingSoonIds[item.id]);
                          const displayBooked = item.bookedCount + (isBooked ? 1 : 0);
                          return (
                            <div
                              key={item.id}
                              className="w-[104px] sm:w-[118px] shrink-0 flex flex-col justify-between rounded-lg bg-[#111318] border border-white/[0.08] overflow-hidden group"
                            >
                              <div>
                                {/* Release Date Pill Header */}
                                <div className="px-2 py-1 bg-[#181b22] border-b border-white/[0.06] flex items-center justify-between">
                                  <span className="text-[10px] font-extrabold text-[#00e68a]">
                                    {item.releaseBadge}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    {displayBooked}
                                  </span>
                                </div>

                                {/* Poster */}
                                <div
                                  onClick={() => {
                                    setSearchQuery(item.title);
                                    setSubmittedSearch(item.title);
                                  }}
                                  className="relative aspect-[2/3] w-full bg-[#0a0c10] overflow-hidden cursor-pointer"
                                >
                                  <img
                                    src={item.poster}
                                    alt={item.title}
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-1.5">
                                    <div className="text-[9px] font-semibold text-gray-300 truncate">
                                      {item.country || item.genre}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-1.5 pb-0.5">
                                  <h3 className="text-[11px] font-semibold text-white truncate">
                                    {item.title}
                                  </h3>
                                </div>
                              </div>

                              <div className="px-1.5 pb-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleBookComingSoon(item.id)}
                                  className={`w-full h-6 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                    isBooked
                                      ? 'bg-[#00e68a]/20 text-[#00e68a] border border-[#00e68a]/40'
                                      : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10'
                                  }`}
                                >
                                  <Bell className="w-2.5 h-2.5" />
                                  <span>{isBooked ? 'Booked ✓' : 'Remind'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* 4. All Official MovieBox Horizontal Shelves (Trending Drama, Trending Bengali, Bollywood, South Indian, Hollywood, Hot Short TV, Anime in Hindi, etc.) */}
                  {currentCategory.path === '/' &&
                    mbHomeData?.sections &&
                    mbHomeData.sections.map((shelf) => (
                      <section key={shelf.id} className="space-y-2">
                        <div className="flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1 h-3.5 rounded-full bg-[#00e68a] shrink-0" />
                            <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                              {shelf.title}
                            </h2>
                            <span className="hidden sm:inline text-[11px] text-gray-400 truncate">
                              · {shelf.bnTitle}
                            </span>
                            {shelf.badge && (
                              <span className="px-1.5 py-0.5 rounded bg-[#00e68a]/15 border border-[#00e68a]/30 text-[9px] font-extrabold text-[#00e68a] shrink-0">
                                {shelf.badge}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(findCat(shelf.categoryPath))}
                            className="text-[11px] font-bold text-gray-300 hover:text-[#00e68a] flex items-center gap-0.5 shrink-0 cursor-pointer"
                          >
                            <span>More</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1">
                          {shelf.items.map((item, idx) => {
                            const hasBrokenImg = brokenImages[item.id] || !item.poster;
                            const langShort = formatShortLanguage(item.language);
                            return (
                              <div
                                key={`${shelf.id}-${item.id}-${idx}`}
                                onMouseEnter={() =>
                                  prefetchMovieDetails(item.path, item.title, activeNodeId)
                                }
                                onTouchStart={() =>
                                  prefetchMovieDetails(item.path, item.title, activeNodeId)
                                }
                                onClick={() => setSelectedMovie(item)}
                                className="group w-[96px] sm:w-[114px] shrink-0 cursor-pointer flex flex-col"
                              >
                                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#14171f] border border-white/[0.08] group-hover:border-[#00e68a]/50 transition-all">
                                  {!hasBrokenImg ? (
                                    <img
                                      src={item.poster}
                                      alt={item.title}
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      onError={() =>
                                        setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                                      }
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="w-6 h-6 text-gray-600" />
                                    </div>
                                  )}

                                  {/* Top-Left MovieBox Language Corner Tag */}
                                  {langShort && (
                                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8.5px] font-bold text-white border border-white/10">
                                      {langShort}
                                    </span>
                                  )}

                                  {/* Top-Right Rating Pill */}
                                  {item.rating && (
                                    <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8.5px] font-extrabold text-amber-400 flex items-center gap-0.5">
                                      <Star className="w-2 h-2 fill-current" />
                                      {item.rating}
                                    </span>
                                  )}

                                  {/* Bottom Episode / Quality Strip */}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1 flex items-center justify-between text-[8.5px] font-bold text-gray-200">
                                    <span className="truncate">
                                      {item.episodePill || item.typeBadge}
                                    </span>
                                    <span className="text-[#00e68a] shrink-0">HD</span>
                                  </div>
                                </div>

                                <h3 className="text-[11px] font-semibold text-gray-100 group-hover:text-[#00e68a] truncate mt-1">
                                  {item.title}
                                </h3>
                                <p className="text-[9.5px] text-gray-400 truncate">
                                  {langShort || item.language} • {item.timeAgo}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                </div>
              )}

            {/* PRIMARY SECTION: MOVIES & SERIES CATALOG GRID */}
            <section className="space-y-4">
              <>
                {/* Section Header + Filter Toolbar */}
                  <div className="rounded-2xl bg-[#0a0a0a] border border-white/[0.08] p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Flame className="w-5 h-5 text-[#ef4444] shrink-0" />
                        <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                          {submittedSearch
                            ? `সার্চ ফলাফল: "${submittedSearch}"`
                            : `${currentCategory.label} · ${currentCategory.bnLabel}`}
                        </h2>
                      </div>
                      <span className="text-xs text-gray-400 font-mono tabular-nums shrink-0">
                        Page {currentPage}/{maxPage}
                      </span>
                    </div>

                    {/* Clean Audio Filter Segmented Controls + Quality/Sort Selectors */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {[
                          { label: 'All Audio', id: 'ALL' },
                          { label: 'Bengali', id: 'BANGLA' },
                          { label: 'Hindi', id: 'HINDI' },
                          { label: 'Dual Audio', id: 'DUAL' },
                          { label: 'Anime / Sub', id: 'SUB' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setAudioFilter(f.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                              audioFilter === f.id
                                ? 'bg-[#dc2626] text-white shadow-[0_0_10px_rgba(220,38,38,0.35)]'
                                : 'bg-[#141414] text-gray-300 hover:text-white border border-white/5'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Compact Quality & Sort Dropdowns */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#141414] border border-white/10 rounded-xl px-2.5 py-1.5">
                          <SlidersHorizontal className="w-3 h-3 text-[#ef4444]" />
                          <select
                            value={qualityFilter}
                            onChange={(e) => setQualityFilter(e.target.value as any)}
                            aria-label="Filter quality"
                            className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none"
                          >
                            <option value="ALL" className="bg-[#121212]">All Quality</option>
                            <option value="4K" className="bg-[#121212]">4K UHD</option>
                            <option value="1080P" className="bg-[#121212]">1080p FHD</option>
                            <option value="WEBDL" className="bg-[#121212]">WEB-DL</option>
                            <option value="HDTC" className="bg-[#121212]">HDTC</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 bg-[#141414] border border-white/10 rounded-xl px-2.5 py-1.5">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            aria-label="Sort order"
                            className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none"
                          >
                            <option value="HOT_HYPE" className="bg-[#121212]">Hot & New</option>
                            <option value="LATEST" className="bg-[#121212]">Latest Upload</option>
                            <option value="RATING" className="bg-[#121212]">Top Rated</option>
                            <option value="VIEWS" className="bg-[#121212]">Most Popular</option>
                            <option value="TITLE" className="bg-[#121212]">A–Z</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {loadingCatalog && (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#101010] text-xs text-gray-300">
                      <Loader2 className="w-4 h-4 animate-spin text-[#ef4444]" />
                      <span>লোড হচ্ছে (Page {currentPage})...</span>
                    </div>
                  )}

                  {/* Sleek Compact Poster Grid (3-Col Mobile / 4-Col SM / 5-Col MD / 6-Col LG) */}
                  {displayedItems.length === 0 ? (
                    <div className="rounded-3xl bg-[#0a0a0a] border border-white/[0.08] p-10 text-center space-y-3">
                      <Film className="w-10 h-10 text-gray-500 mx-auto" />
                      <h3 className="text-base font-bold text-white">কোনো মুভি বা সিরিজ পাওয়া যায়নি</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceFilter('ALL');
                          setAudioFilter('ALL');
                          setQualityFilter('ALL');
                          setYearFilter('ALL');
                          setSubmittedSearch('');
                          setSearchQuery('');
                        }}
                        className="px-5 py-2 rounded-full bg-[#dc2626] text-white text-xs font-extrabold"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                      {displayedItems.map((item) => {
                        const isSaved = isMovieInWatchlist(item);
                        const hasBrokenImg = brokenImages[item.id] || !item.poster;
                        const isJustUploaded = isUploadedWithinMinutes(item.timeAgo);

                        return (
                          <article
                            key={item.path + item.title}
                            onMouseEnter={() => prefetchMovieDetails(item.path, item.title, activeNodeId, true)}
                            onTouchStart={() => prefetchMovieDetails(item.path, item.title, activeNodeId, true)}
                            onClick={() => setSelectedMovie(item)}
                            className="group rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.08] hover:border-[#dc2626]/65 transition-all flex flex-col cursor-pointer shadow-xs"
                          >
                            <div className="relative aspect-[2/3] w-full bg-[#050505] overflow-hidden">
                              {!hasBrokenImg ? (
                                <img
                                  src={item.poster}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  onError={() =>
                                    setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                                  }
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                  <Film className="w-6 h-6 text-[#ef4444] mb-1 opacity-80" />
                                  <span className="text-[10px] font-bold text-gray-300 line-clamp-3">
                                    {item.title}
                                  </span>
                                </div>
                              )}

                              {/* Top-Right Language Tag */}
                              <div className="absolute top-1 right-1 flex flex-col items-end gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[8.5px] sm:text-[9.5px] font-bold text-white border border-white/10">
                                  {formatShortLanguage(item.language)}
                                </span>
                              </div>

                              {/* Top-Left Bookmark */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleWatchlist(item);
                                }}
                                aria-label="Save to list"
                                className={`absolute top-1 left-1 w-5 h-5 rounded-md backdrop-blur-xs flex items-center justify-center transition-colors ${
                                  isSaved
                                    ? 'bg-[#dc2626] text-white'
                                    : 'bg-black/60 text-white/85 hover:text-white'
                                }`}
                              >
                                <Bookmark className={`w-2.5 h-2.5 ${isSaved ? 'fill-current' : ''}`} />
                              </button>

                              {/* Bottom Scrim: Episode/Quality + Star Rating */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-1.5 pt-4 pb-1 flex items-center justify-between gap-1 text-[9px]">
                                <span className="font-bold text-[#ef4444] truncate">
                                  {item.episodePill || item.quality}
                                </span>
                                <span className="text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>{item.rating || '9.0'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="p-1.5 sm:p-2 flex-1 flex flex-col justify-between space-y-0.5">
                              <h3 className="text-[11px] sm:text-xs font-semibold text-gray-100 truncate group-hover:text-[#ef4444] transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex items-center justify-between text-[9.5px] text-gray-400">
                                <span
                                  className={`font-medium truncate ${
                                    isJustUploaded ? 'text-[#ef4444]' : 'text-amber-300/90'
                                  }`}
                                >
                                  {item.timeAgo}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>

              {/* 🏆 TOP 10 THIS WEEK RAIL (Cleanly organized below main grid on Page 1) */}
              {!submittedSearch && currentPage === 1 && (
                <div className="pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#ef4444]" />
                      <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                        TOP 10 THIS WEEK · সেরা ১০ হিট
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(findCat('/mostwatch/7d'))}
                      className="text-xs text-[#ef4444] font-bold flex items-center gap-0.5"
                    >
                      <span>Most Watched</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {top10ThisWeekItems.map((item, idx) => (
                      <div
                        key={item.path + idx}
                        onMouseEnter={() => prefetchMovieDetails(item.path, item.title, activeNodeId, true)}
                        onTouchStart={() => prefetchMovieDetails(item.path, item.title, activeNodeId, true)}
                        onClick={() => setSelectedMovie(item)}
                        className="w-[106px] sm:w-[126px] shrink-0 rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.08] hover:border-[#dc2626]/60 cursor-pointer group flex flex-col transition-all"
                      >
                        <div className="relative aspect-[2/3] w-full bg-[#050505] overflow-hidden">
                          {item.poster && !brokenImages[item.id] ? (
                            <img
                              src={item.poster}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={() =>
                                setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                              }
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-7 h-7 text-gray-600" />
                            </div>
                          )}

                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#dc2626] text-white text-[9px] font-black shadow">
                            #{idx + 1}
                          </span>

                          <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/75 text-[8.5px] font-semibold text-white">
                            {formatShortLanguage(item.language)}
                          </span>

                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pt-3 pb-1 flex items-center justify-between text-[9px]">
                            <span className="font-semibold text-[#ef4444] truncate">
                              {item.episodePill || item.quality}
                            </span>
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <Star className="w-2 h-2 fill-current" />
                              {item.rating || '9.3'}
                            </span>
                          </div>
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          <h3 className="text-[11px] font-semibold text-gray-100 truncate group-hover:text-[#ef4444]">
                            {item.title}
                          </h3>
                          <p className="text-[9.5px] text-amber-300/90 truncate">{item.timeAgo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Static Collections & Upcoming sections removed for clean live feed */}

              {/* Bottom 520-Page Pagination Bar */}
              <div className="rounded-2xl bg-[#0a0a0a] border border-white/[0.08] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#222222] disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: 5 }, (_, idx) => {
                    const start = Math.max(1, Math.min(currentPage - 2, maxPage - 4));
                    const pageNum = start + idx;
                    if (pageNum < 1 || pageNum > maxPage) return null;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-xl text-xs font-bold font-mono tabular-nums transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#dc2626] text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                            : 'bg-[#141414] text-gray-300 hover:bg-[#222222]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= maxPage}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#222222] disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={maxPage}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder={`Page (1-${maxPage})`}
                    className="w-28 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#141414] border border-white/10 text-xs text-white placeholder-gray-400 font-mono tabular-nums focus:outline-none focus:border-[#dc2626]"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-extrabold whitespace-nowrap"
                  >
                    Go
                  </button>
                </form>
              </div>
            </section>
              </>
            )}
          </main>
        )}

        {/* VIEW 2: ALL 55+ CATEGORIES HUB ("Explore Hub") */}
        {activeTab === 'categories' && (
          <main className="px-3.5 sm:px-8 pt-2 space-y-6">
            <div className="rounded-3xl bg-[#0a0a0a] border border-white/[0.08] p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-white">
                    Explore All 55+ Categories & Zones
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    যেকোনো ক্যাটাগরিতে ট্যাপ করে ৫২০+ পেজের সব মুভি ও সিরিজ দেখুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 rounded-full bg-[#dc2626] text-white text-xs font-extrabold"
                >
                  Back Home
                </button>
              </div>

              {(
                [
                  { group: 'zone', title: 'Featured Zones' },
                  { group: 'language', title: 'Languages & Audio Dubs' },
                  { group: 'genre', title: 'Movie & Anime Genres' },
                  { group: 'collection', title: 'Curated Franchises & Collections' },
                ] as const
              ).map((section) => {
                const groupItems = ALL_CATEGORIES.filter((c) => c.group === section.group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={section.group} className="space-y-3">
                    <h2 className="text-sm font-extrabold text-[#ef4444]">{section.title}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {groupItems.map((cat) => (
                        <button
                          key={cat.path}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`min-h-[52px] px-3.5 py-2.5 rounded-2xl text-left transition-colors border flex flex-col justify-center ${
                            currentCategory.path === cat.path
                              ? 'bg-[#7f1d1d]/35 text-white border-[#dc2626]'
                              : 'bg-[#121212] text-gray-200 border-white/5 hover:border-[#dc2626]/50'
                          }`}
                        >
                          <span className="text-xs font-bold truncate">{cat.label}</span>
                          <span className="text-[11px] text-gray-400 truncate mt-0.5">
                            {cat.bnLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {/* VIEW 3: DOWNLOADS & WATCHLIST FOLDERS */}
        {activeTab === 'watchlist' && (
          <main className="px-3.5 sm:px-8 pt-2 space-y-6">
            {/* Saved Watchlist & Custom Folders */}
            <div className="rounded-3xl bg-[#0a0a0a] border border-white/[0.08] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">
                      My List & Saved Downloads ({watchlist.length})
                    </h2>
                    {userSession && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthPanelOpen(true);
                          setActiveTab('me');
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-[#16181e] border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1 hover:border-emerald-400"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>
                          {userSession.isGuest ? userSession.username : `@${userSession.username}`}
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    শুধুমাত্র আপনার ব্যক্তিগত সেভ করা মুভি, অ্যানিমে ও রিজিউম হিস্ট্রি (অন্য কারোর সাথে মিশবে না)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportWatchlist}
                    className="px-3 py-1.5 rounded-full bg-[#141414] border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>Backup</span>
                  </button>

                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportWatchlist}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-[#141414] border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>

              {/* Folder Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {(
                  [
                    { id: 'all', label: `All (${watchlist.length})` },
                    {
                      id: 'favorites',
                      label: `Favorites (${watchlist.filter((m) => (m.folder || 'favorites') === 'favorites').length})`,
                    },
                    {
                      id: 'watch_later',
                      label: `Watch Later (${watchlist.filter((m) => m.folder === 'watch_later').length})`,
                    },
                    {
                      id: 'anime_series',
                      label: `Series & Anime (${watchlist.filter((m) => m.folder === 'anime_series').length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWatchlistFolderTab(tab.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      watchlistFolderTab === tab.id
                        ? 'bg-[#dc2626] text-white'
                        : 'bg-[#141414] text-gray-300'
                    }`}
                  >
                    <FolderHeart className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {filteredWatchlist.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <Bookmark className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-sm text-gray-300 font-medium">No movies saved in this folder yet</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-5 py-2 rounded-full bg-[#dc2626] text-white text-xs font-extrabold"
                  >
                    Discover Movies
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filteredWatchlist.map((item) => {
                    const normItem = normalizeMovieCardItem(item);
                    return (
                      <div
                        key={item.path}
                        onClick={() => setSelectedMovie(normItem)}
                        className="group rounded-xl overflow-hidden bg-[#121212] border border-white/[0.08] cursor-pointer flex flex-col"
                      >
                        <div className="relative aspect-[2/3] w-full bg-[#050505] overflow-hidden">
                          <img
                            src={item.poster}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-semibold text-white">
                            {formatShortLanguage(item.language)}
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {normItem.timeAgo}
                          </span>
                        </div>
                        <div className="p-2">
                          <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                          <p className="text-[10px] text-amber-300 mt-0.5">{normItem.timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Watch History */}
            {continueWatching.length > 0 && (
              <div className="rounded-3xl bg-[#0a0a0a] border border-white/[0.08] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-white">
                    Recent Watch History ({continueWatching.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setContinueWatching([])}
                    className="text-xs text-[#ef4444] flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {continueWatching.map((entry) => {
                    const normMovie = normalizeMovieCardItem(entry.movie);
                    return (
                      <div
                        key={entry.movie.path}
                        onClick={() => setSelectedMovie(normMovie)}
                        className="rounded-xl overflow-hidden bg-[#121212] border border-white/[0.08] cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] w-full">
                          <img
                            src={entry.movie.poster}
                            alt={entry.movie.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 px-2 py-1 text-[10px] text-[#ef4444] font-semibold truncate">
                            {entry.episodeLabel || 'Movie'} · {formatResumeTime(entry.progressSeconds)}
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold text-white truncate">
                            {entry.movie.title}
                          </div>
                          <div className="text-[10px] text-amber-300 mt-0.5">
                            {normMovie.timeAgo}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        )}

        {/* VIEW 4: FULL-SCREEN MOVIEBOX STYLE "ME" PAGE */}
        {activeTab === 'me' && (
          <main className="min-h-screen bg-[#0c0d11] text-white px-3.5 sm:px-6 pt-3 pb-10 max-w-2xl mx-auto space-y-3.5 select-none">
            {/* Top Bar with Account Pill & Scan Icon */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#dc2626] to-[#ef4444] flex items-center justify-center text-white font-black text-sm shadow">
                  {(userSession?.username || 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-white">
                      {userSession?.isGuest
                        ? userSession.username
                        : `@${userSession?.username || 'User'}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      {userSession?.isGuest ? 'Private Guest' : 'Synced Account'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    আপনার ওয়াচলিস্ট ও রিজিউম টাইম সম্পূর্ণ আলাদা সুরক্ষিত
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                aria-label="Scan or Share"
                className="p-1.5 text-gray-200 hover:text-white transition-colors"
              >
                <ScanLine className="w-6 h-6" />
              </button>
            </div>

            {/* Personal Account & Cross-Device Private Sync Card */}
            <div className="rounded-2xl bg-[#16181e] border border-white/[0.06] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00e68a]" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {userSession?.isGuest
                      ? 'আলাদা ইউজার অ্যাকাউন্ট (অন্য ডিভাইসেও নিজের ওয়াচলিস্ট ও রিজিউম পেতে)'
                      : `অ্যাকাউন্ট সক্রিয়: @${userSession?.username}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {userSession?.isGuest ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMessage(null);
                        setAuthPanelOpen((prev) => !prev);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{authPanelOpen ? 'বন্ধ করুন' : 'লগইন / অ্যাকাউন্ট খুলুন'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMessage(null);
                          setAuthPanelOpen((prev) => !prev);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#22252b] hover:bg-[#2a2e36] text-gray-200 text-xs font-bold flex items-center gap-1"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>অন্য অ্যাকাউন্ট</span>
                      </button>
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={handleLogoutToNewGuest}
                        className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-500/30 text-red-200 text-xs font-bold flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>লগআউট</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {authMessage && (
                <div
                  className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                    authMessage.type === 'ok'
                      ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-200'
                      : 'bg-red-950/60 border border-red-500/30 text-red-200'
                  }`}
                >
                  {authMessage.text}
                </div>
              )}

              {authPanelOpen && (
                <form onSubmit={handleAccountAuthSubmit} className="pt-2 border-t border-white/[0.06] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthMessage(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                        authMode === 'register'
                          ? 'bg-[#dc2626] text-white'
                          : 'bg-[#0e1015] text-gray-400'
                      }`}
                    >
                      নতুন অ্যাকাউন্ট খুলুন
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthMessage(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                        authMode === 'login'
                          ? 'bg-[#dc2626] text-white'
                          : 'bg-[#0e1015] text-gray-400'
                      }`}
                    >
                      আগের অ্যাকাউন্টে লগইন
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="আপনার নাম / ইউজারনেম"
                      maxLength={24}
                      className="px-3 py-2 rounded-xl bg-[#0e1015] border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dc2626]"
                    />
                    <input
                      type="password"
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value)}
                      placeholder="গোপন পিন (কমপক্ষে ৪ অক্ষর)"
                      maxLength={24}
                      className="px-3 py-2 rounded-xl bg-[#0e1015] border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#dc2626]"
                    />
                  </div>

                  {authMode === 'register' && (watchlist.length > 0 || continueWatching.length > 0) && (
                    <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authCarryGuestData}
                        onChange={(e) => setAuthCarryGuestData(e.target.checked)}
                        className="accent-[#dc2626]"
                      />
                      <span>এই ব্রাউজারে থাকা বর্তমান গেস্ট ওয়াচলিস্ট নতুন অ্যাকাউন্টে সেভ করুন</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    {authBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : authMode === 'register' ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ব্যক্তিগত অ্যাকাউন্ট তৈরি করুন</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>লগইন করে আমার ওয়াচলিস্ট আনুন</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Clean Essential Card Group: Watch History + My List + Last 24h Updates + App Install */}
            <div className="rounded-2xl bg-[#16181e] overflow-hidden shadow-lg">
              {/* Watch History Section */}
              <div className="pt-4 pb-3.5 space-y-3">
                <div
                  onClick={() => setActiveTab('watchlist')}
                  className="px-4 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-5 h-5 text-gray-300" />
                    <span className="text-[15px] font-bold text-white">Watch History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Horizontal Landscape Watch History Cards */}
                <div className="px-4 flex items-start gap-2.5 overflow-x-auto no-scrollbar">
                  {(continueWatching.length > 0
                    ? continueWatching.map((entry) => ({
                        movie: normalizeMovieCardItem(entry.movie),
                        pct:
                          entry.durationSeconds && entry.progressSeconds
                            ? Math.min(
                                98,
                                Math.max(
                                  14,
                                  Math.round((entry.progressSeconds / entry.durationSeconds) * 100)
                                )
                              )
                            : 42,
                      }))
                    : heroSlides.slice(0, 6).map((m, i) => ({
                        movie: m,
                        pct: [45, 22, 65, 30, 80, 50][i % 6],
                      }))
                  ).map(({ movie, pct }, idx) => {
                    const isSeries =
                      movie.typeBadge === 'SERIES' ||
                      movie.typeBadge === 'DRAMA' ||
                      movie.typeBadge === 'ANIME' ||
                      Boolean(movie.episodePill);
                    const cleanTitle = movie.title
                      .replace(/\s*\(\d{4}\).*$/i, '')
                      .replace(/\s*(?:1080p|720p|480p|4K|WEB-DL|WEBRip|Full HD|HDTC).*$/i, '')
                      .trim();

                    return (
                      <div
                        key={movie.path + idx}
                        onClick={() => setSelectedMovie(movie)}
                        className="w-[128px] sm:w-[144px] shrink-0 cursor-pointer group"
                      >
                        <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0e1015]">
                          {movie.poster ? (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-5 h-5 text-gray-600" />
                            </div>
                          )}

                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-white/90 text-[#0c0d11] flex items-center justify-center shadow">
                            {isSeries ? (
                              <Tv className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <Film className="w-3 h-3 stroke-[2.5]" />
                            )}
                          </div>

                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                            <div
                              className="h-full bg-gradient-to-r from-[#00e68a] to-[#12d6df]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-1.5 text-xs text-gray-300 truncate group-hover:text-white">
                          {cleanTitle || movie.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: My List */}
              <button
                type="button"
                onClick={() => setActiveTab('watchlist')}
                className="w-full px-4 py-4 border-t border-white/[0.04] hover:bg-white/[0.03] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-gray-300" />
                  <span className="text-[15px] font-medium text-gray-100">My List</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span>{watchlist.length}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Row: Last 24 Hours Updates */}
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="w-full px-4 py-4 border-t border-white/[0.04] hover:bg-white/[0.03] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-300" />
                  <span className="text-[15px] font-medium text-gray-100">
                    New Uploads · Last 24h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#e53935] text-white text-xs font-bold tabular-nums">
                    {last24hItems.length}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              {/* Row: Install App & Settings */}
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="w-full px-4 py-4 border-t border-white/[0.04] hover:bg-white/[0.03] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-300" />
                  <span className="text-[15px] font-medium text-gray-100">
                    Install App & TV Setup
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </main>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR WITH ELEVATED CENTER SHORTS/18+ BUTTON */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/[0.08] pb-safe"
      >
        <div className="max-w-xl mx-auto grid grid-cols-5 items-center h-16 px-2">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleSelectCategory(ALL_CATEGORIES[0])}
            className={`flex flex-col items-center justify-center transition-colors ${
              activeTab === 'browse' && currentCategory.path !== '/adult18plus'
                ? 'text-[#ef4444]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Home</span>
          </button>

          {/* 2. Categories Hub (With Red HOT Badge) */}
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`relative flex flex-col items-center justify-center transition-colors ${
              activeTab === 'categories' ? 'text-[#ef4444]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-5 px-1 py-0.2 rounded bg-[#dc2626] text-[8px] font-extrabold text-white leading-tight">
                HOT
              </span>
            </div>
            <span className="text-[11px] font-medium mt-1">Explore</span>
          </button>

          {/* 3. Center Elevated Circular Poster Button ("18+ Hub") */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => handleSelectCategory(findCat('/adult18plus'))}
              className="relative -mt-6 w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#7f1d1d] via-[#dc2626] to-[#ef4444] shadow-[0_6px_20px_rgba(220,38,38,0.45)] flex items-center justify-center transition-transform active:scale-95"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#121212] relative flex items-center justify-center">
                {spotlightItem?.poster && (
                  <img
                    src={spotlightItem.poster}
                    alt="18+ Hub"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-75"
                  />
                )}
                <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#dc2626] text-white flex items-center justify-center shadow">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <span className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-black/90 text-[9px] font-extrabold text-white border border-[#dc2626]/50">
                18+ Hub
              </span>
            </button>
          </div>

          {/* 4. Downloads / Watchlist */}
          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className={`flex flex-col items-center justify-center transition-colors ${
              activeTab === 'watchlist' ? 'text-[#ef4444]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Download className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Downloads</span>
          </button>

          {/* 5. Me (Full-Screen MovieBox Me Page) */}
          <button
            type="button"
            onClick={() => setActiveTab('me')}
            className={`flex flex-col items-center justify-center transition-colors ${
              activeTab === 'me' ? 'text-[#00e68a]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <User className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-[#e53935] absolute -top-0.5 -right-1" />
            </div>
            <span className="text-[11px] font-medium mt-1">Me</span>
          </button>
        </div>
      </nav>

      {/* Lazy-Loaded Modals for Fast Initial Page Load */}
      <Suspense fallback={null}>
        {selectedMovie && (
          <MovieDetailModal
            movie={selectedMovie}
            relatedMovies={displayedItems}
            activeNodeId={activeNodeId}
            savedProgress={selectedMovieProgress}
            isMiniPlayer={isMiniPlayer}
            onToggleMiniPlayer={(mini) => setIsMiniPlayer(mini)}
            onClose={() => {
              setIsMiniPlayer(false);
              setSelectedMovie(null);
            }}
            onSelectMovie={(m) => {
              setIsMiniPlayer(false);
              setSelectedMovie(m);
            }}
            isInWatchlist={isMovieInWatchlist(selectedMovie)}
            currentFolder={getMovieWatchlistFolder(selectedMovie)}
            onToggleWatchlist={handleToggleWatchlist}
            onRecordWatchProgress={handleRecordWatchProgress}
            onSearchByActor={handleTriggerActorSearch}
            onOpenReportModal={(prefillTitle) => {
              setRequestPrefillTitle(prefillTitle);
              setRequestPrefillType('BROKEN_LINK');
              setShowRequestModal(true);
            }}
          />
        )}

        {showRequestModal && (
          <MovieRequestModal
            isOpen={showRequestModal}
            initialTitle={requestPrefillTitle}
            initialType={requestPrefillType}
            activeNodeId={activeNodeId}
            onSelectNode={(nodeId) => setActiveNodeId(nodeId)}
            onClose={() => setShowRequestModal(false)}
            last24hItems={last24hItems}
            liveClockNow={liveClockNow}
            isRefreshing24h={loadingCatalog || refreshing24h}
            onRefresh24h={() => {
              setLiveClockNow(Date.now());
              refreshLatest3SiteUploads(true);
              fetchCatalog(currentCategory.path, 1, '', activeNodeId, true);
            }}
            onSelectMovie={(m) => {
              setIsMiniPlayer(false);
              setSelectedMovie(m);
            }}
            continueWatching={continueWatching}
            onClearWatchHistory={() => setContinueWatching([])}
          />
        )}

        {showInstallModal && (
          <PWAInstallModal
            isOpen={showInstallModal}
            onClose={() => setShowInstallModal(false)}
            isInstallable={isInstallable}
            isInstalled={isInstalled}
            isIOS={isIOS}
            onTriggerInstall={install}
          />
        )}
      </Suspense>
    </div>
  );
}
