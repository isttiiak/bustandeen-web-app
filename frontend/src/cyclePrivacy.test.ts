import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Rayhanah (cycle) data never goes to an AI and never to friends (CLAUDE.md).
// While the big cycle pages are split into parts (audit P4-1), this keeps every
// file that shows cycle data from importing the AI or Naseeh hooks, and from
// importing anything from the social hooks beyond the one name below. A new
// part that needs another one must say so here, with a reason.

const root = fileURLToPath(new URL('.', import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );

const CYCLE_FILE =
  /(^pages\/(Rayhanah|Cycle)[A-Za-z]*\.tsx$)|(^components\/(cycle|rayhanah)\/)|(^components\/(Cycle|Rayhanah)[A-Za-z]*\.tsx$)|(^utils\/cycle[A-Za-z]*\.ts$)/;

/** Modules a cycle file must never import at all. */
const AI_MODULE =
  /from\s+['"](?:\.\.?\/)+(?:hooks\/(?:useAi|useNaseeh|useCycleAiGate|useNaturalLog|useInsights)|components\/ai\/)[^'"]*['"]/;

/**
 * The only names a cycle file may take from the social hooks: the friends list,
 * which the opt-in "share my status with one friend" picker needs. The cycle
 * data itself goes out through the cycle API, never through a social hook.
 */
const SOCIAL_ALLOWED = new Set(['useFriendsList']);
const SOCIAL_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"](?:\.\.?\/)+hooks\/useSocial[^'"]*['"]/g;

const cycleFiles = walk(root)
  .map((f) => f.slice(root.length))
  .filter((f) => CYCLE_FILE.test(f) && !/\.test\.tsx?$/.test(f));

const socialNames = (source: string): string[] =>
  [...source.matchAll(SOCIAL_IMPORT)].flatMap((m) =>
    m[1]!
      .split(',')
      .map((n) => n.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
  );

describe('cycle privacy', () => {
  it('finds the cycle files', () => {
    expect(cycleFiles).toContain('pages/RayhanahCycle.tsx');
    expect(cycleFiles).toContain('pages/CycleAnalytics.tsx');
    expect(cycleFiles).toContain('utils/cycleStats.ts');
    expect(cycleFiles).toContain('components/cycle/useCycleAnalyticsPage.ts');
  });

  it('no cycle file imports an AI hook', () => {
    const offenders = cycleFiles.filter((f) => AI_MODULE.test(readFileSync(join(root, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('no cycle file takes anything from the social hooks but the allowed names', () => {
    const offenders = cycleFiles.flatMap((f) =>
      socialNames(readFileSync(join(root, f), 'utf8'))
        .filter((n) => !SOCIAL_ALLOWED.has(n))
        .map((n) => `${f}: ${n}`)
    );
    expect(offenders).toEqual([]);
  });
});
