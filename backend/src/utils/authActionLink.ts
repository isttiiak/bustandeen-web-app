// Firebase Admin's generate*Link() returns a link to Firebase's own hosted
// page on ihsan-9e89b.firebaseapp.com. Every email we send points at the
// app's branded handler instead (frontend pages/AuthAction.tsx), carrying
// only the one-time code.

export const APP_URL = 'https://bustandeen.com';

export type AuthActionMode = 'resetPassword' | 'verifyEmail';

/**
 * `next: 'admin'` sends an admin back to the admin sign-in after a reset
 * (AuthAction reads it as a fixed choice, never as a URL). A link without an
 * oobCode is returned unchanged.
 */
export const brandedActionLink = (
  firebaseLink: string,
  mode: AuthActionMode,
  next?: 'admin'
): string => {
  const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
  if (!oobCode) return firebaseLink;
  const params = new URLSearchParams({ mode, oobCode });
  if (next) params.set('next', next);
  return `${APP_URL}/auth/action?${params.toString()}`;
};
