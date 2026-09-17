import { toSimpleHtml } from './sadaqahEmail.templates.js';

export { toSimpleHtml };

export const REENGAGEMENT_SUBJECT = 'We miss you at Bustandeen 🌙';

/** Editable draft shown to the Servant before sending — deliberately gentle
 * and non-guilting (matches the app's "no guilt-based mechanics" stance):
 * this observes an absence, it doesn't scold one. Admin can rewrite anything
 * before confirming the send. */
export const reengagementDraft = (d: { name: string; daysInactive: number }): string =>
  `Assalamu Alaikum ${d.name},\n\nWe noticed it's been about ${d.daysInactive} days since you last opened Bustandeen. No worries at all — life gets busy, and every return to worship is welcomed, never judged.\n\nYour zikr counts, streaks, and progress are all still there, exactly as you left them.\n\nWhenever you're ready, we'd love to have you back.\n\n— Bustandeen`;
