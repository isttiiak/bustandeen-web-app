// Which prayers a Rayhanah episode excuses on the day it starts and the day it ends.
//
// The rule follows the user's school (Rayhanah settings) and the answer she gives
// to "before or after which salat?", never the time a button was tapped. The
// sources and the open points are in GitHub issue 431 ("Recheck Rayhanah
// start-day and end-day prayer counts with a scholar"); until a scholar has
// signed it off, treat this file as awaiting review.
//
//   Whole days inside an episode: every prayer is excused (all schools).
//
//   END day, she became pure in some prayer's time:
//     - prayers whose whole time had run out before: excused.
//     - that prayer: owed when there was enough time left, else excused.
//       Hanafi: time for ghusl, dressing and the opening takbir.
//       Majority (as built): time for one rak'ah.
//     - majority only: when it is owed and it is Asr (Isha), the Dhuhr (Maghrib)
//       before it is owed too. Hanafi owes only the prayer she became pure in.
//     - prayers after it: owed as usual.
//   START day, it began in some prayer's time:
//     - prayers whose whole time ended before it began: owed as usual.
//     - that prayer, if she had not prayed it yet: Hanafi, not owed (the state at
//       the end of its time decides); majority, owed when enough time (one rak'ah)
//       had passed before it began, else not owed.
//     - prayers after it: excused.
//
// When an answer is missing the prayer stays OWED: wrongly excusing a prayer is
// worse than asking her to log one.

export const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type FardPrayer = (typeof PRAYER_ORDER)[number];

/** Where in the day it happened: in a prayer's time, or after sunrise before Dhuhr. */
export const MOMENT_SLOTS = ['fajr', 'morning', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
type MomentSlot = (typeof MOMENT_SLOTS)[number];

export type CycleSchool = 'hanafi' | 'majority';

export interface StartMark {
  slot: MomentSlot;
  /** Had she already prayed the prayer of that time? (not asked for 'morning') */
  prayed?: boolean | null;
  /** Majority: had at least one rak'ah's time passed before it began? */
  enough?: boolean | null;
}

export interface EndMark {
  slot: MomentSlot;
  /** Was enough time left in that prayer's time? (not asked for 'morning') */
  enough?: boolean | null;
}

/** How many prayers had their whole time over before this slot began. */
const ENDED_BEFORE: Record<MomentSlot, number> = {
  fajr: 0,
  morning: 1,
  dhuhr: 1,
  asr: 2,
  maghrib: 3,
  isha: 4,
};

/** The prayer whose time the slot is, or null for the stretch from sunrise to Dhuhr. */
const slotPrayerIndex = (slot: MomentSlot): number | null =>
  slot === 'morning' ? null : PRAYER_ORDER.indexOf(slot);

const all = (): Set<FardPrayer> => new Set(PRAYER_ORDER);

/** Prayers excused on the day the episode STARTED. */
export function startDayExcused(mark: StartMark, school: CycleSchool): Set<FardPrayer> {
  const out = new Set<FardPrayer>();
  const here = slotPrayerIndex(mark.slot);
  PRAYER_ORDER.forEach((id, i) => {
    if (i < ENDED_BEFORE[mark.slot]) return; // its time was over before: owed as usual
    if (here === null || i > here) {
      out.add(id); // after it began: excused
      return;
    }
    // The prayer whose time it began in.
    if (mark.prayed === true) return; // she prayed it: nothing to excuse
    if (school === 'hanafi')
      out.add(id); // the state at the end of its time decides
    else if (mark.enough === false) out.add(id); // majority: not enough time passed
    // majority with enough (or unanswered): owed
  });
  return out;
}

/** Prayers excused on the day the episode ENDED. */
export function endDayExcused(mark: EndMark, school: CycleSchool): Set<FardPrayer> {
  const out = new Set<FardPrayer>();
  const here = slotPrayerIndex(mark.slot);
  const owedHere = mark.enough !== false; // unanswered counts as owed
  PRAYER_ORDER.forEach((id, i) => {
    if (i < ENDED_BEFORE[mark.slot]) out.add(id); // its whole time ended before
  });
  if (here !== null && !owedHere) out.add(mark.slot as FardPrayer);
  if (here !== null && owedHere && school === 'majority') {
    // Dhuhr with Asr, Maghrib with Isha
    if (mark.slot === 'asr') out.delete('dhuhr');
    if (mark.slot === 'isha') out.delete('maghrib');
  }
  return out;
}

interface EpisodeMarks {
  startDate: string;
  endDate: string | null;
  startMark?: StartMark | null;
  endMark?: EndMark | null;
}

/**
 * The prayers an episode excuses on `day` (empty when `day` is outside it). An
 * episode with no answer for its start or end day (older ones, or entered by
 * date only) keeps excusing that whole day, as it always did.
 */
export function excusedPrayersOn(
  ep: EpisodeMarks,
  day: string,
  school: CycleSchool,
  through: string
): Set<FardPrayer> {
  const last = ep.endDate ?? through;
  if (day < ep.startDate || day > last) return new Set();
  const startSet =
    day === ep.startDate && ep.startMark ? startDayExcused(ep.startMark, school) : null;
  const endSet =
    ep.endDate !== null && day === ep.endDate && ep.endMark
      ? endDayExcused(ep.endMark, school)
      : null;
  if (startSet && endSet) return new Set([...startSet].filter((p) => endSet.has(p)));
  return startSet ?? endSet ?? all();
}
