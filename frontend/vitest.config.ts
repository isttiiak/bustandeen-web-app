import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: unit tests need none of the app's
// build plugins (PWA, React refresh, env-based HTML transforms).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The fiqh suites reason in local wall-clock time (Fajr in Dhaka, "today"
    // as a civil date), so pin the zone instead of inheriting the machine's
    // (CI runs in UTC, the maintainer in Dhaka or London).
    env: { TZ: 'Asia/Dhaka' },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      // Audit T2.1: the fiqh-sensitive utils must stay at >= 90% line coverage.
      include: [
        'src/utils/musafir.ts',
        'src/utils/fastingRules.ts',
        'src/utils/trackingDay.ts',
        'src/utils/islamicCalendar.ts',
        'src/utils/salatPrefs.ts',
        'src/utils/countryDefaults.ts',
        'src/utils/geocode.ts',
        'src/utils/safeRedirect.ts',
        'src/seo/utils/calc.ts',
      ],
      // Enforced only on the fiqh rule files; the rest are reported so the
      // numbers stay visible.
      thresholds: {
        'src/utils/{musafir,fastingRules,trackingDay,islamicCalendar,salatPrefs}.ts': {
          lines: 90,
          perFile: true,
        },
      },
    },
  },
});
