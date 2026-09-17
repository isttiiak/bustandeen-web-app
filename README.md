# 🌱 Bustandeen — Islamic Productivity App

**Live:** [https://bustandeen.com/](https://bustandeen.com/) · [CHANGELOG](CHANGELOG.md)

> _Iḥsān is to worship Allah as though you see Him._

A calm, ad-free companion for the Muslim day — salat, zikr, Quran, fasting, prayer
times, a first-of-its-kind cycle room for sisters, and a dedicated Ramadan home.
Free forever, private by design, and honest with **every** reference: each Quran
verse and hadith links to quran.com or sunnah.com with its exact number and grade.

---

## ✨ Features

### 📿 Zikr Counter

- Local-first tap counter with focus mode, goals, and custom dhikr — each with Arabic, transliteration and a verified reference
- A curated zikr **library** in Settings: ṣalawāt (Durud Ibrāhīm & the short ṣalawāt), every istighfār formula, the weighty words, calls on His Names — one tap to add to your own list
- Six **core adhkār** (SubḥānAllah, Alḥamdulillah, Allāhu Akbar, the tahlīl, Āyatul Kursī, Astaghfirullāh) can never be deleted — the salat wiring depends on them
- A fair streak system: miss one day and you get a grace chance 🧊; backfill up to 2 days to repair a streak (works on mobile and web)
- Analytics: trends, per-type breakdown, weekly heatmap with met/grace/missed tags — rendered with a hand-rolled SVG chart, no heavyweight charting library

### 🕌 Salat Tracker — wired to zikr & Quran

- All five fard prayers with on-time / late / missed states, location (mosque / jamaah / home), sunnah and nafl
- **Mark the tasbīḥ after a prayer and it posts to your zikr counter itself** — no more opening the counter five times a day to log 33s by hand (un-tap subtracts the same amount)
- **Salat settings** (⚙️): choose your tasbīḥ mode — 33/33/33 + tahlīl _(Muslim 597a, default)_ or 33/33/34 _(Muslim 596a)_ — and your ʿAṣr **madhab** (standard or Ḥanafī, which shifts ʿAṣr's start and Ẓuhr's end)
- Post-salat surahs one tap away: Āyatul Kursī + the three Quls after every fard, al-Mulk after Isha, al-Kahf on Friday — with a live ʿAṣr→Maghrib duʿā-hour banner on Fridays
- Nafl (Tahajjud, Duha, Ishraq, Awwābīn…) with a minimum of 2 rakʿah, pair-stepped
- Streaks, per-prayer analytics, and a 90-day calendar. During Ramadan a tarawih row appears under Isha

### 🕐 Prayer Times

- Calculated fully **on-device** (adhan, Moonsighting Committee) — GPS or city search, **your location never leaves your browser**
- Live clock with current/next prayer, forbidden windows and nafl windows on an educational timeline

### 🌙 Fasting Tracker

- Fiqh-aware: qaḍā make-up counter, kaffārah (consecutive-day tracking), vowed fasts, and every sunnah day (Mon/Thu, White Days, ʿArafah, ʿĀshūrā, Six of Shawwāl…)
- Blocks ḥarām days (Eids, Tashrīq) and warns on disliked ones — each rule cites its exact hadith
- Intention auto-completes after iftar; month calendar; full analytics with editable history

### 🌟 Ramadan — a self-contained room (`/ramadan`)

- **Countdown mode** before the month: days-until, expected Gregorian date, and "prepare your heart" links (qaḍā, Shaʿbān, Quran)
- **Live mode**: Day N hero with a live suhoor→iftar countdown pill, the salat tracker **inline** (five fard rows + nafl + a tarawih toggle — the same rows and hooks as `/salat`, no extra navigation), a three-_ashra_ calendar (Raḥmah / Maghfirah / ʿItq min an-Nār) with pulsing odd nights, and a worship strip to every tracker
- **Ramadan analytics** (`/ramadan/analytics`): fasted vs _obligated_ rate (excused days are subtracted from the denominator so they never drag it down), longest run, tarawih nights, per-ashra bars, last-ten focus
- Rayhanah-aware: excused days show 🌸 and flow into the qaḍā counter automatically

### 📖 Quran — a complete reading & listening home

- Āyah-by-āyah reader: one calm card with the Arabic and its meaning, single-āyah recitation with word highlighting, fullscreen mode with a draggable tafsir split, keyboard navigation, bookmarks, in-app zoom
- Six rooms: Overview · Khatam (serial journey) · Read (any surah, searchable) · Listen (7 reciters, Yasser Al-Dossari default) · Analytics · Saved
- Authentic tafsir (Ibn Kathīr, Maʿārif and more, EN/BN) sourced from quran.com — never AI
- Beloved surahs, authentic protection selections (Āyatul Kursī, last verses of al-Baqarah…), and duʿās from the Quran — each opens straight in the reader
- **One unified streak**: āyāt from khatam, free reading, special selections and listening all count toward your daily goal

### 🤝 Friends — "So compete with one another in doing good" _(Quran 2:148)_

- Connect via a single invite link; see each other's streaks and today's worship
- A calm daily measure called **Noor** (max 100: prayers 50 · zikr streak 20 · Quran goal 20 · fasting 10) — today's Noor resets at midnight, all-time Noor only ever grows

### 🌸 Rayhanah Cycle — for our sisters

- The **first** Muslim productivity app with first-class menstrual & post-natal (nifās) support
- Salat & fasting pause automatically with zero guilt — dhikr, Quran listening & ṣalawāt take over your Noor, and **nothing about it is ever visible to friends**
- Ghusl guide, cycle predictions, madhab-aware istiḥāḍa guidance, and Ramadan days auto-added to your qaḍā counter
- Private flow / symptom / mood notes, a cycle calendar with predicted windows, and a dedicated analytics page with a regularity score, prediction windows, and past-period backfill

### 🌍 Built right

- Hijri dates with a ±1-day moon-sighting adjustment; every quote linked to quran.com / sunnah.com with grading
- Wherever a **ḍaʿīf** (weak) grade appears, a `<DaifExplainer>` card before the footer names the claim, the collection, the _specific_ defect in the chain, the verdict, and how Bustandeen uses it anyway — we never ship a weak label without the reasoning
- **Configurable tracking day** — Fajr-to-Fajr (default, the day flips at dawn), civil Midnight, or the Hijri day (starts at Maghrib); celebration animations that respect reduced-motion
- **PWA**: installable, offline-ready, and self-updating (workbox `skipWaiting` + `clientsClaim`)
- **i18n** (English + Bengali) on the core screens; **full backup** export / restore and per-feature deletion from Settings

---

## 🚀 Tech Stack

### Frontend

- **React 18 + TypeScript** · **Vite**
- **Zustand** (local state) · **TanStack React Query** + persist-client (server state, offline cache)
- **Tailwind CSS** + **DaisyUI** · **Framer Motion**
- **vite-plugin-pwa** (workbox) · **react-i18next**
- Charts are **hand-rolled SVG** (Catmull-Rom → Bézier) — no charting dependency

### Backend

- **Node.js + Express + TypeScript** (`tsx` in dev, `tsc` in prod)
- Ships as **one Vercel serverless function** (`api/index.ts`) — the whole Express app, region Singapore (`sin1`)
- **MongoDB Atlas** (Mongoose, cached connection reused across warm invocations)
- **Firebase Auth** — Bearer ID tokens, no cookies. `firebase-admin` pinned to **v12** (v14 breaks the serverless bundle)
- **Zod** validation on every write route · **Jest** (ESM + ts-jest, mongodb-memory-server)

> There is **no cron** and no separate long-running server. Anything time-decayed
> (e.g. streaks) is computed lazily on read.

---

## 📁 Project Structure

```
bustandeen/
├── api/
│   └── index.ts          # Vercel serverless entry — wraps the whole Express app
├── backend/
│   └── src/
│       ├── models/        # Mongoose models
│       ├── routes/        # Express routes
│       ├── controllers/   # Route handlers
│       ├── services/      # Business logic (streak, social, backup, quran, ai…)
│       ├── middleware/    # Auth, validation
│       └── config/        # Mongo + Firebase Admin init
├── frontend/
│   └── src/
│       ├── components/     # Reusable UI
│       ├── pages/          # Route pages
│       ├── hooks/          # React Query hooks
│       ├── store/          # Zustand stores
│       ├── utils/          # Client logic (tracking day, rules, quran data…)
│       └── locales/        # i18n (en, bn)
├── vercel.json            # Serverless + SPA routing (region sin1)
└── README.md
```

---

## 🛠️ Local Setup

### Prerequisites

- Node.js **v18+** (repo targets Node 22 in prod)
- A MongoDB connection string (Atlas M0 is fine)
- A Firebase project (for authentication)

### 1. Clone

```bash
git clone https://github.com/isttiiak/bustandeen-web-app.git
cd bustandeen-web-app
```

### 2. Backend

```bash
cd backend
npm install
# create backend/.env with:
#   MONGODB_URI, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
#   (optional AI: GROQ_API_KEY, GEMINI_API_KEY)

# macOS note: port 5000 is taken by AirPlay Receiver — run on 5001
PORT=5001 npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
# create frontend/.env.local with:
#   VITE_BACKEND_URL=http://localhost:5001
#   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
#   VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
#   VITE_GA_MEASUREMENT_ID   (optional — GA4, e.g. G-XXXXXXXXXX)

npm run dev
```

### 4. Open

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

> In production the frontend calls the API **same-origin** (`/api`) — no second
> host, no CORS. `VITE_BACKEND_URL` is only for local dev.

---

## 🕰️ How "today" works

Bustandeen's tracking day flows the way a worship day does — **it flips at local Fajr,
not midnight** (`utils/trackingDay.ts`). Isha prayed at 1 AM and suhoor before
dawn belong to the right day. Salat and fasting use client-authoritative local
civil date strings; the server clock is never the source of "today". Hijri dates
go through `getHijriDate()` with a user ±1-day moon-sighting adjustment.

---

## 📝 API (all Bearer-token authenticated + zod-validated)

| Area      | Base             | Highlights                                                                                                                                                |
| --------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zikr      | `/api/zikr`      | `POST /increment/batch` (signed deltas), `GET /summary`, `GET\|POST\|DELETE /types`, `PATCH /types/rename`, `DELETE /all`                                 |
| Analytics | `/api/analytics` | `GET /` (charts + derived streak), `GET\|POST /goal`, `POST /streak/pause\|resume`                                                                        |
| Salat     | `/api/salat`     | `GET /?date=`, `PATCH /prayer`, `PATCH /nafl`, `GET /analytics?today=`, `DELETE /all`                                                                     |
| Fasting   | `/api/fasting`   | `PUT /log`, `GET /summary?today=`, `GET /history`, `PATCH /profile`, vows CRUD, `DELETE /category/:c`, `DELETE /all`                                      |
| Quran     | `/api/quran`     | `POST /read-ayat`, `POST /bookmark`, `GET /summary?today=`, `GET /tafsir`, `PUT /resume`, `PATCH /profile`, `DELETE /all`                                 |
| Cycle     | `/api/cycle`     | `GET /summary`, `POST /start\|end`, `PUT /day`, `PATCH /logs/:id`, `PATCH /profile`, `DELETE /all`                                                        |
| Social    | `/api/social`    | `GET /summary` (leaderboard), `GET /noor`, `GET /friends`, `POST /connect`, `DELETE /friends/:uid`                                                        |
| User      | `/api/user`      | `GET /export` (full backup .json), `POST /import` (merge restore)                                                                                         |
| AI        | `/api/ai`        | `POST /suggest\|weekly-summary\|comeback\|comfort\|streak-coaching\|fasting-companion\|activity-insight` — encouragement only, never a source of evidence |

---

## 🧪 Testing

```bash
cd backend && npm test   # jest ESM + ts-jest, mongodb-memory-server (91 tests)
```

---

## 🧹 Development Workflow

```bash
npm run lint        # ESLint (backend + frontend), from the repo root
npm run typecheck   # tsc --noEmit (backend + frontend)
npm run format       # Prettier — writes
npm run format:check # Prettier — check only (this is what CI would run)
```

- ESLint is configured once at the root (`eslint.config.js`) and shared by both
  packages — `@typescript-eslint`, `eslint-plugin-security` on the backend,
  `eslint-plugin-react-hooks` on the frontend. `no-explicit-any` is an error;
  disabling it (or any rule) inline requires a `-- reason` comment
  (`@eslint-community/eslint-comments/require-description`).
- **Prettier is wired up but the repo has not been reformatted yet** — running
  `format:check` today will flag most existing files. That's expected; a
  dedicated formatting-only commit is a deliberate follow-up so it doesn't
  drown unrelated diffs. Format-on-save in your editor is fine, but hold off on
  a repo-wide `npm run format` until that follow-up lands.
- **Pre-commit** (Husky + lint-staged): staged `.ts`/`.tsx`/`.js` files are
  linted and formatted automatically. This runs alongside `npm run dev`
  without conflict — the hook only touches `git commit`, not the dev servers.
- **CI** (`.github/workflows/ci.yml`) runs on every push/PR to `main`: install,
  lint, typecheck, `backend` tests, `frontend` build, and
  `npm audit --production --audit-level=high` for both packages.
- **Dependabot** opens weekly npm update PRs per package (`backend/`,
  `frontend/`, root), grouping minor/patch bumps and keeping security updates
  separate.

### Versioning — when to bump

Not strict semver (there's no external API contract to protect) — versioning
here tracks _release size_, matching how the project has always tagged
releases:

- **Patch** (`x.y.Z`) — a bug fix, security patch, or small tweak. Bump once
  per fix that reaches `main`, even a single small one.
- **Minor** (`x.Y.0`) — a batch of related work: a new feature, or several
  fixes/improvements shipped together in one push (e.g. an audit-driven
  hardening pass). Bump once per _batch_, not once per commit inside it.
- **Major** (`X.0.0`) — reserved for a milestone that changes the app's
  shape: a design overhaul, a platform change (e.g. a native app launch), or
  whatever you personally judge to be a new "era" for the project.

Bump the three `package.json` files together (root, `frontend/`, `backend/`)
and add an entry to [`CHANGELOG.md`](CHANGELOG.md) as the last step of a work
session before pushing — not after every individual commit.

---

## 🚀 Deployment (Vercel)

The whole app deploys as one Vercel project:

- **Root Directory** points at the repo root; `vercel.json` builds `frontend/dist`
  and serves `api/index.ts` as a serverless function (region `sin1`).
- Set the backend env vars (Mongo, Firebase Admin) **and** the `VITE_*` frontend
  env vars in the Vercel dashboard.
- Root `package.json` **must** keep `"type": "module"` — without it the serverless
  bundle fails with `ERR_REQUIRE_ESM`.
- Keep `firebase-admin` at **v12** — v14 pulls an ESM-only `jose` that breaks
  `verifyIdToken()` in the bundled runtime.

---

## 🤝 Contributing

Contributions are welcome — fork, branch (`feature/…`), and open a PR.
For translations, add values to `frontend/src/locales/<lang>/common.json`
(keep Arabic and references **out** of translation files). Any Quran/hadith
addition must link to quran.com or sunnah.com with the exact number and grade —
if it can't be verified, it doesn't ship.

---

## 📄 License

MIT.

---

## 📧 Contact

**Istiak Islam** — GitHub [@isttiiak](https://github.com/isttiiak)

If you spot a mis-cited or mis-graded reference anywhere in the app, there's a
"Report it" link beside every reference — corrections are always welcome.

---

**Built with ❤️ for the Muslim ummah.**
