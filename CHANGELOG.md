# Changelog

All notable changes to Ihsan are documented here. Format is loosely [Keep a Changelog](https://keepachangelog.com/); versioning follows the project's existing convention (see ["Versioning — when to bump"](README.md#versioning--when-to-bump) in the README) rather than strict semver — patch = fixes, minor = a feature batch, major = a milestone.

## v5.57.0 - Your settings now follow you across devices - 2026-09-22

### Fixed

- **Settings changed on one device no longer revert on another.** Most preferences were saved only in the browser they were set in, so a new device showed the defaults. Quran settings synced only when their drawer was opened. Now these follow your account: sounds, vibration, volume, tasbih mode and target, hidden dhikr, Noor display, discreet mode, height/weight units, BMI hiding, motion and contrast, share-card design, language, the prayer calculation method and Asr madhab, salat guide toggles and after-prayer tasbih style, and every Quran reading choice (font, sizes, transliteration, reciter, translations, tafsir).
- **Newest change wins, per setting.** Each setting is stamped when you change it; on sign-in and when you return to the tab, the app keeps the newer side of each one and sends the rest up. Settings you had before this update are kept and uploaded, not reset. Quran choices already saved on your account are picked up automatically.
- **Account isolation.** Signing in with a different account on the same device clears the previous account's synced settings first.

### Notes

- New routes: `GET /api/user/prefs` and `PUT /api/user/prefs` (whitelisted keys only, at most 64 per request, timestamps clamped to 5 minutes ahead). Prefs are never included in `/api/user/me`.
- Device-specific choices stay per device on purpose: saved location, reader zoom and split, caches.
- To sync a new setting, add its key to both `SYNCED_KEYS` (frontend `utils/prefsSync.ts`) and `SYNCED_PREF_KEYS` (backend `userPrefs.service.ts`).

## v5.56.0 - Weekly plan on the Naseeh page; deleted cycles now restore their days - 2026-09-21

### Added

- **"Your plan for this week".** One or two small targets, sized to what you actually did over the last four weeks (not a fixed goal): the dhikr amount for a typical day of yours, the Quran ayat for a typical reading day, and the one prayer you logged least. Each shows why it was chosen, and you can adjust the amount and the number of days with + and - before pressing **Accept**. Accepting sets your daily dhikr and Quran goals to those amounts and starts a progress bar for the week. If you are already steady everywhere, it says so instead of inventing work, and with too little history it waits.
- **No AI is used for the plan.** It is worked out on our server from your own logs, and the privacy panel lists it as "Nothing sent".
- **Rest days pause it.** Rest days are left out of the four-week baseline (they do not shrink your amounts), they lower how many days a target can be met on, and while today is a rest day the plan is paused: nothing is shown, nothing can be accepted, and nothing is lost. It comes back when the rest days end.

### Fixed

- **A cycle that is deleted or shortened later now counts its days after all.** The day sweep skips rest days, so removing or shortening a cycle used to leave those days uncounted for good. The app now remembers which days were skipped or released as rest days and, if they stop being rest days, counts them once (only prayers you had not logged; safe with several requests at once). Accounts that existed before this get a one-time catch-up from the cycles they have now.
- **The last day of a cycle is a rest day on your device too.** The on-device check that keeps Naseeh's AI cards quiet only looked for an open cycle, so on the day a cycle ended the AI cards still ran, while the server already treated that day as a rest day. Both now use the same rule.

### Notes

- New routes: `GET /api/naseeh/plan` and `POST /api/naseeh/plan/accept`. Both return 403 while Naseeh is off. Tests guard that the plan makes no AI request and that the plan card only mounts when the rest-day check is clear.

## v5.55.0 - Rest days no longer add make-up prayers; Naseeh goes quiet on rest days - 2026-09-21

### Fixed

- **Rest days (Rayhanah) never create make-up prayers.** Salat is excused on those days, but the automatic day sweep used to add every unlogged prayer to your owed make-up count anyway. It now skips rest days, and the salat analytics (missed, totals, percentage, per-prayer and weekday counts) leave them out. A rest day also no longer breaks or extends a streak.
- **Make-up prayers already added for rest days are released.** This runs automatically and safely (once per prayer, even with several requests at once, and it also handles a cycle you add later). It only removes still-owed, dated entries on rest days. Paid ones and your manual +/- adjustments are never touched, and entries dated before a manual reset do not lower the counter.
- The test output no longer prints a fake `AUTHENTICATIONFAILED` error. That was one mailbox test deliberately failing a fetch; it is now captured and checked.
- Chat answers no longer say "since you started tracking" when fewer days were counted; they say how many days were used.
- The privacy panel now shows the updated wording (the English text file was overriding it).

### Added

- **Rayhanah-aware tone.** While a cycle is active, the Naseeh page shows one gentle, fixed card ("Take it gently: these are rest days, nothing here is a slip, your streaks and goals are paused, not lost") instead of the streak, fasting, patterns, make-up plan and weekly cards, and the welcome-back note on Home stays quiet. It is decided on your device, makes no AI request at all, and fails closed: if the cycle status is loading or cannot be read, no AI card runs. Tests guard this.

### Notes

- For anyone with recorded cycles, the make-up count will drop the first time salat analytics loads, by the number of prayers that fell on rest days.

## v5.54.2 - Prompt sanitizer closes three evasion routes - 2026-09-21

### Fixed

- **No round limit.** The cleaner used to stop after 5 passes, so deeply nested markers could survive. It now cuts until none are left (each cut shortens the text, so it always ends).
- **Invisible characters.** Zero-width spaces and joiners, bidi controls, soft hyphens and similar can no longer split a marker such as `system:`.
- **Look-alike letters.** Full-width forms are folded to plain letters, and Cyrillic/Greek look-alikes (for example a Cyrillic "е" in `system:`) are matched as their Latin twins. Only the marker is removed; genuine Cyrillic or Greek text is left as written.
- Six new tests cover each case, plus a check that ordinary text passes through unchanged.

### Notes

- This is still a blocklist. The real protection stays the model having no tools or data access, and its output being checked (numbers must match, chat can only pick a fixed lookup, rulings and citations are filtered).

## v5.54.1 - Backend lint at zero warnings, sturdier prompt sanitizer - 2026-09-21

### Fixed

- **Backend lint went from 99 warnings to 0** (frontend was already clean). Real fixes, no blanket silencing:
  - Lookups keyed by data (dates, email sender, tafsir edition, HTML escapes, hifz result, backup fields) now use `Map`s or explicit allow-lists instead of plain-object indexing. A prayer-log reason check now uses `Object.hasOwn`, so odd keys like `constructor` cannot pass.
  - Startup and script messages follow the project's logging rule (`console.warn`, or plain stdout for the one-off script).
  - The CORS check for Vercel preview URLs is now a small explicit function instead of a long regex.
  - The two long safety regexes are split into simple ones, and a secret-named comparison was renamed.
  - The one remaining rule (object-injection) is switched off only for six services whose keys are closed TypeScript unions (the five prayers, weekdays 0-6), with the reason written in `eslint.config.js`. It stays on everywhere else.
- **Prompt sanitizer is stricter.** It now repeats until nothing changes, so a marker split by another marker (for example `syst` + backticks + `em:`) can no longer be rebuilt after cleaning. A new test covers it.

## v5.54.0 - Rayhanah data never reaches AI, English-only Naseeh, one weekly card, lint clean - 2026-09-21

### Changed

- **No cycle data goes to any AI, ever.** The cycle "for you today" cards (mood comfort and cycle-day guidance) no longer call an AI. They now show fixed, hand-written lines picked on your device, so moods, symptoms, phase and day numbers are never sent anywhere. The `/api/ai/comfort` and `/api/ai/cycle-guidance` routes and their code are deleted. A test now fails if the AI service ever imports cycle data, exposes a cycle function, or those routes return. The privacy panel says "Cycle tracker: nothing is sent".
- **One weekly card instead of two.** "Naseeh · your week" is removed; "Muhāsabah · this week" (with its verified reference) is the one that stays. Its old monthly-pattern part is covered by "What I noticed". The weekly-summary and activity-insight AI routes are removed with it.
- **The AI companion is English only.** No Bengali AI replies, fallbacks or screen text, and the language header is gone. This saves free Groq limit and upkeep. The cycle cards above are not AI and stay in English and Bengali.
- **Naseeh is hidden in demo mode:** the page (redirects home), the menu link and the floating quick-log button.

### Fixed

- **Lint is clean.** Lint no longer scans the generated `dist-ssr` build output (2 false errors). All seven hook-dependency warnings are fixed properly: Ayah share card fit loop, fasting vows list, Ramadan tracker, and the Quran reader's resume/read callbacks (which now use stable `mutate` functions so listing them cannot cause repeated flushes).

## v5.53.0 - Naseeh page: what I noticed, make-up prayer plan, ask about my data, privacy panel - 2026-09-21

### Added

- **"What I noticed" card.** Patterns worked out from your own logs with no AI: the time of day you do most dhikr and Quran, a weekday that runs quieter for prayer, your steadiest and most-slipping prayer, the Isha-before-11pm link to Fajr, and the reason you most often pick when a prayer slips. It only shows a pattern when there is enough history behind it. The AI may re-word the top two sentences, and its version is thrown away if any number changed.
- **Make-up prayer plan.** From your owed count: one a day (attached to the prayer you are steadiest at) with a "done by" date, the date at two a day, and the oldest one owed. Hidden when nothing is owed.
- **Ask about my data.** Quick-question buttons (no AI at all) and a typed question box for prayers missed or prayed, prayer rate and streaks, make-up prayers owed, dhikr, Quran, and fasts, for today, 7 days, this month or the last year. The AI only picks which lookup to run; the answer is always written from your logs. Rulings and anything outside your own numbers get a polite redirect to a scholar. The chat is not saved.
- **AI usage and privacy panel.** Plain-words list of what each Naseeh feature sends, whether you are on your own Groq key or the shared one, the daily limits, and a "Turn off Naseeh" button with a confirm step.

### Notes

- New routes under `/api/naseeh`. Only the AI re-word (`phrase=1`) and typed questions count against AI limits; typed questions have their own 30 a day so they do not use up the shared 20. All four routes return 403 while Naseeh is off.
- Bengali and English throughout, chosen from the app language.

## v5.52.0 - Signed sadaqah receipts and "Download all my data" - 2026-09-20

### Added

- **Signed PDF receipt for every verified sadaqah.** When a donation is verified, the confirmation email now carries a colour, vector-drawn receipt (amount, who gave, on behalf of, transaction ID, dates, verified seal) set in the same El Messiri title font as the app, with `sadaqah@bustandeen.com` and "Dhaka, Bangladesh" in the footer. The email text no longer repeats the payment details; it points to the attachment.
- **Tamper-evident signature and QR check.** Each receipt carries a signature over its amount, transaction ID and verification time, and a QR code to a public page (`/sadaqah/verify/...`) that says whether the receipt is genuine. A changed amount or ID no longer verifies. It shows only the receipt number, amount and date, never the name or transaction ID.
- **Admins can download a receipt** from the Sadaqah admin submissions table ("Receipt PDF" on verified rows).
- **Settings > "Download all my data".** One JSON with everything held about you across every feature (profile, zikr, salat and kaza, fasting, Quran, hifz, Rayhanah, friends as counts, messages you sent us, your sadaqah submissions). It is a read-only copy for your own records; the existing "Full backup" is still the one to restore from.

### Notes

- New optional env var `RECEIPT_SIGNING_KEY`. If unset, the key is derived from `FIELD_ENCRYPTION_KEY`, so nothing needs to be set for this to work. Once receipts are sent, do not change it or older receipts stop verifying.
- This is an HMAC signature checked by Bustandeen, not a certificate signature that a PDF reader marks as "signed".

## v5.51.2 - Friends: honest Noor bars and clearer explanation - 2026-09-20

### Fixed

- **Noor bars now show Noor out of 100.** They were scaled to the leader, so the top friend always had a full bar even at 33 Noor (Today and This week).

## v5.51.4 - Friends: Noor explanation - 2026-09-20

### Changed

- **"What is Noor" explains the weekly average and "usually".** The week line says days with nothing count 0 and what "active X of Y days" means. The "usually" line says it is the average of the last 14 active days (shown from 3) and that bars show Noor out of 100.

_v5.51.3 was a version bump only, with no code change._

## v5.51.1 - Friends: the "This week" board now shows week numbers - 2026-09-20

### Fixed

- **"This week" no longer shows today's chips under a weekly Noor.** The score was the Friday-to-now daily average but the row still showed today's prayers, dhikr and fasting, which made the number look random. On "This week" each row now shows the week so far: prayers done, dhikr total, fasts, āyāt read, plus "daily average · active X of Y days" under the bar. The streak chip is unchanged. "Today" is unchanged.
- Sisters whose days were excused by the cycle still look like any other active day in the weekly totals (same substitution as today's chips).

## v5.51.0 - Zikr: own-list consent, audio tracker removed, istighfar sources fixed - 2026-09-20

### Added

- **Two ways to add a zikr in Settings.** The request form now has "Request for the library" (reviewed, shared with everyone) and "Add to my list only". The second opens a consent box: the zikr is added privately, nobody reviews it, and the user takes responsibility for it. The box also offers "Make request for review" instead, and a red-bordered cross to back out.
- **Audio status on approval.** When approving a zikr request the admin sees whether the user asked for audio and can tick "audio has been added". If ticked, the approval email gets one extra line saying so. Approved requests show whether audio was added. The admin notification also says when audio was requested.
- **Custom zikr deletions now sync across devices.** The server's list is the source of truth for non-built-in zikr, so a custom type removed on one device no longer comes back on another.

### Changed

- **The counter's "+" form is now the same form as Settings.** Same fields, same "Request for the library" / "Add to my list only" buttons and the same consent box (one shared component).
- **Counter header row fits small screens.** The name truncates, and the dropdown, "+" and audio buttons stay on one line at 320px. The edit/remove list moved to the top of the counter's settings drawer.
- **"Log missed counts" no longer lets you create a new zikr.** Pick from your existing list only.
- **Two istighfar entries corrected.** "Astaghfirullahal-Azim" used the wording of Tirmidhi 3577 under the Abu Dawud 1517 reference (which has no "al-Azim"). There are now two entries: Abu Dawud 1517 without "al-Azim" (Sahih), and the full "Astaghfirullahal-Azim alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh" from Tirmidhi 3577 (Hasan). Anyone who had the old name keeps it and sees the new card.

### Removed

- **Admin "Zikr audio tracker"**, its API routes, model and the `audioUrl` fields. The wrong link stored for Astaghfirullahal-Azim was deleted from the database (`npx tsx src/scripts/removeZikrAudioLinks.ts`, already run once). Audio stays bundled in the app.

## v5.50.1 - Update emails greet everyone, not one name - 2026-09-21

### Changed

- **Update emails no longer use `{name}`.** A bulk update goes to a whole group, so every recipient gets the same message, starting from "Assalamu alaikum, Bustandeen family," followed by the shared closing lines.

## v5.50.0 - Custom recipients for update emails, Broadcast open to Ansars - 2026-09-21

### Added

- **Custom recipients** on the Update emails tab: switch from "Choose a group" to "Custom recipients" and type addresses separated by commas (handy for test sends and one-off mails). Addresses are checked and de-duplicated, an address that belongs to an account borrows its first name for `{name}`, and the send is recorded in the history like any other.

### Changed

- **Broadcast is now open to both Servant and Ansar accounts** (the in-app banner and the update emails, including the nav link and the admin home card).
- **Removed the template dropdown** from Update emails. Every message now starts from the standard greeting and closing lines instead, which is all a one-off update needs.

## v5.49.0 - Update emails from the admin panel, persistent broadcast banner, Noor tweaks - 2026-09-20

### Added

- **Update emails (admin > Broadcast > "Update emails" tab, Servant only).** Send an update from ansar@bustandeen.com to brothers, sisters or all, with a choice for accounts that have no gender set (skip, include all, or pick from a list). Templates fill the audience, subject and a bilingual message (Noor v2 for brothers and for sisters); the shared closing lines and "Nourish Your Deen" are added automatically and `{name}` becomes each person's first name. Sending happens in small chunks with a progress bar, and every send is kept in a history with per-recipient status, the full text and a "Retry failed" button. Disabled accounts are never emailed.

### Changed

- **Broadcast banner no longer disappears forever on one tap.** Crossing it hides it only until the next reload; after three crossings it rests for 24 hours and comes back. It now shows the heading, a couple of fading lines of the message and a "See details" link that opens the full text with **Cancel** and **Close permanently** (the only way to remove it for good, per device). Works on the installed mobile app where only the heading used to fit.
- **Noor:** hifz review is removed from every calculation (extras are now a completed fast, nafl prayer, ṣalawāt/istighfār; on excused days ṣalawāt/istighfār is worth 10). Ties (everyone is 0 at the start of a day) are now broken by usual Noor and then streak, so a 72-day streak no longer sits below someone who has just begun. The prayer chip reads x/5.
- **"What is Noor" and the About page no longer mention Rayhanah to brothers** (the public Privacy page still explains it).

## v5.48.0 - Noor v2, weekly leaderboard, updated Privacy and About - 2026-09-20

### Changed

- **Noor v2** (one formula for today, past days, the weekly view and the all-time total). A day now starts at 0 for everyone and only goes up.
  - Prayers 50 (10 per fard, not pro-rated by the clock, so the score no longer falls as prayer times pass), zikr 15 and Quran 15 (against your own daily goals), steadiness 10, extras 10.
  - Steadiness is 1 per day of your active run up to 10, and only once you have done something today, so a long streak is no longer a free head start. Extras are 5 each, best two of: a completed fast, nafl prayer, hifz review, ṣalawāt/istighfār. 100 is reachable without fasting; an "intended" fast no longer scores.
  - Excused (Rayhanah) days move the prayer weight to zikr 40, Quran 40, steadiness 10, extras 10 (privacy behaviour unchanged).
  - Ties are broken by acts done today, not by streak. All-time Noor is recomputed with the same formula, so numbers shift once.
- **Leaderboard:** new Today / This week toggle (week = average daily Noor since Friday, a day with nothing counts 0), and each row shows "above their usual" (or their usual) so everyone races their own best.
- **Privacy Policy rewritten** (the last version was July 2025): what is stored now (timing data, Rayhanah encryption and body stats, sadaqah details), what friends see (the chips, the opt-in cycle yes/no), the optional Naseeh AI and exactly what it sends, third-party services, retention, and your controls. English and Bengali.
- **About page** lists Hifz, Rayhanah and Naseeh and the current Noor description.

## v5.47.0 - Offline listening timer, Rayhanah cycle page tidy-up, leaderboard chips - 2026-09-20

### Fixed

- **Listening offline no longer runs the session timer.** In the installed app with no connection, pressing Play left the button buffering forever but the session clock kept counting and a session appeared in history. Time now only counts while sound is actually playing (not while buffering, stalled, errored or after a rejected play).
- **"5/0 prayers" on the leaderboard.** Between midnight and Fajr the tracking day is still yesterday, but the clock said no prayer was due yet. All five are now due for that day, and the chip can no longer show fewer prayers due than done.
- **Friends who share their cycle status** no longer show the prayer and fasting chips (they were paused/synthetic for her and only confusing).

### Changed

- **Rayhanah Cycle page**: madhab choice and discreet mode moved into the settings drawer; the cycle history list and the three average/period/cycles KPI cards were removed (Analytics has them); "Your fiqh companion" is now at the bottom of the page.
- **Cycle history on Analytics** gained the edit button (adjust dates, or clear the end date to reopen a cycle) beside delete. The edit dialog is now a shared component.

## v5.46.0 - Audit of the v5.43-5.45 batch: analytics ranges, session history, Rayhanah settings, quick log - 2026-09-20

A second pass over everything added in v5.43.0 to v5.45.0 (whose changelog entries were never written; that work is summarised at the bottom). Logic errors found and fixed:

### Fixed

- **Salat analytics range now behaves like a real window.**
  - Debt chart followed "today" instead of the selected period, so a past month charted the wrong days. It now ends on the period's last day.
  - New accounts were graded on days before they existed (a fresh account looked like hundreds of missed prayers on 1y). Analytics now start at account creation, first log or last reset, whichever is latest.
  - The 90d / 1y views only ever showed their last 12 weeks. Trend charts now use up to 12 buckets that cover the whole window.
  - Added 7d and All time (the server accepted at most 365 days). The reset note showed raw `{{actual}}` placeholders and is now filled in.
- **Quran analytics "All time" returned an error** (the request asked for 3650 days, the API allowed 365). The page now asks for an explicit from/to window, so a past month is that month and all-time is charted per month. The "Time of day" card no longer carries the "Quran sessions" title.
- **Listening session showed 7:06 AM to 10:30 AM for 4 minutes** after falling asleep with audio playing. The end time was the moment the page was left, not the last moment audio actually played. Sessions now end at the last active second.
- **Zikr session history and manual logs.**
  - "Log missed counts" no longer pretends to happen at 12:00 pm. Those counts are stored as untimed manual entries: they count for the day and appear as one "Manual log" row, but never as a clock time and never in the time-of-day chart.
  - Tasbih and Ayatul Kursi added automatically by the salat tracker (and "set count" corrections) count toward totals but are no longer logged as a zikr session, so ticking 303 zikr after salat no longer looks like a burst of counting.
  - Sessions record when tapping really began and ended instead of when the request was sent, and a failed sync retries on its own and when the app returns to the foreground (installed full-screen use could leave taps unsent until the next tap).
- **Quick log accuracy.** Counts land in the tracking day the note is about (Fajr-aware), duplicate dhikr lines merge, names match the user's existing dhikr case-insensitively, and a brand-new name is flagged "new dhikr" in the preview. Re-marking a prayer already done no longer wipes its tasbih / Ayatul Kursi ticks or timing. "Yesterday" / "last night" is understood (with a Today / Yesterday switch in the preview), "1 juz" is about 208 ayat instead of 1 page, and "half a page" is 5 ayat instead of 10. The floating button is hidden on the zikr counter so it can't be hit mid-count.
- **Missing translations.** About 30 strings had no entry in either language and fell back to English (zikr analytics stat cards and headings, Naseeh page, BMI card, salat journey title). Salat chart info text updated for the new bucketing, in Bengali too.

### Added

- **Rayhanah settings drawer** (shared by the Cycle and Analytics pages): height and weight (metric or ft/lbs, remembered), remove-my-data button, madhab, and a switch to hide the BMI card. Height and weight stay AES-256-GCM encrypted; clearing removes the ciphertext. BMI card notes that BMI isn't reliable in pregnancy, and its category wording is gentler.
- **Quran analytics KPIs:** time reading, time listening, sessions (read / listen) and active days for the selected range. The range picker (this month by default, last 30 days, all time, any month) now drives the chart and the KPIs.
- **Zikr session history note** explaining what is and isn't a timed session.
- New regression tests for session/manual rules, salat range floor and all-time window, Quran range totals and quick-log commit/parse.

### Summary of v5.43.0 - v5.45.0 (previously unlogged)

- v5.43.0: Rayhanah back/forward day navigation for "How are you today?" during an active period; encrypted height/weight (BMI) storage; Quran range picker and idle-session note.
- v5.44.0: dedicated Naseeh AI page, floating quick-log button, ⓘ explanations on Salat, Zikr and Quran charts with Bengali translations.
- v5.45.0: right-side drawer for BMI, BMI card in Rayhanah analytics, Naseeh moved to the profile menu and removed from Home.

## v5.42.3 - Reading timer pauses while the share modal is open - 2026-09-19

### Changed

- **Designing an āyah share card no longer counts as reading time.** The Quran Reader's session timer now pauses while the share modal is open and resumes when it closes. The reading-session hook gained a `paused` option for this.

## v5.42.2 - Āyah share card: long āyahs fit the frame - 2026-09-19

### Fixed

- **Long āyahs (e.g. 2:282) no longer end up tiny, cut off and lost in empty space.** The card now measures its own text and fits it to the frame instead of guessing from character counts. The Arabic is always shown in full and as large as fits. If everything can't fit, it keeps the Arabic plus the first translation (dropping transliteration and extra translations), and only then trims the translation with a fade. Translations keep a readable minimum size even when the Arabic has to shrink. Short and medium āyahs are unchanged.

## v5.42.1 - Founder mailbox moved to Email Istiak, sync paused - 2026-09-19

### Changed

- **Founder mailbox moved** from the Feedback page to the Email Istiak (compose) page as a "Founder mailbox" tab. The Feedback page is back to app-form messages only.
- **Mailbox sync is now off by default.** Zoho's free plan has no IMAP, so nothing connects to Zoho unless `MAILBOX_SYNC_ENABLED=1` is set on the server. While off, the tab shows a "paused" notice and lists only what was already synced. To be enabled once a paid Zoho plan is added.

## v5.42.0 - Founder mailbox sync + calmer email copy - 2026-09-19

### Added

- **Founder mailbox sync.** Mail sent to istiak@bustandeen.com from any outside client now shows up in the admin Feedback panel under a new Servant-only "Founder mailbox" tab. New mail is pulled over IMAP when the tab opens or on "Sync now", deduplicated by Message-ID, with quoted reply history trimmed. Replies are sent from istiak@ and thread correctly in the sender's mail client; Archive, Mark replied and Delete (panel copy only) work as on app forms. Mail that replies inside one of our own feedback threads is flagged. Needs IMAP enabled on the Zoho account; uses `ISTIAK_IMAP_USER`/`ISTIAK_IMAP_PASS` (falls back to the `ISTIAK_SMTP_*` pair) and optional `ZOHO_IMAP_HOST`.

### Changed

- **All predefined emails rewritten** in a calmer, warmer, more personal voice (donation received/verified/rejected, donor appreciation, zikr request received/approved/rejected/duplicate, feedback/contact received, welcome, re-engagement). No em dashes, and every one now closes with "Nourish Your Deen". The zikr library link is inserted above the sign-off so the tagline stays last. Subjects lost their dashes too (existing threads are unaffected, they thread by headers).

## v5.41.0 - Āyah share card: design studio - 2026-09-19

### Added

- **Background graphics.** Six tiled/radiating patterns (Star, Lattice, Dots, Waves, Rays, None) and six decorations (Frame, Corners, Arch, Mosque skyline, Crescent and stars, None), each independent, with a Subtle/Medium/Bold strength control. Drawn as inline SVG in the theme accent so image capture stays faithful.
- **More themes and a custom colour.** Four new themes (Ocean, Rose, Forest and a light Ivory) plus a colour picker that builds a dark theme from any accent.
- **Card shapes.** Square (1080×1080), Portrait (1080×1350) and Story (1080×1920). Font sizing and line limits adapt to the frame so long āyahs still fit.
- **"Surprise me"** picks a random theme, pattern, decoration and strength.
- **Remembered design.** The whole combination is saved on the device (the old theme-only setting is carried over).

### Changed

- The āyah reference is now a pill badge in the theme accent.
- Bengali translations use a Bengali-first font stack with slightly larger text and looser line height.
- A translation that gets cut off now fades out on its last line instead of ending in a bare ellipsis.

## v5.40.2 - PWA polish: colours, iOS home-screen support, service-worker file fallback - 2026-09-19

### Fixed

- **Mismatched PWA colours.** The manifest's `theme_color`/`background_color` were leftovers from an older design (dark green / near-black) while the app itself paints `#1a1812`, so installed users saw the wrong colour on the install splash screen and standalone title bar. Both now use `#1a1812`.
- **iOS "Add to Home Screen".** Added the apple-touch-icon, standalone/web-app meta tags, app title and an opaque status bar. Without them iOS used a page screenshot as the icon and opened in a browser-like frame.
- **Service worker returned the app shell for real static files.** For anyone with the worker installed, opening `sitemap.xml`, `robots.txt`, `llms.txt` or the Search Console verification file in a browser showed the app instead of the file. Navigations to any path with a file extension now bypass the SPA fallback. Crawlers don't run service workers, so search indexing was never affected.

### Notes

- A responsive audit of ~45 pages at 320px (public and signed-in) found no horizontal overflow or clipped layouts; no layout changes were needed.

## v5.40.1 - Fix: Home page Zakat Calculator used the wrong UI - 2026-09-18

### Fixed

- The Home page's "Islamic Library" row linked its Zakat Calculator card straight to the public `/zakat-calculator` SEO page, so it rendered with that page's own SEO-tree chrome (different header/footer, different styling) instead of the app's normal UI - inconsistent with the other three cards, which already had proper in-app versions. Added `/library/zakat-calculator`, an app-chrome page (`ZikrLibrary`-style `Navbar`/`Footer`/`AnimatedBackground`, `noindex`) with the exact same calculator logic and the same vetted copy (reused directly from `seo/locales/chrome.ts`'s `zakat` object, not re-translated) - same content, right chrome. Home page card now points there instead.

## v5.40.0 - SEO fixes from real GSC/GA4 query data - 2026-09-18

### Added

- **`/ramadan-calendar` index page** (en/bn/ar) - a proper hub for the broad "ramadan calendar {year}" search term, which Search Console showed getting real impressions (15 in the last 28 days) with nowhere good to land - every existing page was a specific city, none of them a sensible match for a bare "ramadan calendar 2027" query. Search box (client-side, filters the same 1,445-city dataset the per-city pages use) plus a curated popular-cities shortlist. Own sitemap entry, hreflang, JSON-LD.
- **Qibla FAQ entry on "What is a Qibla compass"** (en/bn/ar) - the Performance report showed real impressions for `qibla compass`, `kaaba compass`, `mecca compass`, `kaaba direction`, `direction kaaba compass` etc., all landing around position 70-99 (page 7-10) despite the page already targeting "Qibla direction" reasonably well. Added an explicit FAQ answer using those synonyms so the page has a direct on-page match for that query family, on every `/qibla` and `/qibla/{city}` page.
- **Ramadan Calendar added to the SEO footer nav** (`Layout.tsx`) - it was missing entirely from the cross-link row every other SEO page has (prayer times, qibla, du'as, adhkar, hijri converter, asma ul husna, zakat calculator all linked each other; ramadan-calendar pages linked nowhere). Better internal linking helps Google discover and re-crawl the ~4,300 ramadan-calendar city pages faster.

### Notes

- Full read of the GSC Performance/Coverage exports and the GA4 landing-page cut: see `archive/seo-live-links.md` note and project memory for the complete findings (country/device split, which queries are actually landing clicks, why most of the "not indexed" bulk is just new-domain patience, and what's NOT fixable by a content change - competitive broad terms like "qibla compass" need authority/backlinks over time, not more on-page tweaks).

## v5.39.0 - In-app Du'a/Adhkar/Asma ul Husna library + home page utilities row - 2026-09-18

### Added

- **`/library/duas`, `/library/adhkar`, `/library/asma-ul-husna`** - authenticated-app-chrome versions of the public SEO content (`Navbar`/`Footer`/`AnimatedBackground`, not the SEO tree's standalone `Layout.tsx`), reusing the exact same verified data (`seo/content/duas.ts`, `adhkar.ts`, `asmaUlHusna.ts`) so there's a single source of truth for the content itself. All three are search-friendly-free (`noindex` via `<Seo index={false} />`) - the public `/duas`, `/adhkar/*`, `/asma-ul-husna` pages stay the only ones meant to rank.
  - Du'a Library: search + accordion, expands to Arabic/transliteration/translation/source per situation.
  - Adhkar: morning/evening toggle, plus a tap-to-count badge per item (local session state only, not persisted or wired into the zikr pipeline - that's the separate, bigger "guided adhkar session" item still open in TODO-v3.md).
  - 99 Names of Allah: search + card grid, same content and sourcing note as the public page.
- **Home page "Islamic Library" section** - a new 2x2 card row (Du'a Library, Adhkar, 99 Names of Allah, Zakat Calculator) placed directly after the existing Friends & Leaderboard card, per the user's requested placement. The Zakat Calculator card links straight to the existing public `/zakat-calculator` (already fully interactive - no need for a second in-app copy).

### Notes

- Closes out the "in-app hub" + "one-stop utilities row" work deferred from v5.38.0.

## v5.38.0 - New tagline, Zakat calculator and Asma ul Husna SEO pages - 2026-09-18

### Changed

- **New tagline: "Nourish Your Deen"**, replacing "Grow Your Garden of Good Deeds" across every surface that carried it (page `<title>`, OG/Twitter meta, JSON-LD, the generated OG image, both `en`/`bn` locale files, the SEO tree's own chrome strings in all three languages, About/AuthAction copy, and the `connectPreview` fallback + its test). Bengali/Arabic translations use nurture-oriented verbs (`সমৃদ্ধ করুন` / `نمِّ دينك`) rather than a literal "garden" translation.
- **No more em dashes in new copy** - going forward, user-facing text uses a plain hyphen or no dash at all. Applied across everything touched this session; the ~2,268 pre-existing em dashes elsewhere in the app are a separate, deliberately out-of-scope cleanup (see TODO-v3.md).

### Added

- **`/zakat-calculator`** (en/bn/ar) - nisab by gold or silver standard (reader's choice, with the Hanafi-vs-majority reasoning spelled out), a personal-use-jewelry disclosure toggle, an assets/debts form (cash, gold, silver, business inventory, receivables, liabilities), and a ḥawl tracker that computes the actual Hijri-calendar anniversary of a given start date (reusing `toHijri`/`hijriToGregorian` from the SEO tree's `calc.ts`) rather than a rough 354-day approximation. Metal prices are a static, dated snapshot (not a live feed - no metals-price API exists in this app) with a visible "last checked" date. Explicitly excludes any inheritance/farāʾiḍ (Mirath) calculation - out of scope per the liability concern already logged in TODO-v3.md.
- **`/asma-ul-husna`** (en/bn/ar) - the 99 Names of Allah, Arabic + transliteration + meaning, with live search/filter. Sourcing note distinguishes the authentic core hadith (Sahih al-Bukhari 7392, Sahih Muslim 2677) from the specific enumerated list commonly cited via Jami' at-Tirmidhi 3507, which a number of hadith scholars (Ibn Taymiyyah among them) hold to be a later addition rather than the Prophet's ﷺ own wording.
- Both pages follow the existing programmatic-SEO pattern exactly: static pre-rendered routes via `scripts/prerender.mjs`, their own `sitemap-utilities.xml`, hreflang alternates, breadcrumb + WebPage/FAQPage JSON-LD, and cross-links from every other SEO page's footer.

### Notes

- Bengali/Arabic strings in the new pages (asma ul husna meanings, zakat calculator copy) are working translations, not yet reviewed by a native speaker - same standing caution as the rest of the app's non-English content.
- An in-app (authenticated, interactive) Du'a library/Adhkar/Asma ul Husna hub, plus a "one-stop utilities" home page section, was scoped in this session but deliberately deferred - see TODO-v3.md.

## v5.37.0 - Admin user management: manual welcome email, fixed inactivity tracking, custom email - 2026-09-18

### Changed

- **Welcome email is no longer sent automatically on first sign-in.** It's now fully admin-triggered from the user detail page: click "Send welcome email," review/edit the predefined subject and body (e.g. to call out something specific to that person — a first international user, etc.), then confirm — same draft-then-confirm pattern the re-engagement email already used. The old one-click "resend welcome email" is replaced by this editable flow (`GET/POST /api/admin/users/:uid/welcome-draft|welcome-send`). The existing bulk "welcome backfill" tool (for accounts that predate the welcome-email feature entirely) still exists but is now scoped to accounts created before this change, so it can't sweep up new signups with the generic template.
- **Fixed a real "days inactive" bug**: it was computed from Mongoose's generic `updatedAt`, which several admin actions (resending welcome email, disabling/enabling a user) unintentionally bumped — so doing any of those made an inactive user falsely look active again, resetting the re-engagement counter to 0. Added a dedicated `User.lastActiveAt`, set only by genuine activity (zikr increments, sign-in) and never by admin writes. `getDaysInactive`, the user list's "most inactive first" sort, and the detail page's "Last active" all now read from it.
- **User summary no longer shows "zikr types tracked."** That was a bare count of the user's own custom zikr types — their data, not something the admin needs for a journey overview.
- Re-engagement emails now include the app URL (`bustandeen.com`) in the body.

### Added

- **Re-engagement send tracking**: `User.reengagementEmailSentAt`/`reengagementEmailCount`, shown on the user detail page (last-sent date + total count) so the admin isn't drafting blind — sending one is explicitly noted as not meaning the user came back.
- **Custom email section** on the user detail page — a fully free-form subject/body email to one user, for anything outside the welcome/re-engagement templates (`POST /api/admin/users/:uid/custom-email`).

### Notes

- The founder-email request (seeing/replying to emails sent directly to istiak@bustandeen.com from the admin panel) turned out to need a real Zoho mailbox sync that doesn't exist yet — the current "Feedback & Contact" panel only shows in-app form submissions, never real inbox mail. Deferred to its own session; full scope logged in `TODO-v3.md`.

## v5.36.0 — Quran time-of-day chart; listening now tracked as sessions too — 2026-09-18

### Added

- **Follow-up to v5.35.0**: Quran Analytics gained a "Time of day" chart (reusing the zikr counter's own `TimeOfDayChart` component) — a 24-hour bar chart of when active Quran time (reading + listening combined) actually happens, aggregated from session data over the last 30 days. A session's whole duration is attributed to the local hour it started in.
- **Listening now creates sessions too**, not just reading — the audio player (`QuranAudioPlayer.tsx`) tracks its own session the whole time the Listen page is open, tagged `source: 'listen'` in the same `QuranReadingSession` collection the Reader already writes to (`source: 'read'`), so the "Quran sessions" history list (renamed from "Reading sessions") now shows everything in one place — nothing is left out. A listening session's active/paused state is driven by whether audio is actually PLAYING, not tab visibility or interaction — unlike reading, background/screen-off playback still counts as active listening, and pausing the audio (even with the tab in the foreground) correctly stops the clock. A small ⏱/⏸ badge on the Listen page mirrors the Reader's timer. Ayāt already credited by listening (the existing "count listening as āyāt" feature) now also register on the session, so listened surahs/āyāt show up in that session's history row.
- New `GET /api/quran/time-of-day?days=&timezoneOffset=` endpoint (mirrors `zikr.service.ts`'s `getTimeOfDayDistribution`) and a `source: 'read' | 'listen'` field on `QuranReadingSession` (defaults `'read'` — existing rows unaffected).

## v5.35.0 — Quran reading sessions: live timer + session history — 2026-09-18

### Added

- **A live reading timer on the Quran Reader**, and a session-history list on Quran Analytics — the same "session history" concept the zikr counter already has, applied to Quran reading. A small ⏱/⏸ chip next to the surah/juz/today-count chips shows active reading time for the current visit; it pauses (⏸) the instant the tab is hidden or backgrounded, and after 2 minutes with no scroll/tap/key interaction — so leaving the app open on a screen doesn't inflate the number. That idle grace period widens to 5 minutes while the tafsir panel is open, since reading tafsir often means minutes of stillness while genuinely still reading. Time resumes counting the moment you interact again; nothing is lost, it just stops padding the clock while you're away.
- One continuous visit to the Reader is tracked as a single session (surah navigation within that visit doesn't split it), checkpointed to the backend roughly every 20 seconds and finalized on tab-hide/close (`pagehide`, mirroring the zikr counter's own `keepalive`-flush pattern) or on leaving the page — so a crash or force-close loses at most ~20 seconds, not the whole session. New `QuranReadingSession` collection (backend) upserted idempotently by a client-generated session id, `POST /api/quran/session` + `GET /api/quran/sessions?date=`; `QuranLog` gained a `durationSec` rollup field for daily totals. Sessions under 10s are hidden from the history list (accidental taps into the reader) but still contribute their seconds to the daily total.
- **Quran Analytics** gained a "Reading sessions" section — a date picker plus a list of that day's sessions (time range, duration, surahs touched, āyāt read), directly mirroring the zikr counter's existing session-history UI.

### Notes

- Scoped to the ayah-by-ayah Reader only (not the audio Listen tab) and to the timer/session-history pair — kept intentionally smaller than full parity with the zikr counter's analytics page (no reading-time trend chart or time-of-day chart yet); the existing āyāt/khatm streak is unchanged, reading time is a new, separate metric alongside it.

## v5.34.0 — Sadaqah virtue days on the homepage; Jumu'ah sunnah citation fix; Quran settings sync — 2026-09-18

### Added

- **Sadaqah virtue day card on the homepage.** A persistent card (styled like the existing Islamic special-day widget, not auto-dismissing like the reminder it replaces) surfaces on Friday, Ramadan, the first 10 days of Dhul Ḥijjah, Arafah, and Laylat al-Qadr — each with its own heading, short explanation, and a citation, linking straight to `/sadaqah`. Friday's copy is explicitly attributed to Ibn al-Qayyim's own teaching in *Zād al-Maʿād* (paired with the authentic "charity does not decrease wealth" ḥadīth, Ṣaḥīḥ Muslim 2588) rather than presented as a standalone Prophetic ḥadīth, since it isn't one. Replaces `SadaqahFridayReminder.tsx`, which only covered Friday and auto-hid after 30 seconds. New `frontend/src/utils/sadaqahVirtueDays.ts`, `frontend/src/components/SadaqahVirtueCard.tsx`.
- **Quran settings now sync across devices.** `arabicFont`, all four text-size sliders, the transliteration toggle, "count listening as āyāt," default reciter, and translation picks were localStorage-only — a genuinely different phone and laptop always looked different. `QuranProfile` (backend) gained these fields plus a `displayPrefsSet` flag; opening Quran settings for the first time after this update either pushes that device's existing local prefs up (if nothing has synced yet) or pulls the already-synced values down (if another device got there first) — never silently overwrites a real prior customization with factory defaults. Every subsequent change (debounced for the sliders) pushes to the server. `PATCH /api/quran/profile` extended accordingly; localStorage stays the fast synchronous read path everywhere else in the reader, now backed by the server instead of being the only copy.

### Fixed

- **Jumu'ah's sunnah prayer guidance cited the wrong ḥadīth entirely.** Friday's Dhuhr slot (Jumu'ah replaces Dhuhr, tracked internally as the same `PrayerId`) was falling back to Ẓuhr's own rawātib guidance — "4 rakʿah before / 2 rakʿah after, Ṣaḥīḥ Muslim 728" — but hadith 728 is Umm Ḥabībah's narration about Ẓuhr's daily rawātib and says nothing about Jumu'ah. Verified against sunnah.com and added a dedicated `JUMUAH_SUNNAH_GUIDE`: the 2-rakʿah-after figure is correctly Ibn ʿUmar's report of the Prophet's ﷺ own practice of praying 2 at home after Jumu'ah (Ṣaḥīḥ Muslim 882 / Ṣaḥīḥ al-Bukhārī 937) — distinct from Abū Hurayrah's 4-rakʿah-anywhere ḥadīth (Ṣaḥīḥ Muslim 881), which the note now mentions as the alternative. The 4-rakʿah-before figure is relabeled from "confirmed" to "recommended," since (unlike Ẓuhr's) no ṣaḥīḥ ḥadīth prescribes a specific rakʿah count before Jumu'ah itself — it's Ḥanafī tradition via a companion's practice and qiyās with Ẓuhr, not a direct Prophetic sunnah.
- **On small screens, Quran settings were buried inside the room-picker dropdown** instead of being reachable in one tap like the desktop pill row's gear icon. `QuranTabNav.tsx` now shows the gear icon beside the menu button at every width.
- **The Quran streak badge showed on the homepage even with no daily goal set,** where a "streak" isn't really meaningful (it would just mean "read at all that day"). Now hidden until `dailyGoalAyat > 0`, matching zikr/salat's badges, which always have an implicit goal.

## v5.33.3 — Fix: silent email failures on donation/zikr review actions; āyah photo-card overflow — 2026-09-18

### Fixed

- **Verifying/rejecting a donation, or approving/rejecting a zikr suggestion, could silently mark it done even when the notification email failed to send** (SMTP misconfigured, etc.) — `sendMail`'s return value was ignored, same underlying gap as the feedback-reply bug fixed in v5.33.1. Unlike feedback (where replying IS the entire action), a verify/reject/approve is a real administrative fact independent of whether the recipient got notified — verifying a donation the admin actually checked, or adding an approved item to the zikr library, shouldn't get rolled back just because an email bounced. So instead of throwing and blocking the action, `verifyDonation`/`rejectDonation`/`approveRequest`/`rejectRequest` now return an `emailSent` flag alongside the record; the admin panel shows a toast warning ("Saved — but the email failed to send") when it's `false`, and it's logged on the audit-log entry (`metadata.emailFailed`), so a real send failure is surfaced instead of silently swallowed, without blocking the real decision. Covered by new assertions in the existing e2e suites.
- **Long āyah share cards could overflow their fixed 1080×1080 frame.** `AyahShareCard.tsx` used hardcoded font sizes with no overflow handling — a long āyah (e.g. 2:282, the Qur'an's longest) combined with a translation could exceed the frame, and `html-to-image` (the capture library) has no scroll/reflow to compensate. Font sizes now scale down based on total content length, and translations get a line-clamp safety cap (the Arabic verse itself is never truncated). Not visually verified in-browser this session — see `TODO-v3.md`'s "Ayat sharing" section for the follow-up note and a list of separate design-improvement ideas (verse-number badge, background pattern, per-language typography, story-ratio variant) queued for a future pass, not built.

## v5.33.2 — Fix: same Gmail-thread-merge bug in sadaqah and zikr-suggestion emails — 2026-09-18

### Fixed

- **Follow-up to v5.33.1**: the identical fixed-subject design existed in `sadaqahEmail.templates.ts` and `zikrRequestEmail.templates.ts` — a donor submitting multiple separate donations, or a user submitting multiple separate zikr/dua suggestions, would have had each new submission's emails silently merge into the previous one's Gmail/Outlook thread, for the same reason feedback did. Every subject (received, the verify/reject reply, approved/rejected, and the admin-notify copies) now embeds a short ref derived from the record's own id (e.g. `[#A1B2C3]`), same convention as feedback's `feedbackRef`. Covered by two new unit test files (`sadaqahEmail.templates.unit.test.js`, `zikrRequestEmail.templates.unit.test.js`) asserting distinct subjects per record id, including the identical-donor/identical-name case that used to collide. All 240 backend tests pass.

## v5.33.1 — Fix: feedback threads merging in Gmail; compose tool can now reply from the inbox — 2026-09-18

### Fixed

- **Multiple feedback/contact submissions from the same person collapsed into one Gmail thread.** Every submission's confirmation email used the exact same subject line per `kind` (e.g. always "We received your feedback — Bustandeen"), and the admin-notify copy used the same fixed pattern per category. Gmail/Outlook group conversations by (normalized subject + participants) whenever there's no `In-Reply-To`/`References` linking them elsewhere, so a second unrelated submission from the same email address silently merged into the first one's thread even though each submission already had its own unique Message-ID under the hood. Every subject (received, reply, and the admin-notify copy) now includes a short ref derived from the submission's own id (e.g. `[#A1B2C3]`), so each submission gets its own thread end to end.
- **A reply from the Feedback inbox (or the compose tool, see below) could mark a message "replied" even when the email silently failed to send** (e.g. SMTP credentials unset) — `sendMail` never throws, it just returns `null` on failure, and that return value was previously ignored. Both reply paths now check it and return a loud `502` instead, leaving the message `open` so it isn't lost.

### Changed

- **"Email Istiak" compose tool now has a "Reply to someone who wrote in" mode** instead of only a free-form "type any address" box. It lists everyone who's submitted feedback/contact (searchable, filterable by status), and picking one opens a reply that's threaded onto that exact submission — same Message-ID chain and ref-tagged subject as the Feedback inbox's own Reply button, just sent under the founder's own name (`istiak@bustandeen.com`) instead of the system `ansar@` mailbox. The original free-form "custom recipient" mode is still available as a separate tab for anyone not already in that list. Sending a threaded reply here also flips that submission's status in the Feedback inbox, same as replying from there directly.

## v5.33.0 — Compose-to-founder tool, external-reply status sync — 2026-09-18

### Added

- **"Email Istiak" compose tool** (Servant-only, under Tools): a free-form send-to-anyone form that always goes out from `istiak@bustandeen.com`, for anything that needs the founder's own name attached instead of a system mailbox (`sadaqah@`/`ansar@`). Unlike the app's other draft-then-confirm emails there's no auto-generated text — the compose form itself is the editable draft — but it still has an explicit "Review & send" step showing exactly the To/Subject/Body before the irreversible send, and every send is written to the Audit Log with the sending admin's tag, which a reply sent directly from the Zoho mail app never is.
- **"Mark replied (sent via Zoho)" on Feedback**: an open feedback/contact message can now be marked `replied` without the app sending anything — for when you've already answered someone directly from the Zoho mail app instead of this panel. Only changes the tracked status (+ `repliedBy`/`repliedAt`, logged to the Audit Log as `feedback.markRepliedExternal`); does not apply to donation verify/reject or zikr-request approve/reject, since those actions change real underlying state (a verified amount, an approved library entry) that only happens by using the panel — there's nothing to "sync" there regardless of which mailbox you replied from.

### Fixed

- Diagnosed the `ansar@bustandeen.com` sender showing "missing" on System & ops health: `ANSAR_SMTP_USER`/`ANSAR_SMTP_PASS` are not set on the production environment (no code defect — `sadaqah` and `istiak` are both configured and working). Needs the two env vars set in Vercel to the mailbox's address and Zoho app password.

## v5.32.1 — Fix: `published` field on quarterly Sadaqah entries was never actually persisted — 2026-09-17

### Fixed

- **The `published` flag on `quarterlyBreakdown` entries was declared on the TypeScript interface but never added to the actual Mongoose schema**, so `strict: true` silently dropped it on every save — publishing or unpublishing a quarter never wrote the field to the database at all (not `false`, entirely absent). v5.32.0's `published !== false` check masked the symptom on read (a missing field correctly read as "published"), but the field genuinely never persisted, which meant `listQuarterly()`'s admin badge and any future explicit `unpublish` would have been unreliable. Added `published: { type: Boolean, default: true }` to the schema's inline `quarterlyBreakdown` subdocument definition. Caught via the backend test suite (`npm test`), which had not been run before the v5.32.0 push — 3 tests for the old quarterly-report endpoint shape were also failing after that release's API redesign (`/preview`, `/publish`, `/unpublish` replacing the old manual-entry `PATCH`); rewrote them to match the new endpoints. All 213 backend tests now pass.

## v5.32.0 — Admin panel: layout/UX fixes, Sadaqah publish workflow, donor & re-engagement email, user inactivity — 2026-09-17

Follow-up batch after a hands-on review of v5.29–v5.31 surfaced several real bugs and requested a Sadaqah workflow redesign.

### Fixed

- **Zikr audio tracker showed 13 already-live recitations as "missing."** It only checked the new admin-managed `ZikrAudioAsset` collection, never cross-referencing the pre-existing bundled-file map (`utils/zikrAudio.ts`) the counter's playback already uses. Now correctly shows those as "bundled in app" and only flags the real gap (8 remaining, matching the known content backlog).
- **Admin "Tools" dropdown menu was invisible (clipped).** `overflow-x: auto` on the tab row implicitly set `overflow-y: auto` too (an unset axis computes to `auto` once the other axis isn't `visible`), silently clipping the dropdown panel's vertical overflow. Moved the dropdown to a sibling of the scrollable tab strip instead of a child of it.
- **Ops Health page could hard-crash** on a stale cached bundle calling into a changed API response shape. Every field read now defaults defensively (`?? []`, `?? {}`) instead of assuming the shape.
- **Every `<select>` dropdown app-wide rendered white-on-white until hovered** (Settings, qari picker, ayat picker, admin domain pickers, etc.) — Chromium/Windows renders a `<select>`'s native option list with OS-light styling regardless of the closed box's Tailwind/DaisyUI theming. Added `color-scheme: dark` globally (this app has only one theme, never light) plus explicit `select option` colors as a fallback.
- **Real regression caught before shipping**: normalizing quarterly-report visibility around a new `published` field initially relied on Mongoose backfilling old documents' missing field via schema defaults — confirmed via direct DB inspection that this does NOT reliably happen for array-subdocuments, which would have hidden the site's only existing public "Where it has gone" entry the moment this deployed. Fixed by checking `published !== false` everywhere (treats "field absent" as published, matching every pre-existing entry's actual prior visibility) instead of a truthy check.

### Changed

- **Sadaqah admin page split into tabs** (All submissions / Expenses / Analytics) — it had grown into one very long scroll.
- **Quarterly public reporting is now compute-then-publish, not manual entry.** "Received" and "spent" are always calculated fresh from verified donations and the itemized expense ledger (`/quarterly/:quarter/preview`, read-only) — nothing is ever typed in by hand, so a published figure can't drift out of sync with the underlying records. Nothing appears on the public `/sadaqah` page until an explicit "Publish" action; "Unpublish" reversibly hides a quarter without discarding its numbers, "Delete" removes it outright.
- **Admin panel is no longer designed mobile-first.** Every `/admin/*` page's container widened (up to `max-w-[1600px]` on the shell) to use real desktop screen space — this surface is explicitly a laptop/desktop tool, not a phone one.
- Donation/zikr-request/feedback admin lists now show a **"Handled by"** actor tag using each record's existing `verifiedBy`/`reviewedBy`/`repliedBy` field.
- Servant dashboard splits **Total users** out as its own tile, next to New users this week (both were already computed server-side).
- About page: removed the GitHub repo link, replaced with a short founder note and `mailto:istiak@bustandeen.com`.

### Added

- **Donor appreciation email** (Servant-only, inside Sadaqah → Analytics): drafts a personalized thank-you for a top donor (name, total given, donation count), editable before sending — same draft-then-confirm pattern as donation verify/reject.
- **User re-engagement email** (Servant-only, on a user's detail page): drafts a gentle, non-guilting "we miss you" email mentioning how many days they've been inactive, editable before sending.
- **User inactivity sort**: `/admin/users` can now sort by "most inactive first" (server-side, across the whole user base, not just the current page) using each user's `updatedAt` as the existing "last active" proxy; the list also shows a "Last active" column.
- **Broadcast admin page** now shows a live preview of the banner plus explicit copy on exactly where it appears (top of every public page, never inside the admin panel).

## v5.31.0 — SMTP env vars standardized to one dedicated pair per sender — 2026-09-17

### Changed

- **Every email sender now has its own dedicated `<SENDER>_SMTP_USER`/`<SENDER>_SMTP_PASS` pair — no more shared/legacy fallback.** `ZOHO_SMTP_USER`/`ZOHO_SMTP_PASS` was originally sadaqah's own credential reused as a generic "shared mailbox" fallback for any sender without its own pair (see v5.30.0's sender-collision fix) — confusing and exactly how `ansar` ended up silently sending as `sadaqah@bustandeen.com`. Renamed to `SADAQAH_SMTP_USER`/`SADAQAH_SMTP_PASS`, matching the convention `ANSAR_SMTP_USER`/`PASS` and `ISTIAK_SMTP_USER`/`PASS` already used. `ZOHO_SMTP_HOST`/`PORT` remain shared (same Zoho server for the whole org). `email.service.ts`'s `getSenderDiagnostics()` and `/admin/ops-health` simplified accordingly — dropped the now-meaningless "dedicated vs. shared fallback" distinction, kept the collision check (now purely a safety net against two pairs pointing at the same address by mistake). All three real mailbox credentials verified via a live (non-destructive) SMTP `.verify()` handshake before this change shipped — no new app passwords needed, `ansar@bustandeen.com` already had one, it just wasn't paired with `ANSAR_SMTP_USER`.

## v5.30.0 — Admin panel: domain-leak fixes, sender-collision detection, navbar redesign, account disable — 2026-09-17

Follow-up to v5.29.0 after a live review surfaced real bugs in the rich-admin-panel batch.

### Fixed

- **Cross-domain nav leak on `/admin` itself.** `AdminHome.tsx`'s card grid (and stat CTAs) rendered a Sadaqah card to a general-domain Ansar and a Zikr Requests/Feedback card to a sadaqah-domain Ansar — the top nav (`AdminLayout.tsx`) was already domain-scoped correctly, but the home page's own card grid never was, going all the way back to the original v5.27.0 domain split. Every card now uses the exact same `canSeeSadaqah`/`canSeeZikrRequests` gate the nav uses.
- **Email sender collision — `ansar`-sent mail was silently going out as `sadaqah@bustandeen.com`.** Root cause: `ansar` has no dedicated `ANSAR_SMTP_USER`/`PASS` set, so it falls back to the shared `ZOHO_SMTP_USER` credential — which turns out to be `sadaqah@bustandeen.com`'s own mailbox. The display name ("Bustandeen Ansar") was correct; the actual "From" address wasn't. `email.service.ts` now exposes `getSenderDiagnostics()` (configured / using-its-own-dedicated-mailbox / resolved address), and `/admin/ops-health` shows an explicit collision warning naming exactly which senders share a mailbox and what env vars to set to fix it — this can't be fixed in code alone, it needs `ANSAR_SMTP_USER`/`ANSAR_SMTP_PASS` set in the deployment.

### Added

- **Manage Ansars: domain reassignment.** `PATCH /api/admin/accounts/:id/domain` (Servant-only) lets a Servant move an existing Ansar between `sadaqah` and `general` after creation — previously this was create-time-only. New "Domain" column with an inline selector in `/admin/accounts`.
- **Account disable/enable (Servant-only).** New `User.disabled` field, checked in `requireAuth` (every authenticated route) and `/api/auth/verify` itself — blocks sign-in immediately without touching any data, fully reversible. New actions on `/admin/users/:uid`; the frontend shows a clear "account disabled" toast and signs the user out if they're already mid-session.
- **Admin navbar redesign.** Identity/logout now sits in its own row, never wrapping into the tab row. Servant-only secondary tools (Users, Manage Ansars, Audit Log, Ops Health, Broadcast) collapsed into a single "Tools" dropdown instead of 5 extra flat tabs — an Ansar's nav now shows only what their domain can access (1–4 tabs), a Servant sees the review tabs plus one Tools menu.
- **About page:** removed the GitHub repo link at the bottom; replaced with a short founder note and a direct `mailto:istiak@bustandeen.com` link.

## v5.29.0 — Rich admin panel: audit log, feedback inbox, donor analytics, ops health, broadcast — 2026-09-17

### Added

- **Admin audit log.** New `AdminAuditLog` collection records every mutating `/api/admin/*` action (actor email/role, action, target, small metadata) — donation verify/reject/delete, expenses, quarterly edits, zikr approve/reject, library edits, account create/activate/deactivate, feedback reply/archive/delete, user resend-welcome/delete, announcement publish/deactivate. Servant-only viewer at `/admin/audit-log`.
- **Feedback/Contact inbox.** `/feedback` and `/contact` now POST to our own `POST /api/feedback` (own rate limiter) instead of Web3Forms — stored in a new `FeedbackMessage` collection and still emails the review inbox. Admin inbox at `/admin/feedback`: general-domain Ansar reads/replies (threaded)/archives; Servant additionally deletes. Web3Forms env var and client plumbing removed entirely.
- **Donor analytics.** New section inside `/admin/sadaqah` (Servant-only): repeat vs. one-off donor counts, month-over-month verified-amount trend, and a top-50 donor table cross-referencing verified donations against app `User` accounts.
- **Real dashboard numbers + role-specific landing.** `GET /api/admin/stats/overview` returns a different shape per caller's role/domain (never computes cross-domain numbers server-side). `/admin` now shows a Servant a stats hub (pending counts, verified total, new users this week); a sadaqah-domain Ansar a pending-donations hero CTA; a general-domain Ansar a pending-zikr + open-feedback hero CTA.
- **Global Zikr library management.** `PATCH /library/:id` (full-field edit) and `DELETE /library/:id`, alongside the existing category-only patch — a "Manage library" section in `/admin/zikr-requests` with inline edit/delete (Servant-only).
- **Zikr audio tracker.** New `/admin/zikr-audio` (general-domain Ansar + Servant): lists every curated and community-library zikr with audio status, and a paste-a-URL action per entry (`ZikrAudioAsset` for the curated static list, a new `audioUrl` field on `GlobalZikrLibraryItem` for community entries). Sourcing/tracking only — playback wiring into the counter is separate, unbuilt work.
- **User detail view.** `/admin/users/:uid` (Servant-only): profile summary, `updatedAt` as a free "last active" proxy, and a resend-welcome-email action.
- **User cleanup endpoint.** `DELETE /api/admin/users/:uid` (Servant-only) delegates to the existing full-purge `deleteAccount()` — single-UID only, two-click confirm in the UI, no bulk variant.
- **System/ops health page.** `/admin/ops-health` (Servant-only): a new `EmailFailureLog` (written from `email.service.ts`'s existing catch block) surfaces recent send failures per sender, plus Mongo/Firebase-Admin connectivity and per-sender SMTP-configured status.
- **Rate-limit / abuse monitoring.** A new `RateLimitHit` collection is written only when a request is actually throttled (event-driven, since Vercel serverless spreads `express-rate-limit`'s in-memory store across instances) — aggregated by limiter+path over the last 24h in `/admin/ops-health`'s second section.
- **Broadcast/announcement tool.** `/admin/broadcast` (Servant-only) publishes a single active announcement; public `GET /api/announcements/active` feeds a new dismissible `AnnouncementBanner` in the main app (per-viewer localStorage dismissal).

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
