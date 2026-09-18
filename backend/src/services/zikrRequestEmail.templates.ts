import type { SendMailOptions } from './email.service.js';
import { escapeHtml, toSimpleHtml } from './sadaqahEmail.templates.js';

export { toSimpleHtml };

interface RequestData {
  name: string;
  meaning?: string;
  arabic?: string;
  source?: string;
  sourceUrl?: string;
  userEmail?: string;
}

/**
 * Short, human-visible discriminator derived from the request's own
 * ObjectId. Without this, every suggestion used a byte-identical subject —
 * Gmail/Outlook group conversations by (normalized subject + participants)
 * when there's no References chain linking them elsewhere, so a user who
 * submits a second, unrelated suggestion would have it silently merge into
 * the first one's thread even though each has its own Message-ID. Same fix
 * as feedbackEmail.templates.ts's feedbackRef.
 */
export const zikrRequestRef = (id: string): string => id.slice(-6).toUpperCase();

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
    d.meaning ? `Meaning: ${d.meaning}` : null,
    d.source ? `Source: ${d.source}` : null,
    d.sourceUrl ? `Link: ${d.sourceUrl}` : null,
    d.userEmail ? `Submitted by: ${d.userEmail}` : null,
    ``,
    `Review it at https://bustandeen.com/admin/zikr-requests`,
  ].filter((l): l is string => l !== null);

  return {
    subject: `New zikr suggestion: "${d.name}" [#${zikrRequestRef(requestId)}]`,
    text: lines.join('\n'),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
    messageId: `<zikr-request-admin-${requestId}@bustandeen.com>`,
  };
};

// RECEIVED goes to the requester the moment they submit (see
// zikrRequest.service.ts submitRequest); APPROVED/REJECTED reuse "Re: " on
// the same subject so Gmail/Outlook group all three as one conversation,
// matching the sadaqah thread's RECEIVED_SUBJECT/REPLY_SUBJECT convention.
export const RECEIVED_SUBJECT = (id: string): string =>
  `We received your zikr suggestion — Bustandeen [#${zikrRequestRef(id)}]`;
export const APPROVED_SUBJECT = (id: string): string => `Re: ${RECEIVED_SUBJECT(id)}`;
export const REJECTED_SUBJECT = (id: string): string => `Re: ${RECEIVED_SUBJECT(id)}`;

/** Sent immediately on submission — fixed wording (not admin-edited, since
 * this fires before any human has looked at the request). Establishes the
 * Message-ID the later approve/reject email threads against. */
export const zikrRequestReceivedEmail = (d: {
  id: string;
  name: string;
}): Omit<SendMailOptions, 'to'> => ({
  subject: RECEIVED_SUBJECT(d.id),
  text: `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}" to the Bustandeen zikr library. An Ansar will review it — checking the wording and source carefully, with a scholar if needed — and follow up here once it's decided.\n\nMay Allah reward you for wanting to share this with others.\n\n— Bustandeen`,
  html: `<p>Assalamu Alaikum,</p><p>JazakAllahu khayran for suggesting "${escapeHtml(d.name)}" to the Bustandeen zikr library. An Ansar will review it — checking the wording and source carefully, with a scholar if needed — and follow up here once it's decided.</p><p>May Allah reward you for wanting to share this with others.</p><p>— Bustandeen</p>`,
});

/** Editable draft shown in the admin panel before approving — admin can
 * revise the wording, then the final text is sent via toSimpleHtml. The link
 * to the requester's new library entry isn't known until the item is
 * actually created during approval, so it's appended by the service
 * (see zikrRequest.service.ts approveRequest), not baked into this draft. */
export const zikrRequestApprovedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}". We reviewed it carefully alongside its reference, and it's now part of the Bustandeen zikr library for everyone to benefit from.\n\nMay Allah accept this small contribution from you and make it a sadaqah jariyah — a good deed that keeps giving, even after you've moved on to other things.\n\n— Bustandeen`;

/** Appended after the admin's (possibly edited) approval email body — not
 * itself editable, since the library item doesn't exist (and its id/link
 * isn't known) until approval actually runs. */
export const zikrLibraryLinkLine = (libraryItemId: string): string =>
  `\n\nYou can see it here: https://bustandeen.com/settings#zikr-lib-${libraryItemId}`;

/** Editable draft for the rejection case — kept gentle; authenticity checks
 * on religious text are a real reason to say no, not a judgement on intent. */
export const zikrRequestRejectedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for taking the time to suggest "${d.name}". After reviewing it, we weren't able to verify it closely enough against an authentic source to add it to the library right now.\n\n[Let them know what's missing — e.g. couldn't confirm the exact wording, or the hadith reference]\n\nWe really do appreciate you thinking of the community — please don't hesitate to suggest another one.\n\n— Bustandeen`;

/** Editable draft for the "this already exists" rejection case — distinct
 * from the generic rejection since the real reason is different (nothing to
 * fix and resubmit, it's already there) and names/links the existing entry
 * when the match is a published library item rather than another pending
 * request. */
export const zikrRequestDuplicateRejectedDraft = (d: {
  name: string;
  existingLibraryItemId?: string;
}): string => {
  const link = d.existingLibraryItemId
    ? `\n\nYou can find it here: https://bustandeen.com/settings#zikr-lib-${d.existingLibraryItemId}`
    : '';
  return `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}". Looking into it, it seems this one (or something very close to it, worded a little differently) is already in the Bustandeen zikr library.${link}\n\nWe really appreciate you thinking of the community — please don't hesitate to suggest another one.\n\n— Bustandeen`;
};
