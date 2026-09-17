import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only trail of every mutating /api/admin/* action. Never updated or
 * deleted from the API — the point is an honest record of what an Ansar (a
 * real, independently-revocable account, not "the second name on a shared
 * password") actually did, for a Servant reviewing later. `metadata` stays
 * small and cheap (e.g. a status transition), never a full before/after
 * document dump.
 */
export interface IAdminAuditLog extends Document {
  actorEmail: string;
  actorRole: 'servant' | 'ansar';
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>({
  actorEmail: { type: String, required: true },
  actorRole: { type: String, enum: ['servant', 'ansar'], required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actorEmail: 1, createdAt: -1 });

export default mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);
