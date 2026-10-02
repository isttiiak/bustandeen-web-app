import { Suspense, useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import {
  hasSessionHint,
  loadedFirebase,
  loadFirebase,
  SESSION_MARKER,
  whenFirebaseLoaded,
} from './authClient.js';
import { API_BASE } from './lib/api.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useZikrStore, flushZikrLocalPersistence } from './store/useZikrStore.js';
import { replaySalatOutbox } from './hooks/useSalatLog.js';
import { clearSalatOutbox } from './utils/salatOutbox.js';
import { clearSyncOutbox, replaySyncOutbox } from './utils/syncOutbox.js';
import { setDayStartModeLocal, type DayStartMode } from './utils/trackingDay.js';
import { idbRemove } from './utils/idbCache.js';
import { startPrefsSync, stopPrefsSync } from './utils/prefsSync.js';
import { useUiStore } from './store/useUiStore.js';
import Navbar from './components/Navbar.js';
import Footer from './components/Footer.js';
import UnsavedWarning from './components/UnsavedWarning.js';
import GenderGate from './components/GenderGate.js';
import DemoBanner from './components/DemoBanner.js';
import AnnouncementBanner from './components/AnnouncementBanner.js';
import NaturalLogModal from './components/ai/NaturalLogModal.js';
import type { AuthUser } from './types/api.js';
import { trackPageView } from './utils/analytics.js';
import { safeRedirect } from './utils/safeRedirect.js';
import { isSeoPagePath } from './seo/staticPaths.js';
import AppRoutes from './routes.js';
import { RouteFallback } from './routeGuards.js';

// `body { overflow-x: hidden }` (styles/global.css, added to stop mobile
// horizontal bounce) makes the browser compute `overflow-y: auto` on <body>
// too, per the CSS Overflow spec's visible/non-visible pairing rule. Combined
// with `html, body, #root { height: 100% }` (styles.css), that turns <body>
// itself into the real scrolling box — window/<html> never scroll, so
// `window.scrollTo()` alone is a no-op and the page visibly "keeps" whatever
// scroll position <body> was left at when you navigate back to it (reported:
// coming "back" to Home landed at the bottom). The route-change effect below
// resets `document.body.scrollTop` for this reason. Also disable native
// scroll restoration so nothing else fights that reset on back/forward.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export default function App() {
  const { setUser, init, setAuthLoading } = useAuthStore();
  const hasUser = useAuthStore((s) => !!s.user);
  const { hydrate, resetAll, checkAndResetIfNewDay } = useZikrStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep latest navigate/pathname in refs so the auth subscription below can
  // use them without re-subscribing on every route change. Re-subscribing was
  // forcing a token refresh + a /api/auth/verify roundtrip on EVERY navigation.
  const navigateRef = useRef(navigate);
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    navigateRef.current = navigate;
    pathnameRef.current = location.pathname;
  });

  // The backend now runs as a Vercel function on the SAME deployment — there
  // is no Render cold start to warm up, so the old health-ping + amber
  // "waking up the server" banner are gone.

  // Prefetch the most-visited lazy chunks while the browser is idle, so
  // tapping Salat/Quran/Fasting/Prayer-times never shows the route spinner.
  // Only for someone signed in (or in demo): a visitor who opened one tool
  // from search would download four pages they never open (audit PERF-01).
  useEffect(() => {
    if (!hasUser) return;
    const prefetch = () => {
      void import('./pages/SalatTracker.js');
      void import('./pages/QuranHabit.js');
      void import('./pages/FastingTracker.js');
      void import('./pages/PrayerTimes.js');
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(prefetch, 2500); // Safari has no requestIdleCallback
    return () => clearTimeout(t);
  }, [hasUser]);

  // Daily-reset listeners registered once; route changes also trigger a check below.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        checkAndResetIfNewDay();
        // Taps made just before the phone locked (or the installed app was
        // backgrounded mid full-screen) may not have reached the server, since
        // the keepalive flush at that moment can't refresh an expired token.
        // Retry now that there's a live page and a fresh token available.
        void useZikrStore.getState().flush();
        // A device waking from sleep/lock can leave the network stack briefly
        // unready while this tab's mount-time queries fire — they fail with a
        // connection error (net::ERR_CONNECTION_*), and since
        // refetchOnWindowFocus is off (deliberately — see queryClient config
        // in main.tsx, it was flooding the rate limiter) and the browser's
        // 'online' event doesn't reliably fire for this exact case (the OS
        // often never considers the adapter "disconnected", just briefly
        // unable to route), nothing ever retried them — the dashboard stayed
        // stuck on blank/dash placeholders until a manual reload. Retrying
        // ONLY queries already sitting in an error state (never a blanket
        // invalidate) fixes that without reintroducing the refetch storm
        // refetchOnWindowFocus was disabled for.
        void queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' });
      }
    };
    const onFocus = () => checkAndResetIfNewDay();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkAndResetIfNewDay, queryClient]);

  // Offline sync: zikr taps made while offline stay queued in `pending`
  // (persisted to localStorage, so a reload doesn't lose them either) — this
  // listener replays them the moment the connection comes back, instead of
  // waiting for the user's next tap to trigger a flush. Salat prayer/nafl
  // updates queued in the same window (see useSalatLog.ts) replay here too.
  useEffect(() => {
    const onOnline = () => {
      // Invalidate ONLY after the flush actually resolves — analytics pages
      // (e.g. ZikrAnalytics's "Today" stat) otherwise stay stale until their
      // own staleTime expires, since the default refetchOnReconnect can race
      // ahead of this POST and fetch before the server has the new counts.
      // Previously only ZikrCounter.tsx invalidated on its own flush, which
      // did nothing for whichever OTHER page happened to be open when
      // connectivity came back.
      void useZikrStore
        .getState()
        .flush()
        .then(() => queryClient.invalidateQueries({ queryKey: ['analytics'] }));
      void replaySalatOutbox(queryClient);
      // Fasting, Quran and Rayhanah writes made offline (utils/syncOutbox.ts).
      void replaySyncOutbox(queryClient);
      // Belt-and-suspenders alongside the visibilitychange handler above: if
      // 'online' DID fire but a query's own automatic refetchOnReconnect
      // attempt raced ahead of the network actually being ready and failed
      // again, this catches it — again scoped to error-state queries only.
      void queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' });
    };
    window.addEventListener('online', onOnline);
    // Also try once on mount: a queue can survive a reload while the browser
    // was ALREADY online the whole time (tab closed offline, reopened later
    // with connectivity restored) — no 'online' transition ever fires for that.
    if (navigator.onLine) {
      void replaySalatOutbox(queryClient);
      void replaySyncOutbox(queryClient);
    }
    return () => window.removeEventListener('online', onOnline);
  }, [queryClient]);

  // Tab close / navigation away: any unflushed zikr taps sitting in `pending`
  // would otherwise wait for the debounced localStorage write (400ms) and
  // the next user tap (800ms flush debounce) to reach the server — both of
  // which the page may not survive long enough to see. `pagehide` covers
  // actual unload/navigation; `visibilitychange` also catches the mobile
  // case where the app is backgrounded without a page-lifecycle event.
  useEffect(() => {
    const flushBeforeTeardown = () => {
      flushZikrLocalPersistence();
      void useZikrStore.getState().flush({ keepalive: true });
    };
    const onVisibilityHidden = () => {
      if (document.hidden) flushBeforeTeardown();
    };
    window.addEventListener('pagehide', flushBeforeTeardown);
    document.addEventListener('visibilitychange', onVisibilityHidden);
    return () => {
      window.removeEventListener('pagehide', flushBeforeTeardown);
      document.removeEventListener('visibilitychange', onVisibilityHidden);
    };
  }, []);

  useEffect(() => {
    checkAndResetIfNewDay();
  }, [checkAndResetIfNewDay, location.pathname]);

  // Every route change starts at the TOP of the new page — SPAs keep the old
  // scroll position by default (opening /quran from Home landed mid-page).
  // A #hash target (e.g. /quran#duas after finishing a duʿā) wins instead.
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }
  }, [location.pathname, location.hash]);

  // Google Analytics 4: one redacted SPA page view per route change. Private
  // areas are never reported and query strings never leave (utils/analytics.ts).
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    init();
    const theme = localStorage.getItem('bustandeen_theme') || 'bustandeen';
    document.documentElement.setAttribute('data-theme', theme);

    const onUser = async (u: User | null) => {
      if (useAuthStore.getState().isDemoMode) return;
      if (!u) {
        localStorage.removeItem(SESSION_MARKER);
        setUser(null);
        stopPrefsSync();
        resetAll();
        // resetAll() only queues a debounced (400ms) localStorage write —
        // force it through immediately so a fast re-sign-in on the same
        // device can't hydrate against the outgoing account's stale blob.
        flushZikrLocalPersistence();
        clearSalatOutbox();
        clearSyncOutbox();
        localStorage.removeItem('bustandeen_user');
        localStorage.removeItem('bustandeen_idToken');
        // The persisted React Query cache holds personal stats (incl. cycle
        // data) — never leave it behind after sign-out on a shared device.
        queryClient.clear();
        void idbRemove('bustandeen_rq_cache');
        setAuthLoading(false);
        return;
      }

      // Render the app IMMEDIATELY from Firebase's local session — never make
      // the user wait on our backend (Render free tier can take ~60s to wake).
      // Prefer the richer cached copy (DB displayName/photo) for the same account.
      const optimistic: AuthUser = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoUrl: u.photoURL ?? null,
        emailVerified: u.emailVerified,
      };
      try {
        const cached = JSON.parse(
          localStorage.getItem('bustandeen_user') ?? 'null'
        ) as AuthUser | null;
        if (cached?.uid === u.uid) {
          optimistic.displayName = cached.displayName ?? optimistic.displayName;
          optimistic.photoUrl = cached.photoUrl ?? optimistic.photoUrl;
          // gender lives only in our DB, never in Firebase's own user object —
          // without this, every reload's optimistic rebuild dropped it for the
          // brief window before the background /api/auth/verify sync restored
          // it, flashing the GenderGate banner on an account that already has
          // a gender set.
          optimistic.gender = cached.gender ?? optimistic.gender;
          // Same reasoning as gender above — a returning admin's nav link
          // shouldn't flicker away and back while /api/auth/verify round-trips.
          optimistic.isAdmin = cached.isAdmin ?? optimistic.isAdmin;
        }
      } catch {
        /* corrupt cache — Firebase values are fine */
      }
      localStorage.setItem(SESSION_MARKER, '1');
      setUser(optimistic);
      setAuthLoading(false);

      // Only navigate away from /login or /signup once the email is verified.
      // Unverified email/password accounts stay on /signup so the verification screen shows.
      if (['/login', '/signup'].includes(pathnameRef.current) && u.emailVerified) {
        const redirect = sessionStorage.getItem('bustandeen_redirect');
        sessionStorage.removeItem('bustandeen_redirect');
        navigateRef.current(safeRedirect(redirect), { replace: true });
      }

      // Everything below is a BACKGROUND sync — it must never gate rendering.
      void (async () => {
        try {
          const idToken = await u.getIdToken();
          localStorage.setItem('bustandeen_idToken', idToken);
          const pendingGender = sessionStorage.getItem('bustandeen_pending_gender');
          if (pendingGender) sessionStorage.removeItem('bustandeen_pending_gender');
          const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ idToken, ...(pendingGender ? { gender: pendingGender } : {}) }),
          });

          if (!verifyRes.ok) {
            const errorText = await verifyRes.text();
            console.error('Verify failed:', { status: verifyRes.status, body: errorText });
            // Only sign out on genuine auth failures — not rate limits (429) or server errors (5xx)
            if (verifyRes.status === 401 || verifyRes.status === 403) {
              if (errorText.includes('account_disabled')) {
                toast.error(
                  'This account has been disabled. Contact ansar@bustandeen.com if this seems wrong.',
                  { duration: 8000 }
                );
              }
              await loadedFirebase()?.auth.signOut();
              return;
            }
            console.warn(`Verify returned ${verifyRes.status} — keeping session alive`);
          } else {
            // Reconcile with the DB profile (user may have edited name/photo there)
            try {
              const verifyData = (await verifyRes.json()) as {
                user?: {
                  displayName?: string;
                  photoUrl?: string;
                  gender?: AuthUser['gender'];
                  hijriOffset?: number;
                  dayStartMode?: DayStartMode;
                };
                isAdmin?: boolean;
              };
              const authUser: AuthUser = {
                ...optimistic,
                displayName: verifyData?.user?.displayName || optimistic.displayName,
                photoUrl: verifyData?.user?.photoUrl || optimistic.photoUrl,
                gender: verifyData?.user?.gender ?? optimistic.gender,
                isAdmin: verifyData?.isAdmin ?? optimistic.isAdmin,
              };
              localStorage.setItem('bustandeen_user', JSON.stringify(authUser));
              setUser(authUser);
              // Sync hijri offset from server → localStorage
              if (verifyData?.user?.hijriOffset !== undefined) {
                localStorage.setItem(
                  'bustandeen_hijri_offset',
                  String(verifyData.user.hijriOffset)
                );
              }
              // Sync day-start mode from server → localStorage
              if (verifyData?.user?.dayStartMode !== undefined) {
                setDayStartModeLocal(verifyData.user.dayStartMode);
              }
            } catch {
              /* ignore parse error — optimistic values stand */
            }
          }

          // Bring this account's settings (font, reciter, sounds, prayer method…)
          // over from its other devices; non-blocking and never throws.
          void startPrefsSync(u.uid);

          try {
            await hydrate();
          } catch {
            /* hydrate errors are non-fatal */
          }
          // Push any counts made while signed out — the guest dialog promises
          // "Sign in to save", so save immediately rather than on the next tap.
          try {
            await useZikrStore.getState().flush();
          } catch {
            /* retried on next tap */
          }
        } catch (err) {
          console.error('Auth background sync error:', err);
        }
      })();
    };

    // Firebase loads lazily (authClient.ts): at once when someone has signed
    // in on this device, otherwise only when a sign-in page loads it. Until
    // then a visitor is a guest, exactly as Firebase would report.
    let alive = true;
    let unsub: (() => void) | undefined;
    whenFirebaseLoaded(({ auth, onAuthStateChanged }) => {
      if (alive) unsub = onAuthStateChanged(auth, onUser);
    });
    if (hasSessionHint()) void loadFirebase();
    else if (!loadedFirebase()) void onUser(null);

    return () => {
      alive = false;
      unsub?.();
    };
    // Subscribe exactly once — navigation is handled via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [setUser, init, resetAll, hydrate, setAuthLoading]);

  const { authLoading, aiEnabled, isDemoMode } = useAuthStore();
  // Bumped when a sign-in sync changed settings, so screens re-read them.
  const prefsRevision = useUiStore((s) => s.prefsRevision);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const isAuthPage = ['/login', '/signup', '/auth/action'].includes(location.pathname);
  // Programmatic-SEO static pages (src/seo/) ship their own self-contained
  // header/breadcrumb/footer (see src/seo/components/Layout.tsx) — the app
  // shell's Navbar/Footer would otherwise double up on top of it once
  // client-side routing takes over from the pre-rendered HTML. Deliberately
  // excludes the bare `/prayer-times` and `/qibla` paths (the live, on-device
  // tracker pages), which keep the normal app chrome.
  const isSeoPage = isSeoPagePath(location.pathname);
  // The admin panel (AdminProtected, above) has its OWN chrome — AdminLayout
  // — and must never render underneath the main app's Navbar/Footer/
  // DemoBanner/GenderGate. This is the actual fix for a real incident: the
  // main Navbar used to render on top of /admin pages too, and its "Home"
  // logo went to "/" — RootRoute below, which shows whichever REGULAR app
  // account happens to be cached in this browser, nothing to do with which
  // admin is signed into the panel. An admin clicking what looked like
  // "Home" landed on a different person's dashboard. Full isolation (this
  // gating, plus AdminGate's own separate Firebase app) closes that gap.
  const isAdminPage = location.pathname.startsWith('/admin');
  const noFooterPrefixes = [
    '/zikr',
    '/salat',
    '/fasting',
    '/prayer-times',
    '/qibla',
    '/quran',
    '/friends',
  ];
  const showFooter =
    !isAuthPage &&
    !isSeoPage &&
    !isAdminPage &&
    !noFooterPrefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* Single app-wide toaster — pages must not mount their own */}
      <Toaster />
      {authLoading && !isAdminPage ? (
        <div className="flex-1 grid place-items-center bg-brand-void">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
            <div className="text-sm text-white/50">Preparing your session…</div>
          </div>
        </div>
      ) : (
        <>
          {!isSeoPage && !isAdminPage && <AnnouncementBanner />}
          {!isSeoPage && !isAdminPage && <DemoBanner />}
          {!isAuthPage && !isSeoPage && !isAdminPage && <Navbar />}
          {!isAuthPage && !isSeoPage && !isAdminPage && <UnsavedWarning />}
          {!isAuthPage && !isSeoPage && !isAdminPage && <GenderGate />}
          <div className="flex-1">
            <Suspense fallback={<RouteFallback />}>
              <AppRoutes revision={prefsRevision} />
            </Suspense>
            {/* Floating ✨ quick-log button — visible on app pages except /naseeh (it has its own) and the zikr counter */}
            {aiEnabled &&
              !isDemoMode &&
              !isAdminPage &&
              !isSeoPage &&
              !isAuthPage &&
              location.pathname !== '/naseeh' &&
              // The zikr counter is a tap-anywhere surface; a floating button in the
              // corner would get hit by accident mid-count.
              location.pathname !== '/zikr' && (
                <>
                  <button
                    onClick={() => setQuickLogOpen(true)}
                    aria-label="Quick log with a sentence"
                    className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-brand-emerald shadow-lg shadow-brand-emerald/30 flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-transform"
                  >
                    ✨
                  </button>
                  {quickLogOpen && <NaturalLogModal onClose={() => setQuickLogOpen(false)} />}
                </>
              )}
          </div>
          {showFooter && <Footer />}
        </>
      )}
    </div>
  );
}
