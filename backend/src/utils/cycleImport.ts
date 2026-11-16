/**
 * A person can have one OPEN cycle (endDate null) at a time; the database
 * refuses a second (audit 2026-11-16 P1-8). A backup file may still hold more:
 * keep the most recent one open and leave the others out, so the restore
 * succeeds instead of failing on the unique index.
 */
export function keepOneOpenCycle<T extends { startDate?: unknown; endDate?: unknown }>(
  rows: T[]
): { kept: T[]; dropped: number } {
  const isOpen = (r: T) => r.endDate === null || r.endDate === undefined;
  const open = rows.filter(isOpen);
  if (open.length <= 1) return { kept: rows, dropped: 0 };
  const newest = open.reduce((a, b) => (String(b.startDate) > String(a.startDate) ? b : a));
  return { kept: rows.filter((r) => !isOpen(r) || r === newest), dropped: open.length - 1 };
}
