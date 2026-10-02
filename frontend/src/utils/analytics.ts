// Google Analytics 4, privacy-first.
//
// GA only ever sees a REDACTED location:
//   - private areas (cycle, friend invites, sadaqah flows, admin, auth links,
//     Musafir, Naseeh, personal settings/profile) are never reported. No
//     page_view is sent, and GA's automatic events (e.g. scroll) that still
//     fire there carry the placeholder "/private" instead of the real URL;
//   - dynamic app segments are collapsed to the route pattern
//     (/quran/read/36 → /quran/read/:surah, /admin/users/abc → excluded);
//   - query strings and #hashes are always dropped (auth links carry
//     one-time codes such as ?oobCode=…);
//   - the page title sent is the redacted path, never document.title: on an
//     SPA route change the old page's title is still showing when the view
//     is reported (it would label /zikr with the Rayhanah page's title).
// Public, prerendered content pages (/prayer-times/dhaka-bangladesh, duʿās,
// adhkār…) keep their real path; it is public content, not user data.
//
// The loader lives here (not in index.html) so the redacted page_location is
// set in the very first `config` call, before gtag.js has loaded and before
// any automatic event can read the real URL.

type Gtag = (...args: unknown[]) => void;

interface GaWindow {
  dataLayer?: unknown[];
  gtag?: Gtag;
}

const PRIVATE_PATH = '/private';

/** Path prefixes that must never reach analytics. A prefix matches the path
 * itself and anything below it (`/cycle` matches `/cycle/analytics`). */
const PRIVATE_PREFIXES = [
  '/cycle',
  '/connect',
  '/sadaqah/donate',
  '/sadaqah/thank-you',
  '/sadaqah/verify',
  '/admin',
  '/auth',
  '/musafir',
  '/naseeh',
  '/profile',
  '/settings',
  '/friends',
];

/** Dynamic app segments collapsed to their route pattern. */
const PATTERNS: Array<[RegExp, string]> = [[/^\/quran\/read\/[^/]+$/, '/quran/read/:surah']];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/');
}

function normalize(pathname: string): string {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return trimmed.toLowerCase() || '/';
}

/** What analytics may see for a pathname: `null` = private, never report. */
export function analyticsPath(pathname: string): string | null {
  const path = normalize(pathname);
  if (PRIVATE_PREFIXES.some((p) => matchesPrefix(path, p))) return null;
  for (const [re, pattern] of PATTERNS) {
    if (re.test(path)) return pattern;
  }
  return path;
}

function measurementId(): string | null {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

function locationFor(path: string | null): string {
  return window.location.origin + (path ?? PRIVATE_PATH);
}

/** document.referrer, made safe: one of our own pages is redacted like any
 * other path; an external site is reduced to its origin (a search engine or
 * social site is useful to know, the exact page someone came from is not). */
function safeReferrer(): string {
  try {
    if (!document.referrer) return '';
    const ref = new URL(document.referrer);
    if (ref.origin === window.location.origin) return locationFor(analyticsPath(ref.pathname));
    return ref.origin + '/';
  } catch {
    return '';
  }
}

function gtag(): Gtag | null {
  return (window as unknown as GaWindow).gtag ?? null;
}

/** Loads gtag.js once. No-op when VITE_GA_MEASUREMENT_ID is unset (local dev,
 * previews) or the page is being prerendered. */
export function initAnalytics(): void {
  const id = measurementId();
  if (!id || typeof document === 'undefined') return;
  const w = window as unknown as GaWindow;
  if (w.gtag) return;

  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtagShim() {
    // gtag.js reads the `arguments` object itself, not an array.
    // eslint-disable-next-line prefer-rest-params -- gtag.js requires the arguments object
    w.dataLayer!.push(arguments);
  };
  const path = analyticsPath(window.location.pathname);
  w.gtag('js', new Date());
  // cookie_domain is pinned to the exact host: `vercel.app` is on the Public
  // Suffix List, so GA's default `auto` tries to write the _ga cookie to
  // `.vercel.app` and every browser rejects it ("invalid domain").
  w.gtag('config', id, {
    send_page_view: false,
    anonymize_ip: true,
    cookie_domain: window.location.hostname,
    page_location: locationFor(path),
    page_referrer: safeReferrer(),
    page_title: path ?? PRIVATE_PATH,
  });

  // gtag.js itself (about 170 KB) waits for the first interaction or for the
  // browser to go idle (audit PERF-01), so it never competes with the page's
  // own first paint. Everything sent before then waits in dataLayer.
  whenIdleOrInteracting(() => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
  });
}

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/** Runs `fn` once: on the first tap, key or scroll, or once the page has
 * loaded and the browser is idle (at most ~4 s after load). */
export function whenIdleOrInteracting(fn: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, run));
    fn();
  };
  INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, run, { once: true, passive: true }));
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  const afterLoad = () =>
    w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 4000);
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
}

/** Reports one SPA page view (redacted), or nothing for a private page. Also
 * re-points GA's automatic events at the redacted location, so they never
 * carry the real URL of a private page either. */
export function trackPageView(pathname: string): void {
  const g = gtag();
  if (!g) return;
  const path = analyticsPath(pathname);
  const pageLocation = locationFor(path);
  const pageTitle = path ?? PRIVATE_PATH;
  g('set', { page_location: pageLocation, page_title: pageTitle });
  if (!path) return;
  g('event', 'page_view', {
    page_path: path,
    page_location: pageLocation,
    page_title: pageTitle,
  });
}
