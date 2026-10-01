// i18n completeness check (audit T2.10 / UX-05), run in CI.
//
// Fails when:
//  - an English key has no Bangla translation, unless its namespace is
//    deliberately English-only (below);
//  - a Bangla key does not exist in English (a typo, or a stale key);
//  - a translation's {{placeholders}} differ from the English ones (a missing
//    {{count}} silently drops a number from the sentence).
//
// Usage: node scripts/check-i18n.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = join(__dirname, '..', 'src', 'locales');

/** Namespaces that are English-only on purpose. */
const ENGLISH_ONLY = new Set([
  // Admin pages (Servant/Ansar only).
  'adminSadaqah',
  // Naseeh AI is English only (decision 2026-09): hidden in Bangla mode.
  'aiFlair',
  'fastingCompanion',
  'muhasabah',
  'naseeh',
  'naseehChat',
  'naseehKaza',
  'naseehPatterns',
  'naseehPrivacy',
  'naturalLog',
  'streakCoaching',
]);

/** Placeholders that exist only for English grammar and may be left out of
 * the Bangla sentence: key -> names. */
const ENGLISH_GRAMMAR_ONLY = {
  // "fast" / "fasts": Bangla needs no plural word.
  'fasting.ramadanQadaWarning': ['fastsWord'],
};

const load = (lang) =>
  JSON.parse(readFileSync(join(LOCALES, lang, 'common.json'), 'utf8').replace(/^\uFEFF/, ''));

function flatten(obj, prefix = '') {
  const out = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') for (const [k2, v2] of flatten(v, key)) out.set(k2, v2);
    else out.set(key, String(v));
  }
  return out;
}

/** {{name}} / {{name, number}} -> "name"; i18next's own count/context keys included. */
const placeholders = (s, key) =>
  [...s.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)]
    .map((m) => m[1])
    .filter((name) => !(ENGLISH_GRAMMAR_ONLY[key] ?? []).includes(name))
    .sort()
    .join(',');

const en = flatten(load('en'));
const bn = flatten(load('bn'));

/** Plural forms: bn may use only `_other` where en has `_one` + `_other`. */
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const bnBases = new Set([...bn.keys()].map(base));
const enBases = new Set([...en.keys()].map(base));

const missing = [];
const extra = [];
const mismatched = [];

for (const [key, value] of en) {
  const ns = key.split('.')[0];
  if (ENGLISH_ONLY.has(ns)) continue;
  if (!bn.has(key) && !bnBases.has(base(key))) missing.push(key);
  else if (bn.has(key) && placeholders(value, key) !== placeholders(bn.get(key), key)) {
    mismatched.push(`${key}: en {{${placeholders(value, key)}}} / bn {{${placeholders(bn.get(key), key)}}}`);
  }
}
for (const key of bn.keys()) {
  if (!en.has(key) && !enBases.has(base(key))) extra.push(key);
}

const report = (title, list) => {
  if (!list.length) return;
  process.stderr.write(`\n${title} (${list.length}):\n${list.map((k) => `  ${k}`).join('\n')}\n`);
};
report('Missing Bangla translations', missing);
report('Bangla keys with no English source', extra);
report('Placeholder mismatch', mismatched);

if (missing.length || extra.length || mismatched.length) {
  process.stderr.write(
    '\ni18n check failed. Translate the keys (Bangla script, calm wording), or, if a whole\n' +
      'feature is English-only by decision, add its namespace to ENGLISH_ONLY in this script.\n'
  );
  process.exit(1);
}
process.stdout.write(
  `i18n check: ${en.size} English keys, ${bn.size} Bangla; complete outside ${ENGLISH_ONLY.size} English-only namespaces.\n`
);
