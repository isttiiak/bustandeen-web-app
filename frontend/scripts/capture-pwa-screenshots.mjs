// Captures the manifest screenshots (audit T2.5 / PWA-01): Android shows the
// richer install sheet only when the manifest lists screenshots.
//
// Runs the production build in demo mode (sample data, no account, no
// network beyond localhost), so it never touches real data. Third-party
// requests are blocked and the demo banner is hidden for the picture.
//
// Usage: npm run build && node scripts/capture-pwa-screenshots.mjs
// Writes public/screenshots/*.webp. Uses the installed Chrome (CI or a
// machine without Chrome: set PW_CHANNEL= to use Playwright's Chromium).
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'screenshots');
const PORT = 4179;
const BASE = `http://localhost:${PORT}`;

/** Must stay in sync with the `screenshots` list in vite.config.ts. */
const SHOTS = [
  { file: 'salat-narrow', path: '/salat', size: 'narrow' },
  { file: 'zikr-narrow', path: '/zikr', size: 'narrow', taps: 33 },
  {
    file: 'prayer-times-narrow',
    path: '/prayer-times/dhaka-bangladesh/',
    size: 'narrow',
    static: true,
  },
  { file: 'home-wide', path: '/', size: 'wide' },
];

const VIEWPORTS = {
  narrow: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true },
  wide: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false },
};

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite preview did not start');
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  shell: true,
  stdio: 'ignore',
});

try {
  await waitForServer();
  mkdirSync(OUT, { recursive: true });
  const channel = process.env.PW_CHANNEL ?? 'chrome';
  const browser = await chromium.launch(channel ? { channel } : {});

  for (const shot of SHOTS) {
    const context = await browser.newContext({
      ...VIEWPORTS[shot.size],
      timezoneId: 'Asia/Dhaka',
      locale: 'en-GB',
      colorScheme: 'dark',
    });
    await context.route(
      (url) => url.hostname !== 'localhost',
      (route) => route.abort()
    );
    // A saved location (on this throwaway profile only) so prayer times show.
    await context.addInitScript(() => {
      localStorage.setItem(
        'bustandeen_location',
        JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka, Bangladesh' })
      );
    });
    const page = await context.newPage();
    if (shot.static) {
      await page.goto(`${BASE}${shot.path}`);
    } else {
      await page.goto(`${BASE}/`);
      await page.getByRole('link', { name: /Explore as Brother/ }).click();
      await page.getByText('Demo Mode').first().waitFor();
      // Runs in the page: browser globals via globalThis.
      await page.evaluate((p) => {
        globalThis.history.pushState({}, '', p);
        globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate'));
      }, shot.path);
      // Hide the demo banner: the picture shows the app as a user sees it.
      await page.addStyleTag({ content: '.sticky.top-0.z-\\[45\\] { display: none !important; }' });
    }
    if (shot.taps) {
      const count = page.getByRole('button', { name: 'Count', exact: true });
      for (let i = 0; i < shot.taps; i++) await count.click();
    }
    await page.waitForTimeout(2500); // lazy routes, fonts, entrance animations
    const png = await page.screenshot({ fullPage: false });
    const outFile = join(OUT, `${shot.file}.webp`);
    await sharp(png).webp({ quality: 80 }).toFile(outFile);
    const meta = await sharp(outFile).metadata();
    process.stdout.write(
      `Wrote public/screenshots/${shot.file}.webp (${meta.width}x${meta.height})\n`
    );
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
  if (process.platform === 'win32' && server.pid) {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}
