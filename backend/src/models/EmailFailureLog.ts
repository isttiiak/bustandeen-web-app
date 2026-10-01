import mongoose, { Document, Schema } from 'mongoose';

/**
 * Durable record of a failed send.email.service.ts's sendMail() previously
 * only console.error'd a failure — invisible outside server logs, which is
 * exactly what let the Sadaqah system's Zoho SMTP 535 auth error go
 * unnoticed. Written from that same catch block so nothing new can fail
 * silently going forward.
 */
export interface IEmailFailureLog extends Document {
  sender: string;
  to: string;
  subject: string;
  error: string;
  createdAt: Date;
}

const emailFailureLogSchema = new Schema<IEmailFailureLog>({
  sender: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  error: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

/** Retention: failed sends (recipient address + subject) are kept for 90
 * days, long enough to notice and debug a broken mail setup. The TTL index
 * also serves the newest-first sort. Built by `npm run sync-indexes`. */
export const EMAIL_FAILURE_TTL_SECONDS = 90 * 24 * 60 * 60;
emailFailureLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: EMAIL_FAILURE_TTL_SECONDS });

export default mongoose.model<IEmailFailureLog>('EmailFailureLog', emailFailureLogSchema);
