// Shared API response and data types

export interface ZikrIncrementItem {
  zikrType: string;
  amount?: number;
  ts?: number;
  /** Real wall-clock moment of the tap, for time-of-day/session analytics —
   * `ts` above is anchored to the tracking day's midday and can't be used for
   * that (see utils/trackingDay.ts on the frontend). Falls back to `ts`. */
  realTs?: number;
  /** When the run of taps in this item began (`realTs` is when it ended). */
  startTs?: number;
  /** Portion of `amount` added automatically (salat tracker tasbīḥ / set-count
   * corrections) rather than tapped — counted in the totals but never logged
   * as a timed event. May be negative when such a count was reversed. */
  untimedAmount?: number;
  /** Typed in afterwards via "Log missed counts": logged as an untimed manual
   * entry instead of a tap at some clock time. */
  manual?: boolean;
}

export interface ChartDataPoint {
  date: string;
  total: number;
  breakdown: Record<string, number>;
  /** Streak status for the day: met | pending | grace | missed */
  status?: 'met' | 'pending' | 'grace' | 'missed';
}
