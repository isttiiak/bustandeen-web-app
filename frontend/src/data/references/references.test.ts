// The reference map stays complete and current.
//
// - Every Quran / hadith citation in the code must be in registry.ts.
// - Every registry entry must still be used somewhere.
// - Every file that cites something must map to a screen (pages.ts).
// - usage.generated.json and public/references.json must match the code.
//
// After adding or moving a reference: `npm run refs:update --prefix frontend`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REFERENCES } from './registry.js';
import { REF_PAGES, encodeTextFragment, placeHref, type RefPage } from './pages.js';
import { buildUsage, citationIds, scanRepo } from './referenceScan.js';
import { referencesDocument } from './referenceExport.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../../..');
const USAGE_PATH = join(here, 'usage.generated.json');
const PUBLIC_PATH = join(repo, 'frontend/public/references.json');
const UPDATE = process.env.UPDATE_REFS === '1';

const { usage, unknown, unpaged } = buildUsage(scanRepo(repo));
const usageText = JSON.stringify(usage, null, 2) + '\n';
const publicText = JSON.stringify(referencesDocument(usage), null, 2) + '\n';

if (UPDATE) {
  writeFileSync(USAGE_PATH, usageText);
  writeFileSync(PUBLIC_PATH, publicText);
}

describe('citation scanner', () => {
  it('reads the citation forms the app writes', () => {
    expect(
      citationIds("source: 'Ṣaḥīḥ al-Bukhārī 998', url: 'https://sunnah.com/bukhari:998'")
    ).toEqual(['bukhari:998', 'bukhari:998']);
    expect(citationIds('(Sunan Abū Dāwūd 1067, 567)')).toEqual(['abudawud:1067', 'abudawud:567']);
    expect(citationIds('Ḥiṣn al-Muslim 98')).toEqual(['hisn:98']);
    expect(citationIds('Muslim 597a')).toEqual(['muslim:597']);
    expect(citationIds('an-Nasāʾī, al-Kubrā 9848')).toEqual(['nasai-kubra:9848']);
    expect(
      citationIds("ref: { text: 'Quran 7:23 · 2:37', url: 'https://quran.com/7/23' }")
    ).toEqual(['quran:7:23', 'quran:7:23', 'quran:2:37']);
    expect(citationIds("source: 'Quran 2:184–185'")).toEqual(['quran:2:184-185']);
    // Clock times and ratios are not ayahs.
    expect(citationIds('Fajr at 4:30, ratio 3:1')).toEqual([]);
  });
});

describe('reference registry', () => {
  it('knows every citation in the code', () => {
    const lines = unknown.map((h) => `${h.id}  ${h.file}${h.line ? `:${h.line}` : ` (${h.key})`}`);
    expect(lines, 'Add these to src/data/references/registry.ts').toEqual([]);
  });

  it('maps every citing file to a screen', () => {
    expect(unpaged, 'Add a rule to src/data/references/pages.ts').toEqual([]);
  });

  it('has no entry that the code no longer uses', () => {
    const unused = REFERENCES.filter((r) => !usage[r.id]).map((r) => r.id);
    expect(unused, 'Remove these from registry.ts, or add a match string').toEqual([]);
  });

  it('has unique ids and aliases, and https links', () => {
    const ids = REFERENCES.flatMap((r) => [r.id, ...(r.aliases ?? [])]);
    expect(ids.length).toBe(new Set(ids).size);
    for (const r of REFERENCES) {
      if (r.url) expect(r.url, r.id).toMatch(/^https:\/\//);
      expect(r.purpose.length, r.id).toBeGreaterThan(10);
      if (r.desk !== 'verified') expect(r.deskNote ?? r.kind, r.id).toBeTruthy();
    }
  });

  it('records weak narrations as weak or corrected, never plain verified', () => {
    for (const r of REFERENCES) {
      if (/ḍaʿīf|very weak/i.test(r.grade ?? '') && !/ṣaḥīḥ|ḥasan/i.test(r.grade ?? '')) {
        expect(['weak', 'corrected'], r.id).toContain(r.desk);
      }
    }
  });

  it('gives every reference an id the admin API accepts for a manual check', () => {
    // Same pattern as backend/src/validation/referenceCheck.schemas.ts
    for (const r of REFERENCES) {
      expect(r.id.length, r.id).toBeLessThanOrEqual(80);
      expect(r.id).toMatch(/^[a-z][a-z0-9-]*:[a-z0-9:.-]+$/);
    }
  });
});

describe('places in the app', () => {
  const where = (id: string) =>
    usage[id]?.places.map(
      (p) => `${p.path ?? p.page} › ${p.section}${p.item ? ` › ${p.item}` : ''}`
    );

  it('names the screen, section and item a reference sits in', () => {
    expect(where('bukhari:1166')).toEqual(['salat › Nafl prayers list › Istikharah']);
    expect(where('abudawud:5096')).toEqual(['duas › Duʿā by situation › Entering the Home']);
  });

  it('links calendar references to their own special-day page', () => {
    expect(where('abudawud:1067')).toEqual([
      "/special-day/friday › References › Friday (Jumu'ah)",
      "/special-day/friday › What to do › Friday (Jumu'ah)",
    ]);
  });

  it('does not count a citation in a code comment as a place', () => {
    expect(usage['muslim:612']?.places).toEqual([]);
    expect(usage['muslim:612']?.codeNotes).toBeGreaterThan(0);
  });

  it('gives every visible place a screen people can open, except email and help pages', () => {
    for (const [id, u] of Object.entries(usage)) {
      for (const p of u.places) {
        if (['admin', 'email', 'bayan'].includes(p.page)) continue;
        expect(p.path ?? (REF_PAGES[p.page] as RefPage).path, `${id} ${p.page}`).toMatch(/^\//);
      }
    }
  });
});

describe('highlight links', () => {
  it('encodes a text fragment, including the characters the directive reserves', () => {
    expect(encodeTextFragment('Quran 2:148')).toBe('Quran%202%3A148');
    expect(encodeTextFragment('al-Bukhārī 1166')).toBe('al%2DBukh%C4%81r%C4%AB%201166');
    expect(encodeTextFragment('Sunan Abū Dāwūd 1067, 567')).toContain('%2C');
  });

  it('opens the screen with the citation highlighted', () => {
    const friends = usage['quran:2:148']!.places.find((p) => p.section === 'Page heading')!;
    expect(placeHref(friends)).toBe('/friends#:~:text=Quran%202%3A148');
    const friday = usage['abudawud:1067']!.places[0]!;
    expect(placeHref(friday)).toMatch(/^\/special-day\/friday#:~:text=Sunan%20Ab/);
  });

  it('adds the Bangla form as a second directive, and drops a duplicate', () => {
    const p = { page: 'friends' as const, section: 's', sectionBn: 's', text: 'Quran 2:148' };
    expect(placeHref(p, 'কুরআন ২:১৪৮')).toBe(
      `/friends#:~:text=${encodeURIComponent('কুরআন ২:১৪৮')}&text=Quran%202%3A148`
    );
    expect(placeHref(p, 'Quran 2:148')).toBe('/friends#:~:text=Quran%202%3A148');
  });

  it('gives nearly every place something to highlight', () => {
    const places = Object.values(usage).flatMap((u) => u.places);
    const withText = places.filter((p) => p.text).length;
    expect(withText / places.length).toBeGreaterThan(0.95);
  });
});

describe('generated files', () => {
  it('usage.generated.json matches the code', () => {
    expect(readFileSync(USAGE_PATH, 'utf8'), 'Run npm run refs:update --prefix frontend').toBe(
      usageText
    );
  });

  it('public/references.json matches the registry', () => {
    expect(readFileSync(PUBLIC_PATH, 'utf8'), 'Run npm run refs:update --prefix frontend').toBe(
      publicText
    );
  });
});
