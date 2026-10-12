import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useMoonSightingRecords } from '../hooks/useMoonSighting.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import {
  HIJRI_COUNTRY_KEY,
  HIJRI_INPUTS_EVENT,
  writeHijriInput,
} from '../utils/islamicCalendar.js';
import { loadZoneLookup } from '../utils/placeClock.js';
import { autoHijriCountry } from '../utils/hijriCountry.js';

/** Re-renders the caller whenever the Hijri inputs change (new committee
 * record, other country). App uses it so every screen draws the new date. */
export function useHijriInputsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(HIJRI_INPUTS_EVENT, bump);
    return () => window.removeEventListener(HIJRI_INPUTS_EVENT, bump);
  }, []);
  return version;
}

/**
 * Keeps the on-device inputs of the Hijri date current (T4.1): the cached
 * moon-sighting records and the country they are matched against
 * (autoHijriCountry). islamicCalendar.ts reads both
 * synchronously; no location or profile data leaves the device for this.
 */
export default function MoonSightingSync() {
  // Fetching is enough: the query writes the cache (useMoonSighting.ts)
  useMoonSightingRecords();
  const { data: profile } = useUserProfile();
  // No event marks a saved-location change: check again on navigation (the
  // place is saved on Prayer Times, Qibla, Onboarding), on focus, and once the
  // zone map has loaded. Unchanged values write nothing and redraw nothing.
  const { pathname } = useLocation();
  const profileCountry = profile?.country;

  useEffect(() => {
    let live = true;
    const sync = () => {
      if (live) writeHijriInput(HIJRI_COUNTRY_KEY, autoHijriCountry(profileCountry));
    };
    sync();
    void loadZoneLookup().then(sync);
    window.addEventListener('focus', sync);
    return () => {
      live = false;
      window.removeEventListener('focus', sync);
    };
  }, [profileCountry, pathname]);

  return null;
}
