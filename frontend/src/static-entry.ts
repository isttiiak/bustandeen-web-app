// Entry script of every prerendered page (audit PERF-01): the landing (`/`,
// `/bn`) and the SEO pages. scripts/prerender.mjs puts this in place of the
// app's own entry (main.tsx), so a first-time visitor from search no longer
// downloads and runs the whole app (about 520 KB of compressed JavaScript)
// just to read a prayer timetable or the landing page.
//
// - Signed in (index.html's inline script set `has-session`) on the landing:
//   load the app at once; the prerendered landing is already hidden.
// - Any other path, or HTML that is not this path's page: it was served as a
//   fallback for an app route (e.g. by `vite preview`), so load the app.
// - Otherwise: stay static. Register the service worker, count the page view,
//   and bring back only the SEO templates that need the client.

import { initAnalytics, trackPageView } from './utils/analytics.js';
import { isLandingPath, isSeoPagePath } from './seo/staticPaths.js';
import { initStaleChunkReload } from './utils/staleChunkReload.js';
// utils/theme.ts RESOLVED_THEME_KEY (not imported: theme.ts pulls in adhan).
const RESOLVED_THEME_KEY = 'bustandeen_theme';

/** Pages drawn with the app's theme tokens (the T4.4 district timetables)
 * show the visitor's theme: the app's saved one, else the system's. The
 * other static pages have their own dark palette and stay dark. */
function followTheme(): void {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem(RESOLVED_THEME_KEY);
  } catch {
    /* storage blocked: fall back to the system setting */
  }
  if (theme !== 'bustandeen' && theme !== 'bustandeen-light') {
    theme = window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'bustandeen-light'
      : 'bustandeen';
  }
  document.documentElement.setAttribute('data-theme', theme);
}

/** A monthly timetable marks today's row: the page is built once, the date
 * is the visitor's (in the table's own time zone). */
function markToday(): void {
  const table = document.querySelector<HTMLElement>('[data-month-table]');
  if (!table) return;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: table.dataset.timezone || 'Asia/Dhaka',
  }).format(new Date());
  table.querySelector(`tr[data-date="${today}"]`)?.setAttribute('aria-current', 'date');
}

// Before any dynamic import: a stale page reloads instead of breaking.
initStaleChunkReload();

const path = window.location.pathname;
const signedIn = document.documentElement.classList.contains('has-session');
const isLanding = isLandingPath(path);
// Is this HTML really the page for this path? A host's SPA fallback (e.g.
// `vite preview` for a clean URL) can answer any path with the landing.
const servedLanding = !!document.querySelector('[data-prerendered-landing]');
const isStaticPage = isLanding ? servedLanding : isSeoPagePath(path) && !servedLanding;

if (isLanding && signedIn && path !== '/') {
  // The app lives at `/`; there is no Bangla app route.
  window.location.replace('/');
} else if (!isStaticPage || (isLanding && signedIn)) {
  void import('./main.js');
} else {
  if (document.querySelector('[data-follow-theme]')) followTheme();
  markToday();
  void import('./pwaUpdate.js').then((m) => m.initPwaUpdates());
  initAnalytics();
  trackPageView(path);
  if (isLanding) {
    // The language links also set the app's language, so the app opens in it
    // and index.html's inline script sends a Bangla visitor of `/` to `/bn`.
    document.querySelectorAll<HTMLAnchorElement>('a[data-set-lang]').forEach((a) =>
      a.addEventListener('click', () => {
        try {
          localStorage.setItem('bustandeen_lang', a.dataset.setLang ?? 'en');
        } catch {
          /* storage blocked: the link still works */
        }
      })
    );
  } else if (document.getElementById('seo-page')) {
    void import('./seo/entry-client.js').then((m) => m.renderSeoPage());
  }
}
