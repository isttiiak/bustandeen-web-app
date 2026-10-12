// Timezone detection utility for frontend

import { placeClockOffsetMin } from './placeClock.js';

/**
 * The offset sent to the server as `timezoneOffset` (minutes east of UTC):
 * the saved place's clock, else the phone's. Same as the phone's for anyone
 * whose phone is in the saved place's zone. The server matches zikr days by
 * date (v5.160.0), so a changed offset moves no stored data.
 */
export function getUserTimezoneOffset(): number {
  return placeClockOffsetMin();
}

/**
 * Get user's IANA timezone name (e.g., "Asia/Dhaka")
 */
export function getUserTimezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

export interface TimezoneInfo {
  offsetMinutes: number;
  offsetHours: number;
  offsetString: string;
  name: string;
}

export function getTimezoneInfo(): TimezoneInfo {
  const offsetMinutes = getUserTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  const sign = offsetMinutes >= 0 ? '+' : '';
  return {
    offsetMinutes,
    offsetHours,
    offsetString: `UTC${sign}${offsetHours}`,
    name: getUserTimezoneName(),
  };
}

/**
 * Get today's date string (YYYY-MM-DD) in the user's local timezone
 */
export function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isNewDayLocal(lastDateString: string): boolean {
  return getTodayLocal() !== lastDateString;
}
