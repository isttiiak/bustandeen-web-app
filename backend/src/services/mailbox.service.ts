import MailboxMessage, { IMailboxMessage, MailboxStatus } from '../models/MailboxMessage.js';
import { sendMail } from './email.service.js';
import { toSimpleHtml } from './sadaqahEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export interface MailboxListResult {
  messages: IMailboxMessage[];
  total: number;
  page: number;
  limit: number;
}

export const listMailbox = async (
  status: MailboxStatus | undefined,
  page: number,
  limit: number
): Promise<MailboxListResult> => {
  const filter = status ? { status } : {};
  const [messages, total] = await Promise.all([
    MailboxMessage.find(filter)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MailboxMessage.countDocuments(filter),
  ]);
  return { messages, total, page, limit };
};

const replySubject = (subject: string): string =>
  /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim() || 'Your message'}`;

/** Always sent from the founder mailbox, since that is where the mail arrived. */
export const replyToMailbox = async (
  id: string,
  body: string,
  repliedBy: string
): Promise<IMailboxMessage> => {
  const doc = await MailboxMessage.findById(id);
  if (!doc) throw httpError(404, 'Message not found');

  const messageId = await sendMail({
    to: doc.fromEmail,
    subject: replySubject(doc.subject),
    text: body,
    html: toSimpleHtml(body),
    from: 'istiak',
    inReplyTo: doc.messageId,
    references: [...doc.references, doc.messageId].join(' '),
  });
  if (!messageId) {
    throw httpError(502, 'Send failed — check System & ops health for the logged error.');
  }

  doc.status = 'replied';
  doc.repliedAt = new Date();
  doc.repliedBy = repliedBy;
  await doc.save();
  return doc;
};

export const markMailboxRepliedExternally = async (
  id: string,
  repliedBy: string
): Promise<IMailboxMessage> => {
  const doc = await MailboxMessage.findByIdAndUpdate(
    id,
    { status: 'replied', repliedAt: new Date(), repliedBy },
    { new: true }
  );
  if (!doc) throw httpError(404, 'Message not found');
  return doc;
};

export const archiveMailbox = async (id: string): Promise<IMailboxMessage> => {
  const doc = await MailboxMessage.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
  if (!doc) throw httpError(404, 'Message not found');
  return doc;
};

/** Removes only our stored copy — the real mailbox is never touched. */
export const deleteMailbox = async (id: string): Promise<void> => {
  const doc = await MailboxMessage.findByIdAndDelete(id);
  if (!doc) throw httpError(404, 'Message not found');
};
