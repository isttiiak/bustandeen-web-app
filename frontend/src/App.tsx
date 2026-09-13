import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { auth } from './firebase.js';
import { API_BASE } from './lib/api.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useZikrStore, flushZikrLocalPersistence } from './store/useZikrStore.js';
import { replaySalatOutbox } from './hooks/useSalatLog.js';
import { clearSalatOutbox } from './utils/salatOutbox.js';
import { setDayStartModeLocal, type DayStartMode } from './utils/trackingDay.js';
import { idbRemove } from './utils/idbCache.js';
import Navbar from './components/Navbar.js';
import AdminGate from './components/AdminGate.js';
import Home from './pages/Home.js';
import ZikrCounter from './pages/ZikrCounter.js';
import Footer from './components/Footer.js';
import NotFound from './pages/NotFound.js';
import UnsavedWarning from './components/UnsavedWarning.js';
import GenderGate from './components/GenderGate.js';
import DemoBanner from './components/DemoBanner.js';
import type { AuthUser } from './types/api.js';

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

// Route-level code splitting — keeps each tracker's page weight off the shell
// and Profile/Settings are large; keep them out of the initial bundle.
const ZikrAnalytics = lazy(() => import('./pages/ZikrAnalytics.js'));
const Settings = lazy(() => import('./pages/Settings.js'));
const AuthSignIn = lazy(() => import('./pages/AuthSignIn.js'));
const AuthSignUp = lazy(() => import('./pages/AuthSignUp.js'));
const AuthAction = lazy(() => import('./pages/AuthAction.js'));
const Profile = lazy(() => import('./pages/Profile.js'));
const SalatTracker = lazy(() => import('./pages/SalatTracker.js'));
const SalatAnalytics = lazy(() => import('./pages/SalatAnalytics.js'));
const FastingTracker = lazy(() => import('./pages/FastingTracker.js'));
const FastingAnalytics = lazy(() => import('./pages/FastingAnalytics.js'));
const PrayerTimes = lazy(() => import('./pages/PrayerTimes.js'));
const QiblaCompass = lazy(() => import('./pages/QiblaCompass.js'));
const QuranHabit = lazy(() => import('./pages/QuranHabit.js'));
const IslamicSpecialDay = lazy(() => import('./pages/IslamicSpecialDay.js'));
const Friends = lazy(() => import('./pages/Friends.js'));
const ConnectFriend = lazy(() => import('./pages/ConnectFriend.js'));
const About = lazy(() => import('./pages/About.js'));
const Privacy = lazy(() => import('./pages/Privacy.js'));
const Feedback = lazy(() => import('./pages/Feedback.js'));
const Contact = lazy(() => import('./pages/Contact.js'));
const RayhanahCycle = lazy(() => import('./pages/RayhanahCycle.js'));
const RamadanTracker = lazy(() => import('./pages/RamadanTracker.js'));
const RamadanAnalytics = lazy(() => import('./pages/RamadanAnalytics.js'));
const CycleAnalytics = lazy(() => import('./pages/CycleAnalytics.js'));
const QuranKhatam = lazy(() => import('./pages/QuranKhatam.js'));
const QuranBrowse = lazy(() => import('./pages/QuranBrowse.js'));
const QuranListen = lazy(() => import('./pages/QuranListen.js'));
const QuranAnalytics = lazy(() => import('./pages/QuranAnalytics.js'));
const QuranReader = lazy(() => import('./pages/QuranReader.js'));
const QuranBookmarks = lazy(() => import('./pages/QuranBookmarks.js'));
const QuranHifz = lazy(() => import('./pages/QuranHifz.js'));
const Landing = lazy(() => import('./pages/Landing.js'));
const Sadaqah = lazy(() => import('./pages/Sadaqah.js'));
const SadaqahDonate = lazy(() => import('./pages/SadaqahDonate.js'));
const SadaqahThankYou = lazy(() => import('./pages/SadaqahThankYou.js'));
const AdminSadaqah = lazy(() => import('./pages/AdminSadaqah.js'));
const AdminZikrRequests = lazy(() => import('./pages/AdminZikrRequests.js'));

// Programmatic-SEO static pages (prayer-times/qibla/ramadan-calendar by
// city, du'a library, adhkar, Hijri converter) — pre-rendered at build time
// by scripts/prerender.mjs; these lazy wrappers let React Router take over
// in-app navigation once the client bundle loads. One shared chunk (same
// import specifier) reused across every language-prefixed route below.
const SeoPrayerTimesCity = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.PrayerTimesCityRoute }))
);
const SeoQiblaCity = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.QiblaCityRoute }))
);
const SeoRamadanCalendar = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.RamadanCalendarRoute }))
);
const SeoDuaSituation = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.DuaSituationRoute }))
);
const SeoDuasIndex = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.DuasIndexRoute }))
);
const SeoAdhkarMorning = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.AdhkarMorningRoute }))
);
const SeoAdhkarEvening = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.AdhkarEveningRoute }))
);
const SeoHijriConverter = lazy(() =>
  import('./seo/routes/ClientRoutes.js').then((m) => ({ default: m.HijriConverterRoute }))
);

/**
 * Post-sign-in redirects are read back out of sessionStorage, so they must be
 * treated as untrusted before being handed to navigate().
 *
 * Everything we WRITE is internal (location.pathname, '/zikr', `/connect/:code`
 * …), but sessionStorage is writable by anything running on the origin, and
 * react-router ≤7.17 has an open-redirect where a BACKSLASH slips past a naive
 * "starts with /" check (CVE-2025-68470 bypass, GHSA-wrjc-x8rr-h8h6). Requiring
 * a single leading slash followed by a character that is neither / nor \ closes
 * `//evil.com`, `/\evil.com` and `\\evil.com` at our own choke point — which
 * holds whichever router version is installed.
 */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!/^\/(?![/\\])/.test(raw)) return '/';
  return raw;
}

function RouteFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center bg-brand-void">
      <span className="loading loading-spinner loading-lg text-brand-emerald" />
    </div>
  );
}

function VerifyEmailGate({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (resending || !auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: 'https://bustandeen.com/auth/action',
        handleCodeInApp: true,
      });
      setResent(true);
    } catch {
      /* non-fatal */
    }
    setResending(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="text-6xl">📧</div>
        <h2 className="text-2xl font-black text-white">
          {t('app.verifyEmailTitle', 'Verify your email')}
        </h2>
        <p className="text-white/50 text-sm leading-relaxed">
          {t('app.verifyEmailSentTo', 'A verification link was sent to')}{' '}
          <span className="text-brand-emerald font-medium">{email}</span>.{' '}
          {t(
            'app.verifyEmailCheckInbox',
            'Check your inbox (and spam folder) and click the link to unlock this page.'
          )}
        </p>
        {resent ? (
          <p className="text-brand-emerald text-sm font-medium">
            {t('app.verifyEmailResent', 'Email resent! Check your inbox.')}
          </p>
        ) : (
          <button
            className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
            onClick={() => void resend()}
            disabled={resending}
          >
            {resending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('app.resendVerification', 'Resend verification email')
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** "/" shows the marketing landing to guests and the app home to users. */
const RootRoute = () => {
  const { user, authLoading } = useAuthStore();
  if (user) return <Home />;
  if (authLoading) return <RouteFallback />;
  return (
    <Suspense fallback={<RouteFallback />}>
      <Landing />
    </Suspense>
  );
};

interface ProtectedProps {
  children: React.ReactNode;
}

const Protected = ({ children }: ProtectedProps) => {
  const { t } = useTranslation();
  const { user, authLoading } = useAuthStore();
  const location = useLocation();
  const nav = useNavigate();
  const hadSession = !!localStorage.getItem('bustandeen_idToken');
  const [grace, setGrace] = useState(hadSession && !user);
  useEffect(() => {
    if (user) {
      setGrace(false);
      return;
    }
    if (!grace) return;
    // A returning user whose cached idToken has expired needs Firebase to
    // silently refresh it over the network before onAuthStateChanged confirms
    // them — on a slow/high-latency connection (e.g. freshly relocated,
    // patchy wifi) that can take noticeably longer than a couple of seconds.
    // Too short a grace window here was flashing "Sign in required" at
    // legitimate users mid-refresh. 6s trades a slightly longer spinner for
    // not kicking a signed-in user back to the login screen.
    const t = setTimeout(() => setGrace(false), 6000);
    return () => clearTimeout(t);
  }, [user, grace]);
  // Hooks above must run unconditionally on every render (react-hooks/rules-of-hooks) —
  // these early returns come after.
  if (authLoading) return null;
  if (grace) return <RouteFallback />;
  if (!user) {
    const redirectTarget = location.pathname + location.search;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🔐</div>
          <h2 className="text-2xl font-black text-white">
            {t('app.signInRequired', 'Sign in required')}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {t(
              'app.signInRequiredDesc',
              'This page is only available to signed-in users. Create a free account to track your progress and access analytics.'
            )}
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 w-full"
              onClick={() => {
                sessionStorage.setItem('bustandeen_redirect', redirectTarget);
                nav('/login');
              }}
            >
              {t('app.signIn', 'Sign In')}
            </button>
            <button
              className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
              onClick={() => {
                sessionStorage.setItem('bustandeen_redirect', redirectTarget);
                nav('/signup');
              }}
            >
              {t('app.createFreeAccount', 'Create Free Account')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (user.emailVerified === false) {
    return <VerifyEmailGate email={user.email} />;
  }
  return <>{children}</>;
};

/** Admin-only pages: sign-in/verification handled by Protected, then a
 * signed-in non-admin gets NotFound rather than a "forbidden" message —
 * consistent with this app not advertising admin/internal routes elsewhere
 * (the bot-only /connect preview, noindex on it in vercel.json). */
const AdminProtected = ({ children }: ProtectedProps) => {
  const { user } = useAuthStore();
  return <Protected>{user?.isAdmin ? <AdminGate>{children}</AdminGate> : <NotFound />}</Protected>;
};

export default function App() {
  const { setUser, init, setAuthLoading } = useAuthStore();
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
  useEffect(() => {
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
  }, []);

  // Daily-reset listeners registered once; route changes also trigger a check below.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        checkAndResetIfNewDay();
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
    if (navigator.onLine) void replaySalatOutbox(queryClient);
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

  // Google Analytics 4: SPA page views (the gtag loader in index.html sets
  // send_page_view=false, so each route change is reported exactly once here)
  useEffect(() => {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      __BUSTANDEEN_GA_ID?: string;
    };
    if (w.gtag && w.__BUSTANDEEN_GA_ID) {
      w.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    init();
    const theme = localStorage.getItem('bustandeen_theme') || 'bustandeen';
    document.documentElement.setAttribute('data-theme', theme);

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (useAuthStore.getState().isDemoMode) return;
      if (!u) {
        setUser(null);
        resetAll();
        // resetAll() only queues a debounced (400ms) localStorage write —
        // force it through immediately so a fast re-sign-in on the same
        // device can't hydrate against the outgoing account's stale blob.
        flushZikrLocalPersistence();
        clearSalatOutbox();
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
              await auth.signOut();
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
    });

    return () => unsub();
    // Subscribe exactly once — navigation is handled via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [setUser, init, resetAll, hydrate, setAuthLoading]);

  const { authLoading } = useAuthStore();
  const isAuthPage = ['/login', '/signup', '/auth/action'].includes(location.pathname);
  // Programmatic-SEO static pages (src/seo/) ship their own self-contained
  // header/breadcrumb/footer (see src/seo/components/Layout.tsx) — the app
  // shell's Navbar/Footer would otherwise double up on top of it once
  // client-side routing takes over from the pre-rendered HTML. Deliberately
  // excludes the bare `/prayer-times` and `/qibla` paths (the live, on-device
  // tracker pages), which keep the normal app chrome.
  const isSeoPage =
    /^\/(bn\/|ar\/)?(prayer-times\/|qibla\/|ramadan-calendar\/|duas(\/|$)|adhkar\/|hijri-date-converter)/.test(
      location.pathname
    );
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
    !noFooterPrefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* Single app-wide toaster — pages must not mount their own */}
      <Toaster />
      {authLoading ? (
        <div className="flex-1 grid place-items-center bg-brand-void">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
            <div className="text-sm text-white/50">Preparing your session…</div>
          </div>
        </div>
      ) : (
        <>
          {!isSeoPage && <DemoBanner />}
          {!isAuthPage && !isSeoPage && <Navbar />}
          {!isAuthPage && !isSeoPage && <UnsavedWarning />}
          {!isAuthPage && !isSeoPage && <GenderGate />}
          <div className="flex-1">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/zikr" element={<ZikrCounter />} />
                <Route path="/salat" element={<SalatTracker />} />
                <Route
                  path="/salat/analytics"
                  element={
                    <Protected>
                      <SalatAnalytics />
                    </Protected>
                  }
                />
                <Route path="/fasting" element={<FastingTracker />} />
                <Route
                  path="/fasting/analytics"
                  element={
                    <Protected>
                      <FastingAnalytics />
                    </Protected>
                  }
                />
                <Route path="/prayer-times" element={<PrayerTimes />} />
                <Route path="/qibla" element={<QiblaCompass />} />

                {/* Programmatic-SEO static pages — pre-rendered by
                    scripts/prerender.mjs, React Router takes over from here
                    once the client bundle loads. See TODO-v3.md. */}
                <Route path="/prayer-times/:city" element={<SeoPrayerTimesCity lang="en" />} />
                <Route path="/bn/prayer-times/:city" element={<SeoPrayerTimesCity lang="bn" />} />
                <Route path="/ar/prayer-times/:city" element={<SeoPrayerTimesCity lang="ar" />} />
                <Route path="/qibla/:city" element={<SeoQiblaCity lang="en" />} />
                <Route path="/bn/qibla/:city" element={<SeoQiblaCity lang="bn" />} />
                <Route path="/ar/qibla/:city" element={<SeoQiblaCity lang="ar" />} />
                <Route
                  path="/ramadan-calendar/:city/:year"
                  element={<SeoRamadanCalendar lang="en" />}
                />
                <Route
                  path="/bn/ramadan-calendar/:city/:year"
                  element={<SeoRamadanCalendar lang="bn" />}
                />
                <Route
                  path="/ar/ramadan-calendar/:city/:year"
                  element={<SeoRamadanCalendar lang="ar" />}
                />
                <Route path="/duas" element={<SeoDuasIndex lang="en" />} />
                <Route path="/bn/duas" element={<SeoDuasIndex lang="bn" />} />
                <Route path="/ar/duas" element={<SeoDuasIndex lang="ar" />} />
                <Route path="/duas/:situation" element={<SeoDuaSituation lang="en" />} />
                <Route path="/bn/duas/:situation" element={<SeoDuaSituation lang="bn" />} />
                <Route path="/ar/duas/:situation" element={<SeoDuaSituation lang="ar" />} />
                <Route path="/adhkar/morning" element={<SeoAdhkarMorning lang="en" />} />
                <Route path="/bn/adhkar/morning" element={<SeoAdhkarMorning lang="bn" />} />
                <Route path="/ar/adhkar/morning" element={<SeoAdhkarMorning lang="ar" />} />
                <Route path="/adhkar/evening" element={<SeoAdhkarEvening lang="en" />} />
                <Route path="/bn/adhkar/evening" element={<SeoAdhkarEvening lang="bn" />} />
                <Route path="/ar/adhkar/evening" element={<SeoAdhkarEvening lang="ar" />} />
                <Route path="/hijri-date-converter" element={<SeoHijriConverter lang="en" />} />
                <Route path="/bn/hijri-date-converter" element={<SeoHijriConverter lang="bn" />} />
                <Route path="/ar/hijri-date-converter" element={<SeoHijriConverter lang="ar" />} />
                <Route
                  path="/quran"
                  element={
                    <Protected>
                      <QuranHabit />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/khatam"
                  element={
                    <Protected>
                      <QuranKhatam />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/browse"
                  element={
                    <Protected>
                      <QuranBrowse />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/listen"
                  element={
                    <Protected>
                      <QuranListen />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/analytics"
                  element={
                    <Protected>
                      <QuranAnalytics />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/bookmarks"
                  element={
                    <Protected>
                      <QuranBookmarks />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/hifz"
                  element={
                    <Protected>
                      <QuranHifz />
                    </Protected>
                  }
                />
                <Route
                  path="/quran/read/:surah"
                  element={
                    <Protected>
                      <QuranReader />
                    </Protected>
                  }
                />
                <Route
                  path="/zikr/analytics"
                  element={
                    <Protected>
                      <ZikrAnalytics />
                    </Protected>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Protected>
                      <Settings />
                    </Protected>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Protected>
                      <Profile />
                    </Protected>
                  }
                />
                <Route path="/special-day/:id" element={<IslamicSpecialDay />} />
                <Route
                  path="/friends"
                  element={
                    <Protected>
                      <Friends />
                    </Protected>
                  }
                />
                <Route
                  path="/cycle"
                  element={
                    <Protected>
                      <RayhanahCycle />
                    </Protected>
                  }
                />
                <Route
                  path="/ramadan"
                  element={
                    <Protected>
                      <RamadanTracker />
                    </Protected>
                  }
                />
                <Route
                  path="/ramadan/analytics"
                  element={
                    <Protected>
                      <RamadanAnalytics />
                    </Protected>
                  }
                />
                <Route
                  path="/cycle/analytics"
                  element={
                    <Protected>
                      <CycleAnalytics />
                    </Protected>
                  }
                />
                {/* Public: handles guests itself (sign-in gate that returns here) */}
                <Route path="/connect/:code" element={<ConnectFriend />} />
                {/* Public: guests can donate too, so these are unwrapped */}
                <Route path="/sadaqah" element={<Sadaqah />} />
                <Route path="/sadaqah/donate" element={<SadaqahDonate />} />
                <Route path="/sadaqah/thank-you" element={<SadaqahThankYou />} />
                <Route
                  path="/admin/sadaqah"
                  element={
                    <AdminProtected>
                      <AdminSadaqah />
                    </AdminProtected>
                  }
                />
                <Route
                  path="/admin/zikr-requests"
                  element={
                    <AdminProtected>
                      <AdminZikrRequests />
                    </AdminProtected>
                  }
                />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<AuthSignIn />} />
                <Route path="/signup" element={<AuthSignUp />} />
                <Route path="/auth/action" element={<AuthAction />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          {showFooter && <Footer />}
        </>
      )}
    </div>
  );
}
