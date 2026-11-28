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
  const previous = await ReferenceCheck.findOne({ refId: input.refId });
  const note = input.note?.trim();
  const saved = await ReferenceCheck.findOneAndUpdate(
    { refId: input.refId },
    {
      $set: {
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
  const removed = await ReferenceCheck.findOneAndDelete({ refId });
  return removed ? toPublic(removed) : null;
}
