import { describe, expect, it } from 'vitest';
import { BD_DISTRICTS, BD_DIVISIONS, BD_PART_OF, bdDistrictForCity } from './bdDistricts.js';
import { CITIES, cityBySlug, cityCountry, cityLabel, cityName } from './cities.js';
import { CHROME, bnIn, bnOf } from '../locales/chrome.js';

const BENGALI = /^[ঀ-৿\s]+$/;

describe('BD_DISTRICTS', () => {
  it('has the 64 districts in the 8 divisions', () => {
    expect(BD_DISTRICTS).toHaveLength(64);
    const perDivision = Object.fromEntries(
      Object.keys(BD_DIVISIONS).map((d) => [d, BD_DISTRICTS.filter((x) => x.division === d).length])
    );
    expect(perDivision).toEqual({
      barishal: 6,
      chattogram: 11,
      dhaka: 13,
      khulna: 10,
      mymensingh: 4,
      rajshahi: 8,
      rangpur: 8,
      sylhet: 4,
    });
  });

  it('has unique ids, names and pages', () => {
    for (const key of ['id', 'en', 'bn', 'citySlug'] as const) {
      expect(new Set(BD_DISTRICTS.map((d) => d[key])).size).toBe(64);
    }
  });

  it('writes Bangla names in Bangla script', () => {
    for (const d of BD_DISTRICTS) expect(d.bn).toMatch(BENGALI);
    for (const d of Object.values(BD_DIVISIONS)) expect(d.bn).toMatch(BENGALI);
  });

  it('gives every district a Bangladesh city page inside the country', () => {
    for (const d of BD_DISTRICTS) {
      const city = cityBySlug(d.citySlug);
      expect(city, d.id).toBeDefined();
      expect(city!.countryCode).toBe('BD');
      expect(city!.timezone).toBe('Asia/Dhaka');
      expect(city!.lat).toBeGreaterThan(20.5);
      expect(city!.lat).toBeLessThan(26.7);
      expect(city!.lng).toBeGreaterThan(88);
      expect(city!.lng).toBeLessThan(92.7);
    }
  });

  it('adds the 34 missing HQ towns without touching existing pages', () => {
    const added = BD_DISTRICTS.filter((d) => d.hq);
    expect(added).toHaveLength(34);
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
    // The existing Dhaka page keeps its slug and coordinates.
    expect(cityBySlug('dhaka-bangladesh')).toMatchObject({ lat: 23.7104, lng: 90.4074 });
  });

  it('maps every other BD city page to a district', () => {
    for (const city of CITIES.filter((c) => c.countryCode === 'BD')) {
      expect(bdDistrictForCity(city.slug), city.slug).toBeDefined();
    }
    for (const id of Object.values(BD_PART_OF)) {
      expect(BD_DISTRICTS.some((d) => d.id === id)).toBe(true);
    }
  });
});

describe('city names by language', () => {
  const dhaka = cityBySlug('dhaka-bangladesh')!;
  const tungi = cityBySlug('tungi-bangladesh')!;

  it('uses the Bangla district name on Bangla pages of HQ towns', () => {
    expect(cityName(dhaka, 'bn')).toBe('ঢাকা');
    expect(cityCountry(dhaka, 'bn')).toBe('বাংলাদেশ');
    expect(cityLabel(dhaka, 'bn')).toBe('ঢাকা, বাংলাদেশ');
  });

  it('keeps English names elsewhere', () => {
    expect(cityLabel(dhaka, 'en')).toBe('Dhaka, Bangladesh');
    expect(cityName(dhaka, 'ar')).toBe('Dhaka');
    expect(cityName(tungi, 'bn')).toBe(tungi.name);
    expect(bdDistrictForCity('tungi-bangladesh')).toMatchObject({
      isHq: false,
      district: { id: 'gazipur' },
    });
  });

  it('gives Bangla place names their real case ending', () => {
    expect(bnOf('ঢাকা')).toBe('ঢাকার');
    expect(bnOf('সিলেট')).toBe('সিলেটের');
    expect(bnOf('রাজশাহী')).toBe('রাজশাহীর');
    expect(bnOf('নওগাঁ')).toBe('নওগাঁর');
    expect(bnOf('ঠাকুরগাঁও')).toBe('ঠাকুরগাঁওয়ের');
    expect(bnOf('ময়মনসিংহ')).toBe('ময়মনসিংহের');
    expect(bnIn('বাংলাদেশ')).toBe('বাংলাদেশে');
    expect(bnIn('ঢাকা')).toBe('ঢাকায়');
    expect(bnIn('রাজশাহী')).toBe('রাজশাহীতে');
    // Latin-script names keep the hyphenated form.
    expect(bnOf('London')).toBe('London-এর');
    expect(bnIn('United Kingdom')).toBe('United Kingdom-এ');
    expect(CHROME.bn.prayerTimes.heading('ঢাকা')).toBe('ঢাকার আজকের নামাজের সময়');
    expect(CHROME.bn.prayerTimes.heading('London')).toBe('London-এ আজকের নামাজের সময়');
  });

  it('names the two GeoNames-artifact HQ towns after their district', () => {
    expect(cityBySlug('par-naogaon-bangladesh')!.name).toBe('Naogaon');
    expect(cityBySlug('nawabganj-bangladesh')!.name).toBe('Chapainawabganj');
  });
});
