import fs from 'node:fs';
import request from 'supertest';
import app from '../src/app.js';

// 2026-10-15: per-city Qibla pages removed, ~500 cities keep their pages.
// Old URLs with no prerendered file land here and get a permanent redirect.
describe('Removed SEO page redirects', () => {
  const cases = [
    ['/qibla/karachi-pakistan', '/qibla'],
    ['/bn/qibla/dhaka-bangladesh', '/qibla'],
    ['/ar/qibla/cairo-egypt/', '/qibla'],
    ['/prayer-times/bekasi-indonesia', '/prayer-times'],
    ['/ar/prayer-times/bekasi-indonesia', '/prayer-times'],
    ['/prayer-times/bekasi-indonesia/2026-10', '/prayer-times'],
    ['/ramadan-calendar/bekasi-indonesia/2027', '/ramadan-calendar'],
    ['/bn/ramadan-calendar/bekasi-indonesia/2027', '/bn/ramadan-calendar'],
    ['/ar/ramadan-calendar/bekasi-indonesia/2027', '/ar/ramadan-calendar'],
  ];

  test.each(cases)('%s → 301 %s', async (from, to) => {
    const res = await request(app).get(from);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(to);
  });

  test('the bare live pages are not redirected', async () => {
    for (const p of ['/qibla', '/prayer-times', '/ramadan-calendar']) {
      expect((await request(app).get(p)).status).toBe(404);
    }
  });

  test('vercel.json sends only unmatched old SEO paths here, before the app-shell catch-all', () => {
    const vercel = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url)));
    const sources = vercel.rewrites.map((r) => r.source);
    const seo = sources.indexOf('/((?:bn/|ar/)?(?:prayer-times|ramadan-calendar|qibla)/.+)');
    expect(seo).toBeGreaterThan(-1);
    expect(seo).toBeLessThan(sources.indexOf('/((?!api/|__/|assets/).*)'));
    expect(vercel.rewrites[seo].destination).toBe('/api/index');
  });
});
