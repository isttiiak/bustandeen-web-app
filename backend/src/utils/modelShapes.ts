/**
 * What the generic data helpers need from a Mongoose model, written
 * structurally so every domain model (each with its own document type)
 * satisfies it without `any` (audit 2026-11-16 P4-5). Query objects are
 * thenable, so the methods return `PromiseLike`.
 */
type PlainDoc = Record<string, unknown>;

/** Backup and restore helpers (services/backup*.service.ts). */
export interface RestorableModel {
  new (doc: PlainDoc): {
    validate(): PromiseLike<unknown>;
    toObject(options?: object): unknown;
  };
  bulkWrite(ops: never, options?: object): PromiseLike<unknown>;
  replaceOne(filter: PlainDoc, doc: PlainDoc, options?: object): PromiseLike<unknown>;
  updateOne(filter: PlainDoc, update: PlainDoc, options?: object): PromiseLike<unknown>;
  deleteMany(filter: PlainDoc): PromiseLike<unknown>;
  insertMany(docs: PlainDoc[], options?: object): PromiseLike<unknown>;
}

/** The key re-wrap script (scripts/lib/rewrapFields.ts): scan one field, update one row. */
export interface ScannableModel {
  find(filter: PlainDoc): { lean(): { cursor(): unknown } };
  updateOne(filter: PlainDoc, update: PlainDoc): PromiseLike<{ modifiedCount: number }>;
}
