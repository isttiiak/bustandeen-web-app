// Home quick sections (T3.4 E, Istiak 2026-10-09): a short, few-tap section
// per habit, shown in the habit order (utils/onboarding.ts). The Salat
// section is the prayer timeline, switched by HOME_TIMELINE_KEY; Quran, Zikr
// and Fasting are switched here. All on by default. Synced across devices
// (utils/prefsSync.ts + the server whitelist).

import { getFocusHabits, getHomeTimeline, type Habit } from './onboarding.js';

export const HOME_SECTIONS_OFF_KEY = 'bustandeen_home_sections_off';

type QuickHabit = Exclude<Habit, 'salat'>;
const QUICK: readonly QuickHabit[] = ['quran', 'zikr', 'fasting'];

function readOff(): QuickHabit[] {
  try {
    const raw = localStorage.getItem(HOME_SECTIONS_OFF_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((h): h is QuickHabit => QUICK.includes(h as QuickHabit))
      : [];
  } catch {
    return [];
  }
}

/** Whether a habit's Home section is on. */
export function isSectionOn(habit: Habit): boolean {
  if (habit === 'salat') return getHomeTimeline();
  return !readOff().includes(habit);
}

export function setSectionOn(habit: QuickHabit, on: boolean): void {
  const off = readOff().filter((h) => h !== habit);
  if (!on) off.push(habit);
  try {
    localStorage.setItem(HOME_SECTIONS_OFF_KEY, JSON.stringify(off));
  } catch {
    /* private mode */
  }
}

/** The sections Home shows, in the user's habit order. */
export function homeSections(): Habit[] {
  return getFocusHabits().filter(isSectionOn);
}
