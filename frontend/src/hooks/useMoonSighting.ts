import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import { MOON_SIGHTING_KEY, type MoonSightingRecord } from '../utils/islamicCalendar.js';

/** Active national moon-sighting records (T4.1). Public and small; every
 * device downloads all of them and applies its own country's on-device, so
 * nothing about the user is sent. */
export function useMoonSightingRecords() {
  return useQuery({
    queryKey: ['calendar', 'moon-sighting'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; records: MoonSightingRecord[] }>(
        '/api/calendar/moon-sighting'
      );
      const records = data.records ?? [];
      // Written here, before any subscriber re-renders: islamicCalendar.ts
      // reads this cache synchronously when it formats a date.
      localStorage.setItem(MOON_SIGHTING_KEY, JSON.stringify(records));
      return records;
    },
    staleTime: 60 * 60_000,
    // A committee can announce in the evening: check again when the app returns
    refetchOnWindowFocus: true,
  });
}
