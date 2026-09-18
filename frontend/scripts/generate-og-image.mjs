// Regenerates public/og-image.jpg from an SVG template — run whenever the
// brand name/tagline changes so the shared-link preview never drifts from
// the app itself (this is what fixed the old "Ihsan" text baked into the
// previous JPEG after the Bustandeen rebrand).
//
// Usage: node scripts/generate-og-image.mjs
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'og-image.jpg');

const WIDTH = 1200;
const HEIGHT = 630;

// Same crescent + spark mark as public/favicon.svg, scaled up and
// recentred for the wide OG canvas.
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1520"/>
      <stop offset="1" stop-color="#080c12"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.32" r="0.55">
      <stop offset="0" stop-color="#10b981" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
    <mask id="crescentCut">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="white"/>
      <circle cx="323" cy="238" r="128" fill="black"/>
    </mask>
    <style>
      .title { font-family: 'Arial', sans-serif; font-weight: 900; }
      .sub { font-family: 'Arial', sans-serif; font-weight: 800; }
      .feat { font-family: 'Arial', sans-serif; font-weight: 500; }
      .quote { font-family: 'Arial', sans-serif; font-style: italic; font-weight: 600; }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <!-- Crescent moon (favicon mark, scaled ~10x) -->
  <circle cx="245" cy="315" r="163" fill="url(#moon)" mask="url(#crescentCut)"/>
  <!-- Four-point sparkle -->
  <path d="M405 130 L423 178 L471 196 L423 214 L405 262 L387 214 L339 196 L387 178 Z" fill="url(#star)"/>
  <circle cx="450" cy="120" r="9" fill="#f59e0b"/>

  <text x="475" y="270" class="title" font-size="92" fill="#f1f5f9">Bustandeen</text>
  <text x="478" y="330" class="sub" font-size="34" fill="#10b981">Nourish Your Deen</text>
  <text x="478" y="388" class="feat" font-size="27" fill="#94a3b8">Zikr &#183; Salat &#183; Fasting &#183; Quran &#183; Prayer Times &#183; Friends</text>
  <text x="478" y="448" class="quote" font-size="24" fill="#f59e0b">"So compete with one another in doing good" - Quran 2:148</text>
</svg>
`.trim();

await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(OUT_PATH);

console.error(`Wrote ${OUT_PATH}`);
