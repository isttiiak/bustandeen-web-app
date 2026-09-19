import type { SendMailOptions } from './email.service.js';
import { SIGN_OFF } from './emailBrand.js';

// Donor-supplied strings (name, transaction ID) land inside HTML here with no
// framework escaping the way JSX would on the frontend — escape manually so
// a stray "<" or "&" in donor input can't break the email markup.
export const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

/** Turns admin-edited plain text (paragraphs separated by a blank line) into
 *  the same shape as the rest of this app's emails, for the verify/reject
 *  sends where the body is no longer a fixed template. */
export const toSimpleHtml = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');

interface DonationEmailData {
  donorName: string | null;
  amount: number;
  transactionId: string;
}

// Plain text on purpose: toSimpleHtml escapes at send time, so escaping here
// would literally insert "&amp;" etc. into text a human is about to read/edit.
const plainGreeting = (donorName: string | null) =>
  donorName ? `Assalamu Alaikum ${donorName},` : 'Assalamu Alaikum,';

/**
 * Short, human-visible discriminator derived from the donation's own
 * ObjectId. Without this, every donation used a byte-identical subject —
 * Gmail/Outlook group conversations by (normalized subject + participants)
 * when there's no References chain linking them elsewhere, so a donor who
 * submits a second, unrelated donation would have it silently merge into the
 * first one's thread even though each has its own Message-ID. Same fix as
 * feedbackEmail.templates.ts's feedbackRef.
 */
export const sadaqahRef = (id: string): string => id.slice(-6).toUpperCase();

// Deliberately outcome-neutral. Every reply in a donation's thread reuses
// this via "Re: ..." so email clients (Gmail, Outlook) group the
// received/verified/rejected messages as one conversation. The thank-you
// wording lives only in the received email's body, where it is actually true.
export const RECEIVED_SUBJECT = (id: string): string =>
  `Your sadaqah submission to Bustandeen [#${sadaqahRef(id)}]`;
export const REPLY_SUBJECT = (id: string): string => `Re: ${RECEIVED_SUBJECT(id)}`;

export const donationReceivedEmail = (
  d: DonationEmailData & { id: string }
): Omit<SendMailOptions, 'to'> => {
  const text = `${plainGreeting(d.donorName)}\n\nJazakAllahu khayran for your sadaqah of ${d.amount} BDT (transaction ${d.transactionId}). It has reached us safely.\n\nWe will check it against our records within 24 to 48 hours. There is nothing more you need to do, and we will write back here as soon as it is confirmed.\n\nMay Allah accept it from you and let it be a source of lasting reward, in sha Allah.\n\n${SIGN_OFF}`;
  return { subject: RECEIVED_SUBJECT(d.id), text, html: toSimpleHtml(text) };
};

/**
 * Draft body for the admin's editable verify email (plain text only; the
 * admin dashboard shows this in a textarea, HTML is generated from whatever
 * they end up sending via toSimpleHtml). Includes a payment-details block as
 * a lightweight stand-in for the signed PDF receipt planned for later.
 */
export const donationVerifiedDraft = (
  d: DonationEmailData & {
    paymentMethod: 'bkash' | 'nagad';
    transactionDate: Date;
  }
): string => {
  const method = d.paymentMethod === 'bkash' ? 'bKash' : 'Nagad';
  const date = d.transactionDate.toISOString().slice(0, 10);
  return `${plainGreeting(d.donorName)}\n\nAlhamdulillah, your sadaqah of ${d.amount} BDT has been verified. JazakAllahu khayran for your kindness. May Allah make it a sadaqah jariyah, a charity whose reward keeps flowing long after the moment you gave it.\n\nFor your records:\nAmount: ${d.amount} BDT\nTransaction ID: ${d.transactionId}\nPayment method: ${method}\nDate: ${date}\n\nIf you would like to see how contributions are being used, you can read about it here: https://bustandeen.com/sadaqah\n\n${SIGN_OFF}`;
};

/** Draft body for the admin's editable reject email. The reason is left as a
 *  clear placeholder the admin is expected to fill in before sending. */
export const donationRejectedDraft = (d: DonationEmailData): string =>
  `${plainGreeting(d.donorName)}\n\nThank you for your sadaqah submission of ${d.amount} BDT (transaction ${d.transactionId}). We tried to match it with our records, but could not find it just yet.\n\n[Tell the donor what did not match, for example the amount, or a transaction ID we could not find]\n\nThis is usually just a small detail, like a single digit in the transaction ID. If you check it against your bKash SMS, you are very welcome to submit it again at https://bustandeen.com/sadaqah/donate. And if you feel we have got this wrong, simply reply to this email and we will look into it together.\n\nYour intention to give is already a beautiful thing, and we are grateful for it.\n\n${SIGN_OFF}`;
