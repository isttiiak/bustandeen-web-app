import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Fasting: the tracker, analytics and their parts draw SVG icons only,
// and their copy has no emoji or em dashes (quoted narrations excepted).
const files = {
  ...import.meta.glob<string>('./Fasting*.tsx', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../components/fasting/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;
const DASH_OR_EMOJI = /—|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;

type Tree = { [k: string]: string | Tree };
function strings(node: Tree, path: string, out: Array<[string, string]>) {
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') out.push([`${path}.${k}`, v]);
    else strings(v, `${path}.${k}`, out);
  }
  return out;
}

describe('Fasting screens', () => {
  it.each(Object.keys(files))('%s renders no emoji', (path) => {
    // comments may mention emoji; JSX and strings may not
    const code = (files[path] ?? '').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(EMOJI);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s fasting copy has no emoji or em dashes', (_lang, dict) => {
    const d = dict as unknown as Tree;
    const all = ['fasting', 'fastingAnalytics', 'fastingRules'].flatMap((ns) =>
      strings(d[ns] as Tree, ns, [])
    );
    const bad = all
      // a quoted narration keeps its attribution as written
      .filter(([key]) => !key.startsWith('fastingRules.dislikedRefText.'))
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });
});
