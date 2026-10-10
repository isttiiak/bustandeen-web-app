/** Label for a rolling 7-day window, newest first ([0] = the last 7 days). */
export function weekLabel(index: number): string {
  if (index === 0) return 'Last 7 days';
  if (index === 1) return '1 week before';
  return `${index} weeks before`;
}

/** Share of the cohort seen again after their first week, or null when the
 *  cohort is empty (no percent to show). */
export function cameBackPercent(c: { cohort: number; returned: number }): number | null {
  if (c.cohort <= 0) return null;
  return Math.round((c.returned / c.cohort) * 100);
}
