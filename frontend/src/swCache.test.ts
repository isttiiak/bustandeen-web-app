import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Audit 2026-11-16 P2-11: a cache that accepts status 0 keeps "opaque" responses, whose
// real status the service worker cannot see: an error page from another site would be
// kept as if it were the content, for weeks. Only real 200s are cached.

const sw = readFileSync(new URL('./sw.ts', import.meta.url), 'utf8');

describe('service worker caches', () => {
  it('no cache accepts status 0 (opaque responses)', () => {
    const lists = [...sw.matchAll(/statuses:\s*\[([^\]]*)\]/g)].map((m) => m[1].trim());
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      const codes = list.split(',').map((c) => c.trim());
      expect(codes).not.toContain('0');
    }
  });
});
