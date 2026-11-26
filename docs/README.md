# Bustandeen Architecture

Last verified against the code: 2026-11-26 (v5.190.47). Each section names the file it describes, so a
reader can check a claim at the source. For the product overview and licence, see the root `README.md`.

---

## 1. Request flow

```
Browser ──► Vercel edge (bustandeen.com → 308 → www.bustandeen.com)
             │
             ├─ /api/*           ─► rewrite ─► api/index.ts (one serverless function, region sin1, Fluid)
             │                                   ├─ initFirebaseAdmin()           (once per instance)
             │                                   ├─ connectDB()                   (cached promise, config/mongo.ts)
             │                                   ├─ bootstrapAdminAccounts() / backfillAnsarDomains()
             │                                   └─ backend/src/app.ts (Express 5)
             │
             ├─ /connect/:code   ─► crawler UA ─► api/index.ts (OG preview HTML), humans ─► SPA
             │
             ├─ prerendered file ─► frontend/dist/<route>/index.html  (landing `/`, /bn, SEO pages, served as static)
             │
             ├─ SEO URL with no prerendered file ─► api/index.ts ─► 301 to the live page (seoRedirect.routes.ts)
             │
             ├─ /admin*          ─► frontend/dist/admin.html  (own page, admin.bustandeen.com)
             │
             ├─ bayan host       ─► frontend/dist/bayan/*     (Help & What's new)
             │
             ├─ /__/auth, /__/firebase ─► proxied to the Firebase auth domain
             │
             └─ anything else (not /api/, /__/, /assets/) ─► frontend/dist/app-shell.html
                                    (the empty SPA shell, client-side routing; a missing chunk 404s)
```

`index.html` is the prerendered landing page, not the app shell: never point the catch-all back at it.

Local dev runs the same Express app via `backend/src/index.ts` (listens on 5000, then connects to
Mongo), and Vite on 5173. Two Vercel crons call `/api/cron/rebuild` (monthly) and `/api/cron/email-check`
(daily) with the `CRON_SECRET` bearer.

### Inside the Express app (`backend/src/app.ts`)

Order matters:

1. `trust proxy = 1` (Vercel sits in front, so the client IP comes from `X-Forwarded-For`)
2. `helmet` (CSP `default-src 'none'` etc. - applies to **API responses only**, not the static site)
3. CORS allowlist (`FRONTEND_ORIGIN`, bustandeen.com, the admin host for `/api/admin/*`, and Vercel previews of
   this project under this account: `utils/corsOrigins.ts`)
4. `/api/csp-report` and `/api/client-errors`, mounted before the general limiter
5. `generalLimiter`, then the JSON/urlencoded body parsers (1 MB) and `/api/health` (no DB; `/deep` and `/email` do check)
6. Per-domain routers, some with their own limiter (`authLimiter`, `zikrLimiter`, `aiLimiter`)
7. Error handler `middleware/errorHandler.ts` (`globalErrorHandler`)

Each domain follows **routes → controllers → services → models**. Auth is `requireAuth` (Firebase ID
token → `req.user`, rejects disabled users on every request) or `requireAdminAuth` (Firebase account +
`AdminAccount` role: Servant or Ansar, plus a TOTP second factor: an `X-Admin-MFA` proof from
`/api/admin/auth/mfa/*`, see `services/adminMfa.service.ts`, required only while the Servant's switch
`AdminSetting.mfaRequired` is on; `requireAdminIdentity` skips it only for the session and MFA routes).
Every write route is validated with Zod (`middleware/validate.ts` plus `validation/*.schemas.ts`).

API route groups: `auth, zikr, ai, user, analytics, salat, stats, fasting, adhkar, quran, hifz, social, cycle,
insights, natural-log, naseeh, sadaqah, feedback, announcements, calendar, cron, csp-report, client-errors`,
and `admin/*` (sadaqah, zikr-requests, auth, users, accounts, audit-log, feedback + mailbox, stats, ops,
announcements, moon-sighting, compose-email, update-emails).

Rate limiting (`middleware/rateLimiter.ts`): flood guards use express-rate-limit's **in-memory store**, which is
per serverless instance. Money- and abuse-sensitive limits (per-user AI, password reset, sadaqah submit, data
export and others) use the shared `MongoRateLimitStore` (`RateLimitCounter`, keys hashed). 429s are logged to
`RateLimitHit` (30-day TTL).

---

## 2. Data model (MongoDB Atlas, database `ihsan`)

`dbName` stays `'ihsan'` on purpose (the live database kept its original name; renaming it needs a dump, a
restore and downtime); it is named in one place, `config/database.ts`. `autoIndex` is **off** except in the test
suite (or a local database with `MONGO_AUTO_INDEX=1`): indexes reach Atlas only through
`npm run sync-indexes --prefix backend` (dry run, then `-- --apply --production`). Data changes go through
`npm run migrate --prefix backend` (`src/migrations`, recorded in `schemaversions`; dry run by default).

| Area        | Collections                                                                                                                                                                   | Key indexes                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Users       | `User`, `SocialProfile`, `PendingSignup`, `DailyActivity`                                                                                                                     | unique `uid` / `userId`; `PendingSignup` TTL on `expiresAt`                                                                         |
| Zikr        | `ZikrDaily`, `ZikrEvent`, `ZikrGoal`, `ZikrStreak`, `ZikrRequest`, `GlobalZikrLibraryItem`, `AdhkarDay`                                                                       | `ZikrDaily {userId,date,zikrType}` unique; `ZikrEvent` TTL 90 days on `ts`                                                          |
| Salat       | `SalatLog`, `SalatDebt`, `SalatDebtEvent`, `KazaUnit`                                                                                                                         | `SalatLog {userId,date}` unique; `KazaUnit {userId,prayer,missedDate}` unique                                                       |
| Fasting     | `FastingLog`, `FastingProfile`                                                                                                                                                | `{userId,date}` unique                                                                                                              |
| Quran       | `QuranLog`, `QuranProfile`, `QuranReadingSession`, `HifzEntry`, `HifzLog`, `HifzProfile`                                                                                      | `{userId,date}` unique; `QuranReadingSession {userId,clientSessionId}` unique; `HifzEntry {userId,surah,ayah}` unique               |
| Rayhanah    | `CycleDay`, `CycleLog`, `CycleProfile`                                                                                                                                        | `CycleDay {userId,date}` unique; one open cycle per user; sensitive fields AES-256-GCM (`utils/fieldCrypto.ts`)                     |
| AI          | `NaseehPlan`                                                                                                                                                                  | `{userId,weekStart}` unique                                                                                                         |
| Sadaqah     | `Donation`, `DonationStats`, `SadaqahExpense`                                                                                                                                 | `Donation.transactionId` unique while pending/verified; `{status,createdAt}`                                                        |
| Calendar    | `MoonSighting`                                                                                                                                                                | one active sighting per country and Hijri month                                                                                     |
| Admin / ops | `AdminAccount`, `AdminAuditLog`, `AdminSetting`, `Announcement`, `FeedbackMessage`, `MailboxMessage`, `MailboxSyncState`, `UpdateEmailCampaign`, `EmailFailureLog`, `CronRun` | `EmailFailureLog` TTL 90 days                                                                                                       |
| Plumbing    | `ClientOp`, `RateLimitCounter`, `RateLimitHit`, `ClientErrorDaily`, `CspViolationDaily`                                                                                       | TTLs: `ClientOp` 30 days, `RateLimitHit` 30 days, `ClientErrorDaily` / `CspViolationDaily` 30 days, `RateLimitCounter` on `resetAt` |

Every daily log is one document per user per day (the "day" is the client's tracking day, see §3).
Profile-style collections are one document per user.

---

## 3. Client state and sync

- **Server data** goes through React Query hooks in `frontend/src/hooks/`. The query cache is
  persisted (`@tanstack/query-async-storage-persister`, IndexedDB via `utils/idbCache.ts`) so the app
  opens with the last known data while offline.
- **Tracking day:** every date sent to the server comes from `utils/trackingDay.ts`
  (`getTrackingDay()`); the day flips at Fajr by default (`fajr` / `midnight` / `maghrib`). Fasting
  and kaza history use a plain calendar date instead.
- **Zikr:** `useZikrStore` (Zustand 5) increments optimistically and flushes to `/api/zikr` with an
  800 ms debounce; unsent counts survive reloads and are kept per tab, so two tabs never resend each other's taps.
- **Offline outboxes:** `utils/salatOutbox.ts` queues prayer/nafl PATCHes in `localStorage`
  (`bustandeen_salat_outbox`); `utils/syncOutbox.ts` (`bustandeen_sync_outbox`) does the same for fasting, Quran,
  Rayhanah, adhkar and zikr "Log counts". Both replay in order when the connection returns, retry with backoff, and
  are cleared on sign-out. Additive writes carry an `X-Client-Op-Id`, and the server route uses `idempotent()`
  (`ClientOp`) so a replay after a lost response never counts twice.
- **Quran sessions** are idempotent through a client-generated `clientSessionId`.
- **Cross-device prefs:** per-key newest-wins sync (`utils/prefsSync.ts`); new keys must be added to
  both the frontend and backend whitelists.

---

## 4. PWA and caching

- `vite-plugin-pwa` in `injectManifest` mode with a custom worker, `frontend/src/sw.ts`.
- **Precache:** the built app shell + assets (`self.__WB_MANIFEST`).
- **Navigation fallback:** any navigation not in the precache gets `app-shell.html` (never `index.html`, the
  landing page), fetched **network-first** so a stale precached shell can never lock anyone out (the 2026-10-11
  incident); the precached copy is the offline fallback. Excluded: `/api/*`, `/__/*`, `/admin*` and any path with
  a file extension (sitemaps, robots.txt, verification files).
- **Runtime caches:** `quran-uthmani` (the bundled Tanzil text, stale-while-revalidate), `quran-text`
  (CacheFirst, 30 days, `api.alquran.cloud`), `assets-runtime` (hashed JS/CSS the precache leaves out, 30 days),
  `fonts-v2` (self-hosted fonts, 1 year) and `static-pages` (prerendered pages, network-first, 7 days).
- **Never cached:** `/api/*`. Worship logs must never be served stale.
- **Updates:** `skipWaiting` + `clientsClaim` + periodic `registration.update()` (`src/pwaUpdate.ts`),
  so a new deploy takes over without a stale bundle.
- Manifest: generated from `vite.config.ts` (`orientation: portrait`; the maskable icon reuses
  `pwa-512.png`, audit PWA-01).

---

## 5. SEO prerender pipeline

`npm run build --prefix frontend` runs five steps:

1. `vite build` → client bundle, `dist/index.html` (the landing page) and `dist/app-shell.html`
2. `vite build --config vite.admin.config.ts` → the admin page (see Deployment)
3. `vite build --config vite.ssr.config.ts` → `dist-ssr/entry-server.js` (from `src/seo/entry-server.tsx`)
4. `node scripts/prerender.mjs` → for each route and language (en/bn/ar), clone `dist/index.html`,
   swap in the page's title/description/canonical/hreflang/OG tags, and replace the empty
   `<div id="root">` with the server-rendered body (including BreadcrumbList/FAQPage/WebPage JSON-LD)
5. `node scripts/check-csp.mjs` → fails the build if the static pages' CSP hash in `vercel.json` no longer
   matches the inline script in `index.html`

The landing page, `/bn` and every SEO page load `src/static-entry.ts`, not the app. The Arabic Quran text is the
bundled Tanzil Uthmani v1.1 (`public/quran/uthmani/`), used verbatim; see `NOTICE`.

Prerendered templates (`src/seo/templates/`): prayer times per city, Qibla per city, Ramadan
calendar per city/year + index, duʿā situations + index, morning/evening adhkār, Asmāʾ ul-Ḥusnā,
Hijri date converter, Zakat calculator. City data is built by `npm run data:cities`
(`all-the-cities` + `geo-tz`). Prayer times on these pages come from `src/seo/utils/calc.ts`
(`adhan`, MoonsightingCommittee, standard ʿAṣr).

The app routes themselves (`/about`, `/privacy`, `/zikr`, ...) are **not** prerendered; they serve the empty
SPA shell. Sitemaps: `sitemap-index.xml` → pages, prayer-times,
qibla, ramadan, duas, adhkar, utilities. Also `robots.txt` and `llms.txt`.

---

## 6. Third parties the browser talks to

| Origin                                                 | Why                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Firebase (`*.googleapis.com`, auth domain, Storage)    | Sign-in, profile photos                                                                    |
| `www.googletagmanager.com`, `www.google-analytics.com` | GA4 page views, only after the visitor says yes (`utils/analyticsConsent.ts`)              |
| `api.alquran.cloud`                                    | Quran text                                                                                 |
| `cdn.islamic.network`, `server1x.mp3quran.net`         | Quran audio                                                                                |
| `nominatim.openstreetmap.org`                          | Place names, only if the user picks OpenStreetMap (location rounded to ~1 km, audit T1.10) |
| `flagcdn.com`                                          | Country flags on Friends / Profile                                                         |

Fonts are self-hosted (`frontend/src/fonts.ts`, audit T2.7); no font requests leave the site.

The backend talks to MongoDB Atlas, Firebase Admin, api.quran.com (tafsir proxy), Groq (Naseeh AI, English only; cycle data is
never sent) and Zoho SMTP/IMAP. Every browser-facing origin is listed in the privacy page (`/privacy`); add one there
before adding it here.

## 7. Local development

Prerequisites: Node **24** with npm 11 (`.nvmrc`; root `devEngines` refuses other versions), a MongoDB connection
string and a Firebase project.

```bash
git clone https://github.com/isttiiak/bustandeen-web-app.git
cd bustandeen-web-app
npm run install:all
npm run dev            # backend :5000 + frontend :5173 (the CORS allowlist expects 5173)
```

- `backend/.env`: `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
  `FIELD_ENCRYPTION_KEY`, optional `GROQ_API_KEY`. macOS: port 5000 is AirPlay, use `PORT=5001`.
- `frontend/.env`: `VITE_BACKEND_URL` (local dev only; production calls `/api` same-origin) and `VITE_FIREBASE_*`.
- The `.env` files are gitignored; copy them to each machine. Claude Code worktrees copy only `frontend/.env*`
  (`.worktreeinclude`).
- **Environments (audit P3-1).** Production (`bustandeen.com`) uses the Atlas project `Bustandeen`. Every Vercel preview
  deploy uses the separate Atlas project `bustandeen-staging` (its own cluster, its own `readWrite` user, no real data).
  Set these for the **Preview scope only**: `MONGODB_URI` (staging), a different `FIELD_ENCRYPTION_KEY`,
  `DEV_AUTH_BYPASS=0`, and `PRODUCTION_MONGO_HOST` (the production host only, no credentials). Keep the mailbox/SMTP,
  `GROQ_API_KEY`, `CRON_SECRET`, `VERCEL_DEPLOY_HOOK_URL` and bootstrap-password variables Production-only.
  `config/database.ts` `assertNotProductionOnPreview` makes a preview refuse to start if its database host is the
  production host, or if `PRODUCTION_MONGO_HOST` is missing. A new staging cluster has no indexes: run
  `npm run sync-indexes --prefix backend` (dry run), then `-- --apply --production`, with its URI in `MONGODB_URI`.
- npm 11 runs install scripts only for packages under `allowScripts`. If backend tests time out "Downloading MongoDB",
  run `node node_modules/mongodb-memory-server/postinstall.js` once in `backend/`.

Quality gates (CI runs all of them on every push and PR to `main`):

```bash
npm run lint && npm run typecheck && npm run format:check
npm test --prefix backend      # Jest + mongodb-memory-server
npm test --prefix frontend     # Vitest (TZ pinned to Asia/Dhaka)
npm run i18n:check --prefix frontend   # Bangla keys complete
npm run build --prefix frontend
npm run test:e2e --prefix frontend     # Playwright against the built dist, demo mode
npm run knip                           # unused files, exports, dependencies: report only, not in CI yet
```

CI also runs CodeQL (JS/TS and Actions), gitleaks, the Firebase storage-rules emulator tests and
`npm audit --omit=dev --audit-level=high`. Actions are pinned to commit SHAs, and Node is pinned to one exact
version (`.nvmrc`, `ci.yml`, `storage-rules.yml`; a test keeps them equal).

Pre-commit (Husky + lint-staged) lints and formats staged files. Dependabot opens weekly grouped update PRs
(majors of the packages listed in `.github/dependabot.yml` are ignored on purpose; read a major's release notes,
because green CI does not catch behaviour changes).

**`main` is protected** by a repository ruleset: changes need a pull request, the five CI checks must pass, the
branch must be up to date, and force-push and deletion are blocked. Merge with merge commits; merged branches are
deleted automatically.

**Operator scripts** (`backend/src/scripts`, `npm run migrate`, `sync-indexes`) connect to whatever `MONGODB_URI`
names. A script that writes refuses any hosted database unless `--production` is on the command line, and prints the
database and host first. Local `backend/.env` should point at the staging cluster, with the production URI
commented out.

### Versioning

Not strict semver; the version tracks release size:

- **Patch** (`x.y.Z`): a fix, security patch or small tweak.
- **Minor** (`x.Y.0`): a batch of related work (a feature, or several fixes shipped together).
- **Major** (`X.0.0`): a milestone that changes the app's shape (a redesign, a native app launch).

Bump the three `package.json` files together (root, `frontend/`, `backend/`: `npm version X --no-git-tag-version
--ignore-scripts` in each), add a [`CHANGELOG.md`](../CHANGELOG.md) entry, and add an English and Bangla entry
with the full version to `frontend/src/seo/bayan/releases.ts` (a test fails without it) before pushing.

### Deployment

One Vercel project: `vercel.json` serves `frontend/dist` and `api/index.ts` as a serverless function (region `sin1`).
Install is `npm ci` in both workspaces (`installCommand`). Set the backend and `VITE_*` env vars in the Vercel
dashboard (Production and Preview scopes differ: see Environments above). Root `package.json` must keep
`"type": "module"`, and `firebase-admin` stays on v13 (v14 crashed Vercel on 2026-09-20; Dependabot ignores majors).
Vercel can only choose the Node major (24); CI pins the exact version, so a production prerender may use a newer
24.x patch than the tests did.

**Admin site (v5.163.0).** The admin panel is its own page, `frontend/admin.html` → `src/admin-entry.tsx`,
built by its own pass (`vite.admin.config.ts`, output `dist/assets/admin/`, after the app build so it never changes the app's chunks)
(routes `src/adminRoutes.tsx`, guards `src/adminGuards.tsx`), served on `admin.bustandeen.com` for origin
isolation: its Firebase sign-in and second-factor proof never share storage with the app, and it loads no app
Firebase, service worker, manifest, analytics or persisted query cache. `vercel.json`: `bustandeen.com/admin*` 301s
to `admin.bustandeen.com/admin*`; on the admin host `/` → `/admin` and every non-admin path goes back to
bustandeen.com; `/admin*` → `admin.html` on every host (so previews and `vite`/`vite preview` serve it at `/admin`);
the admin host has its own stricter header block (CSP `script-src 'self'`, `frame-src 'none'`, `noindex`).
Backend: with `ADMIN_HOST=admin.bustandeen.com`, `/api/admin/*` answers only on that host (plus previews and
localhost) and only the admin site may call it cross-origin (`utils/corsOrigins.ts`). Unset = no restriction.

**Bayan (v5.164.0).** Help & Updates on `bayan.bustandeen.com`: content in `src/seo/bayan/` (`guides.ts`, `releases.ts`
for What's new, add one per user-visible release, and `pages.ts`), rendered by `BayanPage.tsx` through the SSR bundle and
written by `scripts/prerender.mjs` to `dist/bayan/` as standalone documents (app stylesheet + `public/bayan/filter.js`
only). `vercel.json` rewrites the bayan host to `/bayan/*`; `/` and `/bn` there redirect to `/home` and `/bn/home`
because Vercel serves existing files (the app's landing pages) before rewrites. `help.` and `bustandeen.com/bayan/*`
301 to it. Locally, `vite preview` answers `bayan.localhost` the same way.
