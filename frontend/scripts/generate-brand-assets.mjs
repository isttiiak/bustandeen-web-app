// Regenerates every logo image from src/brand/brandMark.ts (v5.155.0):
//   public/  favicon.svg, pwa-192/512.png, pwa-maskable-192/512.png,
//            shortcut-96.png, og-image.jpg
//   ../brand/ master SVGs, profile photos and social covers (not shipped)
//
// Icons are drawn with sharp. Images with text (og-image, covers) are drawn in
// the installed Chrome via Playwright so El Messiri / Plus Jakarta Sans load
// from Google Fonts, exactly as on the site.
//
// A maskable icon is cropped by the launcher, so it is full-bleed and keeps
// the mark inside the central safe zone (a circle 80% of the icon); the
// script fails if the mark leaves it.
//
// Usage: npm run brand:assets  (needs network for the fonts)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { BRIGHT, PAPER, markSvg } from '../src/brand/brandMark.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const BRAND = join(__dirname, '..', '..', 'brand');
mkdirSync(BRAND, { recursive: true });

/** The mark on a 512 grid, scaled about the centre. */
function placed(variant, palette, scale, idPrefix) {
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${markSvg(variant, palette, idPrefix)}</g>`;
}

/** Square icon: tile + mark. `rx` 0 = full-bleed. */
function iconSvg(
  size,
  { variant = 'full', scale = 0.86, rx = 0, palette = BRIGHT, tile = true } = {}
) {
  const bg = tile ? `<rect width="512" height="512" rx="${rx}" fill="${palette.tile}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${bg}${placed(variant, palette, scale, 'bm')}</svg>`;
}

async function png(svg, file) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
}

/** Farthest non-tile pixel from the centre, in px. */
async function markRadius(file, size) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const t = BRIGHT.tile.match(/\w\w/g).map((h) => parseInt(h, 16));
  let max = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const diff =
        Math.abs(data[i] - t[0]) + Math.abs(data[i + 1] - t[1]) + Math.abs(data[i + 2] - t[2]);
      if (diff > 30) max = Math.max(max, Math.hypot(x - size / 2, y - size / 2));
    }
  }
  return max;
}

const log = (s) => process.stdout.write(s + '\n');

// ── App icons ───────────────────────────────────────────────────────────────
// The tab icon is 16-32 px: small mark (one flower, no spark), rounded tile.
writeFileSync(
  join(PUBLIC, 'favicon.svg'),
  iconSvg(32, { variant: 'small', scale: 0.92, rx: 112 }).replace(' width="32" height="32"', '') +
    '\n'
);
log('Wrote public/favicon.svg');

for (const o of [
  { file: 'pwa-512.png', size: 512, scale: 0.86 },
  { file: 'pwa-192.png', size: 192, scale: 0.86 },
  { file: 'pwa-maskable-512.png', size: 512, scale: 0.88, maskable: true },
  { file: 'pwa-maskable-192.png', size: 192, scale: 0.88, maskable: true },
  { file: 'shortcut-96.png', size: 96, scale: 0.9, variant: 'small' },
]) {
  const file = join(PUBLIC, o.file);
  await png(iconSvg(o.size, { scale: o.scale, variant: o.variant }), file);
  if (o.maskable) {
    const r = await markRadius(file, o.size);
    const limit = 0.4 * o.size;
    if (r > limit)
      throw new Error(
        `${o.file}: mark reaches ${r.toFixed(1)}px, safe zone is ${limit.toFixed(1)}px`
      );
    log(
      `Wrote public/${o.file} (mark radius ${r.toFixed(0)}px of ${limit.toFixed(0)}px safe zone)`
    );
  } else log(`Wrote public/${o.file}`);
}

// ── Brand masters + profile photos ──────────────────────────────────────────
const bare = (variant, palette) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${placed(variant, palette, 1, 'bm')}</svg>\n`;
writeFileSync(join(BRAND, 'mark.svg'), bare('full', BRIGHT));
writeFileSync(join(BRAND, 'mark-small.svg'), bare('small', BRIGHT));
writeFileSync(join(BRAND, 'mark-on-light.svg'), bare('full', PAPER));
writeFileSync(join(BRAND, 'profile.svg'), iconSvg(512, { scale: 0.78 }) + '\n');
// Every platform crops the profile photo to a circle: 0.78 keeps the mark inside it.
for (const [size, use] of [
  [1080, 'instagram'],
  [720, 'facebook'],
  [512, 'email'],
  [400, 'x-linkedin'],
  [256, 'reddit'],
]) {
  await png(iconSvg(size, { scale: 0.78 }), join(BRAND, `profile-${size}-${use}.png`));
}
// YouTube shows the channel photo at 98 px: the small mark reads better there.
await png(iconSvg(98, { scale: 0.78, variant: 'small' }), join(BRAND, 'profile-98-youtube.png'));
await png(iconSvg(800, { scale: 0.78 }), join(BRAND, 'profile-800-youtube.png'));
log('Wrote brand/ masters and profile photos');

// ── Images with text ────────────────────────────────────────────────────────
const C = { cov1: '#0c130e', cov2: '#16301f', frame: '#f5b947', ink: '#f7f2e4', ink2: '#ffd27a' };
const FEATURES = 'Salat  ·  Quran  ·  Fasting  ·  Zikr';

/**
 * @param {number} w
 * @param {number} h
 * @param {{ layout: 'stack' | 'row', k: number, centreY?: number, rowH?: number, features?: boolean, url?: [number, number, number] }} o
 */
function coverSvg(w, h, o) {
  const k = o.k;
  let content;
  if (o.layout === 'stack') {
    const m = 196 * k;
    content =
      `<svg x="${-m / 2}" y="0" width="${m}" height="${m}" viewBox="0 0 512 512">${markSvg('full', BRIGHT, 'cv')}</svg>` +
      `<text x="0" y="${322 * k}" text-anchor="middle" font-size="${120 * k}" class="w">Bustandeen</text>` +
      `<text x="0" y="${386 * k}" text-anchor="middle" font-size="${38 * k}" letter-spacing="${3 * k}" class="t">Nourish Your Deen</text>` +
      (o.features !== false
        ? `<text x="0" y="${466 * k}" text-anchor="middle" font-size="${30 * k}" class="f">${FEATURES}</text>`
        : '');
  } else {
    // Row height: the banner height, or a smaller safe band (YouTube).
    const r = o.rowH ?? h;
    const m = r * 0.62;
    const x = m + r * 0.1;
    content =
      `<svg x="0" y="${-m / 2}" width="${m}" height="${m}" viewBox="0 0 512 512">${markSvg('full', BRIGHT, 'cv')}</svg>` +
      `<text x="${x}" y="${-r * 0.02}" font-size="${r * 0.3}" class="w">Bustandeen</text>` +
      `<text x="${x + r * 0.01}" y="${r * 0.13}" font-size="${r * 0.1}" letter-spacing="${r * 0.008}" class="t">Nourish Your Deen</text>` +
      (o.features
        ? `<text x="${x + r * 0.01}" y="${r * 0.26}" font-size="${r * 0.075}" class="f">${FEATURES}</text>`
        : '');
  }
  const url = o.url
    ? `<text x="${o.url[0]}" y="${o.url[1]}" text-anchor="end" font-size="${o.url[2]}" class="f">bustandeen.com</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<style>
  .w{font-family:'El Messiri',serif;font-weight:600;fill:${C.ink}}
  .t{font-family:'Plus Jakarta Sans',sans-serif;font-weight:500;fill:${C.ink2}}
  .f{font-family:'Plus Jakarta Sans',sans-serif;font-weight:500;fill:${C.ink};opacity:.75}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cov1}"/><stop offset="1" stop-color="${C.cov2}"/></linearGradient>
  <radialGradient id="fade" cx=".5" cy=".46" r=".62"><stop offset="0" stop-color="#000"/><stop offset=".42" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
  <mask id="m"><rect width="${w}" height="${h}" fill="url(#fade)"/></mask>
  <pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="scale(${Math.max(k, 0.45)})">
    <g fill="none" stroke="${C.frame}" stroke-width="2"><rect x="36" y="36" width="48" height="48"/><rect x="36" y="36" width="48" height="48" transform="rotate(45 60 60)"/><path d="M60 0V26M60 94V120M0 60H26M94 60H120"/></g>
  </pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<rect width="${w}" height="${h}" fill="url(#p)" opacity=".4" mask="url(#m)"/>
<g id="content" data-cy="${o.centreY ?? h / 2}">${content}</g>
${url}
</svg>`;
}

const TEXT_IMAGES = [
  { file: join(PUBLIC, 'og-image.jpg'), w: 1200, h: 630, o: { layout: 'stack', k: 0.8 } },
  {
    file: join(BRAND, 'cover-facebook-1640x924.png'),
    w: 1640,
    h: 924,
    o: { layout: 'stack', k: 1, centreY: 430, url: [1580, 748, 26] },
  },
  {
    file: join(BRAND, 'cover-x-1500x500.png'),
    w: 1500,
    h: 500,
    o: { layout: 'stack', k: 0.66, url: [1460, 470, 22] },
  },
  {
    file: join(BRAND, 'cover-reddit-1920x384.png'),
    w: 1920,
    h: 384,
    o: { layout: 'row', k: 0.5, features: true },
  },
  {
    file: join(BRAND, 'cover-linkedin-1128x191.png'),
    w: 1128,
    h: 191,
    o: { layout: 'row', k: 0.45 },
  },
  {
    // Everything sits in the 1235 x 338 band YouTube shows on every device.
    file: join(BRAND, 'cover-youtube-2048x1152.png'),
    w: 2048,
    h: 1152,
    o: { layout: 'row', k: 1, rowH: 300, features: true },
  },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const t of TEXT_IMAGES) {
  await page.setViewportSize({ width: t.w, height: t.h });
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@600&family=Plus+Jakarta+Sans:wght@500&display=block"><style>html,body{margin:0}svg{display:block}</style></head><body>${coverSvg(t.w, t.h, t.o)}</body></html>`,
    { waitUntil: 'networkidle' }
  );
  await page.evaluate(async () => {
    // Runs in the page: browser globals via globalThis.
    const document = globalThis.document;
    await document.fonts.load('600 100px "El Messiri"');
    await document.fonts.load('500 30px "Plus Jakarta Sans"');
    await document.fonts.ready;
    // Centre the content group now that the text has its real width.
    const g = document.getElementById('content');
    const svg = g.ownerSVGElement;
    const bb = g.getBBox();
    const cx = svg.viewBox.baseVal.width / 2;
    const cy = Number(g.dataset.cy);
    g.setAttribute(
      'transform',
      `translate(${cx - (bb.x + bb.width / 2)} ${cy - (bb.y + bb.height / 2)})`
    );
  });
  const ok = await page.evaluate(() => globalThis.document.fonts.check('600 100px "El Messiri"'));
  if (!ok) throw new Error('El Messiri did not load (offline?)');
  const buf = await page.screenshot({ type: 'png' });
  if (t.file.endsWith('.jpg')) await sharp(buf).jpeg({ quality: 92 }).toFile(t.file);
  else await sharp(buf).png({ compressionLevel: 9 }).toFile(t.file);
  log(`Wrote ${t.file.replace(/.*[\\/](public|brand)[\\/]/, '$1/')}`);
}
await browser.close();
