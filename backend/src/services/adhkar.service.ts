import AdhkarDay, { type AdhkarPeriod } from '../models/AdhkarDay.js';

export interface AdhkarDayState {
  date: string;
  morning: boolean;
  evening: boolean;
}

function toState(date: string, doc: { morningAt?: Date; eveningAt?: Date } | null): AdhkarDayState {
  return { date, morning: !!doc?.morningAt, evening: !!doc?.eveningAt };
}

export async function getDay(userId: string, date: string): Promise<AdhkarDayState> {
  const doc = await AdhkarDay.findOne({ userId, date }).lean();
  return toState(date, doc);
}

/** Marks a routine done. Idempotent: the first completion time is kept, so a
 * replayed or repeated write changes nothing. */
export async function markDone(
  userId: string,
  date: string,
  period: AdhkarPeriod
): Promise<AdhkarDayState> {
  const field = period === 'morning' ? 'morningAt' : 'eveningAt';
  const doc = await AdhkarDay.findOneAndUpdate(
    { userId, date },
    { $min: { [field]: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return toState(date, doc);
}
