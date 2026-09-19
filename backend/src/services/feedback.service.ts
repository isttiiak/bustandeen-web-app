import mongoose from 'mongoose';
import FeedbackMessage, { IFeedbackMessage, FeedbackStatus } from '../models/FeedbackMessage.js';
import { sendMail, EmailSender } from './email.service.js';
import {
  feedbackNotifyAdminEmail,
  feedbackReceivedText,
  RECEIVED_SUBJECT,
  REPLY_SUBJECT,
  toSimpleHtml,
} from './feedbackEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

const REVIEW_INBOX = process.env.FEEDBACK_REVIEW_EMAIL ?? 'ansar@bustandeen.com';
const feedbackMessageId = (id: string): string => `<feedback-${id}@bustandeen.com>`;

export interface SubmitFeedbackInput {
  name: string;
  email: string;
  message: string;
  category: string[];
  kind: 'feedback' | 'contact';
}

export const submitFeedback = async (
  input: SubmitFeedbackInput,
  ipAddress: string,
  userId: string | null
): Promise<IFeedbackMessage> => {
  const _id = new mongoose.Types.ObjectId();
  const emailMessageId = feedbackMessageId(_id.toString());

  const doc = await FeedbackMessage.create({
    _id,
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    category: input.category,
    kind: input.kind,
    userId,
    ipAddress,
    emailMessageId,
  });

  // Confirmation to the sender establishes the thread; admin-notify is a
  // separate, fixed internal email — both best-effort, never block the
  // submission response on either.
  const receivedText = feedbackReceivedText(doc.kind);
  await sendMail({
    to: doc.email,
    subject: RECEIVED_SUBJECT(doc.kind, doc._id.toString()),
    text: receivedText,
    html: toSimpleHtml(receivedText),
    from: 'ansar',
    messageId: emailMessageId,
  });

  await sendMail({
    to: REVIEW_INBOX,
    from: 'ansar',
    ...feedbackNotifyAdminEmail(doc, doc._id.toString()),
  });

  return doc;
};

export interface FeedbackListResult {
  messages: IFeedbackMessage[];
  total: number;
  page: number;
  limit: number;
}

export const listFeedback = async (
  status: FeedbackStatus | undefined,
  page: number,
  limit: number
): Promise<FeedbackListResult> => {
  const filter = status ? { status } : {};
  const [messages, total] = await Promise.all([
    FeedbackMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    FeedbackMessage.countDocuments(filter),
  ]);
  return { messages, total, page, limit };
};

export const replyToFeedback = async (
  id: string,
  body: string,
  repliedBy: string,
  sender: EmailSender = 'ansar'
): Promise<IFeedbackMessage> => {
  const doc = await FeedbackMessage.findById(id);
  if (!doc) throw httpError(404, 'Feedback message not found');

  const messageId = await sendMail({
    to: doc.email,
    subject: REPLY_SUBJECT(doc.kind, doc._id.toString()),
    text: body,
    html: toSimpleHtml(body),
    from: sender,
    inReplyTo: doc.emailMessageId ?? undefined,
    references: doc.emailMessageId ?? undefined,
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

/**
 * For when the admin actually replied from the Zoho mail app directly
 * instead of this panel — no email is sent here (it already went out), this
 * only syncs the tracked status so the item stops showing as open.
 */
export const markRepliedExternally = async (
  id: string,
  repliedBy: string
): Promise<IFeedbackMessage> => {
  const doc = await FeedbackMessage.findById(id);
  if (!doc) throw httpError(404, 'Feedback message not found');

  doc.status = 'replied';
  doc.repliedAt = new Date();
  doc.repliedBy = repliedBy;
  await doc.save();
  return doc;
};

export const archiveFeedback = async (id: string): Promise<IFeedbackMessage> => {
  const doc = await FeedbackMessage.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
  if (!doc) throw httpError(404, 'Feedback message not found');
  return doc;
};

export const deleteFeedback = async (id: string): Promise<void> => {
  const doc = await FeedbackMessage.findByIdAndDelete(id);
  if (!doc) throw httpError(404, 'Feedback message not found');
};

export const countOpenFeedback = async (): Promise<number> =>
  FeedbackMessage.countDocuments({ status: 'open' });
