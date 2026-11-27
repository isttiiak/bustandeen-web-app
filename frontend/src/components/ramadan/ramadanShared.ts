import { type ComponentType, type SVGProps } from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import { formatLocaleDate } from '../../utils/localeDate.js';

/** The three ʿashra, named the way the ummah actually refers to them
 * (Istiak's call) — Raḥmah, Maghfirah, ʿItq min an-Nār.
 *
 * HONESTY NOTE, kept deliberately: this three-way split traces to a narration
 * in Ibn Khuzaymah (1887) whose chain is graded ḍaʿīf — Ibn Khuzaymah himself
 * flagged it. The NAMES are how people organise the month and are used here as
 * such, but the page never presents them as an established reward structure;
 * the badge in the UI carries the grade. The last ten's virtue, by contrast, is
 * firmly authentic (Bukhārī 2017), so only that one states a promise. */
export const ASHRA_META = [
  {
    from: 1,
    to: 10,
    labelKey: 'ramadan.ashraRahmah',
    subKey: 'ramadan.ashraMercy',
    noteKey: '',
    weak: true,
  },
  {
    from: 11,
    to: 20,
    labelKey: 'ramadan.ashraMaghfirah',
    subKey: 'ramadan.ashraForgiveness',
    noteKey: '',
    weak: true,
  },
  {
    from: 21,
    to: 30,
    labelKey: 'ramadan.ashraItq',
    subKey: 'ramadan.ashraFreedom',
    noteKey: 'ramadan.ashraItqNote',
    weak: true,
  },
];

export type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
export type WorshipId = 'salat' | 'nafl' | 'quran' | 'zikr';

export const WORSHIP_TILES: {
  id: WorshipId;
  labelKey: string;
  Icon: Icon;
  to: string;
  tone: string;
}[] = [
  {
    id: 'salat',
    labelKey: 'ramadan.fardSalat',
    Icon: MosqueIcon,
    to: '/salat',
    tone: 'text-brand-emerald',
  },
  {
    id: 'nafl',
    labelKey: 'ramadan.naflRakahs',
    Icon: CrescentIcon,
    to: '/salat',
    tone: 'text-brand-info',
  },
  {
    id: 'quran',
    labelKey: 'ramadan.quranToday',
    Icon: BookOpenIcon,
    to: '/quran',
    tone: 'text-brand-info',
  },
  {
    id: 'zikr',
    labelKey: 'ramadan.dhikrToday',
    Icon: TasbihIcon,
    to: '/zikr',
    tone: 'text-brand-gold',
  },
];

/** The arch's day-state medallion and the inset panels use the same ring. */
export const MEDALLION =
  'mx-auto w-16 h-16 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold';
export const INSET = 'rounded-control bg-shade/20 border border-brand-border';

export function weekdayShort(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { weekday: 'short' });
}

/** Civil date shown inside each cell — "2 Feb" — so the month can be planned
 * against a normal calendar without converting hijri in your head. */
export function gregorianShort(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { day: 'numeric', month: 'short' });
}

export function formatGregorian(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
