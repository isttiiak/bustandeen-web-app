import { createHash, randomBytes } from 'crypto';
import admin from 'firebase-admin';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import PendingSignup from '../models/PendingSignup.js';
import { APP_URL } from '../utils/authActionLink.js';
import { sendMail } from './email.service.js';
import { type AuthEmailLang, accountExistsEmail, signupLinkEmail } from './authEmail.templates.js';

/**
 * Email-first sign-up (v5.156.0). Step 1 (start) stores a pending row and
 * emails a link; step 2 (complete) runs when the link is opened and a
 * password chosen, and only then creates the Firebase account, already
 * verified. An email that is never confirmed never gets an account.
 */

export const SIGNUP_LINK_MINUTES = 60;

export interface SignupLinker {
  getUserByEmail(email: string): Promise<{ email?: string; displayName?: string }>;
  createUser(props: {
    email: string;
    password: string;
    displayName?: string;
    emailVerified: boolean;
  }): Promise<{ uid: string }>;
}

const defaultLinker = (): SignupLinker | null => (isFirebaseInitialized() ? admin.auth() : null);

export class SignupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const hashSignupToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const send = (to: string, mail: { subject: string; text: string; html: string }) =>
  sendMail({ to, ...mail, from: 'ansar', fromName: 'Bustandeen' });

export interface StartSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  gender: 'male' | 'female';
  lang: AuthEmailLang;
}

/**
 * Ends quietly either way: the caller answers the same whether the email is
 * new, already registered (that address gets a "you already have an
 * account" email instead) or Firebase is not configured.
 */
export async function startSignup(
  input: StartSignupInput,
  linker: SignupLinker | null = defaultLinker()
): Promise<'link' | 'exists' | 'skipped'> {
  if (!linker) return 'skipped';
  const email = input.email.toLowerCase();
  const existing = await linker.getUserByEmail(email).catch(() => null);
  if (existing) {
    const name = existing.displayName?.trim().split(/\s+/)[0] || null;
    await send(email, accountExistsEmail(input.lang, { name, email, link: `${APP_URL}/login` }));
    return 'exists';
  }

  const token = randomBytes(32).toString('base64url');
  // One row per email: a new request replaces the token, so older links die.
  await PendingSignup.findOneAndUpdate(
    { email },
    {
      email,
      tokenHash: hashSignupToken(token),
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      lang: input.lang,
      expiresAt: new Date(Date.now() + SIGNUP_LINK_MINUTES * 60_000),
      createdAt: new Date(),
    },
    { upsert: true }
  );
  const link = `${APP_URL}/signup/complete?${new URLSearchParams({ token }).toString()}`;
  await send(email, signupLinkEmail(input.lang, { name: input.firstName || null, email, link }));
  return 'link';
}

async function findValid(token: string) {
  const pending = await PendingSignup.findOne({
    tokenHash: hashSignupToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!pending) throw new SignupError('link_invalid', 410);
  return pending;
}

/** For the password page: whose sign-up this link finishes. */
export async function checkSignup(token: string): Promise<{ email: string; firstName: string }> {
  const pending = await findValid(token);
  return { email: pending.email, firstName: pending.firstName };
}

/** Creates the (already verified) Firebase account and uses up the link. */
export async function completeSignup(
  token: string,
  password: string,
  linker: SignupLinker | null = defaultLinker()
): Promise<{ email: string; gender: 'male' | 'female' }> {
  if (!linker) throw new SignupError('Sign-up is not configured here', 503);
  const pending = await findValid(token);
  const displayName = [pending.firstName, pending.lastName].filter(Boolean).join(' ');
  try {
    await linker.createUser({
      email: pending.email,
      password,
      ...(displayName ? { displayName } : {}),
      emailVerified: true,
    });
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/email-already-exists') {
      await PendingSignup.deleteOne({ _id: pending._id });
      throw new SignupError('account_exists', 409);
    }
    if (code === 'auth/invalid-password') throw new SignupError('weak_password', 400);
    throw err;
  }
  await PendingSignup.deleteOne({ _id: pending._id });
  return { email: pending.email, gender: pending.gender };
}
