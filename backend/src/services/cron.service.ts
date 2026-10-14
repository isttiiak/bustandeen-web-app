import CronRun from '../models/CronRun.js';
import { verifySender, type EmailSender } from './email.service.js';

export type CronJob = 'rebuild' | 'email-check';

export interface CronResult {
  ok: boolean;
  detail: string;
}

/** Saves the outcome of a job run; never throws (a logging failure must not
 *  turn a successful job into a failed response). */
export const recordCronRun = async (job: CronJob, result: CronResult): Promise<void> => {
  const now = new Date();
  try {
    await CronRun.updateOne(
      { _id: job },
      {
        $set: {
          ok: result.ok,
          detail: result.detail.slice(0, 300),
          ranAt: now,
          ...(result.ok ? { lastOkAt: now } : {}),
        },
        ...(result.ok ? {} : { $setOnInsert: { lastOkAt: null } }),
      },
      { upsert: true }
    );
  } catch (err) {
    console.error(`Failed to record cron run "${job}":`, err);
  }
};

export interface CronRunSummary {
  job: string;
  ok: boolean;
  detail: string;
  ranAt: Date;
  lastOkAt: Date | null;
}

export const getCronRuns = async (): Promise<CronRunSummary[]> => {
  const rows = await CronRun.find().sort({ _id: 1 }).lean();
  return rows.map((r) => ({
    job: r._id,
    ok: r.ok,
    detail: r.detail,
    ranAt: r.ranAt,
    lastOkAt: r.lastOkAt ?? null,
  }));
};

/**
 * LT-1: the prerendered pages are dated at build time (district timetables
 * keep this month and the next two, Ramadan calendars read the moon-sighting
 * records), so a fresh production build is requested once a month. This used
 * to be a GitHub schedule, which GitHub turns off after 60 days without a
 * commit on a public repo. VERCEL_DEPLOY_HOOK_URL is the same Deploy Hook
 * (branch main) the manual GitHub workflow uses; it is never logged.
 */
export const triggerRebuild = async (): Promise<CronResult> => {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return { ok: false, detail: 'VERCEL_DEPLOY_HOOK_URL is not set: nothing deployed' };
  try {
    const res = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { ok: false, detail: `Deploy hook answered ${res.status}` };
    return { ok: true, detail: 'Production deploy requested' };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    return { ok: false, detail: `Deploy hook unreachable (${name})` };
  }
};

const EMAIL_SENDERS: EmailSender[] = ['ansar', 'sadaqah', 'istiak'];

/**
 * LT-2: email-first sign-up and password reset depend on Zoho SMTP alone, so
 * once a day every configured sender logs in (nothing is sent). 'ansar' sends
 * the account emails, so it must be configured; the others only count when set.
 * /api/health/email turns a failed or missing run into a 503 for the status
 * page, which alerts by its own email, not through Zoho.
 */
export const checkEmailSenders = async (): Promise<CronResult> => {
  const checks = await Promise.all(EMAIL_SENDERS.map((s) => verifySender(s)));
  const parts = checks.map((c) =>
    c.ok === null
      ? `${c.sender} not configured`
      : c.ok
        ? `${c.sender} ok`
        : `${c.sender} FAILED (${c.error})`
  );
  const accountSender = checks.find((c) => c.sender === 'ansar');
  const ok = accountSender?.ok === true && checks.every((c) => c.ok !== false);
  return { ok, detail: parts.join('; ') };
};
