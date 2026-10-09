import { useEffect } from 'react';
import { useMoonSightingRecords } from '../hooks/useMoonSighting.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { deviceCountry } from '../utils/countryDefaults.js';
import { HIJRI_COUNTRY_KEY } from '../utils/islamicCalendar.js';

let nameToCode: Map<string, string> | null = null;

/** ISO code for an English country name from the profile (e.g. "Bangladesh"
 * → "BD"), built once from the browser's own region names. */
export function countryCodeFromName(name: string | undefined | null): string | null {
  if (!name) return null;
  if (!nameToCode) {
    nameToCode = new Map();
    try {
      const names = new Intl.DisplayNames(['en'], { type: 'region' });
      const A = 65;
      for (let i = 0; i < 26; i++) {
        for (let j = 0; j < 26; j++) {
          const code = String.fromCharCode(A + i, A + j);
          const n = names.of(code);
          if (n && n !== code) nameToCode.set(n.toLowerCase(), code);
        }
      }
    } catch {
      // No Intl.DisplayNames: the time zone fallback still works
    }
  }
  return nameToCode.get(name.trim().toLowerCase()) ?? null;
}

/**
 * Keeps the on-device inputs of the Hijri date current (T4.1): the cached
 * moon-sighting records and the country they are matched against (profile
 * country, else the phone's time zone). islamicCalendar.ts reads both
 * synchronously; no location or profile data leaves the device for this.
 */
export default function MoonSightingSync() {
  // Fetching is enough: the query writes the cache (useMoonSighting.ts)
  useMoonSightingRecords();
  const { data: profile } = useUserProfile();

  useEffect(() => {
    const code = countryCodeFromName(profile?.country) ?? deviceCountry();
    if (code) localStorage.setItem(HIJRI_COUNTRY_KEY, code);
    else localStorage.removeItem(HIJRI_COUNTRY_KEY);
  }, [profile?.country]);

  return null;
}
