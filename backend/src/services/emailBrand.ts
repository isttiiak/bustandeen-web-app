/** Closing lines shared by every predefined email, so the tagline is written
 *  in exactly one place. */
export const EMAIL_TAGLINE = 'Nourish Your Deen';

const SIGN_OFF_LEAD = 'Warm regards,';

/** Default sign-off, used by every system-voiced email. */
export const SIGN_OFF = `${SIGN_OFF_LEAD}\nBustandeen\n${EMAIL_TAGLINE}`;

/** Personal sign-off for emails that come from the founder's own mailbox. */
export const founderSignOff = (name: string, title: string): string =>
  `${SIGN_OFF_LEAD}\n${name}\n${title}\n${EMAIL_TAGLINE}`;

/** Inserts `extra` just above the sign-off (e.g. a link only known at send
 *  time), so the tagline always stays the very last thing in the email. */
export const insertAboveSignOff = (text: string, extra: string): string => {
  const at = text.lastIndexOf(SIGN_OFF_LEAD);
  if (at === -1) return `${text}\n\n${extra}`;
  return `${text.slice(0, at).trimEnd()}\n\n${extra}\n\n${text.slice(at)}`;
};
