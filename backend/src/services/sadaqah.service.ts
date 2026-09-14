import mongoose from 'mongoose';
import Donation, { IDonation } from '../models/Donation.js';
import DonationStats, { IDonationStats, IQuarterlyEntry } from '../models/DonationStats.js';
import SadaqahExpense, { ISadaqahExpense } from '../models/SadaqahExpense.js';
import { sendMail, EmailSender } from './email.service.js';
import {
  donationReceivedEmail,
  donationVerifiedDraft,
  donationRejectedDraft,
  toSimpleHtml,
  REPLY_SUBJECT,
} from './sadaqahEmail.templates.js';

const STATS_ID = 'current';

/** Deterministic, not nodemailer-generated — known before the first email is
 *  even sent, so verify/reject can always thread against it even if the
 *  "received" send itself failed or is still in flight. */
const donationMessageId = (id: string): string => `<sadaqah-${id}@bustandeen.com>`;

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

/**
 * Atomic upsert — avoids the classic "find, if null then create" race where
 * two concurrent requests both see no doc and both try to insert (the second
 * insert then fails on the _id: 'current' collision). findOneAndUpdate with
 * upsert is a single atomic operation at the Mongo level.
 */
const getOrCreateStats = async () => {
  const stats = await DonationStats.findOneAndUpdate(
    { _id: STATS_ID },
    { $setOnInsert: { _id: STATS_ID } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return stats!;
};

export interface SubmitDonationInput {
  donorName?: string;
  onBehalfOf?: string;
  email: string;
  phone: string;
  paymentMethod: 'bkash' | 'nagad';
  transactionId: string;
  amount: number;
  transactionDate: Date;
  message?: string;
  showNamePublicly?: boolean;
  isAnonymous?: boolean;
}

export const submitDonation = async (
  input: SubmitDonationInput,
  ipAddress: string,
  userId: string | null
): Promise<IDonation> => {
  const isAnonymous = input.isAnonymous ?? false;
  // Anonymous donors are never named, even privately, and a name that isn't
  // stored obviously can't also be shown publicly.
  const donorName = isAnonymous ? null : (input.donorName ?? '').trim();
  const showNamePublicly = isAnonymous ? false : (input.showNamePublicly ?? false);

  // Pre-generated so the thread's Message-ID is known before the first email
  // even sends — verify/reject can reference it regardless of whether this
  // first send succeeds.
  const _id = new mongoose.Types.ObjectId();
  const donation = await Donation.create({
    _id,
    donorName,
    onBehalfOf: input.onBehalfOf?.trim() || null,
    email: input.email.trim(),
    phone: input.phone.trim(),
    paymentMethod: input.paymentMethod,
    transactionId: input.transactionId.trim(),
    amount: input.amount,
    transactionDate: input.transactionDate,
    message: input.message?.trim() || null,
    showNamePublicly,
    isAnonymous,
    userId,
    ipAddress,
    emailMessageId: donationMessageId(_id.toString()),
  });

  await sendMail({
    to: donation.email,
    messageId: donation.emailMessageId ?? undefined,
    ...donationReceivedEmail({
      donorName: donation.donorName,
      amount: donation.amount,
      transactionId: donation.transactionId,
    }),
  });

  return donation;
};

export const getPublicStats = async (): Promise<{
  totalVerifiedAmount: number;
  totalVerifiedCount: number;
  totalContributors: number;
  lastUpdated: Date;
  quarterlyBreakdown: IQuarterlyEntry[];
}> => {
  const [stats, contributorEmails] = await Promise.all([
    getOrCreateStats(),
    // Distinct people, not distinct donations — someone giving twice still
    // counts once. Donation counts are small enough that a live distinct()
    // is simpler than maintaining another incremental counter.
    Donation.distinct('email', { status: 'verified' }),
  ]);
  return {
    totalVerifiedAmount: stats.totalVerifiedAmount,
    totalVerifiedCount: stats.totalVerifiedCount,
    totalContributors: contributorEmails.length,
    lastUpdated: stats.lastUpdated,
    quarterlyBreakdown: stats.quarterlyBreakdown,
  };
};

/** Bounded — manual verification within 24-48h keeps this queue small in
 *  practice, but a bound protects response size against a pathological backlog. */
export const listPending = async (): Promise<IDonation[]> =>
  Donation.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(200);

export const listAll = async (
  status: 'pending' | 'verified' | 'rejected' | undefined,
  page: number,
  limit: number
): Promise<{ donations: IDonation[]; total: number; page: number; limit: number }> => {
  const filter = status ? { status } : {};
  const [donations, total] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Donation.countDocuments(filter),
  ]);
  return { donations, total, page, limit };
};

const findPendingOrThrow = async (id: string): Promise<InstanceType<typeof Donation>> => {
  const donation = await Donation.findById(id);
  if (!donation) throw httpError(404, 'Donation not found');
  if (donation.status !== 'pending') {
    throw httpError(409, `Donation is already ${donation.status}`);
  }
  return donation;
};

/**
 * Prefilled, editable draft text for the admin dashboard's Verify/Reject
 * textarea — the admin always sees and can edit this before anything sends,
 * so the actual email is whatever they end up submitting, not this template
 * directly. Kept here (not duplicated on the frontend) as the single source
 * of the wording.
 */
export const getEmailDraft = async (
  id: string,
  type: 'verified' | 'rejected'
): Promise<{ subject: string; body: string }> => {
  const donation = await Donation.findById(id);
  if (!donation) throw httpError(404, 'Donation not found');

  const body =
    type === 'verified'
      ? donationVerifiedDraft({
          donorName: donation.donorName,
          amount: donation.amount,
          transactionId: donation.transactionId,
          paymentMethod: donation.paymentMethod,
          transactionDate: donation.transactionDate,
        })
      : donationRejectedDraft({
          donorName: donation.donorName,
          amount: donation.amount,
          transactionId: donation.transactionId,
        });

  return { subject: REPLY_SUBJECT, body };
};

export const verifyDonation = async (
  id: string,
  adminEmail: string,
  emailBody: string,
  sender: EmailSender = 'sadaqah'
): Promise<IDonation> => {
  const donation = await findPendingOrThrow(id);

  donation.status = 'verified';
  donation.verifiedAt = new Date();
  donation.verifiedBy = adminEmail;
  await donation.save();

  await getOrCreateStats();
  await DonationStats.updateOne(
    { _id: STATS_ID },
    {
      $inc: { totalVerifiedAmount: donation.amount, totalVerifiedCount: 1 },
      $set: { lastUpdated: new Date() },
    }
  );

  await sendMail({
    to: donation.email,
    subject: REPLY_SUBJECT,
    text: emailBody,
    html: toSimpleHtml(emailBody),
    from: sender,
    inReplyTo: donation.emailMessageId ?? undefined,
    references: donation.emailMessageId ?? undefined,
  });

  return donation;
};

export const rejectDonation = async (
  id: string,
  adminEmail: string,
  emailBody: string,
  sender: EmailSender = 'sadaqah'
): Promise<IDonation> => {
  const donation = await findPendingOrThrow(id);

  donation.status = 'rejected';
  donation.verifiedAt = new Date();
  donation.verifiedBy = adminEmail;
  // The record of "why" IS what was actually told the donor — same text.
  donation.rejectionReason = emailBody;
  await donation.save();

  await sendMail({
    to: donation.email,
    subject: REPLY_SUBJECT,
    text: emailBody,
    html: toSimpleHtml(emailBody),
    from: sender,
    inReplyTo: donation.emailMessageId ?? undefined,
    references: donation.emailMessageId ?? undefined,
  });

  return donation;
};

/**
 * Permanently removes a donation record (any status) — for erroneous/test
 * entries, not a donor-facing action. Reverses its effect on the cached
 * stats first if it had been verified, so deleting a mistaken "verified"
 * entry doesn't leave the public lifetime total or contributor count
 * overcounting a donation that no longer exists.
 */
export const deleteDonation = async (id: string): Promise<void> => {
  const donation = await Donation.findById(id);
  if (!donation) throw httpError(404, 'Donation not found');

  if (donation.status === 'verified') {
    await getOrCreateStats();
    await DonationStats.updateOne(
      { _id: STATS_ID },
      {
        $inc: { totalVerifiedAmount: -donation.amount, totalVerifiedCount: -1 },
        $set: { lastUpdated: new Date() },
      }
    );
  }

  await donation.deleteOne();
};

export const upsertQuarterly = async (
  quarter: string,
  patch: { received?: number; spent?: number; notes?: string }
): Promise<IDonationStats> => {
  const stats = await getOrCreateStats();
  const existing = stats.quarterlyBreakdown.find((q) => q.quarter === quarter);
  if (existing) {
    if (patch.received !== undefined) existing.received = patch.received;
    if (patch.spent !== undefined) existing.spent = patch.spent;
    if (patch.notes !== undefined) existing.notes = patch.notes;
  } else {
    stats.quarterlyBreakdown.push({
      quarter,
      received: patch.received ?? 0,
      spent: patch.spent ?? 0,
      notes: patch.notes ?? '',
    });
  }
  await stats.save();
  return stats;
};

export const deleteQuarterly = async (quarter: string): Promise<IDonationStats> => {
  const stats = await getOrCreateStats();
  stats.quarterlyBreakdown = stats.quarterlyBreakdown.filter(
    (q) => q.quarter !== quarter
  ) as typeof stats.quarterlyBreakdown;
  await stats.save();
  return stats;
};

/**
 * Internal cost ledger — admin-only, never surfaced publicly. Separate from
 * quarterlyBreakdown.spent (one manually-entered aggregate per quarter for
 * the public page); this is the itemized record behind that figure.
 */
export const listExpenses = async (): Promise<ISadaqahExpense[]> =>
  SadaqahExpense.find().sort({ date: -1 }).limit(500);

export const addExpense = async (
  date: Date,
  amount: number,
  description: string,
  createdBy: string
): Promise<ISadaqahExpense> => SadaqahExpense.create({ date, amount, description, createdBy });

export const deleteExpense = async (id: string): Promise<void> => {
  const expense = await SadaqahExpense.findById(id);
  if (!expense) throw httpError(404, 'Expense not found');
  await expense.deleteOne();
};
