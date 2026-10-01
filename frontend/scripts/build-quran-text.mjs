#!/usr/bin/env node
// Splits the bundled Tanzil Uthmani text (audit T2.6 / PWA-02) into one JSON
// file per surah under public/quran/uthmani/, so the reader loads only the
// surah it opens and works offline once a surah has been read.
//
// Source: data/tanzil/quran-uthmani.xml, Tanzil Quran Text (Uthmani, v1.1),
// downloaded from tanzil.net with pause marks, sajdah signs, rub el hizb signs
// and the small low meem after tanween (the same options alquran.cloud used).
//
// Tanzil's terms: verbatim copies only, credit Tanzil Project with a link to
// tanzil.net, and keep the copyright notice in every derived file. So the ayah
// strings are copied byte for byte (no trimming, no normalisation), and every
// output file carries the full notice. The XML's checksum is pinned below: if
// the file is replaced, update TANZIL_SHA256 on purpose.
//
// Run: npm run quran:text. The output is committed; src/utils/quranText.test.ts
// checks it still matches the XML byte for byte.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TANZIL_XML = join(root, 'data/tanzil/quran-uthmani.xml');
export const OUT_DIR = join(root, 'public/quran/uthmani');
export const TANZIL_SHA256 = 'cb8a9569407e4a3ad80d83e438edd63d9fb83b12f438215a60415a8640d5366f';

/** Undo the five XML entity escapes; Tanzil's text uses none today. */
const unescapeXml = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

export function parseTanzil(xml) {
  const notice = /<!--([\s\S]*?)-->/.exec(xml)?.[1];
  if (!notice || !notice.includes('Tanzil Project')) throw new Error('Tanzil notice not found');
  const surahs = [];
  for (const m of xml.matchAll(/<sura index="(\d+)" name="([^"]*)">([\s\S]*?)<\/sura>/g)) {
    const ayahs = [];
    let bismillah;
    for (const a of m[3].matchAll(
      /<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")? \/>/g
    )) {
      if (Number(a[1]) !== ayahs.length + 1)
        throw new Error(`surah ${m[1]}: ayah ${a[1]} out of order`);
      ayahs.push(unescapeXml(a[2]));
      if (a[3] !== undefined) bismillah = unescapeXml(a[3]);
    }
    surahs.push({ surah: Number(m[1]), name: unescapeXml(m[2]), bismillah, ayahs });
  }
  if (surahs.length !== 114) throw new Error(`expected 114 surahs, got ${surahs.length}`);
  return { notice: notice.replace(/^\s+|\s+$/g, ''), surahs };
}

/** `start` is the global number (1..6236) of the surah's first ayah, so the
 * reader can number ayat (khatam, per-ayah audio) without the API. */
export function surahFile(notice, s, start) {
  return (
    JSON.stringify({
      notice,
      source: 'Tanzil Quran Text (Uthmani, Version 1.1), https://tanzil.net',
      surah: s.surah,
      name: s.name,
      start,
      ...(s.bismillah !== undefined ? { bismillah: s.bismillah } : {}),
      ayahs: s.ayahs,
    }) + '\n'
  );
}

function main() {
  const buf = readFileSync(TANZIL_XML);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== TANZIL_SHA256) throw new Error(`quran-uthmani.xml checksum changed: ${sha}`);
  const { notice, surahs } = parseTanzil(buf.toString('utf8'));
  mkdirSync(OUT_DIR, { recursive: true });
  let start = 1;
  for (const s of surahs) {
    writeFileSync(join(OUT_DIR, `${s.surah}.json`), surahFile(notice, s, start));
    start += s.ayahs.length;
  }
  if (start !== 6237) throw new Error(`expected 6236 ayat, got ${start - 1}`);
  console.error(`Wrote ${surahs.length} surahs to public/quran/uthmani/`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
