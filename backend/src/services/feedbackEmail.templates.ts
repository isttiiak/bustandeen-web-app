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
    subject: `New ${d.kind}: ${d.category.join(', ') || 'Message'}`,
    text: lines.join('\n'),
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
    messageId: `<feedback-admin-${feedbackId}@bustandeen.com>`,
  };
};

export const RECEIVED_SUBJECT = (kind: 'feedback' | 'contact'): string =>
  kind === 'feedback'
    ? 'We received your feedback — Bustandeen'
    : 'We received your message — Bustandeen';

export const REPLY_SUBJECT = (kind: 'feedback' | 'contact'): string =>
  `Re: ${RECEIVED_SUBJECT(kind)}`;
