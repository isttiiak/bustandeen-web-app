import { describe, expect, it } from 'vitest';
import main from '../main.tsx?raw';
import { NEVER_PERSISTED, shouldPersistQuery } from './persistPolicy.js';

describe('what the on-device query cache may keep', () => {
  it('keeps ordinary successful answers', () => {
    expect(shouldPersistQuery(['salat', 'log', '2026-10-15'], 'success', false)).toBe(true);
    expect(shouldPersistQuery(['quran', 'summary'], 'success', false)).toBe(true);
  });

  it('never keeps Rayhanah (cycle) data', () => {
    expect(NEVER_PERSISTED).toContain('cycle');
    expect(shouldPersistQuery(['cycle', 'summary', '2026-10-15'], 'success', false)).toBe(false);
    expect(shouldPersistQuery(['cycle', 'bodyStats'], 'success', false)).toBe(false);
  });

  it('never keeps demo answers or failed queries', () => {
    expect(shouldPersistQuery(['salat', 'log', '2026-10-15'], 'success', true)).toBe(false);
    expect(shouldPersistQuery(['salat', 'log', '2026-10-15'], 'error', false)).toBe(false);
    expect(shouldPersistQuery(['salat', 'log', '2026-10-15'], 'pending', false)).toBe(false);
  });

  it('the app uses this policy, and old caches saved with cycle data are discarded', () => {
    expect(main).toMatch(/shouldDehydrateQuery: \(q\) =>\s*shouldPersistQuery\(q\.queryKey/);
    expect(main).not.toMatch(/buster: 'v1'/);
  });
});
