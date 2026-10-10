/** A new admin password must be at least this long (as for a new Ansar). */
export const ADMIN_PASSWORD_MIN = 8;

/** Why the change-password form can't be sent yet, or null when it can. */
export function passwordProblem(
  current: string,
  next: string,
  repeat: string
): 'missing' | 'short' | 'same' | 'mismatch' | null {
  if (!current || !next) return 'missing';
  if (next.length < ADMIN_PASSWORD_MIN) return 'short';
  if (next === current) return 'same';
  if (next !== repeat) return 'mismatch';
  return null;
}
