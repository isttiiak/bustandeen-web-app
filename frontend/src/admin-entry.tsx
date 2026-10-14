// The admin panel's own page (admin.html), v5.163.0. It is served on its own
// site in production (admin.bustandeen.com) so the panel's sign-in never shares
// storage with the app's, and an issue in the app can't reach it (origin
// isolation). Deliberately missing here: the app's Firebase, its service
// worker, the PWA manifest, analytics and the persisted query cache (admin
// data is never written to this device's storage).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LazyMotion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import i18n, { i18nReady } from './i18n.js';
import './fonts.js';
import './styles.css';
import './styles/global.css';
import ThemeInit from './components/ThemeInit.js';
import UiInit, { MotionPrefs } from './components/UiInit.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import AdminRoutes from './adminRoutes.js';
import { AdminFallback } from './adminGuards.js';
import { initErrorReporting } from './utils/errorReporting.js';
import { API_BASE } from './lib/api.js';

initErrorReporting(API_BASE);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const loadMotionFeatures = () => import('./motionFeatures.js').then((mod) => mod.default);

// The panel's strings exist only in English (i18n:check skips them).
const render = () =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionPrefs>
            <BrowserRouter>
              <ThemeInit />
              <UiInit />
              <ErrorBoundary>
                <Toaster />
                <React.Suspense fallback={<AdminFallback />}>
                  <AdminRoutes />
                </React.Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </MotionPrefs>
        </LazyMotion>
      </QueryClientProvider>
    </React.StrictMode>
  );
void i18nReady.then(() => i18n.changeLanguage('en')).then(render, render);
