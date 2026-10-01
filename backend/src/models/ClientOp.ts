import mongoose, { Document, Schema } from 'mongoose';

/**
 * One row per client operation id (`X-Client-Op-Id`), so a write the app
 * replays from its offline outbox, or retries after a lost response, is applied
 * once (audit T2.3, middleware/idempotency.ts).
 *
 * `body` is the first response, replayed verbatim to a duplicate. Routes that
 * return private data (Rayhanah) opt out with `storeBody: false` and replay a
 * bare `{ ok: true }` instead, so no cycle data is ever copied here unencrypted.
 */
export interface IClientOp extends Document {
  uid: string;
  opId: string;
  /** "POST /api/zikr/increment/batch", for debugging only. */
  route: string;
  status: 'pending' | 'done';
  statusCode?: number;
  body?: unknown;
  createdAt: Date;
}

const clientOpSchema = new Schema<IClientOp>({
  uid: { type: String, required: true },
  opId: { type: String, required: true },
  route: { type: String, required: true },
  status: { type: String, enum: ['pending', 'done'], required: true },
  statusCode: { type: Number },
  body: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

/** The guarantee: one op id per user. Built by `npm run sync-indexes`. */
clientOpSchema.index({ uid: 1, opId: 1 }, { unique: true });

/** An outbox replays within days, not months: 30 days is ample. */
export const CLIENT_OP_TTL_SECONDS = 30 * 24 * 60 * 60;
clientOpSchema.index({ createdAt: 1 }, { expireAfterSeconds: CLIENT_OP_TTL_SECONDS });

export default mongoose.model<IClientOp>('ClientOp', clientOpSchema);
