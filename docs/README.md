# Bustandeen Architecture

Current as of v5.61.0 (2026-09-30). This replaces the old contents of this file, which described the
Oct 2025 JavaScript codebase. For conventions and commands, see the root `CLAUDE.md` / `README.md`.

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
             ├─ prerendered file ─► frontend/dist/<route>/index.html  (SEO pages, served as static)
             │
             └─ anything else    ─► frontend/dist/index.html (SPA shell, client-side routing)
```

Local dev runs the same Express app via `backend/src/index.ts` (listens on 5000, then connects to
Mongo), and Vite on 5173.

### Inside the Express app (`backend/src/app.ts`)

Order matters:

1. `trust proxy = 1` (Vercel sits in front, so the client IP comes from `X-Forwarded-For`)
2. `helmet` (CSP etc. — applies to **API responses only**, not the static site)
3. JSON/urlencoded body parsers (1 MB limit), `morgan`
4. CORS allowlist (`FRONTEND_ORIGIN`, bustandeen.com, Vercel previews of `ihsan-web-app-main`)
5. `generalLimiter`, then `/api/health` (no DB)
6. Per-domain routers, some with their own limiter (`authLimiter`, `zikrLimiter`, `aiLimiter`)
7. 404 handler → `middleware/errorHandler.ts`

Each domain follows **routes → controllers → services → models**. Auth is `requireAuth` (Firebase ID
token → `req.user`, rejects disabled users on every request) or `requireAdminAuth` (Firebase account +
`AdminAccount` role: Servant or Ansar). Every write route is validated with Zod (`middleware/validate.ts`

- `validation/*.schemas.ts`).

API route groups: `auth, zikr, ai, user, analytics, salat, fasting, quran, hifz, social, cycle,
insights, natural-log, naseeh, sadaqah, feedback, announcements`, and `admin/*` (sadaqah,
zikr-requests, auth, users, accounts, audit-log, feedback + mailbox, stats, ops, announcements,
compose-email, update-emails).

Rate limiting (`middleware/rateLimiter.ts`) uses express-rate-limit's **in-memory store**, which is
per serverless instance (audit SEC-01). 429s are logged to `RateLimitHit`.

---

## 2. Data model (MongoDB Atlas, database `ihsan`)

`dbName` stays `'ihsan'` on purpose (see CLAUDE.md, Deferred Migrations). `autoIndex: true` is on in
all environments (audit DB-02).

| Area        | Collections                                                                                                                                                        | Key indexes                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users       | `User`, `SocialProfile`                                                                                                                                            | unique `uid` / `userId`                                                                                                                                                 |
| Zikr        | `ZikrDaily`, `ZikrEvent`, `ZikrGoal`, `ZikrStreak`, `ZikrRequest`, `GlobalZikrLibraryItem`                                                                         | `ZikrDaily {userId,date,zikrType}` unique; `ZikrEvent` TTL 90 days on `ts`                                                                                              |
| Salat       | `SalatLog`, `SalatDebt`, `SalatDebtEvent`, `KazaUnit`                                                                                                              | `SalatLog {userId,date}` unique; `KazaUnit {userId,prayer,missedDate}` unique                                                                                           |
| Fasting     | `FastingLog`, `FastingProfile`                                                                                                                                     | `{userId,date}` unique                                                                                                                                                  |
| Quran       | `QuranLog`, `QuranProfile`, `QuranReadingSession`, `HifzEntry`, `HifzLog`, `HifzProfile`                                                                           | `{userId,date}` unique; `QuranReadingSession {userId,clientSessionId}` unique (idempotent client sessions); `HifzEntry {userId,surah,ayah}` unique + `{userId,dueDate}` |
| Rayhanah    | `CycleDay`, `CycleLog`, `CycleProfile`                                                                                                                             | `CycleDay {userId,date}` unique; sensitive fields AES-256-GCM encrypted (`utils/fieldCrypto.ts`)                                                                        |
| AI          | `NaseehPlan`                                                                                                                                                       | `{userId,weekStart}` unique                                                                                                                                             |
| Sadaqah     | `Donation`, `DonationStats`, `SadaqahExpense`                                                                                                                      | `{status,createdAt}`                                                                                                                                                    |
| Admin / ops | `AdminAccount`, `AdminAuditLog`, `Announcement`, `FeedbackMessage`, `MailboxMessage`, `MailboxSyncState`, `UpdateEmailCampaign`, `EmailFailureLog`, `RateLimitHit` | `createdAt` indexes; **no TTL** on `RateLimitHit` / `EmailFailureLog` (audit DB-01)                                                                                     |

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
- **Zikr:** `useZikrStore` (Zustand) increments optimistically and flushes to `/api/zikr` with an
  800 ms debounce; pending counts survive reloads.
- **Salat offline outbox:** `utils/salatOutbox.ts` queues prayer/nafl PATCHes in `localStorage`
  (`bustandeen_salat_outbox`) when the network fails and replays them when the connection returns.
  Fasting, Quran and cycle writes have **no outbox yet** (audit FE-03).
- **Quran sessions** are idempotent through a client-generated `clientSessionId`.
- **Cross-device prefs:** per-key newest-wins sync (`utils/prefsSync.ts`); new keys must be added to
  both the frontend and backend whitelists.

---

## 4. PWA and caching

- `vite-plugin-pwa` in `injectManifest` mode with a custom worker, `frontend/src/sw.ts`.
- **Precache:** the built app shell + assets (`self.__WB_MANIFEST`).
- **Navigation fallback:** any navigation not in the precache gets `index.html`, except `/api/*`
  and any path with a file extension (sitemaps, robots.txt, verification files).
- **Runtime caches:** `quran-text` (CacheFirst, 30 days, `api.alquran.cloud`) and `fonts`
  (CacheFirst, 1 year, Google Fonts).
- **Never cached:** `/api/*`. Worship logs must never be served stale.
- **Updates:** `skipWaiting` + `clientsClaim` + periodic `registration.update()` (`src/pwaUpdate.ts`),
  so a new deploy takes over without a stale bundle.
- Manifest: generated from `vite.config.ts` (`orientation: portrait`; the maskable icon reuses
  `pwa-512.png`, audit PWA-01).

---

## 5. SEO prerender pipeline

`npm run build --prefix frontend` runs three steps:

1. `vite build` → client bundle + `dist/index.html`
2. `vite build --config vite.ssr.config.ts` → `dist-ssr/entry-server.js` (from `src/seo/entry-server.tsx`)
3. `node scripts/prerender.mjs` → for each route and language (en/bn/ar), clone `dist/index.html`,
   swap in the page's title/description/canonical/hreflang/OG tags, and replace the empty
   `<div id="root">` with the server-rendered body (including BreadcrumbList/FAQPage/WebPage JSON-LD).

Prerendered templates (`src/seo/templates/`): prayer times per city, Qibla per city, Ramadan
calendar per city/year + index, duʿā situations + index, morning/evening adhkār, Asmāʾ ul-Ḥusnā,
Hijri date converter, Zakat calculator. City data is built by `npm run data:cities`
(`all-the-cities` + `geo-tz`). Prayer times on these pages come from `src/seo/utils/calc.ts`
(`adhan`, MoonsightingCommittee, standard ʿAṣr).

The app routes themselves (`/`, `/about`, `/privacy`, `/zikr`, …) are **not** prerendered; they
serve the empty SPA shell (audit SEO-01). Sitemaps: `sitemap-index.xml` → pages, prayer-times,
qibla, ramadan, duas, adhkar, utilities. Also `robots.txt` and `llms.txt`.

---

## 6. Third parties the browser talks to

| Origin                                                 | Why                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Firebase (`*.googleapis.com`, auth domain, Storage)    | Sign-in, profile photos                                                                    |
| `www.googletagmanager.com`, `www.google-analytics.com` | GA4 page views (audit PRIV-01)                                                             |
| `api.alquran.cloud`                                    | Quran text                                                                                 |
| `cdn.islamic.network`, `server1x.mp3quran.net`         | Quran audio                                                                                |
| `nominatim.openstreetmap.org`                          | Place names, only if the user picks OpenStreetMap (location rounded to ~1 km, audit T1.10) |
| `flagcdn.com`                                          | Country flags on Friends / Profile                                                         |

Fonts are self-hosted (`frontend/src/fonts.ts`, audit T2.7); no font requests leave the site.

The backend talks to MongoDB Atlas, Firebase Admin, api.quran.com (tafsir proxy), Groq (Naseeh AI, English only; cycle data is
never sent) and Zoho SMTP.
