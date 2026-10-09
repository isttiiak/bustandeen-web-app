import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LazyMotion } from 'framer-motion';
import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App.js';
import { i18nReady } from './i18n.js';
import './fonts.js';
import './styles.css';
import './styles/global.css';
import ThemeInit from './components/ThemeInit.js';
import UiInit, { MotionPrefs } from './components/UiInit.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import { idbGet, idbSet, idbRemove } from './utils/idbCache.js';
import { initPwaUpdates } from './pwaUpdate.js';
import { initStaleChunkReload } from './utils/staleChunkReload.js';
import { initAnalytics } from './utils/analytics.js';
import { migratePrayerDefaultsOnce } from './utils/salatPrefs.js';

initStaleChunkReload();
initPwaUpdates();
initAnalytics();
// Before the first render, so no screen ever shows a timetable that then jumps.
migratePrayerDefaultsOnce();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 2-minute stale time — reduces redundant refetches while keeping data fresh.
      staleTime: 2 * 60_000,
      // Don't refetch just because the user switched tabs — this was flooding the
      // rate limiter. Explicit invalidation (after mutations) keeps data current.
      refetchOnWindowFocus: false,
      // One retry on failure, then surface the error.
      retry: 1,
      // Cache entries survive 24h so the localStorage persister below can
      // restore them on reload — stats paint INSTANTLY from last-known values
      // while fresh data revalidates in the background (stale-while-revalidate).
      gcTime: 24 * 60 * 60_000,
    },
  },
});

// Persist the query cache to IndexedDB: on a hard reload the app paints
// yesterday's numbers immediately instead of spinners, then refetches.
// IndexedDB instead of localStorage because this cache spans every feature
// (salat, quran, fasting, cycle, social, analytics) and can grow into the
// megabytes over active daily use — an async store avoids both the ~5MB
// localStorage ceiling and blocking the main thread on every throttled write.
const persister = createAsyncStoragePersister({
  storage: { getItem: idbGet, setItem: idbSet, removeItem: idbRemove },
  key: 'bustandeen_rq_cache',
  throttleTime: 2_000,
  // If storage is full, drop the oldest queries instead of giving up.
  retry: removeOldestQuery,
});

// One-time cleanup: the cache used to live in localStorage under this same
// key. It's disposable (just refetches on miss), so no migration — just
// reclaim the quota it was using.
try {
  localStorage.removeItem('bustandeen_rq_cache');
} catch {
  /* ignore */
}

// After the detected language's strings have loaded (Bangla is its own chunk,
// see i18n.ts). If that load fails, render anyway: i18next falls back to the
// bundled English.
// Animation features (about 15 KB compressed) load after the app starts:
// components import `m as motion` (eslint enforces it), and `strict` throws if
// a full `motion` component ever slips back in. Until the features arrive,
// elements show their `initial` state (audit PERF-01 follow-up).
const loadMotionFeatures = () => import('./motionFeatures.js').then((mod) => mod.default);

const render = () =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          // Bump to invalidate every persisted cache after a breaking shape change.
          buster: 'v1',
        }}
      >
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionPrefs>
            <BrowserRouter>
              <ThemeInit />
              <UiInit />
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </MotionPrefs>
        </LazyMotion>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </React.StrictMode>
  );
void i18nReady.then(render, render);
