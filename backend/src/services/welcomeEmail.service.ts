import User from '../models/User.js';
import { sendMail } from './email.service.js';
import { welcomeEmail } from './welcomeEmail.templates.js';

/**
 * Fixed-template send, used only by the admin's bulk backfill for legacy
 * accounts (adminUsers.service.ts's sendWelcomeBackfill) where per-user
 * editing isn't practical. Welcome email is otherwise fully admin-triggered
 * and editable per user (see getWelcomeDraft/sendWelcomeEmailEdited in
 * adminUsers.service.ts) — there is no more automatic send on first sign-in.
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
