import { describe, expect, it } from 'vitest';
import seo from '../../data/seoCities.generated.json';
import all from '../../data/cities.generated.json';
import { CITIES, cityBySlug } from './cities.js';
import { BD_DISTRICTS } from './bdDistricts.js';
import { POPULAR_CITY_LINKS } from '../../components/LandingSeoSections.js';
import { MUSLIM_MAJORITY } from '../../../scripts/countries.mjs';

// Need-based city pages (Istiak, 2026-10-15): ~500 cities, few in
// Muslim-majority countries, many where Muslims are a minority.
describe('SEO city list', () => {
  it('has about 500 cities with unique slugs', () => {
    expect(CITIES.length).toBeGreaterThan(450);
    expect(CITIES.length).toBeLessThan(560);
    expect(new Set(CITIES.map((c) => c.slug)).size).toBe(CITIES.length);
  });

  it('at most 3 cities per Muslim-majority country, except the home market', () => {
    const per = new Map<string, number>();
    for (const c of CITIES) per.set(c.countryCode, (per.get(c.countryCode) ?? 0) + 1);
    for (const code of Object.keys(MUSLIM_MAJORITY)) {
      if (code === 'BD') continue;
      expect(per.get(code) ?? 0, code).toBeLessThanOrEqual(3);
    }
    expect(per.get('SE')).toBeGreaterThanOrEqual(5);
    expect(per.get('BE')).toBeGreaterThanOrEqual(5);
    expect(per.get('JP')).toBeGreaterThanOrEqual(5);
    expect(per.get('KR')).toBeGreaterThanOrEqual(5);
  });

  it('keeps every Bangladesh city and every district town', () => {
    const bd = all.filter((c) => c.countryCode === 'BD').map((c) => c.slug);
    for (const slug of bd) expect(cityBySlug(slug), slug).toBeDefined();
    for (const d of BD_DISTRICTS) expect(cityBySlug(d.citySlug), d.citySlug).toBeDefined();
  });

  it('keeps the cities the landing page links to', () => {
    for (const c of POPULAR_CITY_LINKS) expect(cityBySlug(c.slug), c.slug).toBeDefined();
  });

  it('a city that already had pages keeps its URL', () => {
    const old = new Map(all.map((c) => [`${c.countryCode}:${c.name}`, c.slug]));
    for (const c of seo) {
      const prior = old.get(`${c.countryCode}:${c.name}`);
      if (prior) expect(c.slug).toBe(prior);
    }
  });
});
