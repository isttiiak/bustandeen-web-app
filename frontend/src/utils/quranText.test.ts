import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import xml from '../../data/tanzil/quran-uthmani.xml?raw';
import buildScript from '../../scripts/build-quran-text.mjs?raw';
import backendCounts from '../../../backend/src/utils/surahAyahCounts.ts?raw';

// Audit T2.6: the bundled Tanzil text must be a verbatim copy (Tanzil's terms
// forbid any change) and every file must carry Tanzil's notice. These checks
// parse the XML on their own, independently of scripts/build-quran-text.mjs.
// Files are read through Vite (?raw, import.meta.glob) so the test needs no
// Node types.

const files = import.meta.glob<string>('../../public/quran/uthmani/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const rawSurah = (n: number) => files[`../../public/quran/uthmani/${n}.json`] ?? '';

const store = new Map<string, unknown>();
vi.mock('./idbCache.js', () => ({
  idbGet: (key: string) => Promise.resolve(store.get(key)),
  idbSet: (key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  },
  idbRemove: (key: string) => {
    store.delete(key);
    return Promise.resolve();
  },
}));

const { arabicAyahs, loadSurahText } = await import('./quranData.js');
import type { TanzilSurah } from './quranData.js';

const xmlSurahs = [...xml.matchAll(/<sura index="(\d+)"[^>]*>([\s\S]*?)<\/sura>/g)].map((m) => ({
  surah: Number(m[1]),
  ayahs: [...(m[2] ?? '').matchAll(/<aya index="\d+" text="([^"]*)"(?: bismillah="([^"]*)")?/g)],
}));
const surahFile = (n: number) => JSON.parse(rawSurah(n)) as TanzilSurah;

// Standard Kufan counts, read from the backend's table so the two can't drift.
const BACKEND_COUNTS = (/SURAH_AYAH_COUNTS[^=]*=\s*\[([\s\S]*?)\]/.exec(backendCounts)?.[1] ?? '')
  .split(',')
  .filter((s) => s.trim() !== '')
  .map(Number)
  .slice(1);

describe('bundled Tanzil text', () => {
  it('is the pinned Tanzil Uthmani v1.1 file', async () => {
    // The file is UTF-8 without a BOM, so its bytes are the string's encoding.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(xml));
    const sha = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const pinned = /TANZIL_SHA256 = '([0-9a-f]{64})'/.exec(buildScript)?.[1];
    expect(sha).toBe(pinned);
    expect(xml).toContain('Tanzil Quran Text (Uthmani, Version 1.1)');
    expect(xml).not.toContain('&'); // no XML entities to unescape
  });

  it('has 114 files, 6,236 ayat, and the standard count for every surah', () => {
    expect(Object.keys(files)).toHaveLength(114);
    expect(BACKEND_COUNTS).toHaveLength(114);
    let start = 1;
    for (let n = 1; n <= 114; n++) {
      const s = surahFile(n);
      expect(s.surah).toBe(n);
      expect(s.ayahs).toHaveLength(BACKEND_COUNTS[n - 1] ?? -1);
      expect(s.start).toBe(start);
      start += s.ayahs.length;
    }
    expect(start - 1).toBe(6236);
  });

  it('copies every ayah and basmala byte for byte', () => {
    expect(xmlSurahs).toHaveLength(114);
    for (const { surah, ayahs } of xmlSurahs) {
      const s = surahFile(surah);
      expect(s.ayahs).toEqual(ayahs.map((a) => a[1]));
      expect(s.bismillah).toBe(ayahs[0]?.[2]);
    }
  });

  it("carries Tanzil's full notice and a link in every file", () => {
    const notice = /<!--([\s\S]*?)-->/.exec(xml)?.[1]?.trim();
    expect(notice).toContain('CHANGING IT IS NOT ALLOWED');
    for (let n = 1; n <= 114; n++) {
      const s = surahFile(n);
      expect(s.notice).toBe(notice);
      expect(s.source).toContain('https://tanzil.net');
    }
  });

  // Expected Arabic is always taken from the files, never typed here: typed
  // Arabic can order the same marks differently (e.g. shadda + fatha).
  it('has a basmala on every surah but al-Fātiḥah (its ayah 1) and at-Tawbah', () => {
    const basmala = surahFile(1).ayahs[0];
    expect(basmala?.split(' ')).toHaveLength(4);
    expect(surahFile(1).bismillah).toBeUndefined();
    expect(surahFile(9).bismillah).toBeUndefined();
    // Tanzil writes the first letter with a shadda (بِّسْمِ) before at-Tīn (95)
    // and al-Qadr (97); alquran.cloud showed the same. Compare the other words.
    const rest = (t?: string) => t?.split(' ').slice(1);
    for (let n = 2; n <= 114; n++) {
      if (n === 9) continue;
      const b = surahFile(n).bismillah;
      if (n === 95 || n === 97) expect(rest(b)).toEqual(rest(basmala));
      else expect(b).toBe(basmala);
    }
  });
});

describe('arabicAyahs', () => {
  it('puts the basmala before ayah 1 only, as the reader always showed it', () => {
    const file = surahFile(112);
    const ikhlas = arabicAyahs(file);
    expect(ikhlas[0]).toBe(`${file.bismillah} ${file.ayahs[0]}`);
    expect(ikhlas.slice(1)).toEqual(file.ayahs.slice(1));
    expect(arabicAyahs(surahFile(1))).toEqual(surahFile(1).ayahs);
    expect(arabicAyahs(surahFile(9))).toEqual(surahFile(9).ayahs);
  });
});

describe('loadSurahText', () => {
  let apiUp = true;
  const apiCalls: string[] = [];

  beforeEach(() => {
    store.clear();
    apiCalls.length = 0;
    apiUp = true;
    vi.stubGlobal('fetch', (input: string) => {
      const local = /^\/quran\/uthmani\/(\d+)\.json$/.exec(input);
      if (local) {
        return Promise.resolve(new Response(rawSurah(Number(local[1]))));
      }
      apiCalls.push(input);
      if (!apiUp) return Promise.reject(new TypeError('Failed to fetch'));
      const eds = input.split('/editions/')[1]?.split(',') ?? [];
      const count = surahFile(Number(/surah\/(\d+)\//.exec(input)?.[1])).ayahs.length;
      const data = eds.map((ed) => ({
        ayahs: Array.from({ length: count }, (_, i) => ({ text: `${ed} ${i + 1}` })),
      }));
      return Promise.resolve(new Response(JSON.stringify({ data })));
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('takes the Arabic from the bundle and only translations from the API', async () => {
    const ayat = await loadSurahText(112, ['en.sahih', 'bn.bengali'], true);
    expect(apiCalls).toEqual([
      'https://api.alquran.cloud/v1/surah/112/editions/en.sahih,bn.bengali,en.transliteration',
    ]);
    expect(ayat).toHaveLength(4);
    expect(ayat[1]).toEqual({
      numberInSurah: 2,
      number: 6223,
      arabic: surahFile(112).ayahs[1],
      translations: ['en.sahih 2', 'bn.bengali 2'],
      transliteration: 'en.transliteration 2',
    });
  });

  it('caches the translations: the second open makes no API call', async () => {
    await loadSurahText(1, ['en.sahih']);
    await loadSurahText(1, ['en.sahih']);
    expect(apiCalls).toHaveLength(1);
  });

  it('still shows the Arabic when the translations cannot be fetched', async () => {
    apiUp = false;
    const ayat = await loadSurahText(1, ['en.sahih']);
    expect(ayat.map((a) => a.arabic)).toEqual(surahFile(1).ayahs);
    expect(ayat[0]?.translations).toEqual(['']);
    expect(ayat[6]?.number).toBe(7);
    apiUp = true;
    await loadSurahText(1, ['en.sahih']); // not cached as empty: tries again
    expect(apiCalls).toHaveLength(2);
  });

  it('reuses translations cached before v5.78.0 but never their Arabic', async () => {
    const legacyKey = 'bustandeen_surah_text_114_en.sahih_v2';
    store.set(
      legacyKey,
      surahFile(114).ayahs.map((_, i) => ({
        numberInSurah: i + 1,
        number: 6231 + i,
        arabic: 'old api text',
        translations: [`cached ${i + 1}`],
      }))
    );
    const ayat = await loadSurahText(114, ['en.sahih']);
    expect(apiCalls).toEqual([]);
    expect(ayat[0]?.translations).toEqual(['cached 1']);
    expect(ayat.map((a) => a.arabic)).toEqual(arabicAyahs(surahFile(114)));
    expect(store.has(legacyKey)).toBe(false);
  });
});
