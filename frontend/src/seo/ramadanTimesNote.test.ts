import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderRoute } from './entry-server.js';

// R0d (v5.180.0): the world Ramadan page says how its two times are found.
// Where the country default is matched to an official timetable, the note
// names that timetable and the real minutes; elsewhere it says we add none.

const BUILD_DATE = '2026-10-17T06:00:00.000Z';

function page(citySlug: string): string {
  return renderRoute({
    route: { kind: 'ramadan-calendar', citySlug, hijriYear: 1448 },
    lang: 'en',
    buildDate: BUILD_DATE,
  }).html;
}

function note(citySlug: string): string {
  const m = page(citySlug).match(/<p>((?:Suhoor ends)[^<]*)<\/p>/);
  return (m?.[1] ?? '').replace(/&#x27;|&#39;/g, "'");
}

describe('world Ramadan times note', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(BUILD_DATE));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("Kuala Lumpur: JAKIM's 18°, the minutes, the timetable and its imsak", () => {
    const n = note('kuala-lumpur-malaysia');
    expect(n).toContain(
      'Suhoor ends 3 minutes before Fajr (JAKIM method, Fajr at 18° and 3 minutes of caution).'
    );
    expect(n).toContain('Iftar is at Maghrib, 3 minutes after sunset.');
    expect(n).toContain("Checked against JAKIM's timetable and kept on the safe side");
    expect(n).toContain('imsak, 10 minutes before Subuh, as a caution');
    expect(n).not.toContain('no minutes of caution');
  });

  it('London and Paris (not checked here): the method as is, no calibration claimed', () => {
    const london = note('london-united-kingdom');
    expect(london).toContain('Suhoor ends when Fajr begins');
    expect(london).toContain('Iftar is at Maghrib, which this method sets 3 minutes after sunset.');
    expect(london).toContain('We add no minutes of caution of our own');
    const paris = note('paris-france');
    expect(paris).toContain('Iftar is at Maghrib (sunset).');
    expect(paris).not.toContain('Checked against');
  });

  it('the suhoor column says "(Fajr)" only where suhoor ends at Fajr', () => {
    expect(page('kuala-lumpur-malaysia')).toContain('>Suhoor ends</th>');
    for (const slug of ['paris-france', 'london-united-kingdom', 'singapore-singapore']) {
      expect(page(slug), slug).toContain('>Imsak / Suhoor ends (Fajr)</th>');
    }
  });

  it('the daily Kuala Lumpur page names the JAKIM method', () => {
    const { html } = renderRoute({
      route: { kind: 'prayer-times', citySlug: 'kuala-lumpur-malaysia' },
      lang: 'en',
      buildDate: BUILD_DATE,
    });
    expect(html).toContain('Calculated with the JAKIM method');
  });

  it('no em dash', () => {
    for (const slug of ['kuala-lumpur-malaysia', 'london-united-kingdom', 'paris-france']) {
      expect(note(slug)).not.toContain('—');
    }
  });
});
