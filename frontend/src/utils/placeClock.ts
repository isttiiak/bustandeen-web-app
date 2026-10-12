// The saved prayer place's own clock (far-zone fix, 2026-10-12).
//
// Prayer times are instants computed from coordinates, but every DAY the app
// talks about (the tracking day, the Hijri day, Friday, the fast) belongs to
// the place whose times are on screen, not to the phone's clock. A phone on
// London time with Dhaka saved must still start the day at Fajr in Dhaka.
//
// The place's clock zone comes from an on-device zone map
// (@photostructure/tz-lookup, CC0, loaded lazily, no network: the location
// never leaves the device). Until it has loaded, or if it fails, we estimate:
// a place within 3 h of the phone's own offset is taken to share the phone's
// zone (civil time runs up to ~3 h from solar time: Spain, western China, DST),
// anything further gets the offset of its longitude (15° ≈ 1 h).

type ZoneLookup = (lat: number, lng: number) => string;

let lookup: ZoneLookup | null = null;
let loading: Promise<void> | null = null;

/** Loads the zone map once. Safe to call often; resolves even if it fails. */
export function loadZoneLookup(): Promise<void> {
  loading ??= import('@photostructure/tz-lookup')
    .then((m) => {
      const fn = ((m as { default?: unknown }).default ?? m) as unknown;
      if (typeof fn === 'function') lookup = fn as ZoneLookup;
    })
    .catch(() => {
      loading = null; // offline before the chunk was cached: try again later
    });
  return loading;
}

/** Test hook: back to the estimate-only state. */
export function resetZoneLookupForTests(): void {
  lookup = null;
  loading = null;
}

const offsetFormats = new Map<string, Intl.DateTimeFormat | null>();

function offsetFormat(zone: string): Intl.DateTimeFormat | null {
  if (!offsetFormats.has(zone)) {
    let f: Intl.DateTimeFormat | null;
    try {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      f = null; // a zone this browser does not know
    }
    offsetFormats.set(zone, f);
  }
  return offsetFormats.get(zone)!;
}

/** Minutes east of UTC for an IANA zone at an instant, or null if unknown. */
export function zoneOffsetMin(zone: string, at: Date): number | null {
  const f = offsetFormat(zone);
  if (!f || Number.isNaN(at.getTime())) return null;
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
  const utcMinute = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((wall - utcMinute) / 60_000);
}

const ZONE_CACHE_KEY = 'bustandeen_place_zone';

interface CachedZone {
  lat: number;
  lng: number;
  zone: string;
}

function cachedZone(lat: number, lng: number): string | null {
  try {
    const raw = localStorage.getItem(ZONE_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedZone;
    return c?.lat === lat && c?.lng === lng && typeof c.zone === 'string' ? c.zone : null;
  } catch {
    return null;
  }
}

/** The IANA zone of a place, or null while only the estimate is available. */
export function placeZone(lat: number, lng: number): string | null {
  if (lookup) {
    try {
      const zone = lookup(lat, lng);
      if (offsetFormat(zone)) {
        if (cachedZone(lat, lng) !== zone) {
          try {
            localStorage.setItem(ZONE_CACHE_KEY, JSON.stringify({ lat, lng, zone }));
          } catch {
            /* private mode */
          }
        }
        return zone;
      }
    } catch {
      /* invalid coordinates: estimate below */
    }
  }
  const cached = cachedZone(lat, lng);
  return cached && offsetFormat(cached) ? cached : null;
}

/** Largest gap between a zone's civil offset and its longitude's solar offset. */
const MAX_SAME_ZONE_DRIFT_MIN = 180;

/** Minutes east of UTC on the place's clock at an instant. */
export function placeOffsetMin(lat: number, lng: number, at: Date): number {
  const zone = placeZone(lat, lng);
  const exact = zone ? zoneOffsetMin(zone, at) : null;
  if (exact !== null) return exact;
  const device = -at.getTimezoneOffset();
  const estimate = Math.round(lng / 15) * 60;
  // Compared round the clock: Samoa and Tonga keep UTC+13 at longitude -172,
  // a whole day from their longitude, and a phone there is in their zone.
  const gap = (((estimate - device) % 1440) + 1440) % 1440;
  return Math.min(gap, 1440 - gap) <= MAX_SAME_ZONE_DRIFT_MIN ? device : estimate;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD on the place's clock at an instant. */
export function placeYmd(lat: number, lng: number, at: Date): string {
  const wall = new Date(at.getTime() + placeOffsetMin(lat, lng, at) * 60_000);
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`;
}

/** Calendar arithmetic on YYYY-MM-DD (no time zones, no DST). */
export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD. */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Noon on the phone's clock of a YYYY-MM-DD: a safe Date to read that day back from. */
export function ymdNoon(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function deviceYmd(at: Date = new Date()): string {
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export interface SavedPlace {
  latitude: number;
  longitude: number;
  name?: string;
}

/** The saved prayer-times location, or null. */
export function readSavedPlace(): SavedPlace | null {
  try {
    const raw = localStorage.getItem('bustandeen_location');
    if (!raw) return null;
    const loc = JSON.parse(raw) as SavedPlace;
    if (
      typeof loc?.latitude !== 'number' ||
      typeof loc?.longitude !== 'number' ||
      !Number.isFinite(loc.latitude) ||
      !Number.isFinite(loc.longitude)
    )
      return null;
    return loc;
  } catch {
    return null;
  }
}

/** Minutes east of UTC on the saved place's clock (the phone's without one).
 * Sent to the "time of day" charts, which group real moments by hour on the
 * server. Not for day buckets: those keep the phone's offset (v5.159.4). */
export function placeClockOffsetMin(at: Date = new Date()): number {
  const loc = readSavedPlace();
  return loc ? placeOffsetMin(loc.latitude, loc.longitude, at) : -at.getTimezoneOffset();
}

/** Noon of a YYYY-MM-DD on the saved place's clock (the phone's without one).
 * Zikr counts are anchored here: with the place offset sent too, the server
 * files them under that day for any phone zone (v5.160.0). */
export function placeNoonTs(ymd: string): number {
  const loc = readSavedPlace();
  if (!loc) return ymdNoon(ymd).getTime();
  const [y, m, d] = ymd.split('-').map(Number);
  const utcNoon = Date.UTC(y!, m! - 1, d!, 12);
  const at = (t: number) => placeOffsetMin(loc.latitude, loc.longitude, new Date(t)) * 60_000;
  // Twice: the offset at the guessed instant (a DST change never falls at noon)
  return utcNoon - at(utcNoon - at(utcNoon));
}

/** Today's calendar date at the saved place (the phone's date without one). */
export function placeToday(at: Date = new Date()): string {
  const loc = readSavedPlace();
  return loc ? placeYmd(loc.latitude, loc.longitude, at) : deviceYmd(at);
}

/**
 * The saved place's zone when its clock differs from the phone's right now,
 * else null. Prayer times are then shown on the place's clock, labelled.
 */
export function foreignPlaceZone(at: Date = new Date()): string | null {
  const loc = readSavedPlace();
  if (!loc) return null;
  const zone = placeZone(loc.latitude, loc.longitude);
  if (!zone) return null;
  const off = zoneOffsetMin(zone, at);
  return off !== null && off !== -at.getTimezoneOffset() ? zone : null;
}

/** The phone's own IANA zone ('' if the browser cannot tell). */
export function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

/** "Dhaka" from "Dhaka, Bangladesh", else the zone's city ("Asia/Dhaka"). */
export function placeShortName(loc: SavedPlace | null, zone: string | null): string {
  const fromName = loc?.name?.split(',')[0]?.trim();
  if (fromName) return fromName;
  return zone ? (zone.split('/').pop() ?? zone).replace(/_/g, ' ') : '';
}

const MISMATCH_DISMISSED_KEY = 'bustandeen_zone_mismatch_dismissed';

/**
 * The phone's clock is on another zone than the saved place (most often a
 * traveller whose location is still home): the card under the Home arch.
 * Null when the zones agree, or when this pair of zones was dismissed.
 */
export function zoneMismatch(at: Date = new Date()): { zone: string; key: string } | null {
  const zone = foreignPlaceZone(at);
  if (!zone) return null;
  const key = `${deviceZone()}|${zone}`;
  try {
    if (localStorage.getItem(MISMATCH_DISMISSED_KEY) === key) return null;
  } catch {
    /* private mode: show it */
  }
  return { zone, key };
}

export function dismissZoneMismatch(key: string): void {
  try {
    localStorage.setItem(MISMATCH_DISMISSED_KEY, key);
  } catch {
    /* private mode */
  }
}
