import type { SendMailOptions } from './email.service.js';
import { escapeHtml, toSimpleHtml } from './sadaqahEmail.templates.js';
import { SIGN_OFF } from './emailBrand.js';

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
  `Your zikr suggestion to Bustandeen [#${zikrRequestRef(id)}]`;
export const APPROVED_SUBJECT = (id: string): string => `Re: ${RECEIVED_SUBJECT(id)}`;
export const REJECTED_SUBJECT = (id: string): string => `Re: ${RECEIVED_SUBJECT(id)}`;

/** Sent immediately on submission. Fixed wording (not admin-edited, since
 * this fires before any human has looked at the request). Establishes the
 * Message-ID the later approve/reject email threads against. */
export const zikrRequestReceivedEmail = (d: {
  id: string;
  name: string;
}): Omit<SendMailOptions, 'to'> => {
  const text = `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}" for the Bustandeen zikr library.\n\nOne of our Ansar will look at it with care, checking the wording and its source, and asking a scholar where needed. We would rather take a little longer than add something we are not sure of. You will hear from us here once it has been decided.\n\nMay Allah reward you for wanting to share this with others.\n\n${SIGN_OFF}`;
  return { subject: RECEIVED_SUBJECT(d.id), text, html: toSimpleHtml(text) };
};

/** Editable draft shown in the admin panel before approving. The admin can
 * revise the wording, then the final text is sent via toSimpleHtml. The link
 * to the requester's new library entry isn't known until the item is
 * actually created during approval, so it's inserted above the sign-off by
 * the service (see zikrRequest.service.ts approveRequest), not baked in here. */
export const zikrRequestApprovedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}". We looked at it carefully alongside its source, and Alhamdulillah it is now part of the Bustandeen zikr library, for everyone to benefit from.\n\nMay Allah accept this small contribution from you and make it a sadaqah jariyah, a good deed that keeps giving even after you have moved on to other things.\n\n${SIGN_OFF}`;

/** Inserted above the sign-off of the admin's (possibly edited) approval
 * email. Not itself editable, since the library item doesn't exist (and its
 * id/link isn't known) until approval actually runs. */
export const zikrLibraryLinkLine = (libraryItemId: string): string =>
  `You can see it here: https://bustandeen.com/settings#zikr-lib-${libraryItemId}`;

/** Editable draft for the rejection case. Kept gentle: authenticity checks
 * on religious text are a real reason to say no, not a judgement on intent. */
export const zikrRequestRejectedDraft = (d: { name: string }): string =>
  `Assalamu Alaikum,\n\nJazakAllahu khayran for taking the time to suggest "${d.name}". We looked at it carefully, and for now we could not verify it closely enough against an authentic source to add it to the library.\n\n[Tell them what is missing, for example that we could not confirm the exact wording, or the hadith reference]\n\nThis is not a no forever. If you are able to share a clearer source, we would be glad to look again. And please do suggest another one whenever something comes to mind. We really appreciate you thinking of the community.\n\n${SIGN_OFF}`;

/** Editable draft for the "this already exists" rejection case. Distinct
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
  return `Assalamu Alaikum,\n\nJazakAllahu khayran for suggesting "${d.name}". When we looked into it, we found that this one, or something very close to it worded a little differently, is already in the Bustandeen zikr library.${link}\n\nSo there is nothing more you need to do, but we are grateful you thought of it. Please do suggest another one whenever you like.\n\n${SIGN_OFF}`;
};
