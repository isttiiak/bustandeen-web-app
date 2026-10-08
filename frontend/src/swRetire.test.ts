import { describe, expect, it } from 'vitest';
import { retireDestination, retireNow, shouldRetire, type RetireScope } from './swRetire.js';

describe('shouldRetire', () => {
  it('retires only the www host', () => {
    expect(shouldRetire('www.bustandeen.com')).toBe(true);
    expect(shouldRetire('bustandeen.com')).toBe(false);
    expect(shouldRetire('localhost')).toBe(false);
    expect(shouldRetire('bustandeenvercel-git-main.vercel.app')).toBe(false);
  });
});

describe('retireDestination', () => {
  it('keeps path, query and hash on the apex', () => {
    expect(retireDestination('https://www.bustandeen.com/salat?d=1#x')).toBe(
      'https://bustandeen.com/salat?d=1#x'
    );
    expect(retireDestination('https://www.bustandeen.com/')).toBe('https://bustandeen.com/');
  });
});

describe('retireNow', () => {
  it('claims, wipes every cache, unregisters, then navigates each window', async () => {
    const log: string[] = [];
    const caches = new Set(['workbox-precache-v2', 'static-pages', 'fonts-v2']);
    const scope: RetireScope = {
      location: { hostname: 'www.bustandeen.com' },
      skipWaiting: async () => {},
      addEventListener: () => {},
      clients: {
        claim: async () => {
          log.push('claim');
        },
        matchAll: async () => [
          {
            url: 'https://www.bustandeen.com/zikr',
            navigate: async (u: string) => log.push(`nav ${u}`),
          },
          {
            url: 'https://www.bustandeen.com/admin',
            navigate: async () => {
              throw new TypeError('not controlled');
            },
          },
        ],
      },
      registration: {
        unregister: async () => {
          log.push(`unregister caches=${caches.size}`);
          return true;
        },
      },
    };
    await retireNow(scope, {
      keys: async () => [...caches],
      delete: async (k) => caches.delete(k),
    });
    expect(log).toEqual(['claim', 'unregister caches=0', 'nav https://bustandeen.com/zikr']);
  });
});
