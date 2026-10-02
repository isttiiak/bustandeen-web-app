/// <reference lib="webworker" />
// Hand-written service worker (vite-plugin-pwa "injectManifest" strategy —
// originally migrated from "generateSW" to support push notifications, since
// removed; kept as hand-written since other code here relies on the explicit
// control this mode gives over cache names/expiration/SPA fallback below).

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// THE MOBILE STALENESS FIX (ported from the old config's comment). With
// autoUpdate alone a new service worker installs but then WAITS for every tab
// to close before activating. On a phone the app is basically never fully
// closed, so users kept being served the previous precached bundle. Taking
// over immediately on install/activate fixes that.
self.skipWaiting();

// skipWaiting() alone only lets the NEW worker become "active" sooner — it
// does NOT hand it control of tabs that were already open before it
// activated (those keep talking to the old worker, including for the SPA
// navigation-fallback route below, until they fully close and reopen).
// clientsClaim() closes that gap by taking control of every open client the
// moment this worker activates. This was the actual reason a plain
// Ctrl+Shift+R on desktop kept serving a stale build while the same update
// showed up fine on Android — a mobile PWA gets fully relaunched far more
// often, incidentally getting a fresh controller each time; a laptop tab left
// open for a long stretch never did.
clientsClaim();

cleanupOutdatedCaches();

// The Google Fonts cache from before fonts were self-hosted (v5.70.0).
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('fonts'));
});
precacheAndRoute(self.__WB_MANIFEST);

// SPA offline routing: serve the cached app shell for any navigation that
// misses the precache (e.g. /zikr while offline) — except the API, which must
// always hit the network (worship logs must never be stale-served). Anything
// with a file extension (sitemap.xml, robots.txt, llms.txt, the Search Console
// verification .html) is a real static file, not an SPA route, so it must
// also bypass the fallback — otherwise opening one of them in a browser that
// already has this worker installed returns the app shell instead of the file.
// (Workbox tests these against pathname + search, hence the `(\?|$)` tail.)
// app-shell.html, not index.html: index.html is the prerendered landing page
// (served for `/` by the precache route above); every other route needs the
// empty shell. See appShellCopy in vite.config.ts.
const navigationHandler = createHandlerBoundToURL('app-shell.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//, /^\/[^?]*\.[A-Za-z0-9]+(\?|$)/],
  })
);

// Bundled Tanzil Arabic text (audit T2.6), one file per surah. Not precached
// (1.8 MB for all 114): each surah is kept once it has been opened, so it
// reads offline from then on. Stale-while-revalidate rather than cache-first
// so a corrected Tanzil release still reaches people who already have it.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/quran/uthmani/'),
  new StaleWhileRevalidate({
    cacheName: 'quran-uthmani',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Translations, transliteration + surah meta (immutable content) — cache-first, 30 days
registerRoute(
  ({ url }) => url.origin === 'https://api.alquran.cloud',
  new CacheFirst({
    cacheName: 'quran-text',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Self-hosted fonts (src/fonts.ts). Not precached: the browser fetches only
// the faces and scripts a page actually uses (each @font-face has a
// unicode-range), and the file names are content-hashed, so cache-first is
// safe and they work offline once seen.
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    (request.destination === 'font' || url.pathname.endsWith('.woff2')),
  new CacheFirst({
    cacheName: 'fonts-v2',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);
