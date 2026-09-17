import nodemailer, { Transporter } from 'nodemailer';

/**
 * Named senders — the mailbox (SMTP credentials) a send authenticates as,
 * paired with the display name shown in the recipient's inbox. 'sadaqah' and
 * 'ansar' now correspond to two real, separately-scoped Ansar accounts
 * (sadaqah@bustandeen.com and ansar@bustandeen.com — see AdminAccount's
 * ansarDomain), but a dedicated Zoho mailbox for each may not exist yet.
 * Each sender therefore checks for an OPTIONAL dedicated env-var pair first
 * (`dedicatedUser`/`dedicatedPass` below) and falls back to the shared
 * `ZOHO_SMTP_USER`/`PASS` mailbox if either is unset — so this works
 * immediately, and upgrades to a real separate inbox with no code change
 * once the user provisions one and sets the matching env vars.
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

const SENDER_ENV: Record<
  EmailSender,
  {
    user: string;
    pass: string;
    dedicatedUser?: string;
    dedicatedPass?: string;
    displayName: string;
  }
> = {
  sadaqah: {
    user: 'ZOHO_SMTP_USER',
    pass: 'ZOHO_SMTP_PASS',
    dedicatedUser: 'SADAQAH_SMTP_USER',
    dedicatedPass: 'SADAQAH_SMTP_PASS',
    displayName: 'Bustandeen',
  },
  ansar: {
    user: 'ZOHO_SMTP_USER',
    pass: 'ZOHO_SMTP_PASS',
    dedicatedUser: 'ANSAR_SMTP_USER',
    dedicatedPass: 'ANSAR_SMTP_PASS',
    displayName: 'Bustandeen Ansar',
  },
  istiak: {
    user: 'ISTIAK_SMTP_USER',
    pass: 'ISTIAK_SMTP_PASS',
    displayName: 'Istiak from Bustandeen',
  },
};

/** Resolves the actual mailbox credentials for a sender: dedicated env vars
 *  if both are set, otherwise the shared Zoho mailbox. */
const resolveSenderCreds = (sender: EmailSender): { user?: string; pass?: string } => {
  const cfg = SENDER_ENV[sender];
  const dedicatedUser = cfg.dedicatedUser ? process.env[cfg.dedicatedUser] : undefined;
  const dedicatedPass = cfg.dedicatedPass ? process.env[cfg.dedicatedPass] : undefined;
  if (dedicatedUser && dedicatedPass) return { user: dedicatedUser, pass: dedicatedPass };
  return { user: process.env[cfg.user], pass: process.env[cfg.pass] };
};

const transporters: Partial<Record<EmailSender, Transporter | null>> = {};

const getTransporter = (sender: EmailSender): Transporter | null => {
  if (sender in transporters) return transporters[sender] ?? null;

  const { ZOHO_SMTP_HOST, ZOHO_SMTP_PORT } = process.env;
  const { user, pass } = resolveSenderCreds(sender);

  if (!ZOHO_SMTP_HOST || !ZOHO_SMTP_PORT || !user || !pass) {
    console.warn(
      `Email not configured for sender "${sender}" (credentials missing) — emails will be skipped.`
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
  const { user } = resolveSenderCreds(sender);
  const { displayName } = SENDER_ENV[sender];
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
