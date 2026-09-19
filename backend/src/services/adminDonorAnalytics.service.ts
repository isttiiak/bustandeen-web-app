import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { sendMail } from './email.service.js';
import { toSimpleHtml } from './sadaqahEmail.templates.js';
import { SIGN_OFF } from './emailBrand.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export interface DonorAnalytics {
  /** Verified donations grouped by normalized donor email — repeat donors
   *  are the ones with count > 1. Sorted by total amount desc, capped at 50
   *  so this stays a quick read, not a full export. */
  topDonors: {
    email: string;
    donationCount: number;
    totalAmount: number;
    isAppUser: boolean;
  }[];
  repeatDonorCount: number;
  oneOffDonorCount: number;
  /** Verified amount grouped by calendar month ('YYYY-MM'), oldest first. */
  monthlyTrend: { month: string; amount: number; count: number }[];
}

/**
 * Cross-references verified Donation rows against User accounts (an
 * "engaged" donor is one with a matching account, by userId first, falling
 * back to email — a donor may donate as a guest with the same email they
 * later sign up with, or vice versa). Verified donations only: pending/
 * rejected rows aren't real money and would skew the numbers.
 */
export const getDonorAnalytics = async (): Promise<DonorAnalytics> => {
  const verified = await Donation.find({ status: 'verified' })
    .select('email userId amount transactionDate')
    .sort({ transactionDate: 1 });

  const byEmail = new Map<string, { count: number; total: number; userId: string | null }>();
  const monthly = new Map<string, { amount: number; count: number }>();

  for (const d of verified) {
    const email = d.email.trim().toLowerCase();
    const entry = byEmail.get(email) ?? { count: 0, total: 0, userId: null };
    entry.count += 1;
    entry.total += d.amount;
    if (d.userId) entry.userId = d.userId;
    byEmail.set(email, entry);

    const month = d.transactionDate.toISOString().slice(0, 7);
    const m = monthly.get(month) ?? { amount: 0, count: 0 };
    m.amount += d.amount;
    m.count += 1;
    monthly.set(month, m);
  }

  const emails = [...byEmail.keys()];
  const users = await User.find({ email: { $in: emails } }).select('email');
  const appUserEmails = new Set(users.map((u) => u.email.toLowerCase()));

  const topDonors = [...byEmail.entries()]
    .map(([email, v]) => ({
      email,
      donationCount: v.count,
      totalAmount: v.total,
      isAppUser: !!v.userId || appUserEmails.has(email),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 50);

  const repeatDonorCount = [...byEmail.values()].filter((v) => v.count > 1).length;
  const oneOffDonorCount = byEmail.size - repeatDonorCount;

  const monthlyTrend = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, amount: v.amount, count: v.count }));

  return { topDonors, repeatDonorCount, oneOffDonorCount, monthlyTrend };
};

const APPRECIATION_SUBJECT = 'JazakAllahu khayran from Bustandeen';

/**
 * Editable draft for a personal thank-you to a donor — the admin always
 * reviews/edits the exact text before anything sends, matching the same
 * draft-then-confirm pattern as donation verify/reject. Not thread-linked to
 * any single donation's emailMessageId: this is a fresh appreciation note
 * about their overall giving, not a reply to one transaction.
 */
export const getDonorEmailDraft = async (
  email: string
): Promise<{ subject: string; body: string }> => {
  const normalized = email.trim().toLowerCase();
  const donations = await Donation.find({ email: normalized, status: 'verified' }).sort({
    transactionDate: -1,
  });
  if (donations.length === 0) throw httpError(404, 'No verified donations found for this email');

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const named = donations.find((d) => !d.isAnonymous && d.donorName);
  const name = named?.donorName ?? 'there';

  const body = `Assalamu Alaikum ${name},

JazakAllahu khayran for your generous support of Bustandeen. Your contributions so far total ${totalAmount.toLocaleString()} BDT across ${donations.length} donation${donations.length > 1 ? 's' : ''}, and we are truly grateful. May Allah accept it from you and make it a continuous source of reward, long after the day you gave it.

[Add anything specific you'd like to say here before sending]

${SIGN_OFF}`;

  return { subject: APPRECIATION_SUBJECT, body };
};

export const sendDonorEmail = async (
  email: string,
  subject: string,
  body: string
): Promise<void> => {
  if (!subject?.trim() || !body?.trim()) throw httpError(400, 'Subject and body are required');
  await sendMail({
    to: email.trim(),
    subject,
    text: body,
    html: toSimpleHtml(body),
    from: 'sadaqah',
  });
};
