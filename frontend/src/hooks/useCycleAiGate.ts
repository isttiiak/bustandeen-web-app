import { useAuthStore } from '../store/useAuthStore.js';
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
 * - 'resting'  - a cycle is active, or its status could not be read. Fails
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
  return summary.data?.active ? 'resting' : 'clear';
}
