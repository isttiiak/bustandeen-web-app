import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jsonLdString } from './components/JsonLd.js';

// JSON written inside a <script> must not contain a raw "<": "</script>" in any text would
// end the block early (audit P2-11). The templates use jsonLdString; scripts/prerender.mjs
// builds the landing FAQ JSON-LD itself. It had `.replace(/</g, '<')`, which in a JS
// string replaces "<" with "<" (found by CodeQL js/identity-replacement, 2026-11-27).

const prerender = readFileSync(new URL('../../scripts/prerender.mjs', import.meta.url), 'utf8');

describe('JSON-LD never carries a raw "<"', () => {
  it('jsonLdString writes "<" as \\u003c and still reads back as the same data', () => {
    const data = { text: 'a </script><b>' };
    const out = jsonLdString(data);
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual(data);
  });

  it('every "<" replacement in prerender.mjs writes the escape, not "<" again', () => {
    const calls = [...prerender.matchAll(/\.replace\(\/<\/g,\s*'([^']*)'\)/g)].map((m) => m[1]);
    // '\\u003c' in the source is the six-character escape; '\u003c' is "<" itself.
    expect(calls).toContain('\\\\u003c');
    expect(calls).not.toContain('\\u003c');
  });
});
