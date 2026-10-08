import { registerSW } from 'virtual:pwa-register';

/**
 * `registerType: 'autoUpdate'` (vite.config.ts) makes the service worker
 * apply a newly-found update automatically, with no user prompt — but only
 * once the browser actually notices sw.js changed. Left alone, the browser
 * checks for a new sw.js only on its own (rare) schedule, so a desktop tab
 * left open for a long stretch can sit on a stale build far longer than a
 * mobile PWA does (which gets fully relaunched more often, incidentally
 * re-registering and re-checking each time). This adds an explicit periodic
 * + on-visibility `registration.update()` nudge so a long-lived tab notices
 * a new deploy promptly instead of needing a manual unregister/reload.
 */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

export function initPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  // Reload only to replace an older worker's build. On a first visit the
  // landing page registers the worker, so the app (a full page load later)
  // sees that install as "external" and the plugin would reload it when it
  // activates: a random reload seconds after "Explore", or Chrome's offline
  // page if the connection dropped in between (clientsClaim has not
  // necessarily finished). A page with no controller has nothing stale.
  const hadController = !!navigator.serviceWorker.controller;

  registerSW({
    immediate: true,
    onNeedReload() {
      if (hadController) window.location.reload();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => void registration.update().catch(() => {});
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });
    },
  });
}
