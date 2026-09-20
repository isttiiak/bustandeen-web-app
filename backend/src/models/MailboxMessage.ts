import mongoose, { Document, Schema } from 'mongoose';

export type MailboxStatus = 'open' | 'replied' | 'archived';

/**
 * A message that arrived in the real founder mailbox (istiak@bustandeen.com)
 * from an outside mail client. Deliberately separate from FeedbackMessage:
 * that collection is only ever written by our own /feedback and /contact
 * forms, this one only by the IMAP sync — the provenance differs, so they
 * are never merged into one collection.
 */
export interface IMailboxMessage extends Document {
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  fromName: string;
  fromEmail: string;
  subject: string;
  text: string;
  receivedAt: Date;
  status: MailboxStatus;
  /** Set when this mail is a reply inside one of our own feedback threads. */
  feedbackId: string | null;
  repliedAt?: Date | null;
  repliedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const mailboxMessageSchema = new Schema<IMailboxMessage>(
  {
    messageId: { type: String, required: true, unique: true },
    inReplyTo: { type: String, default: null },
    references: { type: [String], default: [] },
    fromName: { type: String, default: '', maxlength: 300 },
    fromEmail: { type: String, required: true, maxlength: 300 },
    subject: { type: String, default: '', maxlength: 500 },
    text: { type: String, default: '', maxlength: 20000 },
    receivedAt: { type: Date, required: true },
    status: { type: String, enum: ['open', 'replied', 'archived'], default: 'open', index: true },
    feedbackId: { type: String, default: null },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: String, default: null },
  },
  { timestamps: true }
);

mailboxMessageSchema.index({ status: 1, receivedAt: -1 });

export default mongoose.model<IMailboxMessage>('MailboxMessage', mailboxMessageSchema);
