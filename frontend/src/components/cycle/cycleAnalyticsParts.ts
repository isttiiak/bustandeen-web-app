import { formatLocaleDate } from '../../utils/localeDate.js';

/** A stat value when there is no data yet (no em dash in UI copy). */
export const NO_VALUE = '-';
export const TILE_NUM = 'font-display text-2xl font-bold';
export const TILE_LABEL = 'text-white/70 text-[10px] font-bold uppercase mt-1';
export const BAR_TRACK = 'flex-1 rounded-full bg-brand-surface overflow-hidden';
export const NOTE = 'text-white/70 text-xs mt-0.5 leading-relaxed';
export const FOOT = 'text-white/70 text-[11px] mt-3 leading-relaxed';

export function fmt(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { month: 'short', day: 'numeric' });
}
export function fmtFull(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
