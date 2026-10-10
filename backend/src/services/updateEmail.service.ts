import User from '../models/User.js';
import UpdateEmailCampaign, {
  IUpdateEmailCampaign,
  IUpdateEmailRecipient,
  NotSetMode,
  UpdateEmailAudience,
} from '../models/UpdateEmailCampaign.js';
import { sendMail } from './email.service.js';
import { toSimpleHtml } from './sadaqahEmail.templates.js';
import { EMAIL_TAGLINE, SIGN_OFF } from './emailBrand.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

/** Emails per request. Small on purpose: each is a real SMTP round trip, and a
 * serverless request has a hard time limit, so the admin page loops. */
export const CHUNK_SIZE = 20;
export const MAX_RECIPIENTS = 2000;
const SEND_CONCURRENCY = 4;

type Group = 'male' | 'female' | 'unset' | 'custom';

export interface AudienceUser {
  uid: string;
  email: string;
  name: string;
  group: Group;
}

const groupOf = (gender?: string | null): Group =>
  gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'unset';

const firstNameOf = (u: { firstName?: string | null; displayName?: string | null }): string =>
  (u.firstName?.trim() || u.displayName?.trim() || '').split(/\s+/)[0] ?? '';

async function loadAudienceUsers(): Promise<AudienceUser[]> {
  const rows = await User.find({ disabled: { $ne: true }, email: { $exists: true, $ne: '' } })
    .select('uid email firstName displayName gender')
    .lean();
  return rows
    .filter((u) => !!u.email)
    .map((u) => ({
      uid: u.uid,
      email: u.email,
      name: firstNameOf(u),
      group: groupOf(u.gender),
    }));
}

export interface AudienceSummary {
  brothers: number;
  sisters: number;
  notSet: number;
  /** Accounts with no brother/sister set (including "other" and "prefer not
   * to say"), listed so they can be picked one by one. Capped for the page. */
  notSetUsers: Array<{ uid: string; email: string; name: string }>;
  notSetListTruncated: boolean;
  trailer: string;
  sender: string;
}

const NOT_SET_LIST_CAP = 300;

export async function getAudienceSummary(): Promise<AudienceSummary> {
  const users = await loadAudienceUsers();
  const unset = users.filter((u) => u.group === 'unset');
  return {
    brothers: users.filter((u) => u.group === 'male').length,
    sisters: users.filter((u) => u.group === 'female').length,
    notSet: unset.length,
    notSetUsers: unset
      .slice(0, NOT_SET_LIST_CAP)
      .map((u) => ({ uid: u.uid, email: u.email, name: u.name })),
    notSetListTruncated: unset.length > NOT_SET_LIST_CAP,
    trailer: SIGN_OFF,
    sender: 'ansar@bustandeen.com',
  };
}

export interface CampaignInput {
  subject: string;
  body: string;
  /** Group selection (brothers / sisters / all + how to treat not-set accounts)... */
  audience?: Exclude<UpdateEmailAudience, 'custom'>;
  notSetMode?: NotSetMode;
  selectedUids?: string[];
  /** ...OR an explicit list of addresses (special or test sends), used instead. */
  customEmails?: string[];
}

/** Who a given selection resolves to. */
export function selectRecipients(
  users: AudienceUser[],
  audience: UpdateEmailAudience,
  notSetMode: NotSetMode,
  selectedUids: string[] = []
): AudienceUser[] {
  const picked = new Set(selectedUids);
  return users.filter((u) => {
    if (u.group === 'male') return audience === 'brother' || audience === 'all';
    if (u.group === 'female') return audience === 'sister' || audience === 'all';
    if (notSetMode === 'include') return true;
    if (notSetMode === 'selected') return picked.has(u.uid);
    return false;
  });
}

/** Every email closes with the tagline, whatever was typed. */
export function withTrailer(body: string): string {
  const trimmed = body.trimEnd();
  return trimmed.endsWith(EMAIL_TAGLINE) ? trimmed : `${trimmed}\n\n${SIGN_OFF}`;
}

/** Lower-cased, de-duplicated addresses from the custom list. */
export function normaliseEmails(emails: string[]): string[] {
  return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export async function createCampaign(
  input: CampaignInput,
  createdBy: string
): Promise<IUpdateEmailCampaign> {
  const users = await loadAudienceUsers();
  const custom = normaliseEmails(input.customEmails ?? []);
  if (custom.length > 0) {
    // Special or test send: exactly these addresses. When one belongs to an
    // account, its first name is kept only so the history reads well.
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    return UpdateEmailCampaign.create({
      subject: input.subject,
      body: withTrailer(input.body),
      audience: 'custom',
      createdBy,
      recipients: custom.map((email) => ({
        uid: byEmail.get(email)?.uid ?? `custom:${email}`,
        email,
        name: byEmail.get(email)?.name ?? '',
        group: 'custom',
        status: 'pending',
      })),
    });
  }
  if (!input.audience || !input.notSetMode) {
    throw httpError(400, 'Choose a group or enter custom recipients.');
  }
  const recipients = selectRecipients(users, input.audience, input.notSetMode, input.selectedUids);
  if (recipients.length === 0) throw httpError(400, 'No recipients match this selection.');
  if (recipients.length > MAX_RECIPIENTS) {
    throw httpError(400, `Too many recipients (${recipients.length}). Narrow the audience.`);
  }
  return UpdateEmailCampaign.create({
    subject: input.subject,
    body: withTrailer(input.body),
    audience: input.audience,
    notSetMode: input.notSetMode,
    createdBy,
    recipients: recipients.map((r) => ({ ...r, status: 'pending' })),
  });
}

/** Longer than one chunk can take (the function's maxDuration is 30 s), so a
 *  lease only expires on its own when the request holding it died. */
export const SEND_LEASE_MS = 60_000;

/** Takes the campaign's send lease, or returns null when another request
 *  holds it. Throws 404 when the campaign does not exist. */
async function takeLease(id: string): Promise<IUpdateEmailCampaign | null> {
  const now = new Date();
  const campaign = await UpdateEmailCampaign.findOneAndUpdate(
    { _id: id, $or: [{ sendingUntil: null }, { sendingUntil: { $lt: now } }] },
    { $set: { sendingUntil: new Date(now.getTime() + SEND_LEASE_MS) } },
    { returnDocument: 'after' }
  );
  if (campaign) return campaign;
  if (!(await UpdateEmailCampaign.exists({ _id: id }))) throw httpError(404, 'Campaign not found');
  return null;
}

/** The campaign as it stands, for a caller that could not take the lease. */
async function current(id: string): Promise<IUpdateEmailCampaign> {
  const campaign = await UpdateEmailCampaign.findById(id);
  if (!campaign) throw httpError(404, 'Campaign not found');
  return campaign;
}

/**
 * Sends the next CHUNK_SIZE pending recipients. Safe to call repeatedly and
 * from two tabs at once: only the request holding the lease sends; any other
 * gets the campaign back with `busy: true` and nothing sent.
 */
export async function sendNextChunk(
  id: string
): Promise<{ campaign: IUpdateEmailCampaign; busy: boolean }> {
  const campaign = await takeLease(id);
  if (!campaign) return { campaign: await current(id), busy: true };

  try {
    const batch = campaign.recipients.filter((r) => r.status === 'pending').slice(0, CHUNK_SIZE);
    const sendOne = async (r: IUpdateEmailRecipient): Promise<void> => {
      // One shared message for everyone: bulk updates address the whole community.
      const text = campaign.body;
      const messageId = await sendMail({
        to: r.email,
        subject: campaign.subject,
        text,
        html: toSimpleHtml(text),
        from: 'ansar',
      });
      if (messageId) {
        r.status = 'sent';
        r.sentAt = new Date();
        r.error = undefined;
      } else {
        r.status = 'failed';
        r.error = 'Send failed (see System & ops health)';
      }
    };

    for (let i = 0; i < batch.length; i += SEND_CONCURRENCY) {
      await Promise.all(batch.slice(i, i + SEND_CONCURRENCY).map(sendOne));
    }
  } finally {
    campaign.markModified('recipients');
    campaign.sendingUntil = null;
    await campaign.save();
  }
  return { campaign, busy: false };
}

/** Puts failed recipients back to pending. Refused (409) while a chunk is
 *  being sent, since that send saves the whole recipient list when it ends. */
export async function retryFailed(id: string): Promise<IUpdateEmailCampaign> {
  const campaign = await takeLease(id);
  if (!campaign) throw httpError(409, 'Sending is in progress. Try again in a minute.');
  for (const r of campaign.recipients) if (r.status === 'failed') r.status = 'pending';
  campaign.markModified('recipients');
  campaign.sendingUntil = null;
  await campaign.save();
  return campaign;
}

export interface CampaignSummary {
  _id: string;
  subject: string;
  audience: UpdateEmailAudience;
  notSetMode?: NotSetMode;
  createdBy: string;
  createdAt: Date;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export const summarise = (c: IUpdateEmailCampaign): CampaignSummary => ({
  _id: c._id.toString(),
  subject: c.subject,
  audience: c.audience,
  notSetMode: c.notSetMode,
  createdBy: c.createdBy,
  createdAt: c.createdAt,
  total: c.recipients.length,
  sent: c.recipients.filter((r) => r.status === 'sent').length,
  failed: c.recipients.filter((r) => r.status === 'failed').length,
  pending: c.recipients.filter((r) => r.status === 'pending').length,
});

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const rows = await UpdateEmailCampaign.find().sort({ createdAt: -1 }).limit(50);
  return rows.map(summarise);
}

export async function getCampaign(
  id: string
): Promise<{ summary: CampaignSummary; body: string; recipients: IUpdateEmailRecipient[] }> {
  const c = await UpdateEmailCampaign.findById(id);
  if (!c) throw httpError(404, 'Campaign not found');
  return { summary: summarise(c), body: c.body, recipients: c.recipients };
}
