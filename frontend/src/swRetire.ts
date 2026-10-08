// Retires a service worker installed on a host the app no longer serves.
//
// Why (2026-10-07): browsers that once used www.bustandeen.com kept an old
// www-scoped worker that served an ancient build whose API calls fail CORS.
// It could never update, because www/sw.js was a domain-level 308 to the apex
// and a service worker script may not redirect. vercel.json now serves this
// same sw.js on www (everything else on www still 308s to the apex), and the
// worker sees its own host and calls retireWorker() instead of starting up.
//
// Structural types so this file compiles under both the DOM and the WebWorker
// tsconfigs and can be unit-tested with plain fakes.

export const RETIRED_HOSTS: readonly string[] = ['www.bustandeen.com'];
export const RETIRE_TARGET_ORIGIN = 'https://bustandeen.com';

interface RetireWindowClient {
  url: string;
  navigate(url: string): Promise<unknown>;
}

export interface RetireScope {
  location: { hostname: string };
  skipWaiting(): Promise<void>;
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: { waitUntil(p: Promise<unknown>): void }) => void
  ): void;
  clients: {
    claim(): Promise<void>;
    matchAll(options: { type: 'window' }): Promise<readonly RetireWindowClient[]>;
  };
  registration: { unregister(): Promise<boolean> };
}

export interface RetireCaches {
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

export function shouldRetire(hostname: string): boolean {
  return RETIRED_HOSTS.includes(hostname);
}

/** Same path, query and hash on the target origin. */
export function retireDestination(clientUrl: string, targetOrigin = RETIRE_TARGET_ORIGIN): string {
  const u = new URL(clientUrl);
  return `${targetOrigin}${u.pathname}${u.search}${u.hash}`;
}

/** Runs on activate: take over, wipe every cache, unregister, move each open window to the apex. */
export async function retireNow(scope: RetireScope, cacheStorage: RetireCaches): Promise<void> {
  await scope.clients.claim();
  const keys = await cacheStorage.keys();
  await Promise.all(keys.map((k) => cacheStorage.delete(k)));
  await scope.registration.unregister();
  const windows = await scope.clients.matchAll({ type: 'window' });
  await Promise.all(
    windows.map((c) => c.navigate(retireDestination(c.url)).catch(() => undefined))
  );
}

export function retireWorker(scope: RetireScope, cacheStorage: RetireCaches): void {
  scope.addEventListener('install', (event) => event.waitUntil(scope.skipWaiting()));
  scope.addEventListener('activate', (event) => event.waitUntil(retireNow(scope, cacheStorage)));
}
