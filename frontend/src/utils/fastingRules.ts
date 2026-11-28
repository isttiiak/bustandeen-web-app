// Fasting fiqh rules engine — day rulings, categories, and education content.
// Every reference below was verified against sunnah.com / quran.com on 2026-07-02.
// The hijri date used everywhere is the ADJUSTED one (user's ±1 day moon-sighting
// setting from Settings) via getHijriDate().

import { getHijriDate, formatHijriDate } from './islamicCalendar.js';
import i18n from '../i18n.js';

// 'ramadan' is logged only by the dedicated Ramadan tracker (/ramadan)
export type FastingCategory = 'qada' | 'kaffarah' | 'nadhr' | 'voluntary' | 'ramadan';
export type VoluntaryKind =
  | 'mon_thu'
  | 'ayyam_bid'
  | 'arafah'
  | 'ashura'
  | 'shawwal_six'
  | 'muharram'
  | 'shaban'
  | 'dawud'
  | 'dhul_hijjah'
  | 'general';
export type FastingStatus = 'intended' | 'completed' | 'broken';

export interface FastingRef {
  text: string;
  source: string;
  url: string;
  grade?: string;
}

// ─── Obligatory (non-Ramadan) categories ─────────────────────────────────────

export interface CategoryMeta {
  id: FastingCategory;
  label: string;
  emoji: string;
  short: string;
  detail: string;
  refs: FastingRef[];
}

export const OBLIGATORY_META: CategoryMeta[] = [
  {
    id: 'qada',
    label: 'Qaḍā (Make-up)',
    emoji: '🔄',
    short: 'Making up missed Ramadan fasts',
    detail:
      'Days of Ramadan missed for a valid reason (illness, travel, menstruation…) must be made up before the next Ramadan. Set how many days you owe and log them off one by one.',
    refs: [
      {
        text: '"…and whoever is ill or on a journey — then an equal number of other days."',
        source: 'Quran 2:184–185',
        url: 'https://quran.com/2/184',
        grade: 'Quran',
      },
    ],
  },
  {
    id: 'kaffarah',
    label: 'Kaffārah (Expiation)',
    emoji: '⚖️',
    short: 'Expiatory fasting for a serious violation',
    detail:
      'For deliberately breaking a Ramadan fast through intercourse: free a slave, or fast 60 CONSECUTIVE days, or feed 60 poor people — in that order of ability. For a broken oath the expiation is feeding/clothing ten poor people, and only if unable — fasting 3 days. The 60 days must be consecutive: an unexcused gap restarts the count. Consult a scholar for your specific situation.',
    refs: [
      {
        text: 'The man who broke his fast was told: free a slave, or fast two consecutive months, or feed sixty poor persons.',
        source: 'Ṣaḥīḥ al-Bukhārī 1936',
        url: 'https://sunnah.com/bukhari:1936',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Oath expiation: "…feed ten needy people… or fast three days."',
        source: 'Quran 5:89',
        url: 'https://quran.com/5/89',
        grade: 'Quran',
      },
    ],
  },
  {
    id: 'nadhr',
    label: 'Nadhr (Vow)',
    emoji: '🤝',
    short: 'Fasting you vowed to Allah',
    detail:
      'If you vowed to fast (e.g. "if Allah cures me, I will fast three days"), fulfilling it becomes obligatory. Create a vow with its number of days and track it to completion.',
    refs: [
      {
        text: '"Whoever vows that he will be obedient to Allah, should remain obedient to Him."',
        source: 'Ṣaḥīḥ al-Bukhārī 6696',
        url: 'https://sunnah.com/bukhari:6696',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"They fulfil their vows and fear a Day whose evil is widespread."',
        source: 'Quran 76:7',
        url: 'https://quran.com/76/7',
        grade: 'Quran',
      },
    ],
  },
];

// ─── Voluntary kinds ─────────────────────────────────────────────────────────

export interface VoluntaryMeta {
  id: VoluntaryKind;
  label: string;
  emoji: string;
  when: string;
  virtue: string;
  ref: FastingRef;
  /** Accent color for chips/cards */
  color: string;
  /** Links to the matching SPECIAL_DAYS entry (islamicCalendar.ts) when one exists */
  specialDayId?: string;
}

export const VOLUNTARY_META: VoluntaryMeta[] = [
  {
    id: 'mon_thu',
    label: 'Monday / Thursday',
    emoji: '📅',
    when: 'Every Monday and Thursday',
    virtue:
      'Deeds are presented to Allah on these two days — the Prophet ﷺ loved his deeds to be presented while fasting.',
    ref: {
      text: '"Deeds are presented on Monday and Thursday, and I love that my deeds be presented while I am fasting."',
      source: 'Jāmiʿ al-Tirmidhī 747',
      url: 'https://sunnah.com/tirmidhi:747',
      grade: 'Ḥasan (Ṣaḥīḥ li-ghairihi — al-Albānī)',
    },
    color: '#5a9e8e',
    specialDayId: 'fast_mon_thu',
  },
  {
    id: 'ayyam_bid',
    label: 'Ayyām al-Bīḍ (White Days)',
    emoji: '🌕',
    when: '13th, 14th, 15th of every Hijri month',
    virtue:
      'Three days each month — with every good deed multiplied by ten, it equals fasting the whole year.',
    ref: {
      text: '"Fast three days of every month — the 13th, 14th, and 15th."',
      source: 'Sunan Abī Dāwūd 2449',
      url: 'https://sunnah.com/abudawud:2449',
      grade: 'Ṣaḥīḥ',
    },
    color: '#c9a96e',
    specialDayId: 'ayyam_al_bid',
  },
  {
    id: 'arafah',
    label: 'Day of ʿArafah',
    emoji: '⛰️',
    when: '9 Dhul Ḥijjah (for those not on Ḥajj)',
    virtue:
      'Expiates the sins of the previous year AND the coming year — the single most rewarding voluntary fast.',
    ref: {
      text: '"Fasting on the day of ʿArafah expiates the sins of the preceding year and the coming year."',
      source: 'Ṣaḥīḥ Muslim 1162b',
      url: 'https://sunnah.com/muslim:1162b',
      grade: 'Ṣaḥīḥ',
    },
    color: '#c9a96e',
    specialDayId: 'arafah',
  },
  {
    id: 'ashura',
    label: 'ʿĀshūrā (+ Tāsūʿā)',
    emoji: '🌊',
    when: '10 Muḥarram — add the 9th to differ from the People of the Book',
    virtue: 'Expiates the sins of the previous year.',
    ref: {
      text: '"Fasting the day of ʿĀshūrā expiates the sins of the preceding year." · "If I live until next year, I will fast the ninth (too)."',
      source: 'Ṣaḥīḥ Muslim 1162 · 1134',
      url: 'https://sunnah.com/muslim:1162',
      grade: 'Ṣaḥīḥ',
    },
    color: '#5a9e8e',
    specialDayId: 'ashura',
  },
  {
    id: 'shawwal_six',
    label: 'Six of Shawwāl',
    emoji: '6️⃣',
    when: 'Any six days of Shawwāl (after Eid day)',
    virtue: 'Ramadan + six of Shawwāl = the reward of fasting the entire year.',
    ref: {
      text: '"Whoever fasts Ramadan and then follows it with six days of Shawwāl, it is as if he fasted the entire year."',
      source: 'Ṣaḥīḥ Muslim 1164',
      url: 'https://sunnah.com/muslim:1164a',
      grade: 'Ṣaḥīḥ',
    },
    color: '#7a9e6e',
  },
  {
    id: 'muharram',
    label: 'Muḥarram',
    emoji: '🌙',
    when: 'Any days of Muḥarram (sacred month)',
    virtue: 'The best fasting after Ramadan is in the month of Allah, Muḥarram.',
    ref: {
      text: '"The best fasting after Ramadan is the month of Allah, Muḥarram."',
      source: 'Ṣaḥīḥ Muslim 1163',
      url: 'https://sunnah.com/muslim:1163',
      grade: 'Ṣaḥīḥ',
    },
    color: '#7a9e6e',
  },
  {
    id: 'shaban',
    label: "Sha'bān",
    emoji: '☁️',
    when: "Especially the first half of Sha'bān",
    virtue: "The Prophet ﷺ fasted more in Sha'bān than any month besides Ramadan.",
    ref: {
      text: '"I never saw him fasting in any month more than in Sha\'bān." — ʿĀʾishah (RA)',
      source: 'Ṣaḥīḥ al-Bukhārī 1969',
      url: 'https://sunnah.com/bukhari:1969',
      grade: 'Ṣaḥīḥ',
    },
    color: '#c4825a',
  },
  {
    id: 'dhul_hijjah',
    label: 'First 9 of Dhul Ḥijjah',
    emoji: '🌟',
    when: '1–9 Dhul Ḥijjah',
    virtue: 'No days in which righteous deeds are more beloved to Allah than these.',
    ref: {
      text: '"There are no days in which righteous deeds are more beloved to Allah than these ten days."',
      source: 'Jāmiʿ al-Tirmidhī 757',
      url: 'https://sunnah.com/tirmidhi:757',
      grade: 'Ṣaḥīḥ',
    },
    color: '#c9a96e',
    specialDayId: 'dhul_hijjah_first10',
  },
  {
    id: 'dawud',
    label: 'Fast of Dāwūd',
    emoji: '🔁',
    when: 'Alternate days — the strongest regular pattern',
    virtue: 'The most beloved fasting to Allah: fast one day, break the next.',
    ref: {
      text: '"The most beloved fasting to Allah was the fast of Dāwūd — he fasted every other day."',
      source: 'Ṣaḥīḥ Muslim 1159',
      url: 'https://sunnah.com/muslim:1159a',
      grade: 'Ṣaḥīḥ',
    },
    color: '#5a9e8e',
  },
  {
    id: 'general',
    label: 'General Nafl',
    emoji: '💚',
    when: 'Any permissible day',
    virtue: 'One day of fasting for Allah distances your face from the Fire by seventy years.',
    ref: {
      text: '"Anyone who fasts one day for Allah\'s pleasure, Allah will keep his face away from the Fire for (a distance of) seventy years."',
      source: 'Ṣaḥīḥ al-Bukhārī 2840',
      url: 'https://sunnah.com/bukhari:2840',
      grade: 'Ṣaḥīḥ',
    },
    color: '#7a9e6e',
  },
];

export const VOLUNTARY_BY_ID: Record<string, VoluntaryMeta> = Object.fromEntries(
  VOLUNTARY_META.map((m) => [m.id, m])
);

// ─── Prohibited & disliked ───────────────────────────────────────────────────

export interface ProhibitionInfo {
  id: string;
  label: string;
  emoji: string;
  detail: string;
  refs: FastingRef[];
}

export const PROHIBITED_INFO: ProhibitionInfo[] = [
  {
    id: 'eid_fitr',
    label: 'Eid al-Fiṭr (1 Shawwāl)',
    emoji: '🎉',
    detail:
      'Fasting on the day of Eid al-Fiṭr is ḥarām — it is the day Allah commanded us to break the fast and celebrate.',
    refs: [
      {
        text: 'The Prophet ﷺ forbade fasting on the day of al-Fiṭr and al-Naḥr (the two Eids).',
        source: 'Ṣaḥīḥ al-Bukhārī 1991',
        url: 'https://sunnah.com/bukhari:1991',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'eid_adha',
    label: 'Eid al-Aḍḥā (10 Dhul Ḥijjah)',
    emoji: '🐑',
    detail:
      'Fasting on the day of sacrifice is ḥarām — it is a day of eating from the qurbānī and celebration.',
    refs: [
      {
        text: 'The Prophet ﷺ forbade fasting on the day of al-Fiṭr and al-Naḥr (the two Eids).',
        source: 'Ṣaḥīḥ al-Bukhārī 1991',
        url: 'https://sunnah.com/bukhari:1991',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'tashriq',
    label: 'Days of Tashrīq (11–13 Dhul Ḥijjah)',
    emoji: '🍖',
    detail:
      'The three days after Eid al-Aḍḥā are days of eating, drinking, and remembering Allah — fasting them is prohibited (exception: a pilgrim without a sacrificial animal).',
    refs: [
      {
        text: '"The days of Tashrīq are days of eating, drinking and remembrance of Allah."',
        source: 'Ṣaḥīḥ Muslim 1141',
        url: 'https://sunnah.com/muslim:1141a',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
];

export const DISLIKED_INFO: ProhibitionInfo[] = [
  {
    id: 'friday_alone',
    label: 'Singling out Friday',
    emoji: '🕌',
    detail:
      'Do not fast Friday by itself — join it with Thursday or Saturday. (Fine when it coincides with a habit or a specific day like ʿArafah.)',
    refs: [
      {
        text: '"None of you should fast on Friday unless he fasts a day before or after it."',
        source: 'Ṣaḥīḥ al-Bukhārī 1985',
        url: 'https://sunnah.com/bukhari:1985',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'saturday_alone',
    label: 'Singling out Saturday',
    emoji: '📆',
    detail:
      'Singling out Saturday for voluntary fasting is discouraged by some scholars (it is the day the Jews venerate). Joined with Friday or Sunday, or coinciding with ʿArafah/ʿĀshūrā, it is fine. There is scholarly difference on this hadith.',
    refs: [
      {
        text: '"Do not fast on Saturday except for what has been made obligatory upon you."',
        source: 'Jāmiʿ al-Tirmidhī 744',
        url: 'https://sunnah.com/tirmidhi:744',
        grade: 'Ḥasan (al-Tirmidhī) — graded differently by other scholars',
      },
    ],
  },
  {
    id: 'day_of_doubt',
    label: "Day of Doubt (30 Sha'bān)",
    emoji: '❓',
    detail:
      "Fasting the day when Ramadan's start is uncertain is prohibited by most scholars — unless it matches a fasting habit you already keep (e.g. it falls on your usual Monday fast).",
    refs: [
      {
        text: '"Whoever fasts on the day of doubt has disobeyed Abul-Qāsim ﷺ." — ʿAmmār ibn Yāsir (RA)',
        source: 'Jāmiʿ al-Tirmidhī 686',
        url: 'https://sunnah.com/tirmidhi:686',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'wisal',
    label: 'Wiṣāl (continuous, no ifṭār)',
    emoji: '⛔',
    detail:
      'Fasting day and night continuously without breaking is forbidden — the Prophet ﷺ said no one is like him in this.',
    refs: [
      {
        text: 'Allah\'s Messenger ﷺ forbade al-Wiṣāl in fasting… "Who amongst you is similar to me?"',
        source: 'Ṣaḥīḥ al-Bukhārī 1965',
        url: 'https://sunnah.com/bukhari:1965',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
];

// Sunnah etiquette shown on the page
export const FASTING_SUNNAH: FastingRef[] = [
  {
    text: '"Take suḥūr, for in suḥūr there is a blessing."',
    source: 'Ṣaḥīḥ al-Bukhārī 1923',
    url: 'https://sunnah.com/bukhari:1923',
    grade: 'Ṣaḥīḥ',
  },
  {
    text: '"The people will remain upon good as long as they hasten the breaking of the fast."',
    source: 'Ṣaḥīḥ al-Bukhārī 1957',
    url: 'https://sunnah.com/bukhari:1957',
    grade: 'Ṣaḥīḥ',
  },
];

// ─── Day ruling ──────────────────────────────────────────────────────────────

interface HaramRuling {
  id: string;
  title: string;
  detail: string;
  refs: FastingRef[];
}

export interface DayCaution {
  id: 'friday_alone' | 'saturday_alone' | 'day_of_doubt';
  info: ProhibitionInfo;
}

export interface DayRuling {
  /** 'haram' blocks logging; 'ramadan' defers to the future Ramadan tracker */
  level: 'haram' | 'ramadan' | 'normal';
  haram?: HaramRuling;
  /** Sunnah fasts applicable to this specific day, most specific first */
  recommended: VoluntaryMeta[];
  /** Conditions that need an amber warning at log time (single Friday etc.) */
  cautions: DayCaution[];
  hijriLabel: string | null;
}

const dislikedById = Object.fromEntries(DISLIKED_INFO.map((d) => [d.id, d]));

export function getDayRuling(
  date: Date,
  hijriOverride?: import('./islamicCalendar.js').HijriDate | null
): DayRuling {
  const h = hijriOverride !== undefined ? hijriOverride : getHijriDate(date);
  const weekday = date.getDay(); // 0=Sun … 5=Fri, 6=Sat
  const recommended: VoluntaryMeta[] = [];
  const cautions: DayCaution[] = [];
  const hijriLabel = h ? formatHijriDate(h) : null;

  if (h) {
    // ── Ramadan: dedicated tracker (future) — no ordinary logging ──────────
    if (h.month === 9) {
      return { level: 'ramadan', recommended: [], cautions: [], hijriLabel };
    }

    // ── Prohibited days ─────────────────────────────────────────────────────
    if (h.month === 10 && h.day === 1) {
      return {
        level: 'haram',
        recommended: [],
        cautions: [],
        hijriLabel,
        haram: {
          id: 'eid_fitr',
          title: i18n.t(
            'fastingRules.haram.eidFitrTitle',
            'Today is Eid al-Fiṭr — fasting is ḥarām'
          ),
          detail: PROHIBITED_INFO[0]!.detail,
          refs: PROHIBITED_INFO[0]!.refs,
        },
      };
    }
    if (h.month === 12 && h.day === 10) {
      return {
        level: 'haram',
        recommended: [],
        cautions: [],
        hijriLabel,
        haram: {
          id: 'eid_adha',
          title: i18n.t(
            'fastingRules.haram.eidAdhaTitle',
            'Today is Eid al-Aḍḥā — fasting is ḥarām'
          ),
          detail: PROHIBITED_INFO[1]!.detail,
          refs: PROHIBITED_INFO[1]!.refs,
        },
      };
    }
    if (h.month === 12 && h.day >= 11 && h.day <= 13) {
      return {
        level: 'haram',
        recommended: [],
        cautions: [],
        hijriLabel,
        haram: {
          id: 'tashriq',
          title: i18n.t('fastingRules.haram.tashriqTitle', {
            day: h.day,
            defaultValue: `Today is a day of Tashrīq (${h.day} Dhul Ḥijjah) — fasting is prohibited`,
          }),
          detail: PROHIBITED_INFO[2]!.detail,
          refs: PROHIBITED_INFO[2]!.refs,
        },
      };
    }

    // ── Recommended days (most specific first) ──────────────────────────────
    if (h.month === 12 && h.day === 9) recommended.push(VOLUNTARY_BY_ID['arafah']!);
    if (h.month === 1 && (h.day === 9 || h.day === 10))
      recommended.push(VOLUNTARY_BY_ID['ashura']!);
    if (h.day >= 13 && h.day <= 15) recommended.push(VOLUNTARY_BY_ID['ayyam_bid']!);
    if (h.month === 12 && h.day >= 1 && h.day <= 8)
      recommended.push(VOLUNTARY_BY_ID['dhul_hijjah']!);
    if (h.month === 10 && h.day >= 2) recommended.push(VOLUNTARY_BY_ID['shawwal_six']!);
    if (h.month === 1 && h.day !== 9 && h.day !== 10)
      recommended.push(VOLUNTARY_BY_ID['muharram']!);
    if (h.month === 8 && h.day <= 15) recommended.push(VOLUNTARY_BY_ID['shaban']!);

    // ── Day of doubt: 30 Sha'bān ────────────────────────────────────────────
    if (h.month === 8 && h.day === 30) {
      cautions.push({ id: 'day_of_doubt', info: dislikedById['day_of_doubt']! });
    }
  }

  if (weekday === 1 || weekday === 4) recommended.push(VOLUNTARY_BY_ID['mon_thu']!);
  if (weekday === 5) cautions.push({ id: 'friday_alone', info: dislikedById['friday_alone']! });
  if (weekday === 6) cautions.push({ id: 'saturday_alone', info: dislikedById['saturday_alone']! });

  return { level: 'normal', recommended, cautions, hijriLabel };
}
