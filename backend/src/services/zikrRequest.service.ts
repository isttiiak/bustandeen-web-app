import mongoose from 'mongoose';
import ZikrRequest, { IZikrRequest, ZikrRequestStatus } from '../models/ZikrRequest.js';
import GlobalZikrLibraryItem, {
  GlobalZikrCategory,
  IGlobalZikrLibraryItem,
} from '../models/GlobalZikrLibraryItem.js';
import { sendMail, EmailSender } from './email.service.js';
import { findPossibleDuplicate } from '../utils/zikrDuplicateMatch.js';
import {
  zikrRequestNotifyAdminEmail,
  zikrRequestReceivedEmail,
  zikrRequestApprovedDraft,
  zikrRequestRejectedDraft,
  zikrRequestDuplicateRejectedDraft,
  zikrLibraryLinkLine,
  APPROVED_SUBJECT,
  REJECTED_SUBJECT,
  toSimpleHtml,
} from './zikrRequestEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

/** Overridable so a future admin-team change doesn't need a code deploy. */
const REVIEW_INBOX = process.env.ZIKR_REQUEST_REVIEW_EMAIL ?? 'ansar@bustandeen.com';

const zikrUserMessageId = (id: string): string => `<zikr-request-${id}@bustandeen.com>`;

export interface SubmitZikrRequestInput {
  name: string;
  arabic?: string;
  meaning?: string;
  source?: string;
  sourceUrl?: string;
  wantsAudio?: boolean;
}

export const submitRequest = async (
  userId: string,
  userEmail: string | undefined,
  input: SubmitZikrRequestInput
): Promise<IZikrRequest> => {
  const name = input.name.trim();

  // Non-blocking duplicate hint — checked against published library items and
  // other pending requests. Spelling/transliteration legitimately varies, so
  // this only flags a possible match for the admin to judge, never refuses
  // the submission.
  const [libraryItems, pendingRequests] = await Promise.all([
    GlobalZikrLibraryItem.find({}, { name: 1 }).lean(),
    ZikrRequest.find({ status: 'pending' }, { name: 1 }).lean(),
  ]);
  const duplicate = findPossibleDuplicate(
    name,
    libraryItems.map((i) => ({ id: i._id.toString(), name: i.name })),
    pendingRequests.map((r) => ({ id: r._id.toString(), name: r.name }))
  );

  // Pre-generated so the user-facing confirmation email's Message-ID is known
  // before it sends — approve/reject can thread against it regardless of
  // whether this first send succeeds (mirrors Donation.emailMessageId).
  const _id = new mongoose.Types.ObjectId();
  const emailMessageId = userEmail ? zikrUserMessageId(_id.toString()) : null;

  const request = await ZikrRequest.create({
    _id,
    userId,
    userEmail,
    name,
    arabic: input.arabic?.trim() || undefined,
    meaning: input.meaning?.trim() || undefined,
    source: input.source?.trim() || undefined,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    wantsAudio: input.wantsAudio ?? false,
    emailMessageId,
    possibleDuplicateOf: duplicate?.id ?? null,
    possibleDuplicateOfModel: duplicate?.model ?? null,
  });

  // Admin-notify — unchanged destination, distinct Message-ID from the
  // user-facing thread below (they're two different actual emails/recipients,
  // so they can't share one Message-ID).
  await sendMail({
    to: REVIEW_INBOX,
    from: 'ansar',
    ...zikrRequestNotifyAdminEmail(
      {
        name: request.name,
        arabic: request.arabic,
        meaning: request.meaning,
        source: request.source,
        sourceUrl: request.sourceUrl,
        userEmail,
      },
      request.id as string
    ),
  });

  // Confirmation to the requester — this is what later approve/reject emails
  // thread against; without it, "threading" would have nothing to thread to.
  if (userEmail) {
    await sendMail({
      to: userEmail,
      from: 'ansar',
      messageId: emailMessageId ?? undefined,
      ...zikrRequestReceivedEmail({ name: request.name }),
    });
  }

  return request;
};

/** Bounded — an admin review queue realistically never approaches this.
 * Populates the duplicate hint (if any) so the admin card can show the
 * matched name/link without a second round-trip. */
export const listRequests = async (status?: ZikrRequestStatus): Promise<IZikrRequest[]> =>
  ZikrRequest.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(300)
    .populate('possibleDuplicateOf');

export const listMine = async (userId: string): Promise<IZikrRequest[]> =>
  ZikrRequest.find({ userId }).sort({ createdAt: -1 }).limit(100);

const findPendingOrThrow = async (id: string): Promise<InstanceType<typeof ZikrRequest>> => {
  const request = await ZikrRequest.findById(id);
  if (!request) throw httpError(404, 'Request not found');
  if (request.status !== 'pending') {
    throw httpError(409, `Request is already ${request.status}`);
  }
  return request;
};

export const getEmailDraft = async (
  id: string,
  type: 'approved' | 'rejected'
): Promise<{ subject: string; body: string; isDuplicate: boolean }> => {
  const request = await ZikrRequest.findById(id);
  if (!request) throw httpError(404, 'Request not found');

  const isDuplicate =
    type === 'rejected' && request.possibleDuplicateOfModel === 'GlobalZikrLibraryItem';
  const body =
    type === 'approved'
      ? zikrRequestApprovedDraft({ name: request.name })
      : isDuplicate
        ? zikrRequestDuplicateRejectedDraft({
            name: request.name,
            existingLibraryItemId: request.possibleDuplicateOf?.toString(),
          })
        : zikrRequestRejectedDraft({ name: request.name });
  const subject = type === 'approved' ? APPROVED_SUBJECT : REJECTED_SUBJECT;

  return { subject, body, isDuplicate };
};

export interface ApproveZikrRequestInput {
  name: string;
  arabic: string;
  meaning: string;
  source: string;
  sourceUrl: string;
  transliteration?: string;
  grade?: string;
  virtue?: string;
  category?: GlobalZikrCategory;
  emailBody: string;
}

export const approveRequest = async (
  id: string,
  adminEmail: string,
  input: ApproveZikrRequestInput,
  sender: EmailSender = 'ansar'
): Promise<IZikrRequest> => {
  const request = await findPendingOrThrow(id);

  const libraryItem = await GlobalZikrLibraryItem.create({
    name: input.name.trim(),
    arabic: input.arabic.trim(),
    transliteration: input.transliteration?.trim() || undefined,
    meaning: input.meaning.trim(),
    source: input.source.trim(),
    sourceUrl: input.sourceUrl.trim(),
    grade: input.grade?.trim() || undefined,
    virtue: input.virtue?.trim() || undefined,
    category: input.category ?? 'uncategorized',
    requestId: request._id,
    addedBy: adminEmail,
  });

  request.status = 'approved';
  request.reviewedAt = new Date();
  request.reviewedBy = adminEmail;
  await request.save();

  if (request.userEmail) {
    // The library link isn't known until the item above was just created, so
    // it's appended after the admin's (possibly edited) draft text rather
    // than being part of the editable draft itself.
    const finalText = input.emailBody + zikrLibraryLinkLine(libraryItem.id as string);
    await sendMail({
      to: request.userEmail,
      subject: APPROVED_SUBJECT,
      text: finalText,
      html: toSimpleHtml(finalText),
      from: sender,
      inReplyTo: request.emailMessageId ?? undefined,
      references: request.emailMessageId ?? undefined,
    });
  }

  return request;
};

export const rejectRequest = async (
  id: string,
  adminEmail: string,
  adminNote: string | undefined,
  emailBody: string | undefined,
  sender: EmailSender = 'ansar'
): Promise<IZikrRequest> => {
  const request = await findPendingOrThrow(id);

  request.status = 'rejected';
  request.reviewedAt = new Date();
  request.reviewedBy = adminEmail;
  request.adminNote = adminNote?.trim() || undefined;
  await request.save();

  if (request.userEmail && emailBody?.trim()) {
    await sendMail({
      to: request.userEmail,
      subject: REJECTED_SUBJECT,
      text: emailBody,
      html: toSimpleHtml(emailBody),
      from: sender,
      inReplyTo: request.emailMessageId ?? undefined,
      references: request.emailMessageId ?? undefined,
    });
  }

  return request;
};

/** Ownership-checked — a user may only acknowledge their own request. */
export const acknowledge = async (userId: string, id: string): Promise<void> => {
  const result = await ZikrRequest.updateOne(
    { _id: id, userId },
    { $set: { userAcknowledged: true } }
  );
  if (result.matchedCount === 0) throw httpError(404, 'Request not found');
};

export const listGlobalLibrary = async (): Promise<IGlobalZikrLibraryItem[]> =>
  GlobalZikrLibraryItem.find().sort({ createdAt: -1 }).limit(500);

/** Servant-only, minimal edit: re-categorize an already-published library
 * item (e.g. fix a typo'd category, or move an old uncategorized item into
 * one of the curated buckets). Not full CRUD — see TODO-v3.md for the
 * deferred "Global Zikr library management" item covering the rest. */
export const updateLibraryItemCategory = async (
  id: string,
  category: GlobalZikrCategory
): Promise<IGlobalZikrLibraryItem> => {
  const item = await GlobalZikrLibraryItem.findById(id);
  if (!item) throw httpError(404, 'Library item not found');
  item.category = category;
  await item.save();
  return item;
};
