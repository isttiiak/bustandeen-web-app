# Backend — Bustandeen API

Express + TypeScript + Mongoose (MongoDB Atlas) + Firebase Admin backend for Bustandeen.

See the root [`CLAUDE.md`](../CLAUDE.md) for the full architecture, conventions, and environment variable reference — this file only covers what's specific to running and testing the backend in isolation.

## Running

```bash
npm run dev          # ts-node-dev, port 5000 (see .env)
npm test             # Jest + mongodb-memory-server, no real DB needed
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
```

## Layout

```
src/
├── routes/       Routing only — registers middleware + controller handlers
├── controllers/  Request/response handling, calls services, never touches the DB directly
├── services/     Business logic + all DB queries
├── middleware/   auth, validate (Zod), rateLimiter, errorHandler
├── models/       Mongoose schemas + interfaces
├── config/       mongo.ts, firebaseAdmin.ts
├── utils/        timezone-flexible.ts is the canonical timezone util
├── validation/   Zod schemas, one file per domain
└── jobs/         dailyCron.ts
```

## Domains

Ten route modules, each following the same routes → controllers → services layering: `auth`, `zikr`, `salat`, `fasting`, `quran`, `cycle` (Rayhanah), `social` (friends/Noor), `analytics`, `ai` (Naseeh, Groq-backed), `user`.

## Tests

`tests/*.e2e.test.js` — one file per domain, each spinning up its own `mongodb-memory-server` instance (no shared state between files, no real database needed to run the suite). Run the whole suite with `npm test`, or a single file with e.g. `npx jest tests/social.e2e.test.js`.

### mongod binary cache

`mongodb-memory-server` keeps one `mongod` binary in `~/.cache/mongodb-binaries` (on Windows `C:\Users\<you>\.cache\mongodb-binaries`). Every checkout and worktree on the machine uses that same folder, unless the checkout has its own copy in `backend/node_modules/.cache/mongodb-memory-server`. It holds `mongod-x64-win32-<version>.exe` (or the Linux/macOS name) plus a `.md5` file. A `.zip`/`.tgz` sits there only while a download is in progress.

If tests fail with `MD5 check failed! Binary MD5 is …, Checkfile MD5 is …`, the archive left in that folder is broken. The library reuses any archive it finds there without downloading it again, so every run fails until the archive is removed. To recover:

1. Make sure no test run is using the folder. Other worktrees may be running tests.
2. Rename the archive, plus any `.md5` or `.downloading` file next to it, e.g. to `*.bad`.
3. Run `npm test` again. It downloads a fresh archive, checks it, extracts `mongod` and deletes the archive.

As a stopgap, point `MONGOMS_SYSTEM_BINARY` at any known-good `mongod` of the same version.

## Deployment

Deploys to Vercel as a serverless function alongside the frontend (same deployment, same origin — see `CLAUDE.md`). `MONGODB_URI` in production points at the live Atlas cluster; there is currently no separate staging database, so exercise care when testing against a deployed environment with a real account.
