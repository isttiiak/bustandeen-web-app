import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { useCycleSummary, useIsFemale } from './useCycle.js';

/**
 * On-device gate for every AI card that could touch a rest (Rayhanah) day.
 *
 * Rayhanah privacy rule: no cycle data ever goes to an AI, and while a cycle is
 * active Naseeh must not run its streak, weekly, pattern, plan or welcome-back
 * AI calls at all (those numbers would read rest days as slips). The decision
 * is made here, on the device, from data already loaded for the cycle screens;
 * nothing about it is sent anywhere.
 *
 * - 'clear'    - not on a rest day (or not a Rayhanah user): AI cards may run.
 * - 'resting'  - today falls inside a logged cycle (still open, OR ended today:
 *                the last day is a rest day too, the same rule the server uses),
 *                or the status could not be read. Fails
 *                CLOSED: if we cannot tell, we do not call the AI.
 * - 'checking' - the cycle status is still loading. Do not call the AI yet.
 */
export type CycleAiGate = 'clear' | 'resting' | 'checking';

export function useCycleAiGate(): CycleAiGate {
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const summary = useCycleSummary();

  if (!user || !isFemale) return 'clear';
  if (summary.isPending) return 'checking';
  if (summary.isError) return 'resting';
  const today = getTrackingDay();
  const coversToday = (summary.data?.logs ?? []).some(
    (l) => l.startDate <= today && (l.endDate === null || today <= l.endDate)
  );
  return summary.data?.active || coversToday ? 'resting' : 'clear';
}
