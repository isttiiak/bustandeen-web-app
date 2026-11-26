import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P4-1: thirteen pages were over 1,000 lines. They are being
// split one by one (pure extraction, no behaviour change), and this keeps them
// from growing back. The caps only go down:
//  - a page is at most PAGE_LIMIT lines unless it is listed in PAGE_CAPS;
//  - a listed cap is at most CAP_SLACK above the real length, so the PR that
//    shrinks a file must lower its cap too (the "cap is stale" test fails
//    otherwise);
//  - new files under components/ and hooks/ stay under PART_LIMIT, with the
//    older big ones listed at their size.
// Delete an entry when its file drops under the limit; never raise a number.

const root = fileURLToPath(new URL('.', import.meta.url));
const PAGE_LIMIT = 600;
const PART_LIMIT = 450;
const CAP_SLACK = 30;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );

const lineCount = (file: string): number => {
  const text = readFileSync(file, 'utf8');
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
};

const sizes = (dir: string): Record<string, number> =>
  Object.fromEntries(
    walk(join(root, dir))
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .map((f) => [f.slice(root.length), lineCount(f)])
  );

/** Pages over the limit, at their length when this guard was added. */
const PAGE_CAPS: Record<string, number> = {
  'pages/SalatTracker.tsx': 1828,
  'pages/RayhanahCycle.tsx': 1628,
  'pages/Settings.tsx': 1499,
  'pages/SalatAnalytics.tsx': 1416,
  'pages/QuranReader.tsx': 1360,
  'pages/Friends.tsx': 1309,
  'pages/ZikrAnalytics.tsx': 1167,
  'pages/CycleAnalytics.tsx': 1151,
  'pages/Home.tsx': 1145,
  'pages/MusafirMode.tsx': 1086,
  'pages/RamadanTracker.tsx': 1057,
  'pages/PrayerTimes.tsx': 1018,
  'pages/AdminSadaqah.tsx': 989,
  // Not part of P4-1 (under 1,000 lines), held where they are.
  'pages/FastingTracker.tsx': 960,
  'pages/ZikrCounter.tsx': 873,
  'pages/IslamicCalendar.tsx': 692,
  'pages/AdminZikrRequests.tsx': 672,
  'pages/QuranAnalytics.tsx': 627,
  'pages/Onboarding.tsx': 607,
};

/** Components and hooks over the limit, at their length when this guard was added. */
const PART_CAPS: Record<string, number> = {
  'hooks/useSalatLog.ts': 843,
  'components/calendar/DownloadSheet.tsx': 806,
  'components/Navbar.tsx': 636,
  'components/QuranSettings.tsx': 623,
  'components/ZikrLibrarySection.tsx': 580,
  'components/ShareAyahModal.tsx': 523,
  'components/RamadanSalatCard.tsx': 509,
  'components/QuranAudioPlayer.tsx': 465,
};

const pages = sizes('pages');
const parts = { ...sizes('components'), ...sizes('hooks') };

function check(
  name: string,
  actual: Record<string, number>,
  caps: Record<string, number>,
  limit: number
) {
  describe(name, () => {
    it(`no file is over ${limit} lines unless it is listed, and none is over its cap`, () => {
      const over = Object.entries(actual)
        .filter(([f, n]) => n > (caps[f] ?? limit))
        .map(([f, n]) => `${f}: ${n} lines, limit ${caps[f] ?? limit}`);
      expect(over).toEqual([]);
    });

    it('every cap names a file that still exists and is still over the limit', () => {
      const stale = Object.keys(caps).filter((f) => !(f in actual) || actual[f]! <= limit);
      expect(stale).toEqual([]);
    });

    it(`every cap is within ${CAP_SLACK} lines of the real length (lower it when a file shrinks)`, () => {
      const loose = Object.entries(caps)
        .filter(([f, cap]) => f in actual && cap > actual[f]! + CAP_SLACK)
        .map(([f, cap]) => `${f}: cap ${cap}, now ${actual[f]}`);
      expect(loose).toEqual([]);
    });
  });
}

check('page size', pages, PAGE_CAPS, PAGE_LIMIT);
check('component and hook size', parts, PART_CAPS, PART_LIMIT);
