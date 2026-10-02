---
name: Major bump day (quarterly)
about: Check the major upgrades Dependabot is told to skip, one at a time, on a Vercel preview.
title: 'Major bump day: YYYY-QN'
labels: ['dependencies']
---

<!--
Open this once a quarter (January, April, July, October). Dependabot only opens
minor/patch PRs for the packages below (see .github/dependabot.yml), so nobody
is reminded when a new major ships. One package (or pair) = one branch = one PR,
merged with a merge commit. Skip a row with a reason rather than leaving it open.
-->

## Before you start

- [ ] `main` is green and up to date; note its version here: `v_._._`
- [ ] Find each package's current and latest version:
      `npm outdated --prefix frontend` and `npm outdated --prefix backend`
- [ ] Read each changelog / migration guide before touching code.
- [ ] Remember `backend/.env` points at the **LIVE** database: test against the Vercel
      preview (and demo mode) instead of a local backend wherever you can.

## Majors Dependabot skips

| Package                                                     | Workspace | Why it is skipped                                                                                                                                                                                         | Current → latest | Decision |
| ----------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| `firebase-admin`                                            | backend   | 14 crashed the Vercel function at startup (2026-09-20, reverted). Also clears the node-forge audit exception in `scripts/audit-gate.mjs`.                                                                 |                  |          |
| `react` + `react-dom` + `@types/react` + `@types/react-dom` | frontend  | Must move together; React 19 has its own breaking changes.                                                                                                                                                |                  |          |
| `react-router`                                              | frontend  | Router majors change routing APIs: `routes.tsx`, `routeGuards.tsx`, the client SEO routes (`seo/routes/ClientRoutes.tsx`) and `utils/safeRedirect.ts` (has tests). Was `react-router-dom` before v5.65.1. |                  |          |
| `vite`                                                      | frontend  | Vite 8 moves to Rolldown: check `vite.config.ts` chunking, the SSR build, `prerender.mjs`, `check-csp.mjs` and the PWA plugin.                                                                            |                  |          |
| `tailwindcss` + `daisyui`                                   | frontend  | Tailwind 4 and daisyUI 5 must move together and need the theme moved to CSS config. Pair with the design refresh (T3.2).                                                                                  |                  |          |

Also look for any other `npm outdated` row whose major changed (Dependabot does open
those, but check none is sitting unmerged).

## How to test each one on a Vercel preview

For every row you take on:

- [ ] Branch `deps/<package>-<major>`, bump, run `npm install` in that workspace
      (commit the lockfile; never only edit package.json).
- [ ] Local gates: `npm run lint`, `npm run typecheck`, `npm run format:check`,
      `npm test --prefix backend` (from `backend/`), `npm test --prefix frontend`,
      `npm run build --prefix frontend`, `npm run test:e2e --prefix frontend`.
- [ ] Push and open the PR; wait for CI and the Vercel preview.
- [ ] **Backend packages (firebase-admin):** open the preview's function logs in
      Vercel first, then hit `/api/health` and sign in on the preview. A crash at
      import time only shows in the function logs, not in CI.
- [ ] **Frontend packages:** on the preview, check the landing (`/`), `/bn`, one SEO
      page (e.g. `/prayer-times/dhaka-bangladesh`), `/zikr`, `/salat`, `/quran/read/1`,
      sign in with Google (popup), `/admin`, and the browser console for CSP errors.
- [ ] Bundle size: compare `dist/` critical JS with `main` (PERF-01 budgets).
- [ ] Version + CHANGELOG bump (root, frontend, backend in sync), then merge with a
      merge commit.
- [ ] After the production deploy, watch the Vercel logs for 15 minutes.

If a major can't land yet, write down why and the version tried, and keep its
Dependabot `ignore` entry. If it lands, remove its `ignore` entry from
`.github/dependabot.yml` in the same PR.

## Notes
