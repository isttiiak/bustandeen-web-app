import * as salatService from './salat.service.js';
import * as zikrService from './zikr.service.js';
import * as quranService from './quran.service.js';
import { PrayerId, PrayerLocation, IPrayerEntry } from '../models/SalatLog.js';
import { DEFAULT_TIMEZONE_OFFSET } from '../utils/timezone-flexible.js';

export interface CommitSalatEntry {
  prayer: PrayerId;
  status: 'completed' | 'kaza';
  location?: PrayerLocation;
}
export interface CommitZikrEntry {
  typeName: string;
  count: number;
}
export interface CommitInput {
  salat: CommitSalatEntry[];
  zikr: CommitZikrEntry[];
  quranAyat: number | null;
  date?: string;
  timezoneOffset?: number;
}
export interface CommitResult {
  salatApplied: number;
  zikrApplied: number;
  quranApplied: boolean;
}

function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

/** Local midday of `date` (YYYY-MM-DD) in the user's timezone, as a timestamp —
 * the same tracking-day anchor the zikr counter sends, so the counts land in the
 * bucket of the day the note is about (not whatever day the server clock says). */
function middayTs(date: string, timezoneOffset: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0) - timezoneOffset * 60_000;
}

/**
 * Applies an already-confirmed natural-language log across salat/zikr/quran
 * by reusing each domain's own write path — this is the exact same effect as
 * a user tapping each of those UIs by hand, just batched from one note. The
 * parse step (ai.service.ts's parseNaturalLog) never writes anything itself;
 * only this function, called after the user has reviewed/edited the preview.
 */
export async function commitNaturalLog(userId: string, input: CommitInput): Promise<CommitResult> {
  const date = input.date ?? todayDateString();

  let salatApplied = 0;
  const seenPrayers = new Set<PrayerId>();
  // One read up front: each prayer is an independent entry, so the snapshot
  // stays valid across the writes below.
  const currentLog = input.salat.length ? await salatService.getLogReadOnly(userId, date) : null;
  for (const s of input.salat.slice(0, 5)) {
    if (seenPrayers.has(s.prayer)) continue; // "fajr ... fajr" is one prayer, not two writes
    seenPrayers.add(s.prayer);

    // A prayer already marked done keeps everything the user set on the
    // tracker (tasbih / Ayatul Kursi ticks, the timing window). Re-marking it
    // through updatePrayerStatus would reset those, so only a differing
    // location is applied, with the rest carried over.
    const existing = currentLog?.prayers[s.prayer] as Partial<IPrayerEntry> | undefined;
    if (existing?.status === 'completed' || existing?.status === 'kaza') {
      if (s.location && s.location !== existing.location) {
        await salatService.updatePrayerStatus(
          userId,
          s.prayer,
          existing.status,
          date,
          s.location,
          existing.tasbeeh,
          existing.ayatulKursi,
          existing.windowStart?.toISOString(),
          existing.windowEnd?.toISOString()
        );
        salatApplied++;
      }
      continue;
    }
    await salatService.updatePrayerStatus(userId, s.prayer, s.status, date, s.location);
    salatApplied++;
  }

  // Merge duplicate dhikr lines into one increment per type.
  const zikrTotals = new Map<string, number>();
  for (const z of input.zikr.slice(0, 10)) {
    zikrTotals.set(z.typeName, (zikrTotals.get(z.typeName) ?? 0) + z.count);
  }
  if (zikrTotals.size) {
    const offset = input.timezoneOffset ?? DEFAULT_TIMEZONE_OFFSET;
    await zikrService.batchIncrementZikr(
      userId,
      [...zikrTotals].map(([zikrType, amount]) => ({
        zikrType,
        amount,
        ts: middayTs(date, offset),
        // Typed in afterwards from a sentence: counts for the day, but it is
        // not a real-time session, so it carries no clock time.
        manual: true,
      })),
      offset
    );
  }

  let quranApplied = false;
  if (input.quranAyat && input.quranAyat > 0) {
    await quranService.addAyatReading(userId, { date, count: input.quranAyat });
    quranApplied = true;
  }

  return {
    salatApplied,
    zikrApplied: zikrTotals.size,
    quranApplied,
  };
}
