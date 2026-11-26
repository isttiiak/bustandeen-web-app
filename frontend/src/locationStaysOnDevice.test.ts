import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The privacy promise (CLAUDE.md rule 6, the Privacy page, the location picker):
// the saved place (latitude and longitude) stays in this browser. Prayer times
// are worked out on the device and the server never receives the coordinates.
//
// CodeQL flags the saved place being written to localStorage as "clear text
// storage of sensitive data" (alerts 12 and 13 in placeClock.ts, and others).
// That storage is the feature: the place has to live somewhere on the device,
// and encrypting it in the same page would protect nothing. What matters is that
// it does not leave. This test checks the ways it could, so a dismissed alert is
// backed by a failing build instead of by a promise:
//
//  1. the server has no field, model, schema or route for coordinates;
//  2. a file that reads the saved place or its coordinates does not also call the
//     network, except the two listed below, each with its reason;
//  3. the settings synced between a person's devices never include the place;
//  4. the one request that carries coordinates (the opt-in place-name lookup) goes
//     only to OpenStreetMap, rounds them to about 1 km, and runs only when chosen;
//  5. analytics and the data backup never read the saved place.
//
// It cannot prove that no value derived from the place is ever sent (a hook given
// the coordinates as an argument would not be seen); review and the Privacy page
// cover that. It does catch the likely regressions: a new field, a new fetch next
// to the place, a synced key, a widened lookup.

const frontend = fileURLToPath(new URL('.', import.meta.url));
const backend = fileURLToPath(new URL('../../backend/src/', import.meta.url));

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );
const read = (file: string) => readFileSync(file, 'utf8');
// Line comments only when the // does not follow a colon, so https:// in a URL survives.
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');

const COORDINATES = /\b(latitude|longitude|lat|lng|lon)\b/i;
// (`lng` is left out here: in this code it is the language.)
const READS_PLACE = /\bbustandeen_location\b|\b(latitude|longitude|lat)\b/;
const NETWORK =
  /\bapi\.(get|post|put|patch|delete)\b|\baxios\b|\bfetch\(|sendBeacon|XMLHttpRequest|new WebSocket|\buseMutation\(|\buseQuery\(|\bgtag\(/;

/** Files that read the place and also touch the network, each with why that is fine. */
const ALLOWED_WITH_NETWORK: Record<string, string> = {
  'utils/geocode.ts':
    'the opt-in place-name lookup to OpenStreetMap; its limits are checked in test 4 below',
};

const frontendFiles = walk(frontend)
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .map((f) => ({ rel: f.slice(frontend.length).replace(/\\/g, '/'), src: stripComments(read(f)) }));

describe('the server has no place for coordinates', () => {
  const files = walk(backend).filter((f) => !/\.test\.[jt]sx?$/.test(f));

  it('finds the backend sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no backend source names latitude, longitude, lat, lng or lon (models, schemas, routes, services)', () => {
    const hits = files
      .filter((f) => COORDINATES.test(stripComments(read(f))))
      .map((f) => f.slice(backend.length));
    expect(hits).toEqual([]);
  });
});

describe('files that read the saved place', () => {
  const readers = frontendFiles.filter(
    ({ rel, src }) => READS_PLACE.test(src) && !rel.startsWith('seo/') && !rel.startsWith('data/')
  );

  it('finds the readers', () => {
    expect(readers.map((r) => r.rel)).toEqual(
      expect.arrayContaining(['utils/placeClock.ts', 'utils/prayerTimes.ts', 'utils/geocode.ts'])
    );
  });

  it('do not call the network, except the ones listed with a reason', () => {
    const offenders = readers
      .filter(({ rel, src }) => NETWORK.test(src) && !(rel in ALLOWED_WITH_NETWORK))
      .map((r) => r.rel);
    expect(offenders).toEqual([]);
  });

  it('the allow-list only names files that still read the place and still use the network', () => {
    for (const rel of Object.keys(ALLOWED_WITH_NETWORK)) {
      const file = frontendFiles.find((f) => f.rel === rel);
      expect(file, rel).toBeDefined();
      expect(READS_PLACE.test(file!.src), `${rel} reads the place`).toBe(true);
      expect(NETWORK.test(file!.src), `${rel} uses the network`).toBe(true);
    }
  });

  it('no mutate call in the Salat tracker names the place (its writes carry prayer ids, statuses, venue tags and window instants)', () => {
    const src = frontendFiles.find((f) => f.rel === 'pages/SalatTracker.tsx')!.src;
    const calls = [...src.matchAll(/\.mutate(?:Async)?\(/g)];
    expect(calls.length).toBeGreaterThan(0);
    for (const m of calls) {
      const call = src.slice(m.index!, m.index! + 700);
      // ("location" there is the prayer venue: home, mosque, jamaat. Not a place.)
      expect(call, `mutate call at ${m.index}`).not.toMatch(
        /\b(latitude|longitude|lat|lng|coords?)\b|bustandeen_location|readSavedPlace|StoredLocation/i
      );
    }
  });
});

describe('settings synced between devices never carry the place', () => {
  const PLACE_KEY = /location|coord|zone|latitude|longitude|mismatch/i;
  // A switch (device or osm) is not a place.
  const SWITCHES = new Set(['bustandeen_place_lookup']);

  const keysIn = (file: string, from: string): string[] => {
    const src = stripComments(read(file));
    const at = src.indexOf(from);
    const open = src.indexOf('[', src.indexOf('=', at));
    const block = src.slice(open, src.indexOf(']', open));
    return [...block.matchAll(/'(bustandeen_[a-z0-9_]+)'/g)].map((m) => m[1]!);
  };

  it('the browser list names no place key', () => {
    const keys = keysIn(join(frontend, 'utils/prefsSync.ts'), 'const SYNCED_KEYS');
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((k) => PLACE_KEY.test(k) && !SWITCHES.has(k))).toEqual([]);
  });

  it('the server list names no place key', () => {
    const keys = keysIn(join(backend, 'services/userPrefs.service.ts'), 'SYNCED_PREF_KEYS');
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((k) => PLACE_KEY.test(k) && !SWITCHES.has(k))).toEqual([]);
  });
});

describe('the one request that carries coordinates', () => {
  const geocode = stripComments(read(join(frontend, 'utils/geocode.ts')));

  it('goes only to OpenStreetMap', () => {
    const urls = [...geocode.matchAll(/fetch\(\s*`([^`]+)`/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/^https:\/\/nominatim\.openstreetmap\.org\//);
  });

  it('rounds the coordinates to about 1 km before sending them', () => {
    expect(geocode).toMatch(/const roundForOsm = \(n: number\) => Math\.round\(n \* 100\) \/ 100;/);
    const reverse = geocode.match(/reverse\?lat=\$\{([^}]+)\}&lon=\$\{([^}]+)\}/);
    expect(reverse?.[1]).toBe('roundForOsm(lat)');
    expect(reverse?.[2]).toBe('roundForOsm(lon)');
  });

  it('runs only when the person chose OpenStreetMap, and the default is the on-device index', () => {
    expect(geocode).toMatch(/=== 'osm' \? 'osm' : 'device'/);
    const calls = geocode.match(/return osm(Reverse|Search)\(/g) ?? [];
    const guards = geocode.match(/getPlaceLookup\(\) === 'osm'/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(guards.length).toBeGreaterThanOrEqual(calls.length);
  });
});

describe('analytics and the backup do not read the place', () => {
  it.each([
    'utils/analytics.ts',
    'utils/analyticsConsent.ts',
    'hooks/useBackup.ts',
    'utils/backupExcel.ts',
  ])('%s', (rel) => {
    const src = stripComments(read(join(frontend, rel)));
    expect(src).not.toMatch(/bustandeen_location|\b(latitude|longitude)\b/);
  });
});
