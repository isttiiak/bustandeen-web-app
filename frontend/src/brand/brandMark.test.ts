/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { BRIGHT, FLOWERS, PAPER, SPARK, markSvg, petals, type MarkPalette } from './brandMark.js';

// The in-app <BrandMark> reads --logo-* from global.css; the asset script
// reads BRIGHT/PAPER. They must stay the same colours. (Vitest drops CSS, so
// `?raw` comes back empty: read the file itself.)
const css = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8').replace(
  /\r\n/g,
  '\n'
);

function block(selector: string): string {
  const start = css.indexOf(selector);
  return css.slice(start, css.indexOf('\n}', start));
}

const TOKENS: [string, keyof MarkPalette][] = [
  ['moon-1', 'moon1'],
  ['moon-2', 'moon2'],
  ['star-1', 'star1'],
  ['star-2', 'star2'],
  ['spark', 'spark'],
  ['leaf', 'leaf'],
  ['leaf-warm', 'leafWarm'],
  ['petal-a', 'petalA'],
  ['petal-b', 'petalB'],
  ['flower-centre', 'flowerCentre'],
];

describe('brand mark', () => {
  it.each([
    [":root,\n[data-theme='bustandeen'] {", BRIGHT],
    ["[data-theme='bustandeen-light'] {", PAPER],
  ])('global.css %s mirrors the palette', (selector, palette) => {
    const b = block(selector);
    for (const [token, key] of TOKENS) {
      expect(b, token).toContain(`--logo-${token}: ${palette[key]};`);
    }
  });

  it('full mark has two flowers and the spark, small mark one flower and no spark', () => {
    expect(FLOWERS.full).toHaveLength(2);
    expect(FLOWERS.small).toHaveLength(1);
    expect(markSvg('full', BRIGHT)).toContain(SPARK);
    expect(markSvg('small', BRIGHT)).not.toContain(SPARK);
  });

  it('draws the stem before the crescent so the crescent covers it', () => {
    const svg = markSvg('full', BRIGHT);
    expect(svg.indexOf('stroke-width="12"')).toBeLessThan(svg.indexOf('url(#bm-moon)"/>'));
  });

  it('gives each flower five petals', () => {
    for (const f of [...FLOWERS.full, ...FLOWERS.small]) expect(petals(f)).toHaveLength(5);
  });
});
