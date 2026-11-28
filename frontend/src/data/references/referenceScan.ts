// Finds every Quran / hadith citation in the source tree, so the reference
// map (/references) can say where each reference is used, and the test in
// this folder can fail when a citation appears that the registry does not
// know. Node-only (reads files); imported by references.test.ts, never by
// the app.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REFERENCES } from './registry.js';
import {
  REF_PAGES,
  ruleForFile,
  ruleForLocaleKey,
  type RefPage,
  type RefPageKey,
  type RefPlace,
} from './pages.js';

/** A citation found in one file. */
export interface Hit {
  id: string;
  file: string;
  line: number;
  /** For locales/en/common.json: the dotted key the citation sits in. */
  key?: string;
  /** The citation as a reader sees it (none for a bare link or a literal match). */
  text?: string;
  /** Inside a code comment: explains the code, not shown to anyone. */
  comment?: boolean;
  /** The card or item title nearest above the citation. */
  item?: string;
  /** A deep link more exact than the page (a special day). */
  path?: string;
  /** Pages decided by the line itself (the weak-narration explainer topics). */
  pages?: RefPageKey[];
  /** A locale-style key whose rule names the section (islamicCalendar.ts mirrors specialDays.*). */
  ruleKey?: string;
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

/** One citation on a line: its id, and the text a reader sees (none for a bare link). */
interface Citation {
  id: string;
  text?: string;
}

/** Every citation written on one line of source, with its visible text. */
function citations(line: string): Citation[] {
  const out: Citation[] = [];
  let rest = line;
  rest = rest.replace(SUNNAH_URL, (_m, coll: string, n?: string, b?: string, h?: string) => {
    out.push({ id: n ? `${coll}:${n}` : `${coll}/${b}/${h}` });
    return ' ';
  });
  rest = rest.replace(QURAN_URL, (_m, s: string, a?: string, b?: string) => {
    const id = quranId(s, a, b);
    if (id) out.push({ id });
    return ' ';
  });
  for (const [rx, coll] of HADITH_RX) {
    rest = rest.replace(rx, (m: string, n1: string, n2?: string) => {
      const text = m.trim();
      out.push({ id: `${coll}:${n1}`, text });
      if (n2) out.push({ id: `${coll}:${n2}`, text });
      return ' ';
    });
  }
  for (const rx of [QURAN_TEXT, QURAN_PAREN, QURAN_AFTER_DOT]) {
    rest = rest.replace(rx, (m: string, s: string, a: string, b?: string) => {
      const id = quranId(s, a, b);
      // "(2:37)" and "· 2:37" show the numbers only; "Quran 2:37" shows it all.
      if (id) out.push({ id, text: m.replace(/^[(·\s]+|[)\s]+$/g, '') });
      return ' ';
    });
  }
  return out;
}

/** Literal match text a reader would see, not a code identifier. */
function isShownWords(lit: string): boolean {
  return !/[_=(){}:]|^(const|export) |\/answers\/|\/fatwa\//.test(lit) && /[a-z]/.test(lit);
}

/** Every citation id written on one line of source. */
export function citationIds(line: string): string[] {
  return citations(line).map((c) => c.id);
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
  const root = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as Record<
    string,
    unknown
  >;
  const days = (root.specialDays ?? {}) as Record<string, { name?: string }>;
  const visit = (node: unknown, key: string): void => {
    if (typeof node === 'string') {
      // The reference map's own UI strings (search examples) are not citations.
      if (key.startsWith('references.')) return;
      const day = /^specialDays\.([^.]+)\./.exec(key)?.[1];
      for (const { id, text } of citations(node)) {
        hits.push({
          id,
          file,
          line: 0,
          key,
          ...(text ? { text } : {}),
          ...(day && days[day]?.name ? { item: days[day].name, path: `/special-day/${day}` } : {}),
        });
      }
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) visit(v, key ? `${key}.${k}` : k);
    }
  };
  visit(root, '');
  return hits;
}

/** Title fields that name the card or item a citation belongs to. */
const ITEM_RX =
  /^\s*(?:name|title|label|labelFallback|when|situation|heading)\s*:\s*(?:\{\s*en:\s*)?(['"`])((?:(?!\1).)+)\1/;

function itemAbove(lines: string[], i: number): string | undefined {
  for (let j = i; j >= Math.max(0, i - 30); j--) {
    const m = ITEM_RX.exec(lines[j]!);
    if (m) return m[2]!.replace(/\\'/g, "'");
  }
  return undefined;
}

/** The special day (islamicCalendar.ts SPECIAL_DAYS) a line belongs to. */
function dayAbove(lines: string[], i: number): { id: string; name?: string } | undefined {
  for (let j = i; j >= 0; j--) {
    const id = /^ {4}id: '([a-z0-9_]+)',/.exec(lines[j]!)?.[1];
    if (id) {
      const name = /^ {4}name: (['"])(.+)\1,/.exec(lines[j + 1] ?? '')?.[2];
      return { id, ...(name ? { name: name.replace(/\\'/g, "'") } : {}) };
    }
  }
  return undefined;
}

/** Weak-narration explainer topics and the screens that show them. */
const DAIF_TOPIC_PLACES: Record<string, { pages: RefPageKey[]; path?: string; item: string }> = {
  'ramadan-ashra': { pages: ['ramadan', 'ramadanAnalytics'], item: 'The three ʿashras' },
  'nafl-fard-reward': { pages: ['ramadan', 'ramadanAnalytics'], item: 'Nafl rewarded like farḍ' },
  'iftar-dua': { pages: ['calendar'], path: '/special-day/fast_mon_thu', item: 'Sunnah Fast Day' },
  'mid-shaban': {
    pages: ['calendar'],
    path: '/special-day/shab_e_barat',
    item: "Laylat al-Barā'ah",
  },
  'waqiah-poverty': { pages: [], item: 'Sūrat al-Wāqiʿah and poverty' },
};

function placeHints(file: string, lines: string[], i: number): Partial<Hit> {
  if (file.endsWith('utils/islamicCalendar.ts')) {
    const day = dayAbove(lines, i);
    if (day) {
      let part = 'significance';
      for (let j = i; j >= 0; j--) {
        const m = /^ {4}(references|todos|significance|shortDesc|id):/.exec(lines[j]!);
        if (m) {
          part = m[1] === 'id' ? 'significance' : m[1]!;
          break;
        }
      }
      return {
        path: `/special-day/${day.id}`,
        ruleKey: `specialDays.${day.id}.${part}`,
        ...(day.name ? { item: day.name } : {}),
      };
    }
  }
  if (file.endsWith('components/DaifExplainer.tsx')) {
    for (let j = i; j >= 0; j--) {
      const topic = /^ {4}id: '([a-z-]+)',/.exec(lines[j]!)?.[1];
      const place = topic ? DAIF_TOPIC_PLACES[topic] : undefined;
      if (place)
        return {
          pages: place.pages,
          item: place.item,
          ...(place.path ? { path: place.path } : {}),
        };
    }
  }
  const item = itemAbove(lines, i);
  return item ? { item } : {};
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
    const lines = readFileSync(path, 'utf8').split('\n');
    let inBlock = false;
    lines.forEach((line, i) => {
      const t = line.trim();
      const startsBlock = /^(\{\s*)?\/\*/.test(t);
      const comment = inBlock || startsBlock || t.startsWith('//') || t.startsWith('*');
      if (startsBlock && !t.includes('*/')) inBlock = true;
      else if (inBlock && t.includes('*/')) inBlock = false;
      const found: Citation[] = [
        ...citations(line),
        ...literals
          .filter(([lit]) => line.includes(lit))
          // A literal that reads as words ("tanzil.net", "Umm al-Qura calendar") is
          // what the screen shows; a code name (QASR_DISTANCE_KM) is not.
          .map(([lit, id]) => ({ id, ...(isShownWords(lit) ? { text: lit } : {}) })),
      ];
      if (found.length === 0) return;
      const hints = comment ? {} : placeHints(file, lines, i);
      for (const { id, text } of found) {
        hits.push({
          id,
          file,
          line: i + 1,
          ...(text ? { text } : {}),
          ...(comment ? { comment } : {}),
          ...hints,
        });
      }
    });
  }
  hits.push(...localeHits(join(repo, 'frontend/src/locales/en/common.json'), repo));
  return hits;
}

/** Registry id for a scanned id (direct, or via an entry's aliases). */
function resolveId(id: string): string | null {
  for (const r of REFERENCES) if (r.id === id || r.aliases?.includes(id)) return r.id;
  return null;
}

export interface UsageMap {
  [id: string]: {
    /** Where people see it: screen, section, item. */
    places: RefPlace[];
    /** Source files that cite it (shown in the admin checklist, not the public page). */
    files: string[];
    /** Code comments that cite it (explaining a rule), when there is no visible place. */
    codeNotes?: number;
  };
}

const placeKey = (p: RefPlace) => `${p.page}|${p.path ?? ''}|${p.section}|${p.item ?? ''}`;

/** Group hits into per-reference usage: the places people see it, and the files. */
export function buildUsage(hits: Hit[]): { usage: UsageMap; unknown: Hit[]; unpaged: string[] } {
  const usage: UsageMap = {};
  const unknown: Hit[] = [];
  const unpaged = new Set<string>();
  const notes: Record<string, number> = {};
  // The visible citation per reference and file: a link line (href) borrows
  // the text written next to it, such as the label under the same link.
  const shownText = new Map<string, string>();
  for (const h of hits) {
    const key = `${h.id}|${h.file}`;
    if (h.text && !h.comment && !shownText.has(key)) shownText.set(key, h.text);
  }
  for (const h of hits) {
    const id = resolveId(h.id);
    if (!id) {
      unknown.push(h);
      continue;
    }
    const u = (usage[id] ??= { places: [], files: [] });
    if (!u.files.includes(h.file)) u.files.push(h.file);
    if (h.comment) {
      notes[id] = (notes[id] ?? 0) + 1;
      continue;
    }
    const lkey = h.key ?? h.ruleKey;
    const rule = lkey ? ruleForLocaleKey(lkey) : ruleForFile(h.file);
    if (!rule) {
      unpaged.add(h.key ? `${h.file} (${h.key})` : h.file);
      continue;
    }
    for (const page of h.pages ?? rule.pages) {
      const place: RefPlace = {
        page,
        ...(h.path && h.path !== (REF_PAGES[page] as RefPage).path ? { path: h.path } : {}),
        section: rule.section,
        sectionBn: rule.sectionBn,
        ...(h.item && !rule.noItem ? { item: h.item } : {}),
      };
      // Highlight the citation; failing that, the card's own title.
      const text = h.text ?? shownText.get(`${h.id}|${h.file}`) ?? place.item;
      const same = u.places.find((p) => placeKey(p) === placeKey(place));
      if (!same) u.places.push({ ...place, ...(text ? { text } : {}) });
      else if (!same.text && text) same.text = text;
    }
  }
  const sorted: UsageMap = {};
  for (const id of Object.keys(usage).sort()) {
    const u = usage[id]!;
    sorted[id] = {
      places: u.places.sort((a, b) => placeKey(a).localeCompare(placeKey(b))),
      files: u.files.sort(),
      ...(u.places.length === 0 && notes[id] ? { codeNotes: notes[id] } : {}),
    };
  }
  return { usage: sorted, unknown, unpaged: [...unpaged].sort() };
}
