import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';

/**
 * Multi-document transactions for writes that must land together or not at all
 * (audit 2026-11-16 P0-5). With this option on, every Mongoose query, save and
 * aggregate that runs inside `runInTransaction` joins the transaction by itself,
 * so services do not have to pass a session around.
 *
 * Needs a replica set (Atlas always is one; tests use MongoMemoryReplSet, see
 * tests/__mocks__/mongodb-memory-server.js).
 */
mongoose.set('transactionAsyncLocalStorage', true);

interface TxStore {
  afterCommit: Array<() => Promise<unknown> | unknown>;
}

const store = new AsyncLocalStorage<TxStore>();

/** True while the caller is inside `runInTransaction`. */
export function inTransaction(): boolean {
  return store.getStore() !== undefined;
}

/**
 * Runs `fn` in one transaction and returns its result. An error thrown by `fn`
 * rolls every write back and is rethrown. A write conflict with a concurrent
 * request (TransientTransactionError) runs `fn` again from the start, so `fn`
 * must not do anything outside the database that cannot be repeated; use
 * `afterCommit` for those. Calling it inside a transaction joins that one.
 */
export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (store.getStore()) return fn();

  let hooks: TxStore['afterCommit'] = [];
  const result = await mongoose.connection.transaction(async () => {
    const tx: TxStore = { afterCommit: [] };
    hooks = tx.afterCommit; // each retry starts with an empty list
    return store.run(tx, fn);
  });

  for (const hook of hooks) {
    try {
      await hook();
    } catch (err) {
      // The data is committed; a failed follow-up must not turn that into an error.
      console.error('transaction: after-commit step failed', (err as Error).message);
    }
  }
  return result as T;
}

/**
 * Best-effort work that must not be able to abort the transaction (analytics,
 * activity counters): runs after a successful commit, or at once when there is
 * no transaction. Errors are logged, never thrown.
 */
export async function afterCommit(fn: () => Promise<unknown> | unknown): Promise<void> {
  const tx = store.getStore();
  if (tx) {
    tx.afterCommit.push(fn);
    return;
  }
  try {
    await fn();
  } catch (err) {
    console.error('after-commit step failed', (err as Error).message);
  }
}
