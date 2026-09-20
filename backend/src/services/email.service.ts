import nodemailer, { Transporter } from 'nodemailer';
import EmailFailureLog from '../models/EmailFailureLog.js';

/**
 * Named senders — each is a real, separately-scoped mailbox with its own
 * dedicated `<SENDER>_SMTP_USER`/`<SENDER>_SMTP_PASS` env-var pair (same
 * naming convention for all three, no shared/legacy fallback). Only
 * `ZOHO_SMTP_HOST`/`ZOHO_SMTP_PORT` are shared — that's just the one Zoho
 * server every mailbox in this org connects through.
 *
 * - 'sadaqah' (sadaqah@bustandeen.com, displayed "Bustandeen") — donation
 *   review threads.
 * - 'ansar' (ansar@bustandeen.com, displayed "Bustandeen Ansar") — zikr
 *   request review threads and anything else outside the sadaqah domain.
 * - 'istiak' (istiak@bustandeen.com) — the founder's personal address, used
 *   for the one-time welcome email so it reads as a real person reaching out,
 *   not an automated system mailbox.
 */
export type EmailSender = 'sadaqah' | 'ansar' | 'istiak';

const SENDER_ENV_TABLE: Record<
  EmailSender,
  { userVar: string; passVar: string; displayName: string }
> = {
  sadaqah: {
    userVar: 'SADAQAH_SMTP_USER',
    passVar: 'SADAQAH_SMTP_PASS',
    displayName: 'Bustandeen',
  },
  ansar: {
    userVar: 'ANSAR_SMTP_USER',
    passVar: 'ANSAR_SMTP_PASS',
    displayName: 'Bustandeen Ansar',
  },
  istiak: {
    userVar: 'ISTIAK_SMTP_USER',
    passVar: 'ISTIAK_SMTP_PASS',
    displayName: 'Istiak from Bustandeen',
  },
};

const SENDER_ENV = new Map(
  Object.entries(SENDER_ENV_TABLE) as Array<[EmailSender, (typeof SENDER_ENV_TABLE)[EmailSender]]>
);

const senderConfig = (sender: EmailSender): (typeof SENDER_ENV_TABLE)[EmailSender] => {
  const cfg = SENDER_ENV.get(sender);
  if (!cfg) throw new Error(`Unknown email sender "${sender}"`);
  return cfg;
};

const resolveSenderCreds = (sender: EmailSender): { user?: string; pass?: string } => {
  const cfg = senderConfig(sender);
  return { user: process.env[cfg.userVar], pass: process.env[cfg.passVar] };
};

export interface SenderDiagnostics {
  /** Whether SMTP host/port + this sender's own user/pass are all present. */
  configured: boolean;
  /** The mailbox address actually used (safe to show — it's the public
   *  "From" address every recipient already sees), or null if unconfigured. */
  resolvedUser: string | null;
}

/** Exposed for the ops-health page. Two senders resolving to the SAME
 *  resolvedUser means their env vars were set to the same mailbox by
 *  mistake — each sender's pair is independent now, so this should never
 *  happen unless someone copy-pasted the wrong value. */
export const getSenderDiagnostics = (sender: EmailSender): SenderDiagnostics => {
  const { user, pass } = resolveSenderCreds(sender);
  const configured = !!(process.env.ZOHO_SMTP_HOST && process.env.ZOHO_SMTP_PORT && user && pass);
  return { configured, resolvedUser: configured ? (user ?? null) : null };
};

const transporters = new Map<EmailSender, Transporter | null>();

const getTransporter = (sender: EmailSender): Transporter | null => {
  if (transporters.has(sender)) return transporters.get(sender) ?? null;

  const { ZOHO_SMTP_HOST, ZOHO_SMTP_PORT } = process.env;
  const { user, pass } = resolveSenderCreds(sender);

  if (!ZOHO_SMTP_HOST || !ZOHO_SMTP_PORT || !user || !pass) {
    console.warn(
      `Email not configured for sender "${sender}" (credentials missing) — emails will be skipped.`
    );
    transporters.set(sender, null);
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: ZOHO_SMTP_HOST,
    port: Number(ZOHO_SMTP_PORT),
    secure: Number(ZOHO_SMTP_PORT) === 465,
    auth: { user, pass },
  });
  transporters.set(sender, transporter);
  return transporter;
};

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Which mailbox sends this — defaults to 'sadaqah' so every existing
   *  caller (written before 'istiak' existed) keeps its current behavior. */
  from?: EmailSender;
  /** Explicit Message-ID for this send (angle-bracket form, e.g.
   *  "<sadaqah-<id>@bustandeen.com>") — set on the FIRST email in a thread so
   *  later replies can reference it via inReplyTo/references. */
  messageId?: string;
  /** Threads this send as a reply in the recipient's mail client (Gmail,
   *  Outlook) so a donation's received/verified/rejected emails group into
   *  one conversation instead of three separate ones. */
  inReplyTo?: string;
  references?: string;
  /** Files attached to the message (e.g. the signed sadaqah receipt PDF). */
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

/**
 * Always awaited by callers before they respond to the client — Vercel can
 * freeze a serverless function right after the response is sent, so a
 * fire-and-forget send here would intermittently just never go out. Never
 * throws: a failed/unsent email should not fail the request that triggered
 * it (the donation record is already the source of truth either way).
 *
 * Returns the Message-ID actually used (nodemailer generates one when
 * `messageId` isn't passed), or null if nothing was sent/it failed — the
 * caller can store this to thread later replies against it.
 */
export const sendMail = async (opts: SendMailOptions): Promise<string | null> => {
  const sender = opts.from ?? 'sadaqah';
  const t = getTransporter(sender);
  if (!t) return null;
  const { user } = resolveSenderCreds(sender);
  const { displayName } = senderConfig(sender);
  try {
    const info = await t.sendMail({
      from: `"${displayName}" <${user}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      messageId: opts.messageId,
      inReplyTo: opts.inReplyTo,
      references: opts.references,
      attachments: opts.attachments,
    });
    return info.messageId ?? null;
  } catch (err) {
    console.error('Failed to send email:', err);
    // Best-effort durable record so a silent SMTP failure (e.g. the Sadaqah
    // system's past Zoho 535 auth error) shows up on the ops-health page
    // instead of only ever being visible in server logs. Never let a logging
    // failure mask the original send error.
    try {
      await EmailFailureLog.create({
        sender,
        to: opts.to,
        subject: opts.subject,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch (logErr) {
      console.error('Failed to write email failure log:', logErr);
    }
    return null;
  }
};
