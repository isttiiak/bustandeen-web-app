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
