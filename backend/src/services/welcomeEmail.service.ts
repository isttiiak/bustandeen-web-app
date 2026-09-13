import User from '../models/User.js';
import { sendMail } from './email.service.js';
import { welcomeEmail } from './welcomeEmail.templates.js';

/**
 * Shared by the live first-sign-in send (auth.controller.ts) and the admin's
 * one-time backfill for accounts that predate this feature
 * (adminUsers.service.ts) — one place for "what does sending actually mean".
 * Marks `welcomeEmailSentAt` regardless of whether the send itself succeeded
 * (email.service.ts never throws/reports failure past a console.error) so a
 * misconfigured SMTP doesn't turn into an infinite backfill retry loop.
 */
export const sendWelcomeEmail = async (
  uid: string,
  email: string,
  name?: string
): Promise<void> => {
  await sendMail({ to: email, from: 'istiak', ...welcomeEmail({ name }) });
  await User.updateOne({ uid }, { $set: { welcomeEmailSentAt: new Date() } });
};
