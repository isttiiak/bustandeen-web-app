// The Friday "hour of response" — the last stretch of Jumuʿah before sunset.
//
// "Friday is divided into twelve hours. Amongst them there is an hour in which
//  a Muslim does not ask Allah for anything but He gives it to him. So seek it
//  in the LAST HOUR AFTER THE AFTERNOON PRAYER."
//  — Sunan Abī Dāwūd 1048, graded Ṣaḥīḥ by al-Albānī.
//
// Scholars differ on the exact minute, and the hadith itself says to *seek*
// it, so this deliberately marks the whole ʿAṣr→Maghrib window rather than
// pretending to pinpoint a moment. The final stretch before Maghrib is
// highlighted because that is where the narration directs the search.

export const FRIDAY_HOUR_REF = {
  text: 'Seek it in the last hour after the afternoon prayer.',
  textBn: 'আসরের নামাযের পর শেষ সময়ে তা তালাশ করো।',
  source: 'Sunan Abī Dāwūd 1048',
  url: 'https://sunnah.com/abudawud:1048',
  grade: 'Ṣaḥīḥ (al-Albānī)',
};

export interface FridayHourState {
  /** Friday, and ʿAṣr has begun but Maghrib has not */
  active: boolean;
  /** Within the final stretch before Maghrib — where the narration points */
  isFinalStretch: boolean;
  /** Milliseconds until Maghrib (0 when not active) */
  msToMaghrib: number;
  /** Human countdown, e.g. "1h 12m" */
  countdown: string;
}

const IDLE: FridayHourState = {
  active: false,
  isFinalStretch: false,
  msToMaghrib: 0,
  countdown: '',
};

/** Minutes before Maghrib treated as the "final stretch". */
const FINAL_STRETCH_MIN = 60;

function fmt(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * @param asr     ʿAṣr time for the given day (already madhab-adjusted upstream)
 * @param maghrib Maghrib time for the same day
 * @param now     current instant
 */
export function getFridayHour(
  asr: Date | undefined,
  maghrib: Date | undefined,
  now: Date = new Date()
): FridayHourState {
  if (!asr || !maghrib) return IDLE;
  if (now.getDay() !== 5) return IDLE; // 5 = Friday
  if (now < asr || now >= maghrib) return IDLE;

  const msToMaghrib = maghrib.getTime() - now.getTime();
  return {
    active: true,
    isFinalStretch: msToMaghrib <= FINAL_STRETCH_MIN * 60_000,
    msToMaghrib,
    countdown: fmt(msToMaghrib),
  };
}
