// Islamic calendar utilities: Hijri date detection and special day definitions.
// Uses Intl.DateTimeFormat with the islamic-umalqura calendar.
// The Islamic day starts at Maghrib: getHijriToday() accounts for this.

import { calcPrayerTimes } from './prayerTimes.js';
import {
  clampOffset,
  resolveHijriOffset,
  type HijriOffsetSource,
  type MoonSightingRecord,
} from './hijriOffset.js';
import i18n from '../i18n.js';

export interface SpecialDayTodo {
  action: string;
  note?: string;
}

export interface SpecialDayRef {
  text: string;
  url: string;
  grade?: string; // e.g. "Ṣaḥīḥ", "Ḥasan"
}

export interface SpecialDayInfo {
  id: string;
  name: string;
  arabicName: string;
  color: string; // Tailwind-compatible CSS color token
  type: 'weekly' | 'monthly' | 'annual' | 'ramadan';
  shortDesc: string;
  significance: string;
  todos: SpecialDayTodo[];
  references: SpecialDayRef[];
  replaceDhuhrWithJumah?: boolean;
}

// ── All special day definitions ──────────────────────────────────────────────

export const SPECIAL_DAYS: SpecialDayInfo[] = [
  // ── FRIDAY ────────────────────────────────────────────────────────────────
  {
    id: 'friday',
    name: "Friday (Jumu'ah)",
    arabicName: 'يَوْمُ الجُمُعَة',
    color: '#7a9e6e',
    type: 'weekly',
    replaceDhuhrWithJumah: true,
    shortDesc: "The master of days. Attend Jumu'ah, read Surah Al-Kahf, send abundant ṣalawāt.",
    significance:
      "Friday is the best day the sun rises upon. Allah made it a day of gathering (Jumu'ah), supplication, ṣalawāt on the Prophet ﷺ, and the reading of Surah Al-Kahf. There is a hidden hour on Friday in which any du'ā is accepted. The Jumu'ah prayer (khutbah + 2 rak'ahs in congregation) replaces Dhuhr for adult Muslim men.",
    todos: [
      {
        action: "Perform ghusl (ritual bath) before Jumu'ah",
        note: 'Sunnah, highly recommended',
      },
      {
        action: "Attend Jumu'ah prayer in congregation at a mosque",
        note: 'Farḍ: obligatory for adult Muslim men',
      },
      {
        action: 'Read Surah Al-Kahf (Quran 18)',
        note: 'Illuminates with light from Friday to Friday',
      },
      {
        action: 'Send abundant ṣalawāt on the Prophet ﷺ',
        note: 'As much as you can, as he ﷺ asked (Sunan Abū Dāwūd 1047)',
      },
      {
        action: "Make du'ā between Asr and Maghrib",
        note: 'The hidden hour of acceptance. Do not miss it',
      },
      {
        action: 'Increase dhikr, istighfār, and Quran recitation throughout the day',
        note: '',
      },
      {
        action: 'Cut nails, wear best clothes, use miswāk and fragrance',
        note: 'Sunnah of the day',
      },
    ],
    references: [
      {
        text: '"The best day the sun rises upon is Friday." · Ṣaḥīḥ Muslim 854',
        url: 'https://sunnah.com/muslim:854',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: "Jumu'ah prayer obligation · Quran 62:9",
        url: 'https://quran.com/62/9',
        grade: 'Quran',
      },
      {
        text: '"Whoever reads Surah Al-Kahf on Friday will be illuminated between the two Fridays." · al-Mustadrak 2/399',
        url: 'https://sunnah.com/nawawi40',
        grade: 'Ṣaḥīḥ by al-Albānī',
      },
      {
        text: '"On Friday there is a time in which a Muslim does not ask Allah for anything but He gives it to him." · Ṣaḥīḥ Muslim 852',
        url: 'https://sunnah.com/muslim:852',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"Send abundant ṣalawāt on me on Fridays, for your ṣalawāt is presented to me." · Sunan Abū Dāwūd 1047',
        url: 'https://sunnah.com/abudawud:1047',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── MONDAY & THURSDAY FASTING ──────────────────────────────────────────────
  {
    id: 'fast_mon_thu',
    name: 'Sunnah Fast Day',
    arabicName: 'صيام الاثنين والخميس',
    color: '#5a9e8e',
    type: 'weekly',
    shortDesc: 'Monday & Thursday: the Prophet ﷺ fasted these days. Deeds are presented to Allah.',
    significance:
      "The Prophet ﷺ was asked about fasting on Monday and Thursday. He said: 'Those are two days on which people's deeds are presented to the Lord of the Worlds and I would like my deeds to be presented when I am fasting.' Fasting Monday and Thursday is among the most regularly observed sunnah fasts.",
    todos: [
      {
        action: 'Make intention (niyyah) for fasting before Fajr',
        note: 'Or you may intend in the morning if you have not eaten',
      },
      { action: 'Have suhūr (pre-dawn meal) for blessing', note: '' },
      { action: 'Increase dhikr and istighfār throughout the fasting hours', note: '' },
      {
        action: "Make du'ā at iftār: the fasting person's du'ā is not rejected",
        note: '',
      },
    ],
    references: [
      {
        text: '"Deeds are presented on Monday and Thursday, and I love that my deeds be presented while I am fasting." · Sunan al-Tirmidhī 747',
        url: 'https://sunnah.com/tirmidhi:747',
        grade: 'Ḥasan (Darussalam); Ṣaḥīḥ per al-Albānī',
      },
      {
        text: '"The du\'ā of a fasting person at the time of breaking fast is not rejected." · Sunan Ibn Mājah 1753',
        url: 'https://sunnah.com/ibnmajah:1753',
        grade: 'Ḥasan (Darussalam); Ḍaʿīf per al-Albānī',
      },
    ],
  },

  // ── AYYAM AL-BID (Three White Days) ──────────────────────────────────────
  {
    id: 'ayyam_al_bid',
    name: 'Ayyām al-Bīḍ',
    arabicName: 'أيام البيض',
    color: '#c9a96e',
    type: 'monthly',
    shortDesc:
      '13th, 14th, 15th of every Islamic month: fasting equivalent to fasting the whole month.',
    significance:
      "The Prophet ﷺ never abandoned fasting the three white days: the 13th, 14th, and 15th of each Islamic month. These are called 'the white days' because the full moon illuminates the night. Fasting these three days is like fasting the entire month, for each good deed is multiplied ten times.",
    todos: [
      {
        action: 'Fast the three white days (13th, 14th, 15th)',
        note: 'Equivalent to fasting the whole month',
      },
      { action: "Observe the full moon; reflect on Allah's creation", note: '' },
      { action: 'Increase Quran recitation in these blessed nights', note: '' },
    ],
    references: [
      {
        text: '"Fast three days of every month: the 13th, 14th, and 15th." · Sunan Abū Dāwūd 2449',
        url: 'https://sunnah.com/abudawud:2449',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"Fasting three days of every month is like fasting the whole year." · Ṣaḥīḥ al-Bukhārī 1979',
        url: 'https://sunnah.com/bukhari:1979',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── ASHURA (10th Muharram) ─────────────────────────────────────────────────
  {
    id: 'ashura',
    name: "'Āshūrā",
    arabicName: 'عاشوراء',
    color: '#5a9e8e',
    type: 'annual',
    shortDesc: "10th Muharram: fasting expiates the previous year's sins. Also fast the 9th.",
    significance:
      "The Prophet ﷺ arrived in Medina and found the Jews fasting on this day. They told him it was the day Allah saved Musa (Moses) ﷺ and drowned Pharaoh. The Prophet ﷺ said 'We have more right to Musa than you do' and fasted and commanded fasting. He intended to also fast the 9th to differ from the People of the Book. Fasting 'Āshūrā expiates the sins of the previous year.",
    todos: [
      {
        action: "Fast the 9th of Muharram (Tāsū'ā)",
        note: 'To differ from the People of the Book. The Prophet intended to do this',
      },
      {
        action: "Fast the 10th of Muharram ('Āshūrā)",
        note: 'Expiates one year of sins',
      },
      { action: "Make du'ā and increase istighfār", note: '' },
      {
        action: "Reflect on the story of Musa ﷺ: Allah's deliverance of the believers",
        note: '',
      },
    ],
    references: [
      {
        text: '"Fasting the day of \'Āshūrā expiates the sins of the previous year." · Ṣaḥīḥ Muslim 1162',
        url: 'https://sunnah.com/muslim:1162',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"If I live until next year, I will fast the 9th as well." · Ṣaḥīḥ Muslim 1134',
        url: 'https://sunnah.com/muslim:1134',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── FIRST 10 DAYS OF DHUL HIJJAH ──────────────────────────────────────────
  {
    id: 'dhul_hijjah_first10',
    name: 'First 10 Days of Dhul Ḥijjah',
    arabicName: 'أيام ذو الحجة',
    color: '#c9a96e',
    type: 'annual',
    shortDesc: 'The greatest days for good deeds; they outweigh even jihād in virtue.',
    significance:
      "These are the ten days Allah swore by in the Quran (89:2). The Prophet ﷺ said: 'There are no days in which righteous deeds are more beloved to Allah than these ten days.' Good deeds in these days, including fasting, dhikr (especially tahlīl, takbīr, taḥmīd), Quran recitation, ṣadaqah, and qiyām, are multiplied and more beloved to Allah than even those done in other times.",
    todos: [
      {
        action:
          'Increase tahlīl (Lā ilāha illallāh), takbīr (Allāhu Akbar), taḥmīd (Alḥamdulillāh), and tasbīḥ (SubḥānAllāh)',
        note: '',
      },
      {
        action: 'Fast the first 9 days if able (especially Day of Arafah, 9th)',
        note: '',
      },
      { action: 'Give ṣadaqah generously throughout these 10 days', note: '' },
      {
        action: 'Increase Quran recitation and complete a khatm if possible',
        note: '',
      },
      { action: 'Perform extra nawāfil prayers, especially Tahajjud', note: '' },
      {
        action: 'If planning Qurbānī, do not cut hair or nails from 1st Dhul Ḥijjah',
        note: 'Sunnah for those offering sacrifice',
      },
    ],
    references: [
      {
        text: '"There are no days in which righteous deeds are more beloved to Allah than these ten days." · Ṣaḥīḥ al-Bukhārī 969',
        url: 'https://sunnah.com/bukhari:969',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: "By the dawn; and the ten nights (89:1-2). These are the ten days of Dhul Ḥijjah, per Ibn 'Abbās (RA)",
        url: 'https://quran.com/89',
        grade: 'Quran',
      },
    ],
  },

  // ── DAY OF ARAFAH ──────────────────────────────────────────────────────────
  {
    id: 'arafah',
    name: 'Day of Arafah',
    arabicName: 'يَوْم عَرَفَة',
    color: '#c9a96e',
    type: 'annual',
    shortDesc: '9th Dhul Ḥijjah: the best day of the year. Fasting expiates two years of sins.',
    significance:
      'The Day of Arafah is the best day in the whole year. On this day, millions of pilgrims stand on the plain of Arafah in the greatest act of worship. For those not on Ḥajj, the Prophet ﷺ strongly recommended fasting: it expiates the sins of the previous year and the coming year. Allah descends and boasts to His angels about the people of Arafah. This is also the day Islam was perfected.',
    todos: [
      {
        action: 'Fast the Day of Arafah (9th Dhul Ḥijjah)',
        note: 'Expiates two years of sins. Do not miss it!',
      },
      {
        action: "Spend the day in du'ā, dhikr, and Quran",
        note: "Best du'ā: \"Lā ilāha illAllāhu waḥdahu lā sharīka lahu, lahu l-mulku wa lahu l-ḥamdu wa huwa 'alā kulli shay'in qadīr\"",
      },
      { action: 'Recite takbīr (Allāhu Akbar) abundantly', note: '' },
      { action: 'Give ṣadaqah and increase in righteous deeds', note: '' },
    ],
    references: [
      {
        text: '"Fasting the Day of Arafah expiates the sins of the previous and coming year." · Ṣaḥīḥ Muslim 1162',
        url: 'https://sunnah.com/muslim:1162',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"The best du\'ā is du\'ā on the Day of Arafah." · Tirmidhī 3585',
        url: 'https://sunnah.com/tirmidhi:3585',
        grade: 'Ḥasan',
      },
      {
        text: '"Today I have perfected your religion for you..." · Quran 5:3',
        url: 'https://quran.com/5/3',
        grade: 'Quran',
      },
    ],
  },

  // ── EID AL-FITR ─────────────────────────────────────────────────────────────
  {
    id: 'eid_fitr',
    name: 'Eid al-Fiṭr',
    arabicName: 'عيد الفطر',
    color: '#7a9e6e',
    type: 'annual',
    shortDesc: '1st Shawwāl: celebrate the completion of Ramadan. Eid prayer is wājib.',
    significance:
      "Eid al-Fiṭr marks the end of Ramadan and is a day of pure joy and gratitude. Fasting on this day is forbidden (ḥarām). The Eid prayer is wājib (required by many scholars) or Sunnah Muakkadah. Muslims pay Zakāt al-Fiṭr before the prayer, exchange Eid greetings, visit family, and celebrate Allah's blessing of completing Ramadan.",
    todos: [
      {
        action: 'Attend Eid prayer in congregation',
        note: 'Wājib/Sunnah Muakkadah. Do not miss it',
      },
      {
        action: 'Pay Zakāt al-Fiṭr before the Eid prayer',
        note: 'Must be paid before prayer to count (a grain-based charity)',
      },
      {
        action: 'Eat something sweet (dates) before Eid prayer',
        note: 'Sunnah: the Prophet ﷺ ate an odd number of dates before going out',
      },
      {
        action: 'Recite takbīr until the Eid prayer begins',
        note: 'Allāhu Akbar, Allāhu Akbar, Lā ilāha illAllāhu, Allāhu Akbar, Allāhu Akbar wa lillāhil ḥamd',
      },
      { action: 'Visit family, exchange gifts, spread joy', note: '' },
      { action: 'Do NOT fast today: fasting is ḥarām on Eid al-Fiṭr', note: '' },
    ],
    references: [
      {
        text: '"The Messenger of Allah ﷺ, Abū Bakr and \'Umar used to offer the two Eid prayers before the khuṭbah." · Ṣaḥīḥ al-Bukhārī 963',
        url: 'https://sunnah.com/bukhari:963',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '"The Messenger of Allah ﷺ would eat an odd number of dates before going out on the morning of Eid al-Fiṭr." · Ṣaḥīḥ al-Bukhārī 953',
        url: 'https://sunnah.com/bukhari:953',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── EID AL-ADHA ─────────────────────────────────────────────────────────────
  {
    id: 'eid_adha',
    name: 'Eid al-Aḍḥā',
    arabicName: 'عيد الأضحى',
    color: '#c9a96e',
    type: 'annual',
    shortDesc: '10th Dhul Ḥijjah: the greater Eid. Eid prayer, Qurbānī, and celebration.',
    significance:
      'Eid al-Aḍḥā is the greater Eid, coinciding with the Day of Naḥr (sacrifice) when Ḥājjīs perform their sacrifice after the Day of Arafah. Muslims worldwide offer Qurbānī (an animal sacrifice) to commemorate the sacrifice of Ibrāhīm ﷺ. It is a day of gratitude, prayer, and celebration. Fasting on this day is ḥarām.',
    todos: [
      { action: 'Attend Eid prayer in congregation', note: '' },
      {
        action: 'Offer Qurbānī (Uḍḥiyyah): sacrifice an animal',
        note: 'Wājib (Ḥanafī) or Sunnah Muakkadah (other madhāhib) for those who are able',
      },
      {
        action: 'Recite takbīr al-Tashrīq from Fajr of 9th to Asr of 13th Dhul Ḥijjah',
        note: '',
      },
      {
        action: 'Distribute Qurbānī meat: 1/3 family, 1/3 neighbours, 1/3 poor',
        note: '',
      },
      { action: 'Do NOT fast today: fasting is ḥarām on Eid al-Aḍḥā', note: '' },
    ],
    references: [
      {
        text: 'Qurbānī (Uḍḥiyyah) · Ṣaḥīḥ Muslim 1977',
        url: 'https://sunnah.com/muslim:1977',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Eid al-Adha prayer · Ṣaḥīḥ al-Bukhārī 956',
        url: 'https://sunnah.com/bukhari:956',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── LAYLAT AL-QADR ─────────────────────────────────────────────────────────
  {
    id: 'laylat_qadr',
    name: 'Laylat al-Qadr',
    arabicName: 'لَيْلَةُ القَدْر',
    color: '#c4825a',
    type: 'ramadan',
    shortDesc: 'Odd nights of the last 10 of Ramadan: better than 1000 months of worship.',
    significance:
      "Laylat al-Qadr is the night the Quran was revealed and the greatest night of the year. Worship on this single night is better than 83+ years of worship. The Prophet ﷺ would seclude himself (i'tikāf) in the last 10 nights of Ramadan and seek it especially on odd nights. The signs include a calm, temperate night and the sun rising with no rays the next morning.",
    todos: [
      { action: 'Pray Tarāwīḥ/Qiyām al-Layl throughout the night', note: '' },
      {
        action: "Recite the du'ā: 'Allāhumma innaka 'afuwwun tuḥibb al-'afwa fa'fu 'annī'",
        note: '"O Allah, You are Most Forgiving and love forgiveness, so forgive me." · Tirmidhī 3513',
      },
      { action: 'Recite the Quran extensively throughout the night', note: '' },
      { action: 'Make abundant istighfār, ṣalawāt, and dhikr', note: '' },
      {
        action: 'Give ṣadaqah: this night is better than a thousand months (Quran 97:3)',
        note: '',
      },
      { action: 'Pray Fajr in congregation, completing the night', note: '' },
    ],
    references: [
      {
        text: '"Laylat al-Qadr is better than a thousand months." · Quran 97:3',
        url: 'https://quran.com/97',
        grade: 'Quran',
      },
      {
        text: '"Seek it in the odd nights of the last ten of Ramadan." · Ṣaḥīḥ al-Bukhārī 2017',
        url: 'https://sunnah.com/bukhari:2017',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: "The Laylat al-Qadr du'ā · Sunan al-Tirmidhī 3513",
        url: 'https://sunnah.com/tirmidhi:3513',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },

  // ── SHAB-E-BARAT / LAYLAT AL-BARA'AH ──────────────────────────────────────
  {
    id: 'shab_e_barat',
    name: "Laylat al-Barā'ah",
    arabicName: 'ليلة البراءة',
    color: '#5a9e8e',
    type: 'annual',
    shortDesc:
      "15th Sha'bān night: Allah forgives abundantly. Some scholars consider this established.",
    significance:
      "On the night of the 15th of Sha'bān (i.e., the night between 14th and 15th), some hadith reports indicate that Allah looks upon His creation and forgives all except those who associate partners with Him and those who harbour enmity. Many scholars (including Imam Ahmad, Ibn Rajab, and al-Albānī) consider this night to have virtue. However, there is scholarly disagreement: the reports are weak by some standards but ḥasan by others. Observe this night with worship if you believe in its virtue, but don't innovate specific rituals with no established basis.",
    todos: [
      { action: "Spend the night in qiyām, du'ā, and dhikr", note: '' },
      {
        action: "Fast on the 15th of Sha'bān",
        note: 'Many scholars recommend fasting this day',
      },
      { action: 'Seek forgiveness (istighfār) abundantly', note: '' },
      { action: 'Recite Quran and reflect on your life', note: '' },
    ],
    references: [
      {
        text: '"Allah looks down on the night of the 15th of Sha\'bān and forgives all His creation except a mushrik or a spiteful person." · Sunan Ibn Mājah 1390',
        url: 'https://sunnah.com/ibnmajah:1390',
        grade: 'Ḥasan per al-Albānī; Ḍaʿīf (Darussalam)',
      },
      {
        text: "Scholarly discussion on Sha'bān 15 · see Ibn Rajab's Laṭā'if al-Ma'ārif",
        url: 'https://islamqa.info/en/answers/8907',
        grade: 'Reference',
      },
    ],
  },

  // ── ISLAMIC NEW YEAR ──────────────────────────────────────────────────────
  {
    id: 'islamic_new_year',
    name: 'Islamic New Year',
    arabicName: 'رأس السنة الهجرية',
    color: '#7a9e6e',
    type: 'annual',
    shortDesc: "1st Muḥarram: the Hijrī year begins. Reflect on the Prophet ﷺ's migration.",
    significance:
      "The Islamic New Year marks the beginning of the Hijrī calendar, established after the migration (Hijra) of the Prophet ﷺ from Mecca to Medina. Muḥarram is one of the four sacred months in Islam. It is a time for reflection, renewed intentions, and increased worship. The Quran mentions: 'Allah's count of months is twelve' (9:36). There is no specific act of worship legislated for this day; it is a time for reflection.",
    todos: [
      {
        action: 'Reflect on the Hijra and its lessons of sacrifice and trust in Allah',
        note: '',
      },
      { action: 'Renew your intention (niyyah) for the year ahead', note: '' },
      { action: 'Increase worship in this sacred month of Muḥarram', note: '' },
      { action: "Prepare for 'Āshūrā fasting (9th and 10th Muḥarram)", note: '' },
    ],
    references: [
      {
        text: '"The best fasting after Ramadan is fasting in the month of Muḥarram." · Ṣaḥīḥ Muslim 1163',
        url: 'https://sunnah.com/muslim:1163',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'The four sacred months · Quran 9:36',
        url: 'https://quran.com/9/36',
        grade: 'Quran',
      },
    ],
  },
];

// ── Hijri date detection ────────────────────────────────────────────────────

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  weekday: number; // 0=Sun, 5=Fri
}

const HIJRI_MONTH_NAMES = [
  'Muḥarram',
  'Ṣafar',
  "Rabī' al-Awwal",
  "Rabī' al-Ākhir",
  'Jumādā al-Ūlā',
  'Jumādā al-Ākhirah',
  'Rajab',
  "Sha'bān",
  'Ramaḍān',
  'Shawwāl',
  "Dhul Qa'dah",
  'Dhul Ḥijjah',
];

// ── Regional moon-sighting adjustment ───────────────────────────────────────
// Umm al-Qura follows Saudi sighting; a country's committee often starts a
// month a day earlier or later (Bangladesh is frequently a day behind).
// T4.1: in this order, the first that applies wins (all on-device):
//   1. the user's own offset (Settings: -1, 0, +1 days);
//   2. "Automatic": their country's moon-sighting record in force on that
//      date, set by the admin from the national committee's announcement;
//   3. 0 (plain Umm al-Qura): no guessed default (Istiak, T4.1).

const HIJRI_ADJUSTMENT_KEY = 'bustandeen_hijri_offset';
/** '1' = the user picked their own offset; '0' = Automatic. Absent on devices
 * from before T4.1: a non-zero offset counts as chosen (0 was the default). */
const HIJRI_MANUAL_KEY = 'bustandeen_hijri_manual';
/** Cached active records from /api/calendar/moon-sighting (useMoonSighting) */
export const MOON_SIGHTING_KEY = 'bustandeen_moon_sighting';
/** ISO country used for Automatic: profile country, else the time zone's */
export const HIJRI_COUNTRY_KEY = 'bustandeen_hijri_country';

export {
  resolveHijriOffset,
  type HijriOffsetSource,
  type MoonSightingRecord,
} from './hijriOffset.js';

/** Local YYYY-MM-DD of a Date (the device's calendar day). */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The user's own stored offset (used only when they chose it, see isHijriManual). */
export function readUserOffset(): number {
  return clampOffset(parseInt(localStorage.getItem(HIJRI_ADJUSTMENT_KEY) ?? '0', 10));
}

export function isHijriManual(): boolean {
  const raw = localStorage.getItem(HIJRI_MANUAL_KEY);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return readUserOffset() !== 0;
}

export function readMoonSightingCache(): MoonSightingRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MOON_SIGHTING_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is MoonSightingRecord =>
        !!r &&
        typeof r.country === 'string' &&
        typeof r.effectiveFrom === 'string' &&
        typeof r.offset === 'number'
    );
  } catch {
    return [];
  }
}

/** The offset in force on `date`, and where it comes from. */
export function getHijriOffsetSource(date: Date = new Date()): HijriOffsetSource {
  return resolveHijriOffset({
    manual: isHijriManual(),
    userOffset: readUserOffset(),
    country: localStorage.getItem(HIJRI_COUNTRY_KEY),
    records: readMoonSightingCache(),
    day: localDay(date),
  });
}

export function getHijriAdjustment(date: Date = new Date()): number {
  return getHijriOffsetSource(date).offset;
}

/** The user's own choice: from now on it wins over their country's record. */
export function setHijriAdjustment(days: number): void {
  localStorage.setItem(HIJRI_ADJUSTMENT_KEY, String(clampOffset(days)));
  localStorage.setItem(HIJRI_MANUAL_KEY, '1');
}

/** Back to Automatic: follow the country's moon-sighting record. */
export function setHijriAutomatic(): void {
  localStorage.setItem(HIJRI_ADJUSTMENT_KEY, '0');
  localStorage.setItem(HIJRI_MANUAL_KEY, '0');
}

/** Mirror the server's values (session start): offset + whether it is manual. */
export function syncHijriFromServer(offset: number, manual: boolean | undefined): void {
  localStorage.setItem(HIJRI_ADJUSTMENT_KEY, String(clampOffset(offset)));
  if (manual !== undefined) localStorage.setItem(HIJRI_MANUAL_KEY, manual ? '1' : '0');
}

export function getHijriDate(date: Date = new Date()): HijriDate | null {
  return hijriDateWithOffset(date, getHijriAdjustment(date));
}

/** Umm al-Qura date of `date` shifted by an explicit `offset` in days, ignoring
 * every setting (the admin preview uses it). */
export function hijriDateWithOffset(date: Date, offset: number): HijriDate | null {
  try {
    const adjusted = new Date(date.getTime() + offset * 86_400_000);
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(adjusted);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '0');
    const month = parseInt(parts.find((p) => p.type === 'month')?.value ?? '0');
    const year = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0');
    return {
      day,
      month,
      year,
      monthName: HIJRI_MONTH_NAMES[month - 1] ?? '',
      weekday: date.getDay(),
    };
  } catch {
    return null;
  }
}

/** Format Hijri date for display: month name, day, and year all follow the
 * app's selected language (via the shared `hijriMonths.*` locale keys and
 * বাংলা digits in Bengali mode). */
export function formatHijriDate(h: HijriDate): string {
  const lang = (i18n.language || 'en').split('-')[0];
  const monthName = i18n.t(`hijriMonths.${h.month - 1}`, { defaultValue: h.monthName });
  const ah = i18n.t('hijriMonths.ah', { defaultValue: 'AH' });
  // useGrouping off: a year is "১৪৪৭", never "১,৪৪৭".
  const bnDigits = (n: number) => n.toLocaleString('bn', { useGrouping: false });
  const day = lang === 'bn' ? bnDigits(h.day) : String(h.day);
  const year = lang === 'bn' ? bnDigits(h.year) : String(h.year);
  return `${day} ${monthName} ${year} ${ah}`;
}

/**
 * Whether the current time is past Maghrib (Islamic day has advanced).
 * Returns false when no saved location is available.
 */
export function isPostMaghrib(now: Date = new Date()): boolean {
  try {
    const stored = localStorage.getItem('bustandeen_location');
    if (!stored) return false;
    const loc = JSON.parse(stored) as { latitude: number; longitude: number };
    const times = calcPrayerTimes(loc.latitude, loc.longitude, now);
    return now >= times.maghrib;
  } catch {
    return false;
  }
}

/**
 * Hijri date for the current ISLAMIC day; advances at Maghrib, not midnight.
 * Use this for display ("today's Hijri date") and special-day detection.
 * For calendar/historical conversions, use getHijriDate(specificDate) instead.
 */
export function getHijriToday(): HijriDate | null {
  const now = new Date();
  if (isPostMaghrib(now)) {
    return getHijriDate(new Date(now.getTime() + 86_400_000));
  }
  return getHijriDate(now);
}

/** Returns all special days active today (Maghrib-aware) */
export function getTodaySpecialDays(date?: Date): SpecialDayInfo[] {
  const now = date ?? new Date();
  const h = date ? getHijriDate(date) : getHijriToday();
  // Weekly events must also shift at Maghrib: after Maghrib on Wed → Islamic Thu
  const postMaghrib = !date && isPostMaghrib(now);
  const shifted = postMaghrib ? new Date(now.getTime() + 86_400_000) : now;
  const weekday = shifted.getDay(); // 0=Sun, 5=Fri

  const ids: string[] = [];

  // Friday
  if (weekday === 5) ids.push('friday');

  // Monday (1) or Thursday (4)
  if (weekday === 1 || weekday === 4) ids.push('fast_mon_thu');

  if (h) {
    // Ayyam al-Bid: 13th, 14th, 15th of every month
    if ([13, 14, 15].includes(h.day)) ids.push('ayyam_al_bid');

    // Muharram
    if (h.month === 1) {
      if (h.day === 1) ids.push('islamic_new_year');
      if (h.day === 9 || h.day === 10) ids.push('ashura');
    }

    // Sha'ban 14th/15th: Laylat al-Bara'ah
    if (h.month === 8 && (h.day === 14 || h.day === 15)) ids.push('shab_e_barat');

    // Ramadan (month 9): odd nights of last 10 = Laylat al-Qadr
    if (h.month === 9 && h.day >= 21 && h.day % 2 === 1) ids.push('laylat_qadr');

    // Shawwal 1st = Eid al-Fitr
    if (h.month === 10 && h.day === 1) ids.push('eid_fitr');

    // Dhul Hijjah
    if (h.month === 12) {
      if (h.day >= 1 && h.day <= 8) ids.push('dhul_hijjah_first10');
      if (h.day === 9) ids.push('arafah');
      if (h.day === 10) ids.push('eid_adha');
    }
  }

  return ids
    .map((id) => SPECIAL_DAYS.find((d) => d.id === id))
    .filter((d): d is SpecialDayInfo => d !== undefined);
}

/** Returns true if the current Islamic day is Friday (Jumu'ah), Maghrib-aware */
export function isFriday(): boolean {
  const now = new Date();
  const shifted = isPostMaghrib(now) ? new Date(now.getTime() + 86_400_000) : now;
  return shifted.getDay() === 5;
}
