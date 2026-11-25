import type mongoose from 'mongoose';

type Db = mongoose.mongo.Db;

/**
 * Migration runner (audit 2026-11-16 P3-2).
 *
 * A migration is a one-way change to stored data. Rules for every one:
 *   - idempotent: running it again changes nothing;
 *   - a dry run (`apply: false`) reads and counts but writes nothing;
 *   - talks to raw collections, so it works whatever schema the code has now.
 *
 * The runner records each applied migration in the `schemaversions`
 * collection and skips those next time. It stops at the first failure and
 * records nothing for the failed one (it is safe to run it again).
 */

export const VERSIONS_COLLECTION = 'schemaversions';

export interface MigrationContext {
  db: Db;
  /** false = dry run: count what would change, write nothing. */
  apply: boolean;
}

export interface Migration {
  /** Never reused or renamed once applied anywhere: `NNN-short-name`. */
  id: string;
  description: string;
  up(ctx: MigrationContext): Promise<Record<string, number>>;
}

export type MigrationStatus = 'applied' | 'would-apply' | 'already-applied';

export interface MigrationResult {
  id: string;
  status: MigrationStatus;
  counts: Record<string, number>;
}

export async function runMigrations(
  db: Db,
  migrations: readonly Migration[],
  opts: { apply: boolean }
): Promise<MigrationResult[]> {
  const ids = migrations.map((m) => m.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate migration id');

  const versions = db.collection<{ _id: string }>(VERSIONS_COLLECTION);
  const done = new Set(
    (await versions.find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id)
  );

  const results: MigrationResult[] = [];
  for (const m of migrations) {
    if (done.has(m.id)) {
      results.push({ id: m.id, status: 'already-applied', counts: {} });
      continue;
    }
    const counts = await m.up({ db, apply: opts.apply });
    if (opts.apply) {
      await versions.updateOne(
        { _id: m.id },
        { $setOnInsert: { appliedAt: new Date(), description: m.description, counts } },
        { upsert: true }
      );
    }
    results.push({ id: m.id, status: opts.apply ? 'applied' : 'would-apply', counts });
  }
  return results;
}
