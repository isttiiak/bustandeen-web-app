# Changelog

All notable changes to Ihsan are documented here. Format is loosely [Keep a Changelog](https://keepachangelog.com/); versioning follows the project's existing convention (see ["Versioning — when to bump"](README.md#versioning--when-to-bump) in the README) rather than strict semver — patch = fixes, minor = a feature batch, major = a milestone.

## v5.27.0 — Admin domain split, zikr request overhaul, new-user zero-states — 2026-09-17

### Added

- **Admin panel: Servant + 2 domain-scoped Ansars.** `AdminAccount.ansarDomain` (`'sadaqah' | 'general'`) plus a new `requireDomain` middleware scopes each Ansar to exactly one operational area — `sadaqah@bustandeen.com` for donation review, `ansar@bustandeen.com` for everything else (zikr requests, etc.). The Servant bypasses domain checks entirely. The existing `ansar@bustandeen.com` account is auto-backfilled to `ansarDomain: 'general'` on deploy. Manage Ansars UI now has a domain picker when creating a new Ansar. Email sender identity (`sadaqah` vs `ansar` "from" name) is now fixed per route/domain instead of derived from the acting admin's role — fixes a bug where a Servant approving a zikr request sent under the wrong identity. Each sender can optionally read dedicated `SADAQAH_SMTP_USER/PASS` / `ANSAR_SMTP_USER/PASS` env vars if real separate mailboxes are provisioned later, falling back to the shared mailbox otherwise.
- **Zikr: self-add replaced with admin-reviewed requests.** Users can no longer add a zikr straight to their own practice list unreviewed — the ZikrCounter page's "Add Custom Dhikr" now submits to the existing `ZikrRequest` review pipeline (same as Settings), with only the name required. Added a simple "want audio recitation?" yes/no signal (`ZikrRequest.wantsAudio`), non-blocking duplicate detection (normalize + Levenshtein match against the library and other pending requests, surfaced as a warning + "reject as duplicate" quick action on the admin review card), and a `category` field on `GlobalZikrLibraryItem` reusing the curated library's own 6 categories (defaults to "Uncategorized"). Settings' Community-suggested section now groups by category instead of one flat list.
- **Zikr request email threading.** A new submission-confirmation email now goes to the requester immediately (previously only an internal admin-notify email existed). Approve/reject emails thread against it via `In-Reply-To`/`References` (mirrors the existing Donation email threading), and the approval email links directly to the requester's new library entry.
- **New-user zero-states.** Home badges, the zikr StreakCard, the trend chart, and the 365-day heatmap now show encouraging placeholder copy instead of raw zeros/flat charts for a confirmed brand-new user (zero lifetime zikr count) — an existing user's honest "0 done today" is untouched.

### Fixed

- **`DEV_AUTH_BYPASS` hardened** with a second independent guard (`!process.env.VERCEL`) so a misconfigured preview/staging deploy can't silently disable auth via one bad env var alone.
- **ZikrCounter "Add Custom Dhikr" modal no longer clips on mobile** — the card now has a max-height with internal scroll, matching the page's own "Manage my list" modal, so Save/Cancel can no longer be pushed off-screen.
- Removed the Import/Export buttons from the zikr "Manage my list" modal — they only ever served the free-form self-add path that's now gone.

### Changed

- Zikr Settings' non-destructive "Reset counters" relabeled **"Start fresh"** with clearer copy; the hard-delete danger-zone entry in Settings deliberately keeps its sober "All zikr data" label.

## v5.26.0 — Prayer UX polish: Bengali names, dual Isha window, kaza shortcuts, end times — 2026-09-16

### Added

- **Prayer names now follow the UI language.** The LiveClockCard's "current" and "next" prayer labels were hard-coded in English regardless of the selected language. They now use the same translation keys as the rest of the prayer-times page, so Bengali users see বর্তমান: ফজর / পরবর্তী: যোহর instead of English.
- **Dual Isha window display on the Prayer Times timeline.** When viewing before Fajr (e.g. 4 AM), Isha's timeline card now shows two lines: the primary end time is Islamic midnight (best), and a smaller secondary line shows the absolute window close (Fajr) — so users know both the recommended cutoff and the final deadline. The timeline's "active now" badge also lights up for both Isha and Tahajjud simultaneously during that window.
- **Salat Tracker prayer cards show end times.** Each prayer card now shows `start → end` beneath the card header. Isha shows two end times: Islamic midnight (best) and the next Fajr (final window close), matching the Prayer Times page.
- **Kaza quick-mark chips in the debt panel.** The expanded kaza-debt section now shows a row of clickable date chips for recent days that have at least one missed prayer (incomplete count < 5). Each chip navigates directly to that day's tracker, removing the multi-tap calendar drill-down. A "Show more / Show fewer" toggle expands to up to 3 rows. Chips come from the 90-day calendar data already fetched — no extra API calls.
- **"How it works" now explains Ayatul Kursi auto-counting.** The "How it works" legend section in the Salat Tracker settings accordion now includes an explicit paragraph explaining that tapping the Ayatul Kursi toggle (in ▾ Details) auto-counts 1 recitation in the dhikr log, the same way Tasbeeh does, and that un-tapping reverses it.

### Fixed

- **Before-Fajr Tahajjud window not shown as active.** `buildTimeline` computed the Tahajjud window from today's Isha time (which is still in the future at 4 AM), so the `now >= tahajjudStart` check was always false. Fixed by detecting `now < times.fajr` and recalculating the Isha/Tahajjud window from yesterday's prayer times when in the pre-dawn window.

### Changed

- **Privacy page contact email changed to `ansar@bustandeen.com`** (the app's dedicated communication address). The contact paragraph text was also rewritten in both English and Bengali.

## v5.25.1 — Admin account self-heal, single admin entry point, cross-tab session — 2026-09-14

### Fixed

- **Deleting and recreating an admin's Firebase account locked them out entirely.** Firebase never reuses an account's internal ID, even for the same email — recreating `istiak@bustandeen.com` gave it a brand-new ID that no longer matched the `AdminAccount` row created at bootstrap, so a correct password still got rejected as "not a registered admin." `requireAdminAuth` now falls back to a verified-email match and re-links the existing row to the new ID automatically, instead of requiring a manual database fix.
- **The admin panel required signing in separately for every single tab.** The isolated admin Firebase session was deliberately session-only (didn't outlive a tab), which in practice meant re-entering a password every time a Servant/Ansar opened a new tab or reloaded. Switched to persistent (local) sessions — the isolation from a regular app account was never about session length, only about not sharing state with the main app's own login.

### Changed

- **One "Admin Panel" link instead of two separate deep links** in the profile dropdown ("Sadaqah Admin" / "Zikr Requests Admin" → one link to `/admin`). Both looked like shortcuts into the admin panel but neither skipped its separate sign-in, which was confusing rather than convenient.

## v5.25.0 — Admin panel rebuilt around real Servant/Ansar accounts — 2026-09-14

### Fixed

- **Security incident: an Ansar's "Home" click landed on the Servant's dashboard.** The admin panel's login (a shared password + custom session token, shipped v5.23.0) had no connection to Firebase at all, but `/admin/*` pages still rendered under the main app's `<Navbar/>`, whose logo goes to `/` — which shows whichever regular Firebase user happens to be cached in that browser's normal session, unrelated to who's actually signed into the admin panel. Fixed at the root: the admin panel now has its own isolated chrome and its own isolated Firebase identity (see below) — it's structurally impossible for one admin's session to leak into another's view.

### Changed

- **Two real, individually-revocable admin roles: Servant and Ansar** (not "admin/owner" — named per the site's own terminology). Servant (`istiak@bustandeen.com`) has full operational access, including managing other admin accounts. Ansar (`ansar@bustandeen.com`) has routine review access only — verify/reject sadaqah donations, approve/reject zikr requests — no deletes, financial edits, user list, or account management.
- **Admin auth is now real, individual Firebase accounts** (no more one shared password for every admin), verified server-side and checked against a new `AdminAccount` database collection — the actual source of truth for who's an admin and which role they hold. Deactivating an account revokes access immediately.
- **The Servant can add any number of future Ansars from inside the panel itself** (new "Manage Ansars" page) — no env vars or redeploys needed after the very first setup.
- **New Servant-only user directory** (`/admin/users`) — searchable, paginated — with the existing welcome-email backfill tool moved here from the Sadaqah page.
- **Admin sign-in now runs on its own, isolated Firebase app instance on the client**, entirely separate from a regular user's own app session, and the admin panel never again shares a page with the main app's Navbar/Footer.
- **Review emails sent by an Ansar now show as "Bustandeen Ansar"** in the recipient's inbox instead of "Bustandeen," so a donor or requester can tell who actually handled their case.

See `TODO-v3.md`'s "Admin panel rebuild — Servant/Ansar roles" section for the larger researched feature backlog (audit log, feedback inbox, donor analytics, etc.) intentionally left for a future session.

## v5.24.0 — Kaza debt race-condition fix, salat trend chart corrections — 2026-09-14

### Fixed

- **Kaza debt could be silently multiplied.** `ensureCaughtUp` read `lastAccrualDate`, computed which past days needed sweeping, did the work, then wrote `lastAccrualDate` back as two separate non-atomic steps. The frontend fires several GET endpoints in parallel on one page load, so concurrent calls would each read the same stale `lastAccrualDate`, independently recompute the same days to sweep, and each apply its own `$inc` — reported directly: 2 real missed Maghrib showing as 4, 1 missed Isha as 3, and a manual correction reverting because a still-in-flight racing request landed after the edit. The same race could also crash a request outright with a 409 duplicate-key error. Fixed with an atomic compare-and-swap claim so only one of several concurrent callers ever processes a given day; verified with a test that fires 8 concurrent requests and confirms the total is never multiplied (and reproduced the bug by temporarily reverting the fix before confirming it).
- **Salat trend charts appeared to have nothing for "today."** The Mosque Attendance Trend and Kaza Debt charts both bucket by week once the window is 14+ days, labeling each bucket only with its start date — the bucket covering today (whose window ends today) was always labeled several days in the past. Both charts now show the full date range (or single date, in daily mode) on their last bucket.
- **Prayer Calendar heatmap couldn't tell "no data" from "logged, nothing done."** Its "does this day have data" check compared a cell against the very array it came from, so it was always true — every day with no log row at all (including before the account existed) rendered as a bright red "0 completed" cell. The backend now reports `logged: boolean` per calendar day and the frontend uses that instead.

### Added

- **A "how to read this" (ⓘ) button on every trend/chart on the Salat Analytics page** — none previously explained what they measure or how the time window is bucketed.
- **Show/hide toggle on the admin login password field**, matching the regular sign-in page.

## v5.23.0 — Direct admin login with roles, welcome email from Istiak — 2026-09-13

### Fixed

- **Admin panel login/kick-back bug.** `signAdminSessionToken` silently signed with a fallback empty-string secret when `ADMIN_SESSION_SECRET` was unset, so a login could "succeed" and show the dashboard, but the very first API call then correctly failed verification and got kicked back to the login screen. Signing now throws immediately on a missing secret instead of issuing a token nothing can verify.
- **Sadaqah rejection email subject read like a thank-you.** `RECEIVED_SUBJECT` ("We received your sadaqah — JazakAllahu khayran") was reused verbatim for every reply in the thread, including rejections. The subject is now outcome-neutral ("Your sadaqah submission — Bustandeen"); the thank-you wording stays in the received email's body, where it's actually true. Threading (same subject for every reply in a donation's conversation) is otherwise still correct practice and unchanged.

### Changed

- **The admin panel no longer requires signing in as a normal app user first.** Replaced the old "Firebase login on the ADMIN_EMAILS allowlist, then a panel password" flow with a direct email+password login (`POST /api/admin/auth/login`) that has zero dependency on Firebase accounts — `requireAdminAuth` is now the only gate on every `/api/admin/*` route.
- **Two-tier admin roles.** `ADMIN_OWNER_EMAILS` (istiak@bustandeen.com) can delete records, edit financial stats, and trigger bulk operations; every other admin (ansar@bustandeen.com) gets the full day-to-day review workflow (verify/reject a donation, approve/reject a zikr request) but not those — enforced server-side via `requireOwnerAdmin`, with the Sadaqah admin UI hiding owner-only controls for a non-owner session.
- **Welcome email now sends from istiak@bustandeen.com**, not the shared sadaqah@ mailbox, with rewritten content: a short personal intro, links to About/Privacy, and a real sign-off. `email.service.ts` supports multiple named senders (each with its own SMTP credentials, since Zoho requires that) to make this possible.

### Added

- **One-time welcome-email backfill** for accounts that predate the welcome-email feature — owner-triggered only (`GET`/`POST /api/admin/users/welcome-backfill`), tracked via `User.welcomeEmailSentAt` so it never double-sends.

## v5.22.0 — Admin panel gate, zikr request review, kaza-debt fix — 2026-09-13

### Added

- **Second-factor admin panel password.** Being a Firebase account on `ADMIN_EMAILS` used to be the entire admin bar. Every `/api/admin/*` route now also requires a short-lived session token from `POST /api/admin/auth/verify-password` (`ADMIN_PANEL_PASSWORD`/`ADMIN_SESSION_SECRET`), and every admin page is gated behind a password prompt (`AdminGate`) that mints and holds that token in `sessionStorage` for the tab.
- **Zikr/dua suggestions now go through admin review.** The Zikr Library's "add your own zikr" form no longer creates a type directly — it submits a request (`ZikrRequest`), emails the review inbox (`ansar@bustandeen.com` by default), and shows a "we'll review it soon" message. A new `/admin/zikr-requests` panel lets an admin correct the submitted fields, edit a prefilled thank-you/decline email (same draft-then-send pattern as the Sadaqah admin), and approve or reject. Approving writes to a new `GlobalZikrLibraryItem` collection the frontend merges live into the library (`GET /api/zikr/library`) — no redeploy needed for a new entry to show up. The requester gets a one-time dismissible "we added it" card plus the admin's email.
- **Audio preview in the Zikr Library.** Any curated or community-suggested item with a recording now shows a small listen/stop button, so users can hear it before adding it to their counter.
- **Welcome email on first sign-in.** A new account's very first successful `/api/auth/verify` now sends a warm welcome email including a hadith on consistency in good deeds.

### Fixed

- **Kaza (missed-prayer) debt could get permanently stuck.** The day-rollover sweep counted a never-opened past day as owed but only persisted `missed` into the log if a row already existed for that day. Marking that prayer done afterwards then started from a fresh `pending` entry, so the debt counter's decrement never fired. The sweep now creates the log row so a later edit is seen correctly.
- **Zikr analytics streak card was crowded with always-visible text.** The grace-day paragraph and the 4-bullet "How Streaks Work" block are now collapsed behind a single "How streaks & grace days work" toggle.
- **The "Change" label next to the zikr counter's title was replaced with an icon-only caret button** — same underlying picker, less visual clutter next to the title.
- **Several zikr audio files were assigned to the wrong dhikr.** Sayyidul-Istighfar and Durud Ibrahim had swapped recordings; the four-beloved-words dhikr and the long-form "Astaghfirullahal-Azim" both had audio confirmed to be the wrong recitation and had their (incorrect) mapping removed until a correct recording is available.
- **A long list of bookmarked Quran verses forced scrolling past every earlier surah.** Each surah now renders as a collapsed summary card (number, name, saved count) that expands on tap, with the Arabic text fetched only for the surah actually opened.

## v5.21.1 — SEO pages: language switcher, interactive Hijri converter, broken-link fixes — 2026-09-12

### Added

- **Language switcher on every SEO page** (`/prayer-times/{city}`, `/qibla/{city}`, `/ramadan-calendar/{city}/{year}`, `/duas`, `/adhkar/morning|evening`, `/hijri-date-converter`) — v5.21.0 shipped real en/bn/ar content for these but no on-page way to switch between them, so a visitor could only reach the other languages by hand-editing the URL. `Layout.tsx` now renders EN/বাং/عربي pills that carry you to the equivalent page in that language.
- **`/hijri-date-converter` is now an actual converter.** It previously only displayed today's date — no input, nothing to convert. Now: a live Gregorian→Hijri date input, a live Hijri→Gregorian day/month/year picker, and a moon-sighting ±1 day adjustment control shared with the app's own `bustandeen_hijri_offset` setting (`utils/islamicCalendar.ts`) — a choice made here carries over to the app's own Hijri-date display and vice versa. New `hijriToGregorian()` in `src/seo/utils/calc.ts` (same scan-outward-from-an-estimate technique as the existing `ramadanRangeForHijriYear`, since the Umm al-Qura calendar's month lengths aren't reducible to a closed-form formula).

### Fixed

- **Several SEO-page nav links pointed at pages that don't exist.** The site wordmark and "Home" breadcrumb used `langPath(lang, '/')`, which for bn/ar produced `/bn/` or `/ar/` — routes that were never registered (404). The "Prayer Times"/"Qibla Direction" breadcrumb category links had the same problem pointing at the live app's (English-only) `/prayer-times` and `/qibla` pages. The "Ramadan Calendar" breadcrumb pointed at a `/ramadan-calendar` index page that was never built, for any language. All fixed: site-wide links always go to `https://bustandeen.com/`; the two live-app category links stay unprefixed; the Ramadan Calendar breadcrumb is now a plain (non-broken) label since there's no index page for it to link to yet.

## v5.21.0 — Programmatic SEO: prayer times, qibla, Ramadan calendar, du'a library by city — 2026-09-12

### Added

- **Static-site-generation pipeline.** The app has no SSR (client-only SPA), so the new pages below needed real pre-rendered HTML to be crawlable and to produce correct link-preview cards — not just client-side meta tags. A new isolated `frontend/src/seo/` tree (no Zustand/Firebase/React Query — SSR-safe by construction) is rendered via `react-dom/server` in `scripts/prerender.mjs`, chained into `vite build` alongside a dedicated `vite.ssr.config.ts`. React Router takes over client-side navigation on top of the static output once the app bundle loads.
- **~1,450-city dataset** (`scripts/build-cities.mjs`), built from `all-the-cities` (GeoNames) + `geo-tz`, tiered by country so coverage favors real search intent — a low population bar for Muslim-majority countries and India, a higher bar for known diaspora hubs, and only major global cities elsewhere.
- **`/prayer-times/{city}` and `/qibla/{city}`** — 1,445 cities × en/bn/ar, cross-linked to each other, to `/ramadan-calendar` for the same city, and to the live in-app trackers.
- **`/ramadan-calendar/{city}/{year}`** — full day-by-day Imsak/Iftar table for the current Hijri year's Ramadan, computed via `adhan` + the existing Hijri-detection technique from `islamicCalendar.ts`; the Gregorian year in the URL rolls forward automatically on each rebuild.
- **`/duas/{situation}`** — 15 new situational du'as (travel, illness, anxiety & grief, exams, anger, hardship, entering/leaving home, entering the masjid, rain, seeking forgiveness, waking up, before sleep, before/after eating) and **`/adhkar/morning`, `/adhkar/evening`** — new curated content, every Arabic text/hadith citation checked against sunnah.com and quran.com before being added, same verified-reference discipline as `SPECIAL_DAYS` in `islamicCalendar.ts`.
- **`/hijri-date-converter`.**
- Real Arabic content and RTL layout for all of the above (`src/seo/locales/chrome.ts`), scoped to just these new pages — kept separate from the app-wide `i18n.ts`, which stays en/bn until the larger Arabic/RTL rollout (tracked separately in `TODO-v3.md`).
- `hreflang` (en/bn/ar + x-default) and Schema.org JSON-LD (`BreadcrumbList`, `FAQPage`, `WebPage`) on every generated page; a `sitemap-index.xml` plus 6 category sitemaps generated from the same route list that builds the pages, so they can't drift out of sync.

### Fixed

- **`og-image.jpg` still read "Ihsan" in the actual pixels** after the rebrand — the shared-link preview on WhatsApp/Messenger/etc. was showing the old name even though every text-based SEO surface already said Bustandeen. Regenerated from a checked-in SVG template (`scripts/generate-og-image.mjs`) so it's reproducible if the brand line ever changes again.
- **`robots.txt`'s `Disallow: /ramadan` was a prefix match**, so it accidentally also blocked the new `/ramadan-calendar/*` pages. Split into `Disallow: /ramadan$` + `Disallow: /ramadan/` so only the private live tracker stays blocked.
- **Sadaqah public page showed unique-donor count, not total donations.** "People who have given" counted distinct emails, undercounting real generosity since one person can give more than once or on behalf of others. Now shows `totalVerifiedCount` (total verified donations), relabeled "Donations given."

## v5.20.1 — Fix: friendlier fallback on /auth/action — 2026-09-12

### Fixed

- **`/auth/action` showed an alarming "Invalid Link" error when Firebase's own hosted action page intercepted the email link before `mode`/`oobCode` ever reached our branded page** (confirmed via a generated verification/reset link: both route through `firebaseapp.com/__/auth/action` first, whose own "Continue" link drops those params). The action had usually already completed there by the time this showed. The no-code fallback now says the link didn't carry what's needed and suggests signing in, with a Sign In button alongside Go Home, instead of implying something failed. This does not fix the underlying routing — that needs a Firebase Console change (Authentication → Templates → "Customize action URL" set to `https://bustandeen.com/auth/action` for both Email verification and Password reset) — tracked separately.

## v5.20.0 — Sadaqah: contributor count, cleanup tooling, cost ledger — 2026-09-12

### Added

- **Admin: delete a donation entry.** `DELETE /api/admin/sadaqah/:id` permanently removes an erroneous/test entry, reversing its stats impact first if it had been verified — for cleaning up test data or mistaken submissions, not a donor-facing action. Two-click inline confirm in the "All submissions" table (click once to arm, again to actually delete), replacing an earlier `window.confirm()` draft that didn't fit this app's own in-UI confirmation style.
- **Admin: internal cost ledger.** New `SadaqahExpense` model + `GET/POST/DELETE /api/admin/sadaqah/expenses[/:id]` — a simple itemized record (date, amount, description) of what the project actually spends, separate from and feeding into the existing quarterly "spent" aggregate on the public page. Admin-only, never shown publicly.

### Changed

- **Public page shows contributor count, not a money figure.** `/sadaqah`'s "Received so far" (a BDT amount) is now "People who have given" — a count of distinct donors (by email; someone giving twice still counts once), computed via `Donation.distinct('email', {status:'verified'})`. Showing raised amounts wasn't the right framing for sadaqah.

## v5.19.0 — Sadaqah: customizable emails, single-thread replies, visibility — 2026-09-12

### Added

- **Fully editable admin emails.** Clicking Verify or Reject no longer sends immediately — both open the same prefilled, editable textarea (a new `GET /api/admin/sadaqah/:id/email-draft?type=verified|rejected` endpoint generates the draft from the real donation data) so the admin sees and can change the exact wording before anything goes out. The verified draft now includes a plain-text payment-details block (amount, transaction ID, method, date) as a stand-in for the signed PDF receipt planned for later.
- **Single email thread per donation.** Previously each donation produced two or three separate email threads in the donor's inbox (received / verified / rejected). Every donation now gets a deterministic Message-ID at submission time (`Donation.emailMessageId`); the verify/reject emails set `In-Reply-To`/`References` against it and reuse a `Re: ...`-prefixed subject, so Gmail/Outlook group all of a donation's emails into one conversation.
- **Sadaqah visibility, kept low-key.** A "Sadaqah" link now sits in the profile dropdown right above Sign Out (visible to every signed-in user, not just admins) and near the bottom of the Landing page for guests — moved out of the site-wide footer, which was too easy to miss. A once-a-day Friday reminder (`SadaqahFridayReminder.tsx`) appears on Home with an inspiring line linking to `/sadaqah`, auto-dismissing after 30s and never reappearing the same day — never a permanent fixture, never forced.

### Changed

- `PATCH /api/admin/sadaqah/:id/reject` now takes `emailBody` (the full message) instead of a short `reason` fragment embedded in a fixed template; `PATCH .../verify` now requires `emailBody` too, matching the new always-edit-before-sending flow.

## v5.18.0 — Sadaqah (Donation) System — 2026-09-11

### Added

- **Public sadaqah (donation) system, Phase 1 (Bangladesh-only, bKash, manual verification).** A transparency page (`/sadaqah`) explains what contributions support and shows aggregate stats plus a quarterly spend breakdown once there's real data; `/sadaqah/donate` collects the donor's bKash transaction details (name, email, phone, transaction ID, amount, date, optional message, anonymous/public-name toggles); `/sadaqah/thank-you` confirms receipt. Framed throughout as sadaqah jariyah — no tiers, no feature-gating, donor names default to private.
- **Admin verification dashboard** (`/admin/sadaqah`, gated by a new `ADMIN_EMAILS` allowlist checked against the Firebase token — no DB role field needed for a single-admin tool): a pending queue with inline Verify/Reject, a filterable/paginated history table, and a quarterly-breakdown editor (add/edit/delete) that feeds the public transparency page.
- New backend: `Donation` (partial-unique index on `transactionId`, scoped to pending+verified so a rejected submission's real TrxID stays resubmittable) and `DonationStats` models; `/api/sadaqah/*` (submit, stats, config) and `/api/admin/sadaqah/*` routes; the app's first backend-originated email capability (Nodemailer + Zoho SMTP, a generic transport reusable beyond sadaqah) sending received/verified/rejected notifications — awaited before the response returns, and fails silently (logged, not thrown) if unconfigured.
- `isAdmin` now exposed on `/api/auth/verify` and `/api/user/me` (computed live from `ADMIN_EMAILS`, never stored) so the frontend can gate its own UI instead of just reacting to 403s.
- New env vars: `SADAQAH_BKASH_NUMBER`, `SADAQAH_NAGAD_NUMBER`, `ADMIN_EMAILS`, `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`.

## v5.16.0 — Hifz: read-before-you-memorise step — 2026-09-11

### Added

- **A dedicated reading step before an āyah enters the SRS queue.** Memorising an āyah you have never actually read was backwards — both "Start memorising" (the sequential cursor) and the manual surah/āyah picker now open a "Read before you memorise" modal (`HifzLearnModal.tsx`) showing the full, unmasked Arabic, transliteration, and translation (the user's selected edition(s), same as the Quran reader) before the āyah is added as a `HifzEntry`. Only "I've read it — start memorising" actually adds it; "Not yet" closes the modal with no side effects. The existing recall/review modal (`HifzReviewModal.tsx`, masked-text self-testing) is unchanged and deliberately stays translation-free — reading and recall are now two distinct, correctly-ordered steps.

### Changed

- No changes to the analytics/heatmap/totals section of the Hifz tab — left as-is per explicit direction that the current level is sufficient.

## v5.15.0 — Hifz (memorisation) tracker — 2026-09-11

### Added

- **New Hifz tab in the Quran section** (`/quran/hifz`), alongside Khatam/Read/Listen/Saved/Analytics. Lets you track Quran memorisation with real spaced repetition instead of just a reading log.
- **Per-āyah SM-2 spaced repetition.** Starting to memorise an āyah creates a `HifzEntry` (new → learning → consolidating → solid, derived from the SM-2 interval). Each recall attempt is self-assessed as Easy / Hesitant / Forgot, which drives the next review interval and ease factor — a "Forgot" demotes the āyah back into `learning` without discarding that it has been attempted before (it never regresses to `new`, which is reserved for an āyah that has literally never been reviewed).
- **Two independent daily targets** — new memorisation count vs. revision count — each with its own progress bar and a streak that uses the same single-day-grace rule as the Quran/zikr streaks.
- **Sequential "add next āyah" cursor**, mirroring the existing khatam bookmark pattern, plus a manual surah/āyah picker to memorise out of sequence.
- **Due-for-revision queue** — everything due today and not yet `solid`, oldest-due first — opens a recall session per āyah with progressive word-masking (a hint slider from fully hidden to fully revealed, plus tap-to-reveal individual words) before asking for a self-assessment.
- **Weak-spot heatmap** across every surah the user has started, colored by strength (share of `solid` entries), plus a totals row (new/learning/consolidating/solid counts).
- Undo for a mistaken add (per-entry remove with confirmation), and a "Hifz" section in Settings → danger zone (wipe all Hifz data, or just restart the add-next cursor) matching every other feature's data-management pattern.
- New backend: `HifzEntry`, `HifzProfile`, `HifzLog` models; `hifz.service.ts` (SM-2 scheduling); `/api/hifz/*` routes. Wired into account deletion (`user.service.ts`) alongside every other feature's data.

## v5.14.2 — CI fix: timezone-aware social summary fallback — 2026-09-11

### Fixed

- **`/api/social/summary` and `/api/social/noor` computed "today" from the plain server UTC date when the client omitted the `today` query param**, ignoring the `timezoneOffset` the same request already carried — inconsistent with the rest of this service, which is timezone-aware throughout. The real frontend always sends `today` explicitly, so this never affected production traffic, but it made `tests/cyclePartnerSync.e2e.test.js` genuinely flaky: for several hours around the UTC day boundary (e.g. any UTC+6 run between 18:00–23:59 UTC), the fallback's date disagreed with the date used to start the test's cycle, so a friend's `onCycle` flag read `false` when it should have been `true`. Switched both fallbacks to the existing timezone-aware `getTodayString()` helper. Verified: full backend suite (153 tests) passes, including the two that were failing in CI.

## v5.14.1 — UI/layout fixes — 2026-09-11

### Fixed

- **Home showed 0/5 prayers despite the day being fully prayed.** The Home dashboard's salat card queried the plain civil date instead of the user's fajr-to-fajr tracking day (unlike SalatTracker itself, which already gets this right) — so between midnight and the next Fajr, it silently rolled onto a new, empty civil day while the still-open tracking day (with all 5 prayers logged) stayed one date behind. Now matches SalatTracker's own definition of "today."
- **Profile avatar could be clipped off-screen on mobile.** On pages that show more nav content (Friends, which always displays both Noor badges), the navbar's right-hand cluster (language toggle, Noor badges, avatar) could exceed the viewport width — and since the app deliberately hides horizontal overflow site-wide, the profile menu button was silently clipped away with no way to reach it. Raised the all-time-Noor-badge breakpoint from 360px to 640px and trimmed some padding, verified down to 320px-wide devices.
- **Quran settings drawer's close button was hidden behind the navbar.** The drawer was rendered inline inside a page wrapper that creates its own (lower) stacking context, so its z-index could never actually win against the navbar above it. Portaled it to `<body>`, matching every other settings drawer (Salat, Zikr, Prayer Times) in the app, which already did this.
- **Salat tracker's calendar toggle could be squeezed to invisible on mobile.** It sat alongside 7 equal-width day cells with nothing protecting its own width; gave it `shrink-0` so the day cells compress first instead.
- **Āyah share card's Download/Copy/Share buttons could overflow their own box on mobile.** A three-button row with icon+label side by side didn't leave enough width for text at narrow modal sizes, so the label wrapped to a second line that rendered outside the button. Switched to icon-over-label buttons, which can't overflow regardless of column width.
- Incidentally found and fixed the demo-mode banner (`z-90`) sitting above *every* modal and settings drawer in the app, including the ones above — lowered it to sit correctly between the navbar and modal backdrops.

## v5.14.0 — Āyah Card Copy-to-Clipboard — 2026-09-11

### Added

- **Copy button on the āyah share card.** Alongside Download (and Share, on devices with a native share sheet), a Copy button writes the generated card straight to the OS clipboard via the Clipboard API — paste it directly into WhatsApp, Messenger, or anywhere else without a download round-trip first. Only shown where the browser actually supports writing images to the clipboard (a secure context with the Clipboard API); falls back to Download/Share elsewhere.

### Fixed

- Share and Download previously ran as two independent "busy" actions sharing one loading flag, so clicking one showed a spinner on both buttons. Each action (Copy/Download/Share) now tracks its own busy state.

## v5.13.0 — Shareable Āyah Photo Card — 2026-09-11

### Added

- **Shareable āyah photo card.** A "Share as image" button in the Quran reader's ayah controls and on each saved bookmark opens a preview of a generated 1080×1080 card (Arabic text, surah:āyah reference, a small Ihsan mark) with a translations picker (up to 2 of the app's existing editions, chosen per-share rather than fixed to the reader's current setting), an optional transliteration line, and 4 dark-first card styles (Emerald, Gold, Midnight, Slate — the choice is remembered for next time). Uses the Web Share API on supporting devices (straight to the native share sheet, with a separate explicit Download button alongside it) or a single Download button as the fallback everywhere else — those used to both say "Download" and do the exact same thing when the native share sheet wasn't available; now only one button shows in that case.

## v5.12.1 — 2026-09-11

### Fixed

- **Rayhanah's "🌿 Fertile window" title read clinical in Bengali.** "উর্বর" is dictionary-correct for "fertile" but carries an agricultural/clinical connotation (as in fertile soil), not how this is naturally described. Changed to "গর্ভধারণের উপযুক্ত সময়" (the natural phrasing a Bengali speaker would actually use).

## v5.12.0 — Natural-Language Logging & Weekly Muhāsabah — 2026-09-10

### Added

- **Natural-language logging.** A "Quick log with a sentence" entry on Home ("Prayed fajr in jamaah, read 5 pages, 100 istighfar") lets Naseeh parse a free-text note into a structured salat/dhikr/Qur'an log. Nothing is written until you review an editable preview (remove a wrong entry, adjust a count) and confirm — the parse step never touches your data by itself. Page counts convert to an ayah estimate (flagged "approximate") since the app tracks Qur'an reading in āyāt.
- **Weekly muhāsabah report.** A new, distinct card on Home (separate from the existing Naseeh weekly recap) pairs a short AI-written self-accounting — one thing that went well, one that slipped, one concrete suggestion, always framed as reflection rather than judgement — with a verified āyah or hadith. The reference is never AI-generated: it's picked from a small hand-verified corpus and rotates weekly, with Qur'an text fetched live from the same verified source the Qur'an reader already trusts.
- **Salat correlation insights.** Salat Analytics now shows how your Isha time relates to catching Fajr the next morning ("87% on time when Isha is before 11pm vs. 41% after"), computed entirely from prayer times already logged — no new logging step required. Only appears once there's enough history (5+ days in both buckets) to say something meaningful.

### Fixed

- **The "Enable Naseeh" toggle didn't actually persist.** Settings' AI toggle wrote straight to a local flag and fired a save request that always came back "success" — but the field wasn't in the update endpoint's accepted list, so it was silently dropped before ever reaching the database. The toggle looked "on" indefinitely while every AI feature's real, server-side gate stayed off, so a user who'd switched it on was quietly getting zero AI value from any Naseeh feature. Fixed the endpoint to actually accept and persist the field.
- **Duplicate React key** in the shared "Naseeh is thinking" loader (two dots shared a color-based key) — same bug class as the CycleGuidance one fixed in v5.10.0, spotted live while testing the features above.

## v5.11.0 — Rayhanah Depth & More Translation Fixes — 2026-09-10

### Fixed

- **Rayhanah cycle page and analytics page were substantially untranslated in Bengali.** The Garden of Light checklist, mood/symptom/flow chips, the adhkār-garden du'a descriptions, ghusl steps, and the pre-period symptom-pattern labels all had `t()` calls already wired to the right keys — the Bengali (and in a few cases English) locale entries themselves were simply never added, so every one silently fell back to raw English text. Added ~50 missing keys across both locales.
- **Numbers throughout the cycle and cycle-analytics pages stayed in Latin digits in Bengali mode** ("Day 3" instead of "দিন ৩", stat tiles, calendar day numbers, percentages). Wired in `formatLocaleNumber()` (already used elsewhere in the app) for raw JSX-rendered numbers, and adopted i18next's built-in `{{value, number}}` interpolation format for numbers embedded in translated sentences — both correctly render Bengali-Indic digits now. Also fixed a genuine regression caught while doing this: two Home-page keys (`ramadanDay`/`ramadanIn`) already pre-formatted their values before interpolating, so adding the new format hint there double-processed them into "NaN" — reverted those two specifically.
- **Same missing-key gap on the Fasting Analytics stat tile** ("Mon/Thu streak" showed in English even in Bengali) — added the missing keys while touching this page for the new streak stat below.

### Added

- **Best-ever Mon/Thu fasting streak.** Fasting Analytics only ever showed the *current* streak; added a "Best Mon/Thu streak" stat computed from the full fast history (longest unbroken run, not just the trailing one from today).
- **Rayhanah: discreet mode.** A new toggle (Settings on the Rayhanah page) that swaps the home-screen banner and nav-menu wording from explicit "🌸 Rayhanah day N" language to a neutral "🍃 Wellness mode" for a shared-device or over-the-shoulder scenario. The Rayhanah page itself is unaffected once opened — this only changes ambient, at-a-glance surfaces.
- **Rayhanah: pregnancy mode.** A status + due-date toggle that suspends period predictions (which would otherwise be actively wrong during pregnancy) and shows a week count instead. Deliberately does **not** touch salat/fasting exemption logic — pregnancy alone doesn't excuse worship, so that stays exactly as it was.
- **"iOS & Android apps coming soon" note** moved from the footer (shown on every page) to the landing page only, where it's actually relevant to a prospective new user.

## v5.10.0 — Naseeh Speaks Bengali — 2026-09-10

Reported by a sister using the app during her period: the Rayhanah cycle page showed untranslated English text in an otherwise-Bengali page. Root cause: Naseeh (the AI companion) never knew which language the UI was in, so every AI reply — cycle guidance, weekly recap, mood comfort, streak coaching, fasting companion — always came back in English regardless of the app's language setting.

### Fixed

- **Naseeh now replies in the app's actual language.** The frontend now tells the backend which language the UI is showing (a new `X-App-Language` header), and every AI feature honors it — cycle-phase guidance, weekly worship recap, mood comfort, streak coaching, the fasting companion, and monthly activity insights. Includes matching Bengali fallback text for when the AI call itself fails, so a Bengali-reading user never sees a stray English sentence from either path.
- **The output guardrail now also catches Bengali-script violations.** The hadith/verse-citation/ruling-language filter was English-only — a reply in Bengali could contain a citation or ruling word (বুখারী, হারাম, সূরা...) and sail straight through unfiltered. Added the equivalent Bengali patterns so the safety guarantee holds regardless of reply language.
- **Bengali translation used "মাফ" (forgiven/pardoned) for the Rayhanah "excused" state** (salat/fasting lifted during a cycle) — a word that reads as if something needed forgiving, rather than a legitimate exemption. Replaced with "অব্যাহতি" (exemption) throughout; left every doctrinally-correct "sins forgiven" (গুনাহ মাফ) usage elsewhere untouched.
- **Duplicate React key** in `CycleGuidance`'s loading-dots animation (two dots shared the same color-based key), spotted live while testing the language fix.

### Improved

- Weekly recap, streak coaching, fasting companion and monthly insight prompts now explicitly ask for specific numbers and varied phrasing instead of generic praise, addressing reports that Naseeh's messages felt repetitive.

## v5.9.1 — 2026-09-10

### Added

- **Full explanation for each tracking-day option.** An 'i' info icon on each of the three Tracking day boundary cards (Settings) opens a detail panel explaining exactly how that mode computes the boundary, what it needs (location or not), a worked example, and which trackers it does/doesn't affect — so the choice isn't just a one-line label.

## v5.9.0 — International Readiness — 2026-09-10

Prompted by a user relocating to Sweden: an audit of every time-boundary assumption in the app, plus removal of a notification feature that could never honestly serve users outside Bangladesh.

### Added

- **Configurable tracking-day boundary.** Settings → Tracking day boundary now offers three options for when your daily zikr/salat/Quran day begins: Fajr-to-Fajr (default, unchanged), plain Midnight, or the Hijri day (starts at Maghrib/sunset). Synced server-side like the Hijri date adjustment, so it follows you across devices. Fasting and the salat kaza-debt history view are deliberately unaffected — both stay civil-midnight regardless, since a fast is dawn-to-sunset of a fixed calendar date. A location-dependency nudge appears in Settings when Fajr-to-Fajr or Hijri-day is selected but no prayer location is saved yet (both need it to compute the boundary; they silently fall back to civil midnight without one).
- Landing page's "day begins at Fajr" section now mentions the new Midnight/Hijri-day alternatives.

### Removed

- **Web push notifications**, entirely. The evening-nudge categories (streak-at-risk, adhkar reminder, weekly summary) were tuned to a single fixed-UTC-time daily cron that could only ever land in "evening" for users near Bangladesh's timezone — everyone else, including the user prompting this pass, effectively never received them. Rather than half-serve international users, the whole feature is gone: subscribe/unsubscribe endpoints, the `PushSubscription` model, the daily Vercel Cron job, the Settings notification panel, and the service worker's push/notificationclick handlers. `User.timezoneOffset`/`location` (populated only for the push scheduler) are removed too.

- **PWA install prompt** on the landing page (Chrome/Edge/Android native "Install" button; manual Add-to-Home-Screen steps for iOS Safari, which has no install-prompt API).
- **Bring-your-own Groq key UX redesign.** Shows when the current key was saved ("Added on ..."), a "Change" button that no longer forces Remove-first, and a note confirming it's tied to the account (works on any device), not just the browser.

### Fixed

- **Global error boundary.** The app had zero error boundaries — any render-time crash blanked the whole page with no recovery path. Now shows a themed "Something went wrong" screen with Reload/Go Home instead.
- **Sign-in grace window too short after a long time away.** A cold/slow Firebase token refresh (new country, unfamiliar network) could take longer than the old 2-second grace window, flashing "Sign in required" at an actually-still-logged-in user. Bumped to 6 seconds with a proper loading spinner instead of a blank screen during the wait.
- **Dashboard stuck on blank data after a device wakes from sleep.** A burst of instant connection failures (OS network stack not yet reconnected) left queries stuck in an error state with nothing retrying them, since `refetchOnWindowFocus` is deliberately off. Now retries error-state queries on `visibilitychange` and `online`, without a blanket refetch that could flood the rate limiter.
- **Desktop tabs not picking up new deploys.** A long-lived desktop tab could sit on a stale build far longer than mobile, since the service worker never claimed control of already-open tabs and only ever registered once on load. Added `clientsClaim()` and an hourly + on-visibility update check.
- **Naseeh AI replies still sent with the toggle off.** `aiEnabled` was only checked per-component client-side — `ComebackNudge` never checked it at all, so opted-out users still got real AI replies from the shared key. Now enforced once, server-side, in the single function every AI feature funnels through.
- **Backup restore rejected valid v2 files.** The import controller had its own hardcoded version check that never picked up `BACKUP_VERSION`'s bump to 2, rejecting every import with a stale error.
- **Sunnah rak'ah guidance stayed open all day.** Gated on "not yet future" instead of "currently active," so Fajr's rawatib card kept showing through Isha. Now closes with the same prayer window it belongs to.

## v5.8.0 — Rayhanah Encryption & Bring-Your-Own AI Key — 2026-09-10

A privacy pass focused on Rayhanah (cycle tracking): the sharing model was already narrow, but the wellness content itself sat in plaintext — this closes that gap, plus gives anyone who wants it full control over their own AI provider.

### Added

- **Field-level encryption for Rayhanah wellness data.** Flow, symptoms, mood and Garden of Light entries are now AES-256-GCM encrypted at rest — unreadable to anyone with raw database access, not just hidden from other users. Cycle dates/type stay as they were (needed for the app's own scheduling logic, never exposed socially either way).
- **Bring-your-own Groq API key.** Settings → Naseeh AI companion now offers an optional field to paste your own free Groq key instead of using Ihsan's shared one — verified against Groq before it's saved, encrypted at rest, and never shown again once set.

### Changed

- Backup file format bumped to v2 to match the encrypted Rayhanah schema — a backup exported before this release will be rejected on import with a clear message asking for a fresh export, rather than silently reintroducing plaintext fields.

## v5.7.0 — Notifications & Manual Counting — 2026-09-08

Phase 2 (new features) begins: sound/haptic feedback for the zikr counter, a full web push notification system, and user control over auto-counting after-ṣalāh dhikr.

### Added

- **Zikr tap sound.** A short synthesized "wooden bead click" per count, toggleable in Zikr settings, off by default respecting each device independently.
- **Whole-screen tap + milestone haptics.** Full-screen focus mode is now tappable anywhere (not just the Count button); haptic pulses escalate at the 33/66/99 tasbih milestones so an eyes-free user can feel their position in the cycle.
- **Web push notifications.** Opt-in only, one master toggle per device (Settings → Notifications) with per-category control: streak-at-risk reminders, a general evening adhkar nudge, and a Friday weekly summary. Scoped to what a once-daily scheduler can honestly deliver — precise per-prayer "adhan" timing is intentionally not included yet (needs a higher-frequency scheduler). Turning notifications off fully deletes the subscription, not just a local flag.
- **Auto-count dhikr toggle (Salat Tracker settings).** Previously, tapping "Tasbeeh" or "Ayatul Kursi" after a prayer always credited the zikr counter automatically. Now optional — turn it off to just mark them as done and count them yourself via Tasbih mode on the Zikr counter.

### Fixed

- **Account deletion left push-subscription data behind.** `deleteAccount` purges every other domain but had missed the new push subscriptions collection — now included.
- **Full data export didn't include push/notification data.** The GDPR-style account export now surfaces saved timezone/location and subscription metadata alongside every other domain.

## v5.6.0 — Hardening & Trust — 2026-09-06

A full audit pass against the codebase (see `ihsan-feature-audit-2026.md`) turned up several real correctness and privacy bugs — this release fixes the ones found so far, plus ships a few small features that came out of the same investigation.

### Fixed

- **Cross-account data leak on sign-out.** The sign-out button reset the wrong zikr-store action (`reset()`, which only zeroed the currently-selected dhikr type) instead of `resetAll()` — on a shared device, a previous account's lifetime totals and custom dhikr types could survive into the next sign-in. Also closed two related gaps: the debounced local-storage write wasn't flushed immediately on sign-out, and the offline salat outbox queue wasn't cleared at all.
- **Zikr counts lost on tab close.** Pending taps sitting in the debounced sync queue could be lost if the tab closed before the next flush. Now flushed immediately via `pagehide`/`visibilitychange` with `fetch(keepalive)`.
- **Salat updates lost offline.** A network failure while marking a prayer done silently rolled back the tap with no way to recover it. Added a local outbox that queues and replays failed writes once back online.
- **Kaffārah chain broken by ḥayḍ/nifās.** The 60-day consecutive-fast requirement was treated as broken by a menstrual/postpartum interruption, contrary to the majority fiqh position that a mandatory Sharīʿah-imposed break doesn't restart the count. Now bridges the gap correctly while still resetting on an ordinary missed day.
- **Location permission required a page reload.** Granting location access from the Home page updated the stored location but not the displayed prayer-time widget until the next reload, due to a stale `useMemo` dependency. Fixed, and the flow was also redesigned: clicking "Enable Prayer Times" now goes to the Prayer Times page where GPS and manual city search are both visible before any permission prompt fires, instead of triggering geolocation directly from a single ambiguous button.
- **Duplicate streak/goal display.** The navbar showed a second streak/goal capsule on the Zikr Counter page, identical to the one already in the counter card. Removed the redundant navbar display and its backing API call.
- **Quran surah cache pressure on `localStorage`.** Cached Quran text (114 surahs × translation combinations) was competing with every other feature for the shared ~5 MB `localStorage` quota. Moved to IndexedDB with a one-time migration for existing cached data.

### Added

- **Configurable streak grace days.** The "how many missed days does a streak forgive" rule was hardcoded to 1 — now configurable (0–3) per user, in Zikr Analytics' goal settings.
- **Friend request approval.** Connecting via invite code now sends a request instead of connecting instantly — the recipient accepts or declines.
- **Invisible leaderboard mode.** A full opt-out: when on, no one — not even existing friends — sees your Noor score or stats.
- **Block/unblock.** Blocking tears down any existing friendship or pending request and silently invalidates the person's invite link (same generic error as a bad code, so they're never told they were blocked specifically).
- **Rayhanah's Garden of Light checklist is now server-synced**, surviving a device switch or cache clear instead of living only in `localStorage`.
- **Version number in the footer**, sourced from `package.json` at build time.

### Removed

- Dead code: the legacy page-based Quran reading hook (superseded by the ayah-engine reader years ago, zero remaining call sites), and unused live-counter methods on the `ZikrStreak` model (the streak has been fully derived from daily buckets for a while; these were never called).

---

## Earlier releases

Only tracked from this point forward. For history before v5.6.0, see `git log --oneline` — recent notable tags: `v5.4.0` (Turāb design refresh, full Bengali support, bigger Salat Tracker), `v5.2.0` "Shahr" (Ramadan tracker), `v5.1.0` "Waṣl" (salat/zikr/Quran cross-linking), `v5.0.0` (first "stable" milestone), `v4.11.0` (Bengali i18n framework), `v4.10.0` (PWA/installable).
