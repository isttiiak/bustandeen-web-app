import { defineConfig, devices } from '@playwright/test';

// Audit T2.2: browser smoke tests against the PRODUCTION build (`dist/`, served
// by `vite preview`), in demo mode, so they never need a backend, Firebase or
// the live database. Run `npm run build` first, then `npm run test:e2e`.
//
// Locally the installed Google Chrome is used (no browser download); CI
// installs Playwright's Chromium.
const PORT = 4173;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // A pinned zone and locale keep prayer-time windows and dates stable.
    timezoneId: 'Asia/Dhaka',
    locale: 'en-GB',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'], ...(isCI ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
