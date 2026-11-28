import ReferenceCheck, {
  type IReferenceCheck,
  type ReferenceCheckStatus,
} from '../models/ReferenceCheck.js';

/** A mark as the public page and the native app receive it. */
export interface PublicReferenceCheck {
  status: ReferenceCheckStatus;
  by: string;
  date: string;
  note?: string;
}

export interface ReferenceCheckInput extends PublicReferenceCheck {
  refId: string;
}

/** Registry ids, as the route validates them (validation/referenceCheck.schemas.ts). */
const REF_ID_RE = /^[a-z][a-z0-9-]*:[a-z0-9:.-]+$/;

class ReferenceCheckError extends Error {
  statusCode = 400;
}

/**
 * The query filter for one reference. The route already validated the id;
 * this checks again here so the service is safe on its own, and `$eq` makes
 * MongoDB read the value as a plain string, never as an operator (CodeQL
 * js/sql-injection, PR 429).
 */
function byRefId(refId: unknown): { refId: { $eq: string } } {
  if (typeof refId !== 'string' || refId.length > 80 || !REF_ID_RE.test(refId)) {
    throw new ReferenceCheckError('Not a reference id');
  }
  return { refId: { $eq: refId } };
}

function toPublic(c: IReferenceCheck): PublicReferenceCheck {
  return {
    status: c.status,
    by: c.by,
    date: c.date,
    ...(c.note ? { note: c.note } : {}),
  };
}

/** Every mark, keyed by reference id (a few hundred at most). */
export async function listChecks(): Promise<Record<string, PublicReferenceCheck>> {
  const rows = await ReferenceCheck.find({}).sort({ refId: 1 }).limit(2000);
  return Object.fromEntries(rows.map((r) => [r.refId, toPublic(r)]));
}

/** Add or replace the mark on one reference. Returns it, and the mark it replaced. */
export async function saveCheck(
  input: ReferenceCheckInput,
  adminEmail: string
): Promise<{ check: PublicReferenceCheck; before: PublicReferenceCheck | null }> {
  const filter = byRefId(input.refId);
  const previous = await ReferenceCheck.findOne(filter);
  const note = input.note?.trim();
  const saved = await ReferenceCheck.findOneAndUpdate(
    filter,
    {
      $set: {
        refId: input.refId,
        status: input.status,
        by: input.by.trim(),
        date: input.date,
        updatedBy: adminEmail,
        ...(note ? { note } : {}),
      },
      ...(note ? {} : { $unset: { note: 1 } }),
    },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );
  return { check: toPublic(saved), before: previous ? toPublic(previous) : null };
}

/** Remove the mark from one reference. Returns the mark that was removed. */
export async function clearCheck(refId: string): Promise<PublicReferenceCheck | null> {
  const removed = await ReferenceCheck.findOneAndDelete(byRefId(refId));
  return removed ? toPublic(removed) : null;
}
