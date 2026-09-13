import type { SendMailOptions } from './email.service.js';

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

const greeting = (donorName: string | null) =>
  donorName ? `Assalamu Alaikum ${escapeHtml(donorName)},` : 'Assalamu Alaikum,';

// Same wording, no HTML-escaping — for the plain-text drafts below, escaping
// would literally insert "&amp;" etc. into text a human is about to read/edit.
const plainGreeting = (donorName: string | null) =>
  donorName ? `Assalamu Alaikum ${donorName},` : 'Assalamu Alaikum,';

// Fixed and deliberately outcome-neutral — every reply in a donation's
// thread reuses this via "Re: ..." so email clients (Gmail, Outlook) group
// the received/verified/rejected messages as one conversation. It used to
// read "We received your sadaqah — JazakAllahu khayran", which looked wrong
// as the subject line on a REJECTED notice; the thank-you wording now lives
// only in the received email's body, where it's actually true.
export const RECEIVED_SUBJECT = 'Your sadaqah submission — Bustandeen';
export const REPLY_SUBJECT = `Re: ${RECEIVED_SUBJECT}`;

export const donationReceivedEmail = (d: DonationEmailData): Omit<SendMailOptions, 'to'> => ({
  subject: RECEIVED_SUBJECT,
  text: `${greeting(d.donorName)}\n\nWe've received your sadaqah submission of ${d.amount} BDT (transaction ${d.transactionId}). We'll verify it against our records within 24-48 hours and follow up once it's confirmed.\n\nMay Allah accept it from you and make it a means of ongoing reward, in sha Allah.\n\n— Bustandeen`,
  html: `<p>${greeting(d.donorName)}</p><p>We've received your sadaqah submission of <b>${d.amount} BDT</b> (transaction ${escapeHtml(d.transactionId)}). We'll verify it against our records within 24-48 hours and follow up once it's confirmed.</p><p>May Allah accept it from you and make it a means of ongoing reward, in sha Allah.</p><p>— Bustandeen</p>`,
});

/**
 * Draft body for the admin's editable verify email (plain text only — the
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
  return `${plainGreeting(d.donorName)}\n\nYour sadaqah of ${d.amount} BDT (transaction ${d.transactionId}) has been verified. JazakAllahu khayran for your generosity — may Allah make it a sadaqah jariyah, a continuing charity that keeps benefiting you.\n\nPayment details:\nAmount: ${d.amount} BDT\nTransaction ID: ${d.transactionId}\nPayment method: ${method}\nDate: ${date}\n\nYou can see how contributions are being used at https://bustandeen.com/sadaqah\n\n— Bustandeen`;
};

/** Draft body for the admin's editable reject email — reason is left as a
 *  clear placeholder the admin is expected to fill in before sending. */
export const donationRejectedDraft = (d: DonationEmailData): string =>
  `${plainGreeting(d.donorName)}\n\nWe weren't able to match your submission of ${d.amount} BDT (transaction ${d.transactionId}) against our records.\n\n[Let the donor know what didn't match — e.g. wrong amount, transaction ID not found]\n\nThis is usually just a mismatched detail — please double-check the transaction ID and amount from your bKash SMS and resubmit at https://bustandeen.com/sadaqah/donate. If you believe this is a mistake, just reply to this email and we'll sort it out.\n\n— Bustandeen`;
