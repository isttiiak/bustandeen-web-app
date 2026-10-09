import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chunkKey,
  isChunkLoadError,
  refreshServiceWorker,
  shouldReloadForStaleChunk,
} from './staleChunkReload.js';

describe('stale chunk: which chunk failed', () => {
  it('takes the hashed file name from the browser message', () => {
    expect(
      chunkKey(
        'Failed to fetch dynamically imported module: https://bustandeen.com/assets/AdminUsers-Ab12Cd.js'
      )
    ).toBe('AdminUsers-Ab12Cd.js');
    expect(chunkKey('Unable to preload CSS for /assets/Quran-9f8e.css')).toBe('Quran-9f8e.css');
  });

  it("falls back to 'unknown' without a file name", () => {
    expect(chunkKey(undefined)).toBe('unknown');
    expect(chunkKey('Importing a module script failed.')).toBe('unknown');
  });
});

describe('stale chunk: reload guard (one reload per chunk per tab session)', () => {
  it('reloads for a chunk this tab has not reloaded for', () => {
    expect(shouldReloadForStaleChunk('A.js', [])).toBe(true);
    // the 2026-10-09 report: chunk A had reloaded, then chunk B went missing
    expect(shouldReloadForStaleChunk('B.js', ['A.js'])).toBe(true);
  });

  it('does not reload twice for the same chunk (no reload loop)', () => {
    expect(shouldReloadForStaleChunk('A.js', ['A.js'])).toBe(false);
  });

  it('never reloads while offline (that would show the browser offline page)', () => {
    expect(shouldReloadForStaleChunk('A.js', [], false)).toBe(false);
  });
});

describe('stale chunk: recognising the error', () => {
  it('matches the messages of Chrome, Safari and Firefox', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: x'))).toBe(
      true
    );
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: x'))).toBe(
      true
    );
  });

  it('leaves ordinary render errors alone', () => {
    expect(
      isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'x')"))
    ).toBe(false);
  });
});

describe('stale chunk: refreshing the service worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubWorker(registration: Partial<ServiceWorkerRegistration> | undefined) {
    const listeners: Array<() => void> = [];
    const sw = {
      getRegistration: () => Promise.resolve(registration),
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('navigator', { serviceWorker: sw, onLine: true });
    return () => listeners.forEach((fn) => fn());
  }

  it('is false without a service worker', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(await refreshServiceWorker()).toBe(false);
    stubWorker(undefined);
    expect(await refreshServiceWorker()).toBe(false);
  });

  it('is false straight away when the server has nothing new', async () => {
    stubWorker({ update: () => Promise.resolve(), installing: null, waiting: null } as never);
    expect(await refreshServiceWorker(60_000)).toBe(false);
  });

  it('is true once the new worker takes control', async () => {
    const registration = {
      installing: null as unknown,
      waiting: null,
      update: () => {
        registration.installing = {}; // a new sw.js was found
        return Promise.resolve();
      },
    };
    const takeControl = stubWorker(registration as never);
    const result = refreshServiceWorker(60_000);
    await Promise.resolve();
    await Promise.resolve();
    takeControl();
    expect(await result).toBe(true);
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    stubWorker({ update: () => new Promise(() => {}), installing: null, waiting: null } as never);
    const result = refreshServiceWorker(5_000);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await result).toBe(false);
  });
});
