import { type PrayerId } from '../../hooks/useSalatLog.js';

export const PRAYERS: { id: PrayerId; name: string }[] = [
  { id: 'fajr', name: 'Fajr' },
  { id: 'dhuhr', name: 'Dhuhr' },
  { id: 'asr', name: 'Asr' },
  { id: 'maghrib', name: 'Maghrib' },
  { id: 'isha', name: 'Isha' },
];

export const STAY_PRESETS = [0, 2, 3, 5, 10, 20];

/** Inputs: the theme's surface; the date picker follows the theme's color-scheme. */
export const FIELD =
  'mt-1.5 w-full rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-white text-sm placeholder:text-white/50 focus:border-brand-emerald focus:outline-none transition-colors';
export const LABEL = 'text-white/80 text-xs font-bold flex items-center gap-1.5';
/** A choice chip in the form. */
export const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-control text-xs font-bold border transition-colors ${
    on
      ? 'bg-brand-emerald/15 border-brand-emerald text-brand-emerald'
      : 'bg-brand-surface/50 border-brand-border text-white/70 hover:text-white'
  }`;
/** A small label pill inside the hero. */
export const PILL =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-brand-border bg-brand-surface/60 text-white/80';
