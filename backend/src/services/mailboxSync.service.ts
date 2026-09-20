import MailboxMessage from '../models/MailboxMessage.js';
import MailboxSyncState from '../models/MailboxSyncState.js';
import {
  fetchFromImap,
  getImapConfig,
  isMailboxSyncEnabled,
  type FetchedMail,
  type MailFetcher,
} from './mailboxImap.js';

const STATE_KEY = 'inbox';
const LOCK_MS = 60_000;
/** Opening the panel triggers a sync only when the last one is older than this. */
export const STALE_AFTER_MS = 3 * 60_000;
const MAX_TEXT = 20_000;

/** Our own notification mail sometimes lands here too (e.g. a reply sent to
 *  ourselves) — never show the team its own outbound mailboxes as "senders". */
const ownAddresses = (): Set<string> =>
  new Set(
    ['SADAQAH', 'ANSAR', 'ISTIAK']
      .map((s) => process.env[`${s}_SMTP_USER`]?.toLowerCase())
      .filter((v): v is string => !!v)
  );

/** Cuts the quoted history a mail client appends to a reply, so the panel
 *  shows only what the person actually wrote this time. */
export const stripQuotedReply = (raw: string): string => {
  const text = raw.replace(/\r\n/g, '\n');
  const cut = text.search(
    /^(On .{5,200}wrote:\s*|-{2,}\s*Original Message\s*-{2,}|_{5,}\s*|>.*)$/im
  );
  const kept = cut > 0 ? text.slice(0, cut) : text;
  return kept.trim().slice(0, MAX_TEXT);
};

/** If this mail replies inside one of OUR feedback threads (the ids we mint in
 *  feedback.service.ts), returns that FeedbackMessage id. */
export const feedbackIdFromHeaders = (
  inReplyTo: string | null,
  references: string[]
): string | null => {
  for (const h of [inReplyTo ?? '', ...references]) {
    const m = /^<feedback-([a-f0-9]{24})@bustandeen\.com>$/i.exec(h.trim());
    if (m) return m[1];
  }
  return null;
};

export interface SyncResult {
  ok: boolean;
  added: number;
  skipped?: 'not-configured' | 'busy';
  error?: string;
}

export interface SyncStatus {
  enabled: boolean;
  configured: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export const getSyncStatus = async (): Promise<SyncStatus> => {
  const state = await MailboxSyncState.findOne({ key: STATE_KEY });
  return {
    enabled: isMailboxSyncEnabled(),
    configured: !!getImapConfig(),
    lastSyncAt: state?.lastSyncAt ?? null,
    lastError: state?.lastError ?? null,
  };
};

const storeMail = async (mail: FetchedMail, own: Set<string>): Promise<boolean> => {
  if (own.has(mail.fromEmail)) return false;
  const res = await MailboxMessage.updateOne(
    { messageId: mail.messageId },
    {
      $setOnInsert: {
        messageId: mail.messageId,
        inReplyTo: mail.inReplyTo,
        references: mail.references,
        fromName: mail.fromName.slice(0, 300),
        fromEmail: mail.fromEmail.slice(0, 300),
        subject: mail.subject.slice(0, 500),
        text: stripQuotedReply(mail.text),
        receivedAt: mail.receivedAt,
        feedbackId: feedbackIdFromHeaders(mail.inReplyTo, mail.references),
      },
    },
    { upsert: true }
  );
  return res.upsertedCount > 0;
};

/**
 * Pulls new INBOX mail into MailboxMessage. Never throws — a failure is
 * recorded on the sync state (shown in the panel) and returned. Deduped by
 * Message-ID, so re-running or a reset checkpoint can never double-insert.
 * The lock stops two admins opening the panel at once from overlapping.
 */
export const syncMailbox = async (fetcher: MailFetcher = fetchFromImap): Promise<SyncResult> => {
  if (!getImapConfig()) return { ok: false, added: 0, skipped: 'not-configured' };

  await MailboxSyncState.updateOne(
    { key: STATE_KEY },
    { $setOnInsert: { key: STATE_KEY } },
    { upsert: true }
  );
  const now = new Date();
  const state = await MailboxSyncState.findOneAndUpdate(
    { key: STATE_KEY, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
    { new: true }
  );
  if (!state) return { ok: true, added: 0, skipped: 'busy' };

  try {
    const { uidValidity, mails, maxUid } = await fetcher(state.lastUid, state.uidValidity);
    const own = ownAddresses();
    let added = 0;
    for (const mail of mails) {
      if (await storeMail(mail, own)) added++;
    }
    await MailboxSyncState.updateOne(
      { key: STATE_KEY },
      {
        $set: {
          uidValidity,
          lastUid: maxUid,
          lastSyncAt: new Date(),
          lastError: null,
          lockedUntil: null,
        },
      }
    );
    return { ok: true, added };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Mailbox sync failed:', err);
    await MailboxSyncState.updateOne(
      { key: STATE_KEY },
      { $set: { lastError: error.slice(0, 500), lockedUntil: null } }
    );
    return { ok: false, added: 0, error };
  }
};
