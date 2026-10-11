import MoonSighting, { type IMoonSighting } from '../models/MoonSighting.js';
import {
  MAX_RECORD_SHIFT,
  addDays,
  daysBetween,
  nextHijriMonth,
  previousHijriMonth,
  recordShift,
} from '../utils/hijri.js';

/** What devices receive: the active records only, oldest first per country. */
export interface PublicMoonSighting {
  id: string;
  country: string;
  hijriYear: number;
  hijriMonth: number;
  startDate: string;
  /** For app builds from before v5.157.0 (shift model): the first day of the
   * shift (the day before a late start, so Umm al-Qura's 1st is not shown a
   * day early) and the shift clamped to -1..+1. */
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
}

class MoonSightingError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toPublic(r: IMoonSighting): PublicMoonSighting {
  const shift = recordShift(r) ?? 0;
  return {
    id: String(r._id),
    country: r.country,
    hijriYear: r.hijriYear,
    hijriMonth: r.hijriMonth,
    startDate: r.startDate,
    effectiveFrom: shift < 0 ? addDays(r.startDate, -1) : r.startDate,
    offset: Math.max(-1, Math.min(1, shift)),
    note: r.note,
    ...(r.sourceUrl ? { sourceUrl: r.sourceUrl } : {}),
  };
}

export async function listActive(): Promise<PublicMoonSighting[]> {
  const rows = await MoonSighting.find({ active: true }).sort({ country: 1, startDate: 1 });
  return rows.map(toPublic);
}

/** Admin view: every record, newest first, including deactivated ones. */
export async function listAll(): Promise<IMoonSighting[]> {
  return MoonSighting.find({}).sort({ startDate: -1, createdAt: -1 }).limit(500);
}

export interface NewMoonSighting {
  country: string;
  hijriYear: number;
  hijriMonth: number;
  startDate: string;
  note: string;
  sourceUrl?: string;
}

/**
 * Checks that the announcement can be true before it reaches every device:
 * near Umm al-Qura's 1st of the month, one per month, and 29 or 30 days from
 * the neighbouring months' records.
 */
export async function create(input: NewMoonSighting, createdBy: string): Promise<IMoonSighting> {
  if (recordShift(input) === null) {
    throw new MoonSightingError(
      `The start date must be within ${MAX_RECORD_SHIFT} days of Umm al-Qura's 1st of that month.`
    );
  }
  const same = await MoonSighting.exists({
    active: true,
    country: input.country,
    hijriYear: input.hijriYear,
    hijriMonth: input.hijriMonth,
  });
  if (same) {
    throw new MoonSightingError(
      'This month already has a record for this country. Deactivate it first to replace it.',
      409
    );
  }
  const prev = previousHijriMonth(input.hijriYear, input.hijriMonth);
  const next = nextHijriMonth(input.hijriYear, input.hijriMonth);
  const neighbours = await MoonSighting.find({
    active: true,
    country: input.country,
    $or: [
      { hijriYear: prev.year, hijriMonth: prev.month },
      { hijriYear: next.year, hijriMonth: next.month },
    ],
  });
  for (const n of neighbours) {
    const before = n.hijriYear === prev.year && n.hijriMonth === prev.month;
    const length = before
      ? daysBetween(n.startDate, input.startDate)
      : daysBetween(input.startDate, n.startDate);
    if (length !== 29 && length !== 30) {
      throw new MoonSightingError(
        `A Hijri month has 29 or 30 days; with the ${before ? 'previous' : 'next'} month's record (${n.startDate}) this one would have ${length}.`
      );
    }
  }
  return MoonSighting.create({ ...input, createdBy, active: true });
}

export async function deactivate(id: string, by: string): Promise<IMoonSighting | null> {
  return MoonSighting.findOneAndUpdate(
    { _id: id, active: true },
    { $set: { active: false, deactivatedBy: by, deactivatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
