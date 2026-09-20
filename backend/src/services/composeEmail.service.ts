import { sendMail } from './email.service.js';
import { toSimpleHtml } from './sadaqahEmail.templates.js';
import * as feedbackService from './feedback.service.js';
import { REPLY_SUBJECT } from './feedbackEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export interface ComposeEmailInput {
  /** Reply to an existing feedback/contact submission — threads onto its
   *  original conversation instead of starting a new one. */
  feedbackId?: string;
  to?: string;
  subject?: string;
  body: string;
}

export interface ComposeEmailResult {
  to: string;
  subject: string;
}

/**
 * Servant-only send, always from istiak@bustandeen.com. Two modes:
 *
 * - `feedbackId` set: threaded reply to whoever wrote in — `to`/`subject` are
 *   derived from that submission (never trusted from the client) so it lands
 *   in that submission's one Gmail/Outlook thread, same as the "Reply" button
 *   on the feedback inbox but sent under the founder's own name.
 * - `feedbackId` absent: free-form send to an arbitrary address — the
 *   compose form itself IS the "see it before it sends" step here, since
 *   there's no auto-generated draft to review.
 *
 * Throws on failure (rather than the usual silent-fail sendMail convention)
 * because this action has no other purpose than sending — a caller with
 * nothing to show for a failed click needs an explicit error, not a false
 * "sent" response. sendMail's own EmailFailureLog write still happens
 * underneath for the ops-health page.
 */
export const sendComposedEmail = async (
  input: ComposeEmailInput,
  repliedBy: string
): Promise<ComposeEmailResult> => {
  if (input.feedbackId) {
    const doc = await feedbackService.replyToFeedback(
      input.feedbackId,
      input.body,
      repliedBy,
      'istiak'
    );
    return { to: doc.email, subject: REPLY_SUBJECT(doc.kind, doc._id.toString()) };
  }

  const messageId = await sendMail({
    to: input.to!,
    subject: input.subject!,
    text: input.body,
    html: toSimpleHtml(input.body),
    from: 'istiak',
  });
  if (!messageId) {
    throw httpError(502, 'Send failed — check System & ops health for the logged error.');
  }
  return { to: input.to!, subject: input.subject! };
};
