// Derives the small, app-side place index used to name a location ON THE
// DEVICE (audit PRIV-03): nearest city for a GPS fix, and offline city search.
// Same curated city list as the SEO pages (cities.generated.json), reduced to
// [name, countryCode, lat, lng] so the app only loads ~60 KB, and only when
// someone sets a location. Run by `npm run data:cities`; output checked in.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src', 'data', 'cities.generated.json');
const OUT = join(__dirname, '..', 'src', 'data', 'placeIndex.generated.json');

const round = (n) => Math.round(n * 1000) / 1000;
const cities = JSON.parse(readFileSync(SRC, 'utf8'));
// Largest first, so a search shows the best-known match first.
const rows = cities
  .slice()
  .sort((a, b) => b.population - a.population)
  .map((c) => [c.name, c.countryCode, round(c.lat), round(c.lng)]);

writeFileSync(OUT, JSON.stringify(rows) + '\n');
process.stdout.write(`Wrote ${rows.length} places to ${OUT}\n`);
