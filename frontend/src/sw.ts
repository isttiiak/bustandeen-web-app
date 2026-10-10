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
import type { RouteHandlerCallback } from 'workbox-core';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { isLandingPath, isSeoPagePath } from './seo/staticPaths.js';
import { retireWorker, shouldRetire } from './swRetire.js';

declare const self: ServiceWorkerGlobalScope;

// www.bustandeen.com only 308s to the apex, except /sw.js (vercel.json), so a
// worker stuck on www can update to this file and retire itself (swRetire.ts).
// Nothing below may run there: the precache would fetch redirected URLs.
if (shouldRetire(self.location.hostname)) {
  retireWorker(self, caches);
} else {
  startWorker();
}

function startWorker(): void {
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

  // The Google Fonts cache from before fonts were self-hosted (v5.70.0), and
  // the last build's network shell (see freshShell below): a new worker means
  // a new deploy, whose shell names other main-*.js files.
  self.addEventListener('activate', (event) => {
    event.waitUntil(Promise.all([caches.delete('fonts'), caches.delete('app-shell')]));
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
  const precachedShell = createHandlerBoundToURL('app-shell.html');

  // Online, the shell comes from the network (one small HTML request per full
  // page load); the precached copy is only the offline/slow-network fallback.
  // 2026-10-11 incident: right after a deploy a browser precached the
  // PREVIOUS build's shell under the new revision key (Workbox never checks
  // the content), so every load asked for main-*.js files that no longer
  // existed and the app stayed blank until the next deploy. Served from the
  // network, a bad precache entry can no longer lock anyone out.
  const freshShell = new NetworkFirst({
    cacheName: 'app-shell',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  });
  const navigationHandler: RouteHandlerCallback = async (options) => {
    try {
      const response = await freshShell.handle({
        event: options.event,
        request: new Request('/app-shell.html', { credentials: 'same-origin' }),
      });
      if (response?.ok) return response;
    } catch {
      /* offline and never cached: use the precache */
    }
    return precachedShell(options);
  };

  // The prerendered SEO pages and the Bangla landing `/bn` (audit PERF-01) are
  // real pages with their own light entry, so they come from the network (and
  // are kept for a while). Offline and not kept, the app shell renders them
  // instead, as it always did. `/` itself is precached above.
  const staticPages = new NetworkFirst({
    cacheName: 'static-pages',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  });
  registerRoute(
    ({ request, url }) =>
      request.mode === 'navigate' &&
      url.pathname !== '/' &&
      (isSeoPagePath(url.pathname) || isLandingPath(url.pathname)),
    async (options) => {
      try {
        return await staticPages.handle(options);
      } catch {
        return navigationHandler(options);
      }
    }
  );

  registerRoute(
    new NavigationRoute(navigationHandler, {
      // /__/ = Firebase's auth helper pages, proxied to Firebase by vercel.json:
      // the app shell must never answer them.
      denylist: [/^\/api\//, /^\/__\//, /^\/[^?]*\.[A-Za-z0-9]+(\?|$)/],
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

  // Build output the precache leaves out (vite.config.ts globIgnores: the
  // admin panel, the xlsx export, the SEO city list), kept once it has loaded
  // so it still works offline. Names are content-hashed, so cache-first is
  // safe. Only real JS/CSS is kept: until v5.153.3 a chunk missing after a
  // deploy got the app shell (HTML, status 200) from vercel.json's catch-all
  // (now a 404), and caching that under a .js URL would break the page for good.
  registerRoute(
    ({ url }) =>
      url.origin === self.location.origin &&
      url.pathname.startsWith('/assets/') &&
      /\.(js|css)$/.test(url.pathname),
    new CacheFirst({
      cacheName: 'assets-runtime',
      plugins: [
        new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        new CacheableResponsePlugin({ statuses: [200] }),
        {
          cacheWillUpdate: async ({ response }) =>
            /javascript|css/.test(response.headers.get('content-type') ?? '') ? response : null,
        },
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
}
