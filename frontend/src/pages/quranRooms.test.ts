import { describe, it, expect } from 'vitest';

// T3.2 Quran: the rooms use SVG icons only, and two citations that were
// attached to the wrong source stay fixed (both checked on 2026-10-03).
const pages = import.meta.glob<string>('./Quran*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const src = (name: string) => pages[`./${name}.tsx`] ?? '';
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;

describe('Quran rooms', () => {
  it.each(Object.keys(pages))('%s renders no emoji', (path) => {
    // comments may mention emoji; JSX and strings may not
    const code = (pages[path] ?? '').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(EMOJI);
  });

  it('cites Muslim 804 (not Quran 73:4) for "Recite the Quran ... intercessor"', () => {
    expect(src('QuranKhatam')).toContain('https://sunnah.com/muslim:804a');
    expect(src('QuranKhatam')).not.toContain('quran.com/73/4');
  });

  it('cites Quran 7:204 (not Bukhari 5049) for "listen to it and be silent"', () => {
    expect(src('QuranListen')).toContain('https://quran.com/7/204');
    expect(src('QuranListen')).not.toContain('bukhari:5049');
  });
});
