import mongoose, { Document, Schema } from 'mongoose';

/** Single-document checkpoint for the IMAP sync (key is always 'inbox'). */
export interface IMailboxSyncState extends Document {
  key: string;
  uidValidity: string | null;
  lastUid: number;
  lastSyncAt: Date | null;
  lastError: string | null;
  /** Set while a sync runs so two admins opening the panel don't overlap. */
  lockedUntil: Date | null;
}

const mailboxSyncStateSchema = new Schema<IMailboxSyncState>({
  key: { type: String, required: true, unique: true },
  uidValidity: { type: String, default: null },
  lastUid: { type: Number, default: 0 },
  lastSyncAt: { type: Date, default: null },
  lastError: { type: String, default: null },
  lockedUntil: { type: Date, default: null },
});

export default mongoose.model<IMailboxSyncState>('MailboxSyncState', mailboxSyncStateSchema);
