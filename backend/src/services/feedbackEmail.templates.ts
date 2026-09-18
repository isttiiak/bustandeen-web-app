import type { SendMailOptions } from './email.service.js';
import { escapeHtml, toSimpleHtml } from './sadaqahEmail.templates.js';

export { toSimpleHtml };

interface FeedbackData {
  name: string;
  email: string;
  message: string;
  category: string[];
  kind: 'feedback' | 'contact';
}

/**
 * Short, human-visible discriminator derived from the document's own
 * ObjectId. Without this, every submission of the same `kind` produces a
 * byte-identical subject line — Gmail/Outlook group conversations by
 * (normalized subject + participants) when there's no In-Reply-To/References
 * linking them elsewhere, so two unrelated feedback submissions from the same
 * user silently merge into one thread. Including the ref in every subject
 * (received, reply, and the admin-notify copy) keeps each submission's
 * conversation distinct end to end.
 */
export const feedbackRef = (id: string): string => id.slice(-6).toUpperCase();

/** Fixed notification to the review inbox — mirrors zikrRequestNotifyAdminEmail. */
export const feedbackNotifyAdminEmail = (
  d: FeedbackData,
  feedbackId: string
): Omit<SendMailOptions, 'to'> => {
  const lines = [
    `A new ${d.kind} message was submitted.`,
    ``,
    `From: ${d.name} <${d.email}>`,
    d.category.length ? `Category: ${d.category.join(', ')}` : null,
    ``,
    d.message,
    ``,
    `Reply from https://bustandeen.com/admin/feedback`,
  ].filter((l): l is string => l !== null);

  return {
    subject: `New ${d.kind}: ${d.category.join(', ') || 'Message'} [#${feedbackRef(feedbackId)}]`,
    text: lines.join('\n'),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
    messageId: `<feedback-admin-${feedbackId}@bustandeen.com>`,
  };
};

export const RECEIVED_SUBJECT = (kind: 'feedback' | 'contact', id: string): string =>
  kind === 'feedback'
    ? `We received your feedback — Bustandeen [#${feedbackRef(id)}]`
    : `We received your message — Bustandeen [#${feedbackRef(id)}]`;

export const REPLY_SUBJECT = (kind: 'feedback' | 'contact', id: string): string =>
  `Re: ${RECEIVED_SUBJECT(kind, id)}`;
