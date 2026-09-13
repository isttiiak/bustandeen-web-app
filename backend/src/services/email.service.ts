import nodemailer, { Transporter } from 'nodemailer';

/**
 * Two named senders on the same Zoho org (bustandeen.com), each with its own
 * mailbox login — Zoho (like most providers) only lets a mailbox send "From"
 * itself, so a distinct sender needs distinct SMTP credentials, not just a
 * different `from` header on the same transporter.
 *
 * - 'sadaqah' (sadaqah@bustandeen.com) — donation received/verified/rejected
 *   threads, and the zikr-request review pipeline's admin notification.
 * - 'istiak' (istiak@bustandeen.com) — the founder's personal address, used
 *   for the one-time welcome email so it reads as a real person reaching out,
 *   not an automated system mailbox.
 */
export type EmailSender = 'sadaqah' | 'istiak';

const SENDER_ENV: Record<EmailSender, { user: string; pass: string; displayName: string }> = {
  sadaqah: {
    user: 'ZOHO_SMTP_USER',
    pass: 'ZOHO_SMTP_PASS',
    displayName: 'Bustandeen',
  },
  istiak: {
    user: 'ISTIAK_SMTP_USER',
    pass: 'ISTIAK_SMTP_PASS',
    displayName: 'Istiak from Bustandeen',
  },
};

const transporters: Partial<Record<EmailSender, Transporter | null>> = {};

const getTransporter = (sender: EmailSender): Transporter | null => {
  if (sender in transporters) return transporters[sender] ?? null;

  const { ZOHO_SMTP_HOST, ZOHO_SMTP_PORT } = process.env;
  const { user: userVar, pass: passVar } = SENDER_ENV[sender];
  const user = process.env[userVar];
  const pass = process.env[passVar];

  if (!ZOHO_SMTP_HOST || !ZOHO_SMTP_PORT || !user || !pass) {
    console.warn(
      `Email not configured for sender "${sender}" (${userVar}/${passVar} missing) — emails will be skipped.`
    );
    transporters[sender] = null;
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: ZOHO_SMTP_HOST,
    port: Number(ZOHO_SMTP_PORT),
    secure: Number(ZOHO_SMTP_PORT) === 465,
    auth: { user, pass },
  });
  transporters[sender] = transporter;
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
  const { user, displayName } = {
    user: process.env[SENDER_ENV[sender].user],
    displayName: SENDER_ENV[sender].displayName,
  };
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
    });
    return info.messageId ?? null;
  } catch (err) {
    console.error('Failed to send email:', err);
    return null;
  }
};
