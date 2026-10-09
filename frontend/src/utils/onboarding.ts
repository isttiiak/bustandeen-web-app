// First-run setup (audit T3.3, pages/Onboarding.tsx). Who sees what:
//  - accounts created after onboarding shipped (`onboardingRequired`) are sent
//    to the full-screen flow from Home until they finish or skip it;
//  - older accounts (and the demo) get a dismissible card on Home instead;
//  - once finished, skipped or dismissed (`onboardedAt`, or this device's own
//    flag while the server write is in flight or offline), nothing shows.
// The flow stays reachable from Settings → Home screen.

export const HABITS = ['salat', 'zikr', 'quran', 'fasting'] as const;
export type Habit = (typeof HABITS)[number];
/** Gentle by design: up to three things to grow first. */
export const MAX_HABITS = 3;

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

/** The chosen habits in the order they were picked; [] when none chosen. */
export function getFocusHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(isHabit))].slice(0, MAX_HABITS);
  } catch {
    return [];
  }
}

export function setFocusHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(
      FOCUS_KEY,
      JSON.stringify([...new Set(habits.filter(isHabit))].slice(0, MAX_HABITS))
    );
  } catch {
    /* private mode */
  }
}

/** Adds or removes a habit; adding beyond the cap is ignored. */
export function toggleHabit(current: Habit[], habit: Habit): Habit[] {
  if (current.includes(habit)) return current.filter((h) => h !== habit);
  if (current.length >= MAX_HABITS) return current;
  return [...current, habit];
}

/** Home's worship cards: chosen habits first (in the order picked), the rest
 * keep their usual order. */
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
