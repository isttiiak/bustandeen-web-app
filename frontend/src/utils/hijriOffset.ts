// The pure moon-sighting offset rule (T4.1), shared by the app
// (islamicCalendar.ts reads the on-device settings) and the prerendered
// Ramadan calendars (T4.4, which apply Bangladesh's records at build time).
// No i18n, storage or DOM here: the SSR bundle imports it.

export interface MoonSightingRecord {
  id: string;
  country: string;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
}

export interface HijriOffsetSource {
  offset: number;
  source: 'manual' | 'country' | 'none';
  record?: MoonSightingRecord;
}

export const clampOffset = (n: number): number => (n === -1 || n === 1 ? n : 0);

/**
 * The pure rule (unit-tested): which offset applies to `day` (YYYY-MM-DD).
 * A country record applies from its effectiveFrom until the next record for
 * the same country; before the first one there is no override.
 */
export function resolveHijriOffset(input: {
  manual: boolean;
  userOffset: number;
  country: string | null;
  records: readonly MoonSightingRecord[];
  day: string;
}): HijriOffsetSource {
  if (input.manual) return { offset: clampOffset(input.userOffset), source: 'manual' };
  if (!input.country) return { offset: 0, source: 'none' };
  let best: MoonSightingRecord | undefined;
  for (const r of input.records) {
    if (r.country !== input.country || r.effectiveFrom > input.day) continue;
    if (!best || r.effectiveFrom > best.effectiveFrom) best = r;
  }
  return best
    ? { offset: clampOffset(best.offset), source: 'country', record: best }
    : { offset: 0, source: 'none' };
}
