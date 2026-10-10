// Home quick sections (T3.4 E, Istiak 2026-10-09): a short, few-tap section
// per habit, shown in the habit order (utils/onboarding.ts). The Salat
// section is the prayer timeline, switched by HOME_TIMELINE_KEY; Quran, Zikr
// and Fasting are switched here. All on by default; any subset may be on
// (U5). Synced across devices (utils/prefsSync.ts + the server whitelist).

import {
  HABITS,
  completeOrder,
  getFocusHabits,
  getHomeTimeline,
  setHomeTimeline,
  type Habit,
} from './onboarding.js';

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

// ── Today's goals card (U5, Istiak 2026-10-10) ──────────────────────────────
// On/off, its own row order, rows switched off, and the streak/badge line.
// Rule: Home always keeps at least one quick section or the goals card. The
// switches enforce it; if a sync ever lands on "nothing on", the card shows.

export const HOME_GOALS_KEY = 'bustandeen_home_goals';

export interface HomeGoals {
  on: boolean;
  /** Unset = follows the habit order (older accounts, or a fresh setup). */
  order?: Habit[];
  off: Habit[];
  badges: boolean;
}

const DEFAULT_GOALS: HomeGoals = { on: true, off: [], badges: true };

export function getHomeGoals(): HomeGoals {
  try {
    const raw = localStorage.getItem(HOME_GOALS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<HomeGoals> | null) : null;
    if (!p || typeof p !== 'object') return { ...DEFAULT_GOALS };
    const habits = (v: unknown): Habit[] =>
      Array.isArray(v)
        ? [...new Set(v.filter((h): h is Habit => HABITS.includes(h as Habit)))]
        : [];
    return {
      on: p.on !== false,
      ...(Array.isArray(p.order) ? { order: completeOrder(habits(p.order)) } : {}),
      off: habits(p.off),
      badges: p.badges !== false,
    };
  } catch {
    return { ...DEFAULT_GOALS };
  }
}

export function setHomeGoals(next: HomeGoals): void {
  try {
    localStorage.setItem(HOME_GOALS_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

/** The goal rows' order: its own once the user moved a row, else the habit order. */
export function goalOrder(goals: HomeGoals = getHomeGoals()): Habit[] {
  return goals.order ?? getFocusHabits();
}

/** The rows the card shows, in order. Never empty: all off reads as all on. */
export function goalRows(goals: HomeGoals = getHomeGoals()): Habit[] {
  const order = goalOrder(goals);
  const rows = order.filter((h) => !goals.off.includes(h));
  return rows.length ? rows : order;
}

export function anyQuickSectionOn(): boolean {
  return HABITS.some(isSectionOn);
}

/** Whether Home shows the goals card (the rule's safety net included). */
export function goalsCardShown(goals: HomeGoals = getHomeGoals()): boolean {
  return goals.on || !anyQuickSectionOn();
}

/** The welcome setup's habits step (U5): which quick sections show and the
 *  goals card. With no section on, the card stays on. The goal rows go back
 *  to following the habit order the user just set. */
export function saveSetupHomeChoice(on: Record<Habit, boolean>, goalsOn: boolean): void {
  setHomeTimeline(on.salat);
  for (const h of QUICK) setSectionOn(h, on[h]);
  const { order: _order, ...goals } = getHomeGoals();
  setHomeGoals({ ...goals, on: goalsOn || !HABITS.some((h) => on[h]) });
}
