import { toSimpleHtml } from './sadaqahEmail.templates.js';
import { SIGN_OFF } from './emailBrand.js';

export { toSimpleHtml };

export const REENGAGEMENT_SUBJECT = 'A quiet hello from Bustandeen';

const APP_URL = 'https://bustandeen.com';

/** Editable draft shown to the Servant before sending. Deliberately gentle
 * and non-guilting (matches the app's "no guilt-based mechanics" stance):
 * this observes an absence, it doesn't scold one. Admin can rewrite anything
 * before confirming the send. */
export const reengagementDraft = (d: { name: string; daysInactive: number }): string =>
  `Assalamu Alaikum ${d.name},\n\nIt has been about ${d.daysInactive} days since you last opened Bustandeen, so we wanted to send a quiet hello. No worries at all. Life gets busy, and every return to worship is welcomed, never judged.\n\nYour zikr counts, streaks and progress are all still here, exactly as you left them.\n\nWhenever you feel ready, even for a single tasbih, we would be glad to have you back: ${APP_URL}\n\n${SIGN_OFF}`;
