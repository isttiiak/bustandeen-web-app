import mongoose, { Document, Schema } from 'mongoose';

export type UpdateEmailAudience = 'brother' | 'sister' | 'all';
export type NotSetMode = 'include' | 'skip' | 'selected';

export interface IUpdateEmailRecipient {
  uid: string;
  email: string;
  name: string;
  /** The group the account was picked from. */
  group: 'male' | 'female' | 'unset';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

/**
 * One "send an update email" action from the admin Broadcast page: who it
 * went to and what happened to each address. Sent from ansar@bustandeen.com in
 * small chunks (see updateEmail.service.ts) so a large audience never has to
 * fit inside one serverless request.
 */
export interface IUpdateEmailCampaign extends Document {
  subject: string;
  body: string;
  audience: UpdateEmailAudience;
  notSetMode: NotSetMode;
  createdBy: string;
  createdAt: Date;
  recipients: IUpdateEmailRecipient[];
}

const recipientSchema = new Schema<IUpdateEmailRecipient>(
  {
    uid: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    group: { type: String, enum: ['male', 'female', 'unset'], required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date },
    error: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const campaignSchema = new Schema<IUpdateEmailCampaign>({
  subject: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 10000 },
  audience: { type: String, enum: ['brother', 'sister', 'all'], required: true },
  notSetMode: { type: String, enum: ['include', 'skip', 'selected'], required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  recipients: { type: [recipientSchema], default: [] },
});

export default mongoose.model<IUpdateEmailCampaign>('UpdateEmailCampaign', campaignSchema);
