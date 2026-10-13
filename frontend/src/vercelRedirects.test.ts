import { describe, it, expect } from 'vitest';
import raw from '../../vercel.json?raw';

// quran.bustandeen.com is only a short name: every path on it answers a 301
// to bustandeen.com/quran, where the Quran stays (one origin for auth, the
// PWA and SEO). The www redirect keeps leaving the service worker alone.
interface Redirect {
  source: string;
  has?: { type: string; value: string }[];
  destination: string;
  statusCode?: number;
  permanent?: boolean;
}
const { redirects } = JSON.parse(raw) as { redirects: Redirect[] };
const forHost = (host: string) =>
  redirects.filter((r) => r.has?.some((h) => h.type === 'host' && h.value === host));

describe('vercel.json redirects', () => {
  it('quran. answers every path with a 301 to /quran on the main domain', () => {
    const [r, ...rest] = forHost('quran.bustandeen.com');
    expect(rest).toEqual([]);
    expect(r).toEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'quran.bustandeen.com' }],
      destination: 'https://bustandeen.com/quran',
      statusCode: 301,
    });
  });

  it('www. still redirects to the bare domain, sw.js excepted', () => {
    const [r] = forHost('www.bustandeen.com');
    expect(r?.destination).toBe('https://bustandeen.com/$1');
    expect(r?.source).toBe(String.raw`/((?!sw\.js$).*)`);
  });
});
