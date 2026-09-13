import type { SendMailOptions } from './email.service.js';
import { escapeHtml, toSimpleHtml } from './sadaqahEmail.templates.js';

export { toSimpleHtml };

interface RequestData {
  name: string;
  meaning: string;
  arabic?: string;
  source?: string;
  sourceUrl?: string;
  userEmail?: string;
}

/** Fixed notification sent to the review inbox the moment a user submits a
 * suggestion — not editable, since nobody sees it but the admin team. */
export const zikrRequestNotifyAdminEmail = (
  d: RequestData,
  requestId: string
): Omit<SendMailOptions, 'to'> => {
  const lines = [
    `A new zikr/dua suggestion was submitted for review.`,
    ``,
    `Name: ${d.name}`,
    d.arabic ? `Arabic: ${d.arabic}` : null,
    `Meaning: ${d.meaning}`,
    d.source ? `Source: ${d.source}` : null,
    d.sourceUrl ? `Link: ${d.sourceUrl}` : null,
    d.userEmail ? `Submitted by: ${d.userEmail}` : null,
    ``,
    `Review it at https://bustandeen.com/admin/zikr-requests`,
  ].filter((l): l is string => l !== null);

  return {
    subject: `New zikr suggestion: "${d.name}"`,
    text: lines.join('\n'),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
    messageId: `<zikr-request-${requestId}@bustandeen.com>`,
  };
};

export const APPROVED_SUBJECT = 'Your zikr suggestion is now in the Bustandeen library 🌱';
export const REJECTED_SUBJECT = 'About your zikr suggestion';

/** Editable draft shown in the admin panel before approving — admin can
 * revise the wording, then the final text is sent via toSimpleHtml. */
export const zikrRequestApprovedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}". We reviewed it carefully alongside its reference, and it's now part of the Bustandeen zikr library for everyone to benefit from.\n\nMay Allah accept this small contribution from you and make it a sadaqah jariyah — a good deed that keeps giving, even after you've moved on to other things.\n\n— Bustandeen`;

/** Editable draft for the rejection case — kept gentle; authenticity checks
 * on religious text are a real reason to say no, not a judgement on intent. */
export const zikrRequestRejectedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for taking the time to suggest "${d.name}". After reviewing it, we weren't able to verify it closely enough against an authentic source to add it to the library right now.\n\n[Let them know what's missing — e.g. couldn't confirm the exact wording, or the hadith reference]\n\nWe really do appreciate you thinking of the community — please don't hesitate to suggest another one.\n\n— Bustandeen`;
