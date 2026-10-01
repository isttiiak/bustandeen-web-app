import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import rows from '../data/placeIndex.generated.json';
import {
  distanceKm,
  getPlaceLookup,
  nearestPlaceIn,
  normalizeForSearch,
  reverseGeocodeCity,
  searchPlaces,
  searchPlacesIn,
  setPlaceLookup,
} from './geocode.js';

// Audit PRIV-03: the app promised "your location never leaves this device"
// while every GPS fix was sent to OpenStreetMap. Now the default names the
// place on the device, and OpenStreetMap is an explicit, disclosed choice
// that only ever receives coordinates rounded to ~1 km.

type Row = [string, string, number, number];
const INDEX = rows as unknown as Row[];

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ address: { city: 'Dhaka', country: 'Bangladesh' } }),
  }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('on-device place names', () => {
  it('names a GPS fix in the city as that city, not a neighbourhood', () => {
    // Paltan and Azimpur (Dhaka neighbourhoods) are in the list and closer.
    expect(nearestPlaceIn(INDEX, 23.7806, 90.4193)?.name).toBe('Dhaka, Bangladesh');
    expect(nearestPlaceIn(INDEX, 23.729, 90.385)?.name).toBe('Dhaka, Bangladesh');
    // A separate town 20+ km out keeps its own name.
    expect(nearestPlaceIn(INDEX, 24.2513, 89.9167)?.name).toBe('Tāngāil, Bangladesh');
  });

  it('says "Near" further out, and gives up beyond 200 km', () => {
    // North of Mymensingh, ~75 km from the nearest city in the index.
    const near = nearestPlaceIn(INDEX, 25.2, 91.0);
    expect(near?.km).toBeGreaterThan(40);
    expect(near?.name.startsWith('Near ')).toBe(true);
    // Middle of the Indian Ocean.
    expect(nearestPlaceIn(INDEX, -30, 80)).toBeNull();
  });

  it('searches without accents, commas or case getting in the way', () => {
    expect(normalizeForSearch('Rājshāhi')).toBe('rajshahi');
    expect(searchPlacesIn(INDEX, 'rajshahi')[0].name).toBe('Rājshāhi, Bangladesh');
    expect(searchPlacesIn(INDEX, 'Dhaka, Bangladesh')[0].name).toBe('Dhaka, Bangladesh');
    expect(searchPlacesIn(INDEX, 'dha')[0].name).toBe('Dhaka, Bangladesh');
    expect(searchPlacesIn(INDEX, 'zzzz-not-a-city')).toEqual([]);
  });

  it('distance maths is sane (Dhaka → Chittagong ≈ 215 km)', () => {
    const km = distanceKm(23.8103, 90.4125, 22.3569, 91.7832);
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(230);
  });

  it('is the default, and makes no network request at all', async () => {
    expect(getPlaceLookup()).toBe('device');
    expect(await reverseGeocodeCity(23.7806, 90.4193)).toBe('Dhaka, Bangladesh');
    expect((await searchPlaces('karachi'))[0].name).toBe('Karachi, Pakistan');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('OpenStreetMap place names (opt-in)', () => {
  it('sends only coordinates rounded to two decimals (~1 km)', async () => {
    setPlaceLookup('osm');
    expect(await reverseGeocodeCity(23.780612, 90.419345)).toBe('Dhaka, Bangladesh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('lat=23.78&lon=90.42');
    expect(url).not.toContain('23.7806');
  });
});
