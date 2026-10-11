import admin from 'firebase-admin';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import { brandedActionLink } from '../utils/authActionLink.js';
import { sendMail } from './email.service.js';
import { type AuthEmailLang, passwordResetEmail, verifyEmailEmail } from './authEmail.templates.js';

/** The Firebase Admin calls used here (admin.auth() in production, a stub in tests). */
export interface AuthLinker {
  getUserByEmail(email: string): Promise<{
    email?: string;
    displayName?: string;
    disabled: boolean;
    emailVerified: boolean;
  }>;
  generatePasswordResetLink(email: string): Promise<string>;
  generateEmailVerificationLink(email: string): Promise<string>;
}

const defaultLinker = (): AuthLinker | null => (isFirebaseInitialized() ? admin.auth() : null);

// Sent through the Ansar mailbox (replies reach a person), shown as "Bustandeen".
const send = (to: string, mail: { subject: string; text: string; html: string }) =>
  sendMail({ to, ...mail, from: 'ansar', fromName: 'Bustandeen' });

const firstName = (displayName: string | undefined): string | null =>
  displayName?.trim().split(/\s+/)[0] || null;

/**
 * Forgot password. Never reveals whether an account exists: an unknown or
 * disabled email simply gets no email, and the caller always answers ok.
 * Returns whether an email actually went out (for tests and logs only).
 */
export async function sendPasswordReset(
  email: string,
  lang: AuthEmailLang,
  linker: AuthLinker | null = defaultLinker()
): Promise<boolean> {
  if (!linker) return false;
  const user = await linker.getUserByEmail(email).catch(() => null);
  if (!user || user.disabled || !user.email) return false;
  const link = brandedActionLink(
    await linker.generatePasswordResetLink(user.email),
    'resetPassword'
  );
  const mail = passwordResetEmail(lang, {
    name: firstName(user.displayName),
    email: user.email,
    link,
  });
  return (await send(user.email, mail)) !== null;
}

export class AuthEmailError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Email verification for the signed-in user (sign-up and "resend"). */
export async function sendVerification(
  email: string | undefined,
  lang: AuthEmailLang,
  linker: AuthLinker | null = defaultLinker()
): Promise<void> {
  if (!linker) throw new AuthEmailError('Email is not configured here', 503);
  if (!email) throw new AuthEmailError('This account has no email address', 400);
  const user = await linker.getUserByEmail(email).catch(() => null);
  if (!user?.email) throw new AuthEmailError('Account not found', 404);
  if (user.emailVerified) throw new AuthEmailError('already_verified', 409);
  const link = brandedActionLink(
    await linker.generateEmailVerificationLink(user.email),
    'verifyEmail'
  );
  const mail = verifyEmailEmail(lang, {
    name: firstName(user.displayName),
    email: user.email,
    link,
  });
  if ((await send(user.email, mail)) === null) {
    throw new AuthEmailError('The email could not be sent. Please try again later.', 502);
  }
}
