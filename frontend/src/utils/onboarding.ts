// First-run setup (audit T3.3, pages/Onboarding.tsx). Who sees what:
//  - accounts created after onboarding shipped (`onboardingRequired`) are sent
//    to the full-screen flow from Home until they finish or skip it;
//  - older accounts (and the demo) get a dismissible card on Home instead;
//  - once finished, skipped or dismissed (`onboardedAt`, or this device's own
//    flag while the server write is in flight or offline), nothing shows.
// The flow stays reachable from Settings → Home screen.

/** Also the default order (Istiak, 2026-10-09): 1 Salat, 2 Zikr, 3 Quran,
 *  4 Fasting. The user can reorder them; nothing is left out. */
export const HABITS = ['salat', 'zikr', 'quran', 'fasting'] as const;
export type Habit = (typeof HABITS)[number];

/** Synced across devices (utils/prefsSync.ts + the server whitelist). */
export const FOCUS_KEY = 'bustandeen_focus_habits';
/** This device only: the server's onboardedAt is the real record. */
export const ONBOARDED_KEY = 'bustandeen_onboarded';

/** Starting goals offered on the habits step. */
export const ZIKR_GOAL_OPTIONS = [33, 100, 300] as const;
export const QURAN_AYAT_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_ZIKR_GOAL = 100;
export const DEFAULT_QURAN_AYAT = 5;

const isHabit = (v: unknown): v is Habit => HABITS.includes(v as Habit);

/** A full order of all four habits: the saved ones first (older setups saved
 *  up to three picks), then the rest in the default order. */
export function completeOrder(saved: readonly unknown[]): Habit[] {
  const picked = [...new Set(saved.filter(isHabit))];
  return [...picked, ...HABITS.filter((h) => !picked.includes(h))];
}

/** The user's habit order (all four); the default order when none saved. */
export function getFocusHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return completeOrder(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [...HABITS];
  }
}

export function setFocusHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(completeOrder(habits)));
  } catch {
    /* private mode */
  }
}

/** Moves a habit one place up (-1) or down (+1); the ends stay put. */
export function moveHabit(order: Habit[], habit: Habit, dir: -1 | 1): Habit[] {
  const i = order.indexOf(habit);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** Settings → Home and the setup's last step: the Salat timeline on Home.
 *  The arch's five-prayer row always stays. Synced across devices. */
export const HOME_TIMELINE_KEY = 'bustandeen_home_timeline';

/** On unless turned off (older accounts keep the timeline they have). */
export function getHomeTimeline(): boolean {
  try {
    return localStorage.getItem(HOME_TIMELINE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setHomeTimeline(on: boolean): void {
  try {
    localStorage.setItem(HOME_TIMELINE_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

/** The setup's suggestion: show the timeline when Salat comes first. */
export function defaultTimelineFor(order: Habit[]): boolean {
  return order[0] === 'salat';
}

/** Home's worship cards in the user's habit order; anything not in it keeps
 * its usual place after them. */
export function orderByFocus<T extends { id: string }>(items: T[], focus: Habit[]): T[] {
  const rank = (id: string) => {
    const i = focus.indexOf(id as Habit);
    return i === -1 ? focus.length : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item.id) - rank(b.item.id) || a.i - b.i)
    .map(({ item }) => item);
}

export function isOnboardedLocally(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardedLocally(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* private mode */
  }
}

export interface OnboardingProfile {
  onboardingRequired?: boolean;
  onboardedAt?: string | null;
}

/**
 * What Home should do.
 * `profile`: undefined while loading (show nothing, so no flash), null in the
 * demo (no server record: the card, like an existing account).
 */
export function onboardingMode(
  profile: OnboardingProfile | null | undefined,
  locallyDone: boolean
): 'flow' | 'card' | 'none' {
  if (locallyDone || profile === undefined) return 'none';
  if (profile === null) return 'card';
  if (profile.onboardedAt) return 'none';
  return profile.onboardingRequired ? 'flow' : 'card';
}

/** The option to preselect: the user's current goal when it is one of the
 * options, otherwise the gentle default. */
export function initialGoal(
  current: number | null | undefined,
  options: readonly number[],
  fallback: number
): number {
  return current && options.includes(current) ? current : fallback;
}
