import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Audit P4-1 (PR 16): the Salat tracker's tap handlers write to the server, and a guest
// (signed out) must get the sign-in sheet instead. The demo always has a user, so most
// of these cannot be driven in a browser test: this reads the source and checks that
// every handler that writes opens the sheet and returns before its first write.

// The page and the hooks its state and handlers moved into (audit P4-1, PR 16).
const FILES = [
  './SalatTracker.tsx',
  '../components/salat/useSalatTrackerState.ts',
  '../components/salat/useSalatNaflDebt.ts',
  '../components/salat/useSalatDhikrCredit.tsx',
  '../components/salat/useSalatPrayerHandlers.tsx',
];
const src = FILES.map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');

const GUARD = /if \(!user\) \{\s*setShowGuestDialog\(true\);\s*return;\s*\}/;
const WRITERS = [
  'toggleTarawih',
  'commitDebtEdit',
  'handleNaflToggle',
  'handleNaflTypeToggle',
  'handleTypeRakat',
  'handleStatus',
  'handleMissedReason',
  'setQasr',
  'joinPair',
  'toggleJoined',
  'handleSubTag',
];

/** The handler (a top-level `const x = ` in the component or hook) holding each write. */
function writes(): Array<{ handler: string; before: string }> {
  const starts = [...src.matchAll(/\n {2}const (\w+) = /g)].map((m) => ({
    name: m[1]!,
    at: m.index!,
  }));
  return [...src.matchAll(/\.mutate(?:Async)?\(/g)].map((m) => {
    const start = starts.filter((s) => s.at < m.index!).pop()!;
    return { handler: start.name, before: src.slice(start.at, m.index!) };
  });
}

describe('every Salat tracker write asks a guest to sign in first', () => {
  it('the writes are made by the known handlers only', () => {
    expect([...new Set(writes().map((w) => w.handler))].sort()).toEqual([...WRITERS].sort());
  });

  it('each write comes after the guest check in its handler', () => {
    for (const w of writes()) expect(w.before, w.handler).toMatch(GUARD);
  });

  it('there is one guest check per writing handler', () => {
    expect(src.match(new RegExp(GUARD.source, 'g'))?.length).toBe(WRITERS.length);
  });
});
