import { getTrackingDay } from './trackingDay.js';

/**
 * Hifz writes carry the app's own day, like the summary and queue reads do. Without it the
 * server used its UTC date, so a review done in the evening west of UTC (or after midnight
 * east of it) was counted on a different day from the one the screen shows: the daily goal
 * looked unmet and the next-due date was a day off.
 */
export function withHifzDay<T extends object>(
  vars: T,
  day: string = getTrackingDay()
): T & { date: string } {
  return { ...vars, date: day };
}
