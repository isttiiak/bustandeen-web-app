import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P2-10: nothing is sent to Google, and gtag.js is never even fetched, unless
// the person has agreed; saying no later stops it and clears Google's cookies.

const ID = 'G-TESTCONSENT';

interface Fake {
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  [k: string]: unknown;
}

function setup(consent?: 'granted' | 'denied') {
  const store = new Map<string, string>();
  if (consent) store.set('bustandeen_analytics_consent', consent);
  const appended: Array<{ src?: string }> = [];
  const cookieWrites: string[] = [];
  let cookies = '_ga=GA1.1.1; _ga_TESTCONSENT=GS1.1.1; session=abc';
  const win: Fake = {
    location: { origin: 'https://bustandeen.com', hostname: 'bustandeen.com', pathname: '/' },
    addEventListener: () => {},
    removeEventListener: () => {},
    requestIdleCallback: (cb: () => void) => {
      cb();
      return 1;
    },
  };
  const doc = {
    readyState: 'complete',
    referrer: '',
    title: 'x',
    head: { appendChild: (el: { src?: string }) => appended.push(el) },
    createElement: () => ({}) as { src?: string },
    get cookie() {
      return cookies;
    },
    set cookie(v: string) {
      cookieWrites.push(v);
      cookies = cookies
        .split('; ')
        .filter((c) => !v.startsWith(c.split('=')[0] + '=') || !/Max-Age=0/.test(v))
        .join('; ');
    },
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', ID);
  return { win, appended, cookieWrites, getCookies: () => cookies };
}

async function load() {
  vi.resetModules();
  const analytics = await import('./analytics.js');
  const consent = await import('./analyticsConsent.js');
  return { analytics, consent };
}

describe('analytics waits for a yes', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([undefined, 'denied'] as const)(
    'with consent %s nothing is created, loaded or sent',
    async (c) => {
      const env = setup(c);
      const { analytics } = await load();
      analytics.initAnalytics();
      analytics.trackPageView('/prayer-times/dhaka-bangladesh');
      expect(env.win.gtag).toBeUndefined();
      expect(env.win.dataLayer).toBeUndefined();
      expect(env.appended).toHaveLength(0);
    }
  );

  it('with a yes it starts, and gtag.js is fetched once the page is idle', async () => {
    const env = setup('granted');
    const { analytics } = await load();
    analytics.initAnalytics();
    expect(typeof env.win.gtag).toBe('function');
    expect(env.appended.map((e) => e.src)).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${ID}`,
    ]);
    // No ad features: counting page views only.
    const config = (env.win.dataLayer as unknown[][])
      .map((a) => Array.from(a))
      .find((a) => a[0] === 'config');
    expect(config?.[2]).toMatchObject({
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      anonymize_ip: true,
    });
  });

  it('a yes given while the page is open starts it and reports the page', async () => {
    const env = setup();
    const { analytics, consent } = await load();
    analytics.initAnalytics();
    expect(env.win.gtag).toBeUndefined();
    consent.writeConsent('granted');
    expect(typeof env.win.gtag).toBe('function');
    const events = (env.win.dataLayer as unknown[][]).map((a) => Array.from(a));
    expect(events.some((a) => a[0] === 'event' && a[1] === 'page_view')).toBe(true);
  });

  it('changing the answer to no stops it, switches Google off and clears its cookies', async () => {
    const env = setup('granted');
    const { analytics, consent } = await load();
    analytics.initAnalytics();
    const before = (env.win.dataLayer as unknown[]).length;
    consent.writeConsent('denied');
    expect(env.win[`ga-disable-${ID}`]).toBe(true);
    analytics.trackPageView('/quran');
    expect((env.win.dataLayer as unknown[]).length).toBe(before);
    expect(env.getCookies()).toBe('session=abc');
    expect(env.cookieWrites.some((w) => /^_ga=;.*Max-Age=0/.test(w))).toBe(true);
  });

  it('saying yes again after a no works without loading gtag.js twice', async () => {
    const env = setup('granted');
    const { analytics, consent } = await load();
    analytics.initAnalytics();
    consent.writeConsent('denied');
    consent.writeConsent('granted');
    expect(env.win[`ga-disable-${ID}`]).toBe(false);
    expect(env.appended).toHaveLength(1);
    const before = (env.win.dataLayer as unknown[]).length;
    analytics.trackPageView('/quran');
    expect((env.win.dataLayer as unknown[]).length).toBeGreaterThan(before);
  });
});
