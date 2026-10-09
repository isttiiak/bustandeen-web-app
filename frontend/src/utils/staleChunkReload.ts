// After a deploy, a page still running the previous build asks for lazy
// chunks (a route, the sign-in page) whose hashed files no longer exist, and
// the import fails. Installed PWAs hit this most: they stay open in the
// background across deploys. Vite reports these failures as
// `vite:preloadError`.
//
// A plain reload is often not enough: until the browser has noticed the new
// sw.js, the reload is answered by the OLD service worker with the OLD app
// shell, which asks for the same missing chunk again (admin/xlsx/seo-cities
// chunks are not precached, so the old cache cannot fill the gap either).
// So: ask the registration for an update first, wait briefly for the new
// worker to take control (skipWaiting + clientsClaim in sw.ts), then reload.
//
// Guard: at most one automatic reload per missing chunk per tab session, so a
// chunk that is truly unreachable cannot loop, while a DIFFERENT chunk
// failing later (the 2026-10-09 report: a 30 s tab-wide guard had already
// fired) still recovers. Whatever is left surfaces in the ErrorBoundary,
// whose Update button runs recoverFromStaleChunk().

const KEY = 'bustandeen_chunk_reloads';
const MAX_REMEMBERED = 20;
export const SW_UPDATE_TIMEOUT_MS = 5_000;

/** The failing chunk's file name ("AdminUsers-Ab12Cd.js"), or 'unknown'. */
export function chunkKey(message: string | undefined): string {
  const match = message?.match(/[\w.-]+\.(?:m?js|css)\b/);
  return match ? match[0] : 'unknown';
}

/**
 * True unless this tab already reloaded for this chunk, or is offline: a
 * chunk that fails offline is not a stale build (often just the idle route
 * prefetch before the service worker controls the page), and a reload then
 * only swaps the app for the browser's offline page.
 */
export function shouldReloadForStaleChunk(
  key: string,
  alreadyReloaded: readonly string[],
  online = true
): boolean {
  return online && !alreadyReloaded.includes(key);
}

/** The errors browsers throw when a dynamic import's file is missing. */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i.test(
    text
  );
}

function readReloaded(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** False when storage is blocked: without memory a reload could loop. */
function rememberReload(key: string, reloaded: string[]): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...reloaded, key].slice(-MAX_REMEMBERED)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask the service worker registration for a newer sw.js and resolve true once
 * a new worker controls the page, false if there is none (or no worker at
 * all, or it takes longer than timeoutMs).
 */
export async function refreshServiceWorker(timeoutMs = SW_UPDATE_TIMEOUT_MS): Promise<boolean> {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  if (!sw) return false;
  const registration = await sw.getRegistration().catch(() => undefined);
  if (!registration) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (updated: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sw.removeEventListener('controllerchange', onControllerChange);
      resolve(updated);
    };
    const onControllerChange = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    sw.addEventListener('controllerchange', onControllerChange);
    registration
      .update()
      .then(() => {
        // Nothing new on the server: no point waiting out the timeout.
        if (!registration.installing && !registration.waiting) finish(false);
      })
      .catch(() => finish(false));
  });
}

/**
 * The ErrorBoundary's Update button. Fetch the new worker and reload; if no
 * new worker turns up, the old one is what keeps serving the old shell, so
 * unregister it before reloading (online only: offline that would leave
 * nothing to load the app from). The next visit installs the new worker, so
 * offline use returns after one load. Caches are left alone (Quran text etc.).
 */
export async function recoverFromStaleChunk(): Promise<void> {
  const updated = await refreshServiceWorker();
  if (!updated && navigator.onLine && navigator.serviceWorker) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {
      /* fall through to the plain reload */
    }
  }
  window.location.reload();
}

let installed = false;
let recovering = false;

/**
 * True while an automatic update-then-reload is under way. Vite resolves the
 * failed import to undefined once the event is cancelled, so React.lazy
 * throws into the ErrorBoundary during the wait; the boundary shows
 * "Updating" instead of an error then.
 */
export function isRecoveringFromStaleChunk(): boolean {
  return recovering;
}

export function initStaleChunkReload(): void {
  if (installed) return; // static-entry and main both call this
  installed = true;
  window.addEventListener('vite:preloadError', (event) => {
    const key = chunkKey((event as Event & { payload?: Error }).payload?.message);
    const reloaded = readReloaded();
    if (!shouldReloadForStaleChunk(key, reloaded, navigator.onLine)) return; // let the error surface
    if (!rememberReload(key, reloaded)) return; // storage blocked: surface rather than risk a loop
    event.preventDefault();
    recovering = true;
    void refreshServiceWorker().then(() => window.location.reload());
  });
}
