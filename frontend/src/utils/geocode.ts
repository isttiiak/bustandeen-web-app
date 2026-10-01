// Naming a prayer-times location: turning a GPS fix into "Dhaka, Bangladesh",
// and finding a city typed by name. Prayer times themselves are always
// computed on the device; this module only finds a NAME for the place.
//
// Two ways, the user's choice (audit PRIV-03, decision Q14):
//   - 'device' (default): a bundled index of ~1,450 cities, searched on the
//     device. Nothing about the location leaves the browser. Covers cities,
//     not every town; further than 200 km from any of them, the place is
//     simply shown as coordinates.
//   - 'osm': OpenStreetMap's free Nominatim service. Finds any town or
//     village, but the request reaches OpenStreetMap, so the coordinates are
//     ROUNDED to two decimals (about 1 km) before they are sent.

export interface StoredLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export type PlaceLookup = 'device' | 'osm';

/** A place found by a search: coordinates + a short display name. */
export interface PlaceResult {
  latitude: number;
  longitude: number;
  name: string;
}

const PLACE_LOOKUP_KEY = 'bustandeen_place_lookup';

export function getPlaceLookup(): PlaceLookup {
  try {
    return localStorage.getItem(PLACE_LOOKUP_KEY) === 'osm' ? 'osm' : 'device';
  } catch {
    return 'device';
  }
}

export function setPlaceLookup(mode: PlaceLookup): void {
  try {
    localStorage.setItem(PLACE_LOOKUP_KEY, mode);
  } catch {
    /* private mode */
  }
}

/** "23.81, 90.41" — the fallback name saved when reverse geocoding fails.
 * Used to detect an already-saved location that never got a real city name,
 * so it can be silently re-resolved later instead of staying stuck forever. */
const RAW_COORD_NAME_RE = /^-?\d{1,3}\.\d{1,4}, ?-?\d{1,3}\.\d{1,4}$/;
export function looksLikeRawCoordinates(name: string): boolean {
  return RAW_COORD_NAME_RE.test(name.trim());
}

export function coordinatesLabel(lat: number, lon: number): string {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

// ─── On the device ──────────────────────────────────────────────────────────

/** [name, ISO country code, lat, lng], largest city first. */
type PlaceRow = [string, string, number, number];

let indexPromise: Promise<PlaceRow[]> | null = null;

/** Lazy: the ~60 KB index loads only when someone actually sets a location. */
function loadPlaceIndex(): Promise<PlaceRow[]> {
  indexPromise ??= import('../data/placeIndex.generated.json').then(
    (m) => m.default as unknown as PlaceRow[]
  );
  return indexPromise;
}

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

const placeName = (row: PlaceRow) => `${row[0]}, ${countryLabel(row[1])}`;

/** Within METRO_KM the LARGEST city wins: the list includes neighbourhoods
 * (Paltan, Azimpur…) that are technically nearest but are not what anyone
 * calls the place. Within SAME_PLACE_KM the nearest city is the place; up to
 * NEAR_KM it is "Near <city>"; beyond that no city name is honest. */
const METRO_KM = 15;
const SAME_PLACE_KM = 40;
const NEAR_KM = 200;

export function nearestPlaceIn(
  rows: PlaceRow[],
  lat: number,
  lon: number
): { name: string; km: number } | null {
  let best: PlaceRow | null = null;
  let bestKm = Infinity;
  let largestInMetro: { row: PlaceRow; km: number } | null = null;
  for (const row of rows) {
    const km = distanceKm(lat, lon, row[2], row[3]);
    // Rows are largest-first, so the first one inside the metro radius is the biggest.
    if (km <= METRO_KM && !largestInMetro) largestInMetro = { row, km };
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  if (largestInMetro) return { name: placeName(largestInMetro.row), km: largestInMetro.km };
  if (!best || bestKm > NEAR_KM) return null;
  return {
    name: bestKm <= SAME_PLACE_KM ? placeName(best) : `Near ${placeName(best)}`,
    km: bestKm,
  };
}

/** Lower-case, accents stripped ("Rājshāhi" → "rajshahi"). */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').toLowerCase().trim();
}

export function searchPlacesIn(rows: PlaceRow[], query: string, limit = 5): PlaceResult[] {
  // "Dhaka, Bangladesh" and "dhaka bangladesh" both match "dhaka bangladesh".
  const q = normalizeForSearch(query).replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!q) return [];
  const starts: PlaceRow[] = [];
  const contains: PlaceRow[] = [];
  for (const row of rows) {
    const name = normalizeForSearch(row[0]);
    const full = `${name} ${normalizeForSearch(countryLabel(row[1]))}`;
    if (name.startsWith(q) || full.startsWith(q)) starts.push(row);
    else if (name.includes(q) || full.includes(q)) contains.push(row);
  }
  return [...starts, ...contains]
    .slice(0, limit)
    .map((row) => ({ latitude: row[2], longitude: row[3], name: placeName(row) }));
}

// ─── OpenStreetMap ──────────────────────────────────────────────────────────

/** Two decimals ≈ 1 km: enough to name the town, not to find a house. */
const roundForOsm = (n: number) => Math.round(n * 100) / 100;

async function osmReverse(lat: number, lon: number): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${roundForOsm(lat)}&lon=${roundForOsm(lon)}&format=json&zoom=10`,
        { headers: { Accept: 'application/json' } }
      );
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as {
        address?: { city?: string; town?: string; village?: string; country?: string };
      };
      const city = d.address?.city ?? d.address?.town ?? d.address?.village;
      const country = d.address?.country;
      if (city || country) return [city, country].filter(Boolean).join(', ');
      return null;
    } catch {
      // Nominatim occasionally rate-limits or blips: retry once.
      if (attempt === 0) await new Promise((res) => setTimeout(res, 800));
    }
  }
  return null;
}

async function osmSearch(query: string): Promise<PlaceResult[]> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
  );
  if (!r.ok) throw new Error(String(r.status));
  const results = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return results.map((s) => ({
    latitude: parseFloat(s.lat),
    longitude: parseFloat(s.lon),
    name: s.display_name.split(',').slice(0, 2).join(',').trim(),
  }));
}

// ─── Public API (follows the user's choice) ─────────────────────────────────

/** "City, Country" for a GPS fix, or null (callers fall back to coordinates). */
export async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
  if (getPlaceLookup() === 'osm') return osmReverse(lat, lon);
  try {
    return nearestPlaceIn(await loadPlaceIndex(), lat, lon)?.name ?? null;
  } catch {
    return null;
  }
}

/** City search by name. Throws only on a network failure in 'osm' mode. */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (getPlaceLookup() === 'osm') return osmSearch(query);
  return searchPlacesIn(await loadPlaceIndex(), query);
}
