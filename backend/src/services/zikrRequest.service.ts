import ZikrRequest, { IZikrRequest, ZikrRequestStatus } from '../models/ZikrRequest.js';
import GlobalZikrLibraryItem, { IGlobalZikrLibraryItem } from '../models/GlobalZikrLibraryItem.js';
import { sendMail, EmailSender } from './email.service.js';
import {
  zikrRequestNotifyAdminEmail,
  zikrRequestApprovedDraft,
  zikrRequestRejectedDraft,
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

export interface SubmitZikrRequestInput {
  name: string;
  arabic?: string;
  meaning: string;
  source?: string;
  sourceUrl?: string;
}

export const submitRequest = async (
  userId: string,
  userEmail: string | undefined,
  input: SubmitZikrRequestInput
): Promise<IZikrRequest> => {
  const request = await ZikrRequest.create({
    userId,
    userEmail,
    name: input.name.trim(),
    arabic: input.arabic?.trim() || undefined,
    meaning: input.meaning.trim(),
    source: input.source?.trim() || undefined,
    sourceUrl: input.sourceUrl?.trim() || undefined,
  });

  await sendMail({
    to: REVIEW_INBOX,
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

  return request;
};

/** Bounded — an admin review queue realistically never approaches this. */
export const listRequests = async (status?: ZikrRequestStatus): Promise<IZikrRequest[]> =>
  ZikrRequest.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(300);

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
): Promise<{ subject: string; body: string }> => {
  const request = await ZikrRequest.findById(id);
  if (!request) throw httpError(404, 'Request not found');

  const body =
    type === 'approved'
      ? zikrRequestApprovedDraft({ name: request.name })
      : zikrRequestRejectedDraft({ name: request.name });
  const subject = type === 'approved' ? APPROVED_SUBJECT : REJECTED_SUBJECT;

  return { subject, body };
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
  emailBody: string;
}

export const approveRequest = async (
  id: string,
  adminEmail: string,
  input: ApproveZikrRequestInput,
  sender: EmailSender = 'sadaqah'
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
    requestId: request._id,
    addedBy: adminEmail,
  });

  request.status = 'approved';
  request.reviewedAt = new Date();
  request.reviewedBy = adminEmail;
  await request.save();

  if (request.userEmail) {
    await sendMail({
      to: request.userEmail,
      subject: APPROVED_SUBJECT,
      text: input.emailBody,
      html: toSimpleHtml(input.emailBody),
      from: sender,
    });
  }

  void libraryItem; // returned via the request doc; kept for clarity at call sites
  return request;
};

export const rejectRequest = async (
  id: string,
  adminEmail: string,
  adminNote: string | undefined,
  emailBody: string | undefined,
  sender: EmailSender = 'sadaqah'
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
