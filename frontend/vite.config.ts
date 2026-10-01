import { readFileSync } from 'fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Root package.json is the single source of truth for the app version
// (frontend/backend/root package.json versions are kept in sync manually on
// each release) — read at build time so the footer never drifts from it.
const rootPkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

/**
 * Emits `app-shell.html`: an exact copy of the built index.html, before the
 * service-worker precache manifest is generated (so it is precached).
 *
 * Why two files (audit SEO-01): scripts/prerender.mjs writes the prerendered
 * landing page INTO dist/index.html, so `/` has real content for search
 * engines and first-time visitors. Every other app route must still get the
 * EMPTY shell (or it would flash the landing page), so /vercel.json's
 * catch-all rewrite and the SW's offline navigation fallback both point at
 * app-shell.html instead.
 */
function appShellCopy(): Plugin {
  return {
    name: 'bustandeen:app-shell-copy',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      this.emitFile({ type: 'asset', fileName: 'app-shell.html', source: index.source });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  plugins: [
    react(),
    appShellCopy(),
    // v4.10.0 — installable PWA: precached app shell + offline-tolerant
    // runtime caching. The API stays network-only (worship data must never be
    // stale-served); the free Quran text CDN and fonts cache aggressively.
    //
    // Switched generateSW → injectManifest (originally for push notification
    // handling, since removed — kept hand-written since src/sw.ts still needs
    // explicit control over cache names/expiration/SPA fallback). All the
    // caching behavior below is implemented directly in src/sw.ts instead of
    // this declarative `workbox` block; injectManifest only needs globPatterns
    // here, to build the precache manifest injected as self.__WB_MANIFEST.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // The plugin's default auto-injected registration script is a bare
      // `navigator.serviceWorker.register('/sw.js')` on window load — it never
      // re-checks for updates afterwards. A tab left open for a long stretch
      // (the common desktop pattern) could go a long time without picking up
      // a new deploy. Registering manually via `virtual:pwa-register` in
      // main.tsx instead adds a periodic + on-visibility `registration.update()`
      // check, so `injectRegister: null` turns off the plugin's own script to
      // avoid registering twice.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'og-image.jpg', 'robots.txt'],
      injectManifest: {
        // No woff2: fonts are cached at runtime as pages use them (src/sw.ts).
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Install-sheet screenshots are only read by the browser's install UI.
        globIgnores: ['screenshots/**'],
      },
      manifest: {
        name: 'Bustandeen - Nourish Your Deen',
        short_name: 'Bustandeen',
        description:
          'Track your zikr, salat, fasting and Quran reading - with authentic references, streaks, prayer times and a private circle of friends. Free, private, ad-free.',
        // Match the app's real background (index.html's theme-color meta,
        // #1a1812). The old green/near-black values predated the current
        // design and flashed a mismatched colour on the install splash screen
        // and the standalone title bar.
        theme_color: '#1a1812',
        background_color: '#1a1812',
        display: 'standalone',
        // Audit T2.5 (PWA-01). A stable id keeps an installed app the same app
        // if start_url ever changes. No orientation lock: tablets and desktop
        // installs rotate freely.
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed with the mark inside the 80% safe zone, so launchers can
          // crop to any shape (scripts/generate-pwa-icons.mjs).
          {
            src: '/pwa-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Long-press on the home-screen icon.
        shortcuts: [
          {
            name: 'Log a prayer',
            short_name: 'Salat',
            url: '/salat',
            icons: [{ src: '/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Zikr counter',
            short_name: 'Zikr',
            url: '/zikr',
            icons: [{ src: '/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Prayer times',
            short_name: 'Times',
            url: '/prayer-times',
            icons: [{ src: '/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Read Quran',
            short_name: 'Quran',
            url: '/quran',
            icons: [{ src: '/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
        // Shown on Android's richer install sheet. Regenerate with
        // scripts/capture-pwa-screenshots.mjs (demo data, no real account).
        screenshots: [
          {
            src: '/screenshots/salat-narrow.webp',
            sizes: '585x1266',
            type: 'image/webp',
            form_factor: 'narrow',
            label: 'Log your five daily prayers',
          },
          {
            src: '/screenshots/zikr-narrow.webp',
            sizes: '585x1266',
            type: 'image/webp',
            form_factor: 'narrow',
            label: 'A calm zikr counter',
          },
          {
            src: '/screenshots/prayer-times-narrow.webp',
            sizes: '585x1266',
            type: 'image/webp',
            form_factor: 'narrow',
            label: 'Prayer times for your city',
          },
          {
            src: '/screenshots/home-wide.webp',
            sizes: '1280x800',
            type: 'image/webp',
            form_factor: 'wide',
            label: 'Your day of worship at a glance',
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest dependencies into their own long-cacheable chunks
        // so a small app change doesn't re-download all of them.
        manualChunks: {
          // React changes far less often than our code — keeping it separate
          // means an app deploy doesn't invalidate it. It landed back in the
          // main bundle when the recharts chunk was removed, which is what
          // pushed index past the 500 kB warning.
          'react-vendor': ['react', 'react-dom', 'react-router'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/storage'],
          motion: ['framer-motion'],
        },
      },
    },
    // The only chunk near this line is `xlsx`, which is behind a dynamic
    // import() and downloads solely when someone exports a spreadsheet — it
    // never touches first paint. Raised so the build log stays meaningful
    // instead of crying wolf on every deploy.
    chunkSizeWarningLimit: 600,
  },
});
