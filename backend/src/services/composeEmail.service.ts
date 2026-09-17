import { sendMail } from './email.service.js';
import { toSimpleHtml } from './sadaqahEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export interface ComposeEmailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Servant-only free-form send, always from istiak@bustandeen.com — unlike
 * every other email in the app this has no auto-generated draft, so the
 * compose form itself IS the "see it before it sends" step. Throws (rather
 * than the usual silent-fail sendMail convention) because this action has no
 * other purpose than sending — a caller with nothing to show for a failed
 * click needs an explicit error, not a false "sent" response. sendMail's own
 * EmailFailureLog write still happens underneath for the ops-health page.
 */
export const sendComposedEmail = async (input: ComposeEmailInput): Promise<string> => {
  const messageId = await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: toSimpleHtml(input.body),
    from: 'istiak',
  });
  if (!messageId) {
    throw httpError(502, 'Send failed — check System & ops health for the logged error.');
  }
  return messageId;
};
