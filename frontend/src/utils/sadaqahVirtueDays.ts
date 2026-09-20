// Days with extra-recommended ṣadaqah virtue, beyond the ordinary everyday
// reward — surfaced as a persistent homepage card (SadaqahVirtueCard.tsx),
// distinct from the general "Islamic special day" widget which links to a
// significance/todos page, not straight to /sadaqah.
//
// AUTHENTICITY POLICY (same discipline as sunnahGuide.ts/islamicCalendar.ts):
// every claim here is either a direct, verified ḥadīth already cited
// elsewhere in this app, or explicitly attributed to a named scholar's own
// teaching rather than presented as a ḥadīth itself. In particular:
// "ṣadaqah on Friday specifically" is NOT a standalone Prophetic ḥadīth —
// it is Ibn al-Qayyim's own analysis in Zād al-Maʿād, and must stay
// attributed to him as scholarly teaching, never implied to be a ḥadīth
// with its own authenticity grade.

import { getTodaySpecialDays } from './islamicCalendar.js';
import { getRamadanWindow } from './ramadan.js';

export interface SadaqahVirtueReference {
  text: string;
  url: string;
  grade: string;
}

export interface SadaqahVirtueDay {
  id: string;
  icon: string;
  title: string;
  desc: string;
  reference: SadaqahVirtueReference;
}

export const SADAQAH_VIRTUE_DAYS: SadaqahVirtueDay[] = [
  {
    id: 'friday',
    icon: '🤲',
    title: "It's Jumu'ah — a blessed day to give",
    desc: 'Ibn al-Qayyim taught that charity on Friday carries the same extra merit over other days that charity in Ramadan carries over other months — and charity itself never decreases wealth.',
    reference: {
      text: 'Ibn al-Qayyim (Zād al-Maʿād) on Friday\'s merit; "Charity does not decrease wealth" — Ṣaḥīḥ Muslim 2588',
      url: 'https://sunnah.com/muslim:2588',
      grade: "Ṣaḥīḥ (the wealth ḥadīth) · scholarly teaching (Friday's own merit)",
    },
  },
  {
    id: 'ramadan',
    icon: '🌙',
    title: "It's Ramadan — the most generous month",
    desc: 'The Prophet ﷺ was already the most generous of people, and became even more generous every night of Ramadan.',
    reference: {
      text: '"Allah\'s Messenger ﷺ was the most generous of all people, and he used to reach the peak in generosity in the month of Ramaḍān." — Ṣaḥīḥ al-Bukhārī 1902',
      url: 'https://sunnah.com/bukhari:1902',
      grade: 'Ṣaḥīḥ',
    },
  },
  {
    id: 'dhul_hijjah_first10',
    icon: '🌟',
    title: 'The first 10 days of Dhul Ḥijjah — give generously',
    desc: 'No days are more beloved to Allah for righteous deeds than these ten — charity given now is counted among the best deeds of the entire year.',
    reference: {
      text: '"There are no days in which righteous deeds are more beloved to Allah than these ten days." — Ṣaḥīḥ al-Bukhārī 969',
      url: 'https://sunnah.com/bukhari:969',
      grade: 'Ṣaḥīḥ',
    },
  },
  {
    id: 'arafah',
    icon: '⛰️',
    title: 'Day of Arafah — the best day of the year',
    desc: 'Arafah falls within the ten days most beloved to Allah for righteous deeds — charity given today shares in that same virtue.',
    reference: {
      text: '"There are no days in which righteous deeds are more beloved to Allah than these ten days." — Ṣaḥīḥ al-Bukhārī 969',
      url: 'https://sunnah.com/bukhari:969',
      grade: 'Ṣaḥīḥ',
    },
  },
  {
    id: 'laylat_qadr',
    icon: '✨',
    title: 'Laylat al-Qadr — a night better than 1,000 months',
    desc: 'Any charity given tonight is multiplied beyond a thousand months of ordinary worship.',
    reference: {
      text: '"Laylat al-Qadr is better than a thousand months." — Quran 97:3',
      url: 'https://quran.com/97',
      grade: 'Quran',
    },
  },
];

const findDay = (id: string): SadaqahVirtueDay | null =>
  SADAQAH_VIRTUE_DAYS.find((d) => d.id === id) ?? null;

/**
 * Returns today's ṣadaqah-virtue highlight, if any — only one shows at once,
 * checked most-specific/greatest-virtue first. Laylat al-Qadr (an odd night
 * within the last 10 of Ramadan) outranks plain Ramadan; Arafah (9th Dhul
 * Ḥijjah) and the first-10-days entry never overlap (islamicCalendar.ts caps
 * the latter at day 8) so their order doesn't matter relative to each other.
 */
export function getTodaySadaqahVirtueDay(): SadaqahVirtueDay | null {
  const specialIds = new Set(getTodaySpecialDays().map((d) => d.id));

  if (specialIds.has('laylat_qadr')) return findDay('laylat_qadr');
  if (specialIds.has('arafah')) return findDay('arafah');
  if (specialIds.has('dhul_hijjah_first10')) return findDay('dhul_hijjah_first10');
  if (getRamadanWindow().active) return findDay('ramadan');
  if (specialIds.has('friday')) return findDay('friday');

  return null;
}
