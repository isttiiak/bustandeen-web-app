import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CITIES, renderRoute, type RouteKind } from './entry-server.js';

// R0a (v5.179.0): the Bangladesh calibration to Islamic Foundation's
// timetable must not move a single byte of any other country's pages. The
// snapshot holds one hash per country over every city's prayer-times and
// Ramadan pages, recorded before the change. If it fails, a non-BD page
// changed: make sure that was meant before updating it.

const BUILD_DATE = '2026-10-17T06:00:00.000Z';
const HIJRI_YEAR = 1448;

function html(route: RouteKind): string {
  return renderRoute({ route, lang: 'en', buildDate: BUILD_DATE }).html;
}

describe('non-Bangladesh SSR output', () => {
  // Some pages read today's date (the current Hijri year): pin it.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(BUILD_DATE));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('every page outside Bangladesh is byte-identical', () => {
    const byCountry = new Map<string, ReturnType<typeof createHash>>();
    for (const city of CITIES) {
      if (city.countryCode === 'BD') continue;
      let hash = byCountry.get(city.countryCode);
      if (!hash) {
        hash = createHash('sha256');
        byCountry.set(city.countryCode, hash);
      }
      hash.update(html({ kind: 'prayer-times', citySlug: city.slug }));
      hash.update(html({ kind: 'ramadan-calendar', citySlug: city.slug, hijriYear: HIJRI_YEAR }));
    }
    const digests = Object.fromEntries(
      [...byCountry.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cc, h]) => [cc, h.digest('hex').slice(0, 16)])
    );
    expect(digests).toMatchSnapshot();
  }, 120_000);
});
