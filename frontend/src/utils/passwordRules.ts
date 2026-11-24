/**
 * A NEW password (sign-up, password reset) needs at least 8 characters (audit 2026-11-16 P2-9).
 * Signing in with an older, shorter password is never checked: nobody is locked out.
 * The same number is in backend/src/validation/authEmail.schemas.ts.
 */
export const PASSWORD_MIN = 8;

export function passwordTooShort(password: string): boolean {
  return password.length < PASSWORD_MIN;
}
