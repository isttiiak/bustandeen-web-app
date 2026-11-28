import type { ScannableModel } from '../../utils/modelShapes.js';
import CycleDay from '../../models/CycleDay.js';
import CycleProfile from '../../models/CycleProfile.js';
import AdminAccount from '../../models/AdminAccount.js';
import {
  decryptJson,
  encryptJson,
  fieldContexts,
  keyIdOf,
  FieldDecryptError,
} from '../../utils/fieldCrypto.js';

/**
 * Re-seals every encrypted field under the CURRENT key in the v2 format (audit
 * 2026-11-16 P2-3): the step that lets a retired FIELD_ENCRYPTION_KEY_PREVIOUS
 * be dropped, and that upgrades pre-v2 values. Dry run unless `apply` is true.
 *
 * Safe by construction:
 *   - a value that cannot be opened is counted and left exactly as it is;
 *   - each write is conditional on the stored value still being the one read,
 *     so a save made while this runs wins and is counted as "changed meanwhile";
 *   - nothing is written for values already v2 under the current key.
 * Plaintext is never printed or returned; only counts are.
 */

export interface RewrapCounts {
  field: string;
  scanned: number;
  alreadyCurrent: number;
  rewrapped: number; // would be, in a dry run
  unreadable: number;
  changedMeanwhile: number;
}

interface FieldSpec {
  name: string;
  model: ScannableModel; // one loop over several unrelated models
  path: string;
  /** What the value is bound to; receives the raw document. */
  context: (doc: Record<string, unknown>) => string;
}

const str = (v: unknown): string => String(v);

const SPECS: FieldSpec[] = [
  {
    name: 'CycleDay.enc',
    model: CycleDay,
    path: 'enc',
    context: (d) => fieldContexts.cycleDay(str(d.userId), str(d.date)),
  },
  {
    name: 'CycleProfile.bodyStatsEncrypted',
    model: CycleProfile,
    path: 'bodyStatsEncrypted',
    context: (d) => fieldContexts.bodyStats(str(d.userId)),
  },
  {
    name: 'AdminAccount.totpSecretEnc',
    model: AdminAccount,
    path: 'totpSecretEnc',
    context: (d) => fieldContexts.adminTotp(str(d._id)),
  },
  {
    name: 'AdminAccount.totpPendingSecretEnc',
    model: AdminAccount,
    path: 'totpPendingSecretEnc',
    context: (d) => fieldContexts.adminTotpPending(str(d._id)),
  },
];

export async function rewrapAll(opts: { apply: boolean }): Promise<RewrapCounts[]> {
  const currentId = keyIdOf(process.env.FIELD_ENCRYPTION_KEY ?? '');
  const out: RewrapCounts[] = [];

  for (const spec of SPECS) {
    const counts: RewrapCounts = {
      field: spec.name,
      scanned: 0,
      alreadyCurrent: 0,
      rewrapped: 0,
      unreadable: 0,
      changedMeanwhile: 0,
    };
    const cursor = spec.model
      .find({ [spec.path]: { $type: 'string', $ne: '' } })
      .lean()
      .cursor();
    for await (const doc of cursor as AsyncIterable<Record<string, unknown>>) {
      counts.scanned++;
      const stored = doc[spec.path] as string;
      if (stored.startsWith(`v2.${currentId}.`)) {
        counts.alreadyCurrent++;
        continue;
      }
      let value: unknown;
      try {
        const context = spec.context(doc);
        value = decryptJson<unknown>(stored, context);
        if (!opts.apply) {
          counts.rewrapped++;
          continue;
        }
        const res = await spec.model.updateOne(
          { _id: doc._id, [spec.path]: stored },
          { $set: { [spec.path]: encryptJson(value, context) } }
        );
        if (res.modifiedCount === 1) counts.rewrapped++;
        else counts.changedMeanwhile++;
      } catch (e) {
        if (!(e instanceof FieldDecryptError)) throw e;
        counts.unreadable++;
      }
    }
    out.push(counts);
  }
  return out;
}
