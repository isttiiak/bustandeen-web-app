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
import { buildUsage, citationIds, scanRepo } from './referenceScan.js';
import { referencesDocument, type ManualCheck } from './referenceExport.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../../..');
const USAGE_PATH = join(here, 'usage.generated.json');
const MANUAL_PATH = join(here, 'manualChecks.json');
const PUBLIC_PATH = join(repo, 'frontend/public/references.json');
const UPDATE = process.env.UPDATE_REFS === '1';

const { usage, unknown, unpaged } = buildUsage(scanRepo(repo));
const manual = JSON.parse(readFileSync(MANUAL_PATH, 'utf8')) as Record<string, ManualCheck>;
const usageText = JSON.stringify(usage, null, 2) + '\n';
const publicText = JSON.stringify(referencesDocument(usage, manual), null, 2) + '\n';

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

  it('keeps manual checks to known references and a fixed shape', () => {
    const known = new Set(REFERENCES.map((r) => r.id));
    for (const [id, m] of Object.entries(manual)) {
      expect(known.has(id), `manualChecks.json: unknown id ${id}`).toBe(true);
      expect(['source-verified', 'scholar-confirmed', 'needs-correction']).toContain(m.status);
      expect(m.by.trim().length, id).toBeGreaterThan(0);
      expect(m.date, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
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
