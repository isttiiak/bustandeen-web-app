// The country whose moon-sighting records apply when the Hijri date is on
// Automatic (T4.1). Pure, on-device: nothing about the user is sent.

import { regionCountry } from './salatPrefs.js';

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

/** The country whose moon-sighting records apply on Automatic: the profile
 * country, else the saved place's (its zone), else the phone's zone. The place
 * comes before the phone so a far-zone guest (London phone, Dhaka saved)
 * follows Bangladesh's committee, like the rest of the app (v5.159.5). */
export function autoHijriCountry(profileCountry: string | undefined | null): string | null {
  return countryCodeFromName(profileCountry) ?? regionCountry();
}
