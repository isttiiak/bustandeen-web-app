// Regenerates the MASKABLE app icons and the shortcut icons from the same
// crescent + spark mark as public/favicon.svg (audit T2.5 / PWA-01).
//
// A maskable icon is cropped by the launcher to a circle, squircle or
// rounded square, so it must be full-bleed (no transparent corners) and keep
// everything that matters inside the central safe zone: a circle whose
// diameter is 80% of the icon. The old manifest reused pwa-512.png as the
// maskable icon, whose rounded tile got cut off.
//
// Usage: node scripts/generate-pwa-icons.mjs
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const TILE = '#0d1520'; // the icon tile colour of pwa-512.png / favicon.svg

/** The mark in favicon.svg's 32-unit space spans about x 2.5-27.2, y 5-29.5. */
function mark() {
  return `
    <defs>
      <linearGradient id="fm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#34d399"/>
        <stop offset="1" stop-color="#0d9488"/>
      </linearGradient>
      <linearGradient id="fs" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fde68a"/>
        <stop offset="1" stop-color="#f59e0b"/>
      </linearGradient>
      <mask id="fc">
        <rect width="32" height="32" fill="white"/>
        <circle cx="20.2" cy="13.4" r="9.6" fill="black"/>
      </mask>
    </defs>
    <circle cx="14.7" cy="17.3" r="12.2" fill="url(#fm)" mask="url(#fc)"/>
    <path d="M22.4 7 L23.7 10.5 L27.2 11.8 L23.7 13.1 L22.4 16.6 L21.1 13.1 L17.6 11.8 L21.1 10.5 Z" fill="url(#fs)"/>`;
}

/**
 * @param {number} size output px
 * @param {number} markFraction share of the canvas the mark's bounding box may use
 */
function iconSvg(size, markFraction) {
  const markUnits = 24.7; // widest extent of the mark (x 2.5 -> 27.2)
  const scale = (size * markFraction) / markUnits;
  // Centre of the mark's bounding box in its own units.
  const cx = (2.5 + 27.2) / 2;
  const cy = (5.1 + 29.5) / 2;
  const tx = size / 2 - cx * scale;
  const ty = size / 2 - cy * scale;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${TILE}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">${mark()}</g>
</svg>`;
}

const outputs = [
  // 0.68 puts the mark's farthest point about 190 px from the centre of a
  // 512 icon, inside the 205 px safe-zone radius (asserted below).
  { file: 'pwa-maskable-512.png', size: 512, fraction: 0.68, maskable: true },
  { file: 'pwa-maskable-192.png', size: 192, fraction: 0.68, maskable: true },
  // Shortcut icons are shown un-masked, small: let the mark fill more.
  { file: 'shortcut-96.png', size: 96, fraction: 0.72 },
];

/** Farthest non-background pixel from the centre, in px. */
async function markRadius(file, size) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const [r0, g0, b0] = [0x0d, 0x15, 0x20];
  let max = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const diff = Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0);
      if (diff > 30) max = Math.max(max, Math.hypot(x - size / 2, y - size / 2));
    }
  }
  return max;
}

for (const o of outputs) {
  const file = join(PUBLIC, o.file);
  await sharp(Buffer.from(iconSvg(o.size, o.fraction)))
    .png({ compressionLevel: 9 })
    .toFile(file);
  if (o.maskable) {
    const r = await markRadius(file, o.size);
    const limit = 0.4 * o.size;
    if (r > limit)
      throw new Error(
        `${o.file}: mark reaches ${r.toFixed(1)}px, safe zone is ${limit.toFixed(1)}px`
      );
    process.stdout.write(
      `Wrote public/${o.file} (mark radius ${r.toFixed(0)}px of ${limit.toFixed(0)}px safe zone)\n`
    );
  } else {
    process.stdout.write(`Wrote public/${o.file}\n`);
  }
}
