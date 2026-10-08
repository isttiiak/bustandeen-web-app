// After a deploy, a page still running the previous build asks for lazy
// chunks (a route, the sign-in page) whose hashed files no longer exist, and
// the import fails. Installed PWAs hit this most: they stay open in the
// background across deploys. Vite reports these failures as
// `vite:preloadError`; reloading once picks up the new build. The guard stops
// a reload loop when the chunk is truly unreachable (e.g. offline and not
// cached): at most one reload per RELOAD_GUARD_MS.

const KEY = 'bustandeen_chunk_reload_at';
export const RELOAD_GUARD_MS = 30_000;

/**
 * True unless this tab already reloaded for a missing chunk very recently, or
 * is offline: a chunk that fails offline is not a stale build (often just the
 * idle route prefetch before the service worker controls the page), and a
 * reload then only swaps the app for the browser's offline page.
 */
export function shouldReloadForStaleChunk(
  now: number,
  lastReloadAt: string | null,
  online = true
): boolean {
  if (!online) return false;
  if (!lastReloadAt) return true;
  const last = Number(lastReloadAt);
  return !Number.isFinite(last) || now - last > RELOAD_GUARD_MS || now < last;
}

let installed = false;

export function initStaleChunkReload(): void {
  if (installed) return; // static-entry and main both call this
  installed = true;
  window.addEventListener('vite:preloadError', (event) => {
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(KEY);
    } catch {
      /* storage blocked: treat as no earlier reload */
    }
    if (!shouldReloadForStaleChunk(Date.now(), last, navigator.onLine)) return; // let the error surface
    event.preventDefault();
    try {
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* storage blocked: the guard just can't remember this reload */
    }
    window.location.reload();
  });
}
