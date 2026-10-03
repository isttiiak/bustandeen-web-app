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
