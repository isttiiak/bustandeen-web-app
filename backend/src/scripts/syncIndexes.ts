import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

/**
 * Brings the database's indexes in line with the Mongoose schemas.
 *
 * Production runs with `autoIndex: false` (config/mongo.ts), so a new or
 * changed index in a model reaches Atlas only through this script.
 *
 *   npm run sync-indexes                 dry run: prints what WOULD change
 *   npm run sync-indexes -- --apply      creates missing indexes, drops stale ones
 *
 * Always read the dry run first. Dropping is limited to indexes that no schema
 * declares; `_id_` is never touched. Note that creating a TTL index makes
 * MongoDB delete documents older than the TTL within about a minute.
 * Idempotent: a second --apply run reports nothing to do.
 * Requires MONGODB_URI (backend/.env).
 */

const APPLY = process.argv.includes('--apply');

async function loadModels(): Promise<void> {
  const modelsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'models');
  const files = readdirSync(modelsDir).filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'));
  for (const f of files) {
    await import(pathToFileURL(join(modelsDir, f)).href);
  }
}

/** "{"createdAt":1} {"expireAfterSeconds":2592000}" for an index to create.
 * diffIndexes() returns only the key, so the options (TTL, unique…) are
 * looked up in the schema's own index list. */
interface SchemaWithIndexes {
  indexes(): Array<[Record<string, unknown>, Record<string, unknown>]>;
}

function describeCreate(schema: SchemaWithIndexes, key: Record<string, unknown>): string {
  const keyJson = JSON.stringify(key);
  const match = schema.indexes().find(([k]) => JSON.stringify(k) === keyJson);
  const options = match?.[1] ?? {};
  return Object.keys(options).length ? `${keyJson} ${JSON.stringify(options)}` : keyJson;
}

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await loadModels();
  await mongoose.connect(uri, { dbName: 'ihsan', autoIndex: false });
  process.stdout.write(
    APPLY ? 'Applying index changes\n\n' : 'Dry run (pass --apply to change anything)\n\n'
  );

  let changes = 0;
  for (const modelName of mongoose.modelNames().sort()) {
    const model = mongoose.model(modelName);
    const { toDrop, toCreate } = await model.diffIndexes();
    if (toDrop.length === 0 && toCreate.length === 0) continue;
    changes += toDrop.length + toCreate.length;

    process.stdout.write(`${modelName} (${model.collection.collectionName})\n`);
    for (const key of toCreate) {
      process.stdout.write(
        `  + create ${describeCreate(model.schema, key as Record<string, unknown>)}\n`
      );
    }
    for (const name of toDrop) process.stdout.write(`  - drop   ${String(name)}\n`);

    if (APPLY) {
      await model.syncIndexes();
      process.stdout.write('  done\n');
    }
  }

  process.stdout.write(
    changes === 0
      ? 'All indexes are in sync.\n'
      : `\n${changes} change(s)${APPLY ? ' applied' : ' pending'}.\n`
  );
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
