// Builds the ~500 cities that get SEO pages (src/data/seoCities.generated.json),
// by the need-based policy in scripts/seoCityPolicy.mjs (2026-10-15).
// Run on demand with `npm run data:seo-cities`; the output is checked in.
//
// The bigger cities.generated.json is NOT replaced: the app's on-device place
// search (placeIndex.generated.json) is built from it and must keep every city.
// A city that already had pages keeps its slug, so its URL does not change.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cities from 'all-the-cities';
import { find as findTz } from 'geo-tz';
import { COUNTRY_NAMES } from './countries.mjs';
import {
  ALL,
  QUOTA,
  PINS,
  RENAME,
  SKIP,
  MIN_POPULATION,
  MIN_DISTANCE_KM,
} from './seoCityPolicy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'data');
const OUT_PATH = join(DATA, 'seoCities.generated.json');
const existing = JSON.parse(readFileSync(join(DATA, 'cities.generated.json'), 'utf8'));

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function km(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const round = (n) => Math.round(n * 10000) / 10000;
const toEntry = (c) => ({
  name: c.name,
  countryCode: c.country,
  lat: round(c.loc.coordinates[1]),
  lng: round(c.loc.coordinates[0]),
  population: c.population,
});

const byCountry = new Map();
for (const c of cities) {
  if (!(c.country in QUOTA) || QUOTA[c.country] === ALL) continue;
  if (c.featureCode === 'PPLX' || SKIP.has(`${c.country}:${c.name}`)) continue;
  if (!byCountry.has(c.country)) byCountry.set(c.country, []);
  byCountry.get(c.country).push(c);
}

const picked = [];
for (const [code, quota] of Object.entries(QUOTA)) {
  if (quota === ALL) {
    picked.push(...existing.filter((e) => e.countryCode === code).map((e) => ({ ...e })));
    continue;
  }
  const pool = (byCountry.get(code) ?? []).sort((a, b) => b.population - a.population);
  const chosen = [];
  for (const name of PINS[code] ?? []) {
    const hit = pool.find((c) => c.name === name);
    if (!hit) throw new Error(`Pinned city not found: ${code} ${name}`);
    chosen.push(toEntry(hit));
  }
  for (const c of pool) {
    if (chosen.length >= quota) break;
    if (c.population < MIN_POPULATION) break;
    const e = toEntry(c);
    if (chosen.some((p) => p.name === e.name || km(p, e) < MIN_DISTANCE_KM)) continue;
    chosen.push(e);
  }
  if (chosen.length === 0) console.error(`No city for ${code}`);
  picked.push(...chosen.slice(0, Math.max(quota, PINS[code]?.length ?? 0)));
}

// Slugs: an existing page keeps its slug; new ones follow the same pattern.
const used = new Set();
const result = [];
for (const c of picked) {
  if (c.slug) {
    used.add(c.slug);
    result.push(c);
    continue;
  }
  const country = COUNTRY_NAMES[c.countryCode] ?? c.countryCode;
  const prior = existing.find(
    (e) =>
      e.countryCode === c.countryCode &&
      e.name === c.name &&
      Math.abs(e.lat - c.lat) < 0.05 &&
      Math.abs(e.lng - c.lng) < 0.05
  );
  let slug = prior?.slug ?? `${slugify(c.name)}-${slugify(country)}`;
  for (let n = 2; used.has(slug); n++) slug = `${slugify(c.name)}-${slugify(country)}-${n}`;
  used.add(slug);
  result.push({
    slug,
    name: RENAME[`${c.countryCode}:${c.name}`] ?? c.name,
    country,
    countryCode: c.countryCode,
    lat: c.lat,
    lng: c.lng,
    timezone: prior?.timezone ?? findTz(c.lat, c.lng)[0] ?? 'UTC',
    population: c.population,
  });
}

result.sort((a, b) => b.population - a.population);
writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n');

const perCountry = {};
for (const c of result) perCountry[c.countryCode] = (perCountry[c.countryCode] ?? 0) + 1;
console.error(`Wrote ${result.length} SEO cities to ${OUT_PATH}`);
console.error(
  Object.entries(perCountry)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
);
