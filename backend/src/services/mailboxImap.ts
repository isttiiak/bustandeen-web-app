import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

/**
 * Thin IMAP layer for the founder mailbox (istiak@bustandeen.com). Only
 * reads — nothing here changes flags, moves or deletes mail on the server.
 * Kept separate from mailboxSync.service.ts so the sync logic can be tested
 * with a fake fetcher and no network.
 */

export interface FetchedMail {
  uid: number;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  fromName: string;
  fromEmail: string;
  subject: string;
  text: string;
  receivedAt: Date;
}

export interface FetchResult {
  uidValidity: string;
  mails: FetchedMail[];
  /** Highest UID this run covered (also when a message was unparseable), so
   *  the checkpoint always moves forward. */
  maxUid: number;
}

export type MailFetcher = (
  lastUid: number,
  knownUidValidity: string | null
) => Promise<FetchResult>;

/** Per-run cap — keeps one sync well inside the serverless time limit. */
const MAX_PER_RUN = 40;
const FIRST_RUN_DAYS = 30;

/** Master switch, off by default: Zoho's free plan has no IMAP, so nothing
 *  may connect until MAILBOX_SYNC_ENABLED=1 is set (after a paid plan). */
export const isMailboxSyncEnabled = (): boolean => process.env.MAILBOX_SYNC_ENABLED === '1';

export const getImapConfig = (): { host: string; user: string; pass: string } | null => {
  if (!isMailboxSyncEnabled()) return null;
  // Falls back to the founder's SMTP pair: it is the very same mailbox, so
  // one Zoho app-password works for both once IMAP is enabled on the account.
  const user = process.env.ISTIAK_IMAP_USER ?? process.env.ISTIAK_SMTP_USER;
  const pass = process.env.ISTIAK_IMAP_PASS ?? process.env.ISTIAK_SMTP_PASS;
  const host =
    process.env.ZOHO_IMAP_HOST ??
    (process.env.ZOHO_SMTP_HOST ? process.env.ZOHO_SMTP_HOST.replace(/^smtp\./, 'imap.') : '');
  if (!user || !pass || !host) return null;
  return { host, user, pass };
};

const asRefs = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : v ? v.split(/\s+/).filter(Boolean) : [];

export const fetchFromImap: MailFetcher = async (lastUid, knownUidValidity) => {
  const cfg = getImapConfig();
  if (!cfg) throw new Error('Mailbox sync is not configured (IMAP credentials missing).');

  const client = new ImapFlow({
    host: cfg.host,
    port: 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
    socketTimeout: 20_000,
    greetingTimeout: 10_000,
    connectionTimeout: 10_000,
  });
  // Without a listener an async socket error would crash the process.
  client.on('error', () => {});

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      if (!mailbox) throw new Error('Could not open INBOX.');
      const uidValidity = String(mailbox.uidValidity);
      // A changed UIDVALIDITY means every stored UID is meaningless — start over.
      const startFrom = knownUidValidity === uidValidity ? lastUid : 0;

      let uids: number[];
      if (startFrom === 0) {
        const since = new Date(Date.now() - FIRST_RUN_DAYS * 86_400_000);
        const found = await client.search({ since }, { uid: true });
        uids = (found || []).sort((a, b) => a - b).slice(-MAX_PER_RUN);
      } else {
        // "N:*" always yields the newest message even when its UID < N.
        const found = await client.search({ uid: `${startFrom + 1}:*` }, { uid: true });
        uids = (found || [])
          .filter((u) => u > startFrom)
          .sort((a, b) => a - b)
          .slice(0, MAX_PER_RUN);
      }

      const mails: FetchedMail[] = [];
      let maxUid = startFrom;
      if (uids.length) {
        for await (const msg of client.fetch(
          uids.join(','),
          { uid: true, source: true },
          { uid: true }
        )) {
          maxUid = Math.max(maxUid, msg.uid);
          if (!msg.source) continue;
          try {
            const p = await simpleParser(msg.source);
            const from = p.from?.value?.[0];
            if (!from?.address) continue;
            mails.push({
              uid: msg.uid,
              messageId: p.messageId ?? `<no-id-${uidValidity}-${msg.uid}@mailbox.local>`,
              inReplyTo: p.inReplyTo ?? null,
              references: asRefs(p.references),
              fromName: from.name ?? '',
              fromEmail: from.address.toLowerCase(),
              subject: p.subject ?? '',
              text: p.text ?? '',
              receivedAt: p.date ?? new Date(),
            });
          } catch (err) {
            console.error('Mailbox sync: skipped an unparseable message', msg.uid, err);
          }
        }
      }
      return { uidValidity, mails, maxUid };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
};
