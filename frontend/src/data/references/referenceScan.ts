// Finds every Quran / hadith citation in the source tree, so the reference
// map (/references) can say where each reference is used, and the test in
// this folder can fail when a citation appears that the registry does not
// know. Node-only (reads files); imported by references.test.ts, never by
// the app.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REFERENCES } from './registry.js';
import { pagesForFile, pagesForLocaleKey } from './pages.js';

/** A citation found in one file. */
export interface Hit {
  id: string;
  file: string;
  line: number;
  /** For locales/en/common.json: the dotted key the citation sits in. */
  key?: string;
}

const COLLECTIONS: [RegExp, string][] = [
  // Longest / most specific first: matched text is blanked so "Ḥiṣn al-Muslim
  // 98" is not also read as "Muslim 98".
  [/Ḥiṣn al-Muslim|Hisn al-Muslim/, 'hisn'],
  [/(?:an-|al-)?Nas[aā][ʾ'’]?[iī],? (?:al-Sunan )?al-Kubr[aā]/, 'nasai-kubra'],
  [/Ṣaḥīḥ at-Targhīb/, 'targhib'],
  [/(?:Ṣaḥīḥ )?Ibn Khuzaymah/, 'ibnkhuzaymah'],
  [/Shuʿab al-Īmān/, 'bayhaqi-shuab'],
  [/(?:Ṣaḥīḥ al-|Sahih al-|Sahih |Ṣaḥīḥ )?Bukh[aā]r[iī]/, 'bukhari'],
  [/(?:Ṣaḥīḥ |Sahih )?Muslim/, 'muslim'],
  [/(?:Jāmiʿ (?:al-|at-)|Jami' at-|Sunan al-)?Tirmidh[iī]/, 'tirmidhi'],
  [/(?:Sunan )?Ab[uūiī] D[aā]w[uū]d/, 'abudawud'],
  [/(?:Sunan )?(?:an-|al-)?Nas[aā][ʾ'’]?[iī]/, 'nasai'],
  [/(?:Sunan )?Ibn M[aā]jah/, 'ibnmajah'],
  [/Musnad A[hḥ]mad/, 'ahmad'],
];
const NUM = String.raw`\s+(\d{1,5})[a-z]?(?:\s*(?:,|and|&|/)\s*(\d{1,5})[a-z]?)?\b`;
const HADITH_RX = COLLECTIONS.map(
  ([name, id]) => [new RegExp(`(?<![\\p{L}])(?:${name.source})${NUM}`, 'gu'), id] as const
);
const SUNNAH_URL = /sunnah\.com\/([a-z0-9]+)(?::(\d+)[a-z]?|\/(\d+)\/(\d+))/g;
const QURAN_URL = /quran\.com\/(\d{1,3})(?:\/(\d{1,3})(?:-(\d{1,3}))?)?/g;
const QURAN_TEXT = /(?:Qur[ʾ'’]?[aā]n|Quran)\s+(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?/g;
const QURAN_PAREN = /\((\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?\)/g;
// Three groups like the other Quran patterns: String.replace passes the match
// offset right after the last group, so a missing group would read as an ayah.
const QURAN_AFTER_DOT = /·\s*(\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?\b/g;

function quranId(s: string, a?: string, b?: string): string | null {
  const surah = Number(s);
  if (surah < 1 || surah > 114) return null;
  if (!a) return `quran:${surah}`;
  if (Number(a) < 1 || Number(a) > 286) return null;
  return b ? `quran:${surah}:${a}-${b}` : `quran:${surah}:${a}`;
}

/** Every citation id written on one line of source. */
export function citationIds(line: string): string[] {
  const ids: string[] = [];
  let rest = line;
  rest = rest.replace(SUNNAH_URL, (_m, coll: string, n?: string, b?: string, h?: string) => {
    ids.push(n ? `${coll}:${n}` : `${coll}/${b}/${h}`);
    return ' ';
  });
  rest = rest.replace(QURAN_URL, (_m, s: string, a?: string, b?: string) => {
    const id = quranId(s, a, b);
    if (id) ids.push(id);
    return ' ';
  });
  for (const [rx, coll] of HADITH_RX) {
    rest = rest.replace(rx, (_m, n1: string, n2?: string) => {
      ids.push(`${coll}:${n1}`);
      if (n2) ids.push(`${coll}:${n2}`);
      return ' ';
    });
  }
  for (const rx of [QURAN_TEXT, QURAN_PAREN, QURAN_AFTER_DOT]) {
    rest = rest.replace(rx, (_m, s: string, a: string, b?: string) => {
      const id = quranId(s, a, b);
      if (id) ids.push(id);
      return ' ';
    });
  }
  return ids;
}

const SKIP =
  /(\.test\.|__snapshots__|\.baselines|generated|[\\/]data[\\/]references[\\/]|[\\/]references[\\/]|References\.tsx$|AdminReferences|[\\/]locales[\\/]bn[\\/]|[\\/]test[\\/]|\.d\.ts$)/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !SKIP.test(p)) out.push(p);
  }
}

/** Citations in the English locale, with the dotted key each sits under. */
function localeHits(path: string, repo: string): Hit[] {
  const hits: Hit[] = [];
  const file = relative(repo, path).split(sep).join('/');
  const visit = (node: unknown, key: string): void => {
    if (typeof node === 'string') {
      // The reference map's own UI strings (search examples) are not citations.
      if (key.startsWith('references.')) return;
      for (const id of citationIds(node)) hits.push({ id, file, line: 0, key });
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) visit(v, key ? `${key}.${k}` : k);
    }
  };
  visit(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')), '');
  return hits;
}

/** Scan the repo (frontend/src, en locale, backend/src). */
export function scanRepo(repo: string): Hit[] {
  const files: string[] = [];
  walk(join(repo, 'frontend/src'), files);
  walk(join(repo, 'backend/src'), files);
  const hits: Hit[] = [];
  const literals = REFERENCES.flatMap((r) => (r.match ?? []).map((m) => [m, r.id] as const));
  for (const path of files) {
    const file = relative(repo, path).split(sep).join('/');
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const id of citationIds(line)) hits.push({ id, file, line: i + 1 });
        for (const [lit, id] of literals)
          if (line.includes(lit)) hits.push({ id, file, line: i + 1 });
      });
  }
  hits.push(...localeHits(join(repo, 'frontend/src/locales/en/common.json'), repo));
  return hits;
}

/** Registry id for a scanned id (direct, or via an entry's aliases). */
export function resolveId(id: string): string | null {
  for (const r of REFERENCES) if (r.id === id || r.aliases?.includes(id)) return r.id;
  return null;
}

export interface UsageMap {
  [id: string]: { pages: string[]; files: string[] };
}

/** Group hits into per-reference usage: the pages and files that cite it. */
export function buildUsage(hits: Hit[]): { usage: UsageMap; unknown: Hit[]; unpaged: string[] } {
  const usage: UsageMap = {};
  const unknown: Hit[] = [];
  const unpaged = new Set<string>();
  for (const h of hits) {
    const id = resolveId(h.id);
    if (!id) {
      unknown.push(h);
      continue;
    }
    const pages = h.key ? pagesForLocaleKey(h.key) : pagesForFile(h.file);
    if (pages.length === 0) unpaged.add(h.key ? `${h.file} (${h.key})` : h.file);
    const u = (usage[id] ??= { pages: [], files: [] });
    for (const p of pages) if (!u.pages.includes(p)) u.pages.push(p);
    if (!u.files.includes(h.file)) u.files.push(h.file);
  }
  const sorted: UsageMap = {};
  for (const id of Object.keys(usage).sort()) {
    sorted[id] = { pages: usage[id]!.pages.sort(), files: usage[id]!.files.sort() };
  }
  return { usage: sorted, unknown, unpaged: [...unpaged].sort() };
}
