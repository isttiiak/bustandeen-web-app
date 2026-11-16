// Every backend test file starts its database with `MongoMemoryServer.create()`.
// Transactions (audit 2026-11-16 P0-5) need a replica set, so jest.config.js
// maps the package name `mongodb-memory-server` to this file, and `create()`
// returns a single-node MongoMemoryReplSet with the same `getUri()` / `stop()`
// surface. No test file has to change. The real package stays reachable as
// `mongodb-memory-server-core` for a test that wants a plain server.
import core from 'mongodb-memory-server-core';

const { MongoMemoryReplSet } = core;

export const MongoMemoryServer = {
  async create() {
    return MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  },
};
export { MongoMemoryReplSet };
