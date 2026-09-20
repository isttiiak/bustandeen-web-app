// Builds the curated ~1,500-city dataset that backs /prayer-times/{city},
// /qibla/{city} and /ramadan-calendar/{city}/{year}. Run on demand (not on
// every build) via `npm run data:cities` — the output is checked in so
// builds stay deterministic and the city list is reviewable in diffs.
//
// Source: `all-the-cities` (GeoNames-derived). Timezones resolved offline
// via `geo-tz` (needed for Phase B/D to render each city's prayer times in
// its own local wall-clock time, not the build machine's).
//
// Tiered by country so the list favors real search intent instead of raw
// population: Muslim-majority countries get the lowest population bar
// (the core audience), India gets an intermediate bar (huge absolute
// Muslim population despite not being majority), known diaspora/minority
// hubs get a higher bar, and everything else only contributes its largest
// global cities.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cities from 'all-the-cities';
import { find as findTz } from 'geo-tz';
import { MUSLIM_MAJORITY, HIGH_MUSLIM_POPULATION, DIASPORA, COUNTRY_NAMES } from './countries.mjs';
// COUNTRY_NAMES already includes the full ISO fallback list, so every
// picked city (including "rest of world") resolves to a real name.

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'cities.generated.json');

const TIERS = [
  { codes: MUSLIM_MAJORITY, minPopulation: 30_000, cap: 1000 },
  { codes: HIGH_MUSLIM_POPULATION, minPopulation: 150_000, cap: 120 },
  { codes: DIASPORA, minPopulation: 300_000, cap: 300 },
];
const REST_OF_WORLD_MIN_POPULATION = 1_500_000;
const REST_OF_WORLD_CAP = 100;

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function pickTierCities({ codes, minPopulation, cap }) {
  const codeSet = new Set(Object.keys(codes));
  return cities
    .filter((c) => codeSet.has(c.country) && c.population >= minPopulation)
    .sort((a, b) => b.population - a.population)
    .slice(0, cap);
}

const knownCodes = new Set([
  ...Object.keys(MUSLIM_MAJORITY),
  ...Object.keys(HIGH_MUSLIM_POPULATION),
  ...Object.keys(DIASPORA),
]);

const restOfWorld = cities
  .filter((c) => !knownCodes.has(c.country) && c.population >= REST_OF_WORLD_MIN_POPULATION)
  .sort((a, b) => b.population - a.population)
  .slice(0, REST_OF_WORLD_CAP);

const picked = [...TIERS.flatMap(pickTierCities), ...restOfWorld];

const slugCounts = new Map();
const result = [];
const unnamedCodes = new Set();

for (const c of picked) {
  const countryName = COUNTRY_NAMES[c.country] ?? c.country;
  if (!COUNTRY_NAMES[c.country]) unnamedCodes.add(c.country);

  const [lng, lat] = c.loc.coordinates;
  const baseSlug = `${slugify(c.name)}-${slugify(countryName)}`;
  const count = slugCounts.get(baseSlug) ?? 0;
  slugCounts.set(baseSlug, count + 1);
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

  const tz = findTz(lat, lng)[0] ?? 'UTC';

  result.push({
    slug,
    name: c.name,
    country: countryName,
    countryCode: c.country,
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    timezone: tz,
    population: c.population,
  });
}

result.sort((a, b) => b.population - a.population);

writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n');

console.error(`Wrote ${result.length} cities to ${OUT_PATH}`);
if (unnamedCodes.size) {
  console.error('Country codes without a display name (using raw code):', [...unnamedCodes]);
}
