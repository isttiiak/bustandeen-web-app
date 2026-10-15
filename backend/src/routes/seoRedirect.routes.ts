import { Router, Request, Response } from 'express';

/**
 * Old SEO page URLs that no longer exist (2026-10-15): the per-city Qibla
 * pages are gone, ~500 cities keep prayer-time and Ramadan pages, city pages
 * are English only (Bangladesh's also in Bangla), and there are no Arabic
 * pages at all. vercel.json sends these paths here ONLY when no prerendered
 * file matched, so a page that exists is always served as its static file.
 * Permanent redirects:
 * - /{,bn/,ar/}qibla/{city} → the live Qibla compass;
 * - /ar/... → the same page in English (the bare /ar → the landing);
 * - /bn/{prayer-times|ramadan-calendar}/... → the same page in English;
 * - a removed city → the live page that does the same job for any place:
 *   the on-device prayer times, the Ramadan calendar index.
 * A chain ends after at most two hops (e.g. /ar/... → English → index).
 */
const router = Router();

const send = (res: Response, to: string) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.redirect(301, to);
};

router.get(/^\/(?:(?:bn|ar)\/)?qibla\/.+/, (_req: Request, res: Response) => send(res, '/qibla'));
router.get(/^\/ar(?:\/.*)?$/, (req: Request, res: Response) =>
  send(res, req.path.replace(/^\/ar/, '') || '/')
);
router.get(/^\/bn\/(?:prayer-times|ramadan-calendar)\/.+/, (req: Request, res: Response) =>
  send(res, req.path.replace(/^\/bn/, ''))
);
router.get(/^\/prayer-times\/.+/, (_req: Request, res: Response) => send(res, '/prayer-times'));
router.get(/^\/ramadan-calendar\/.+/, (_req: Request, res: Response) =>
  send(res, '/ramadan-calendar')
);

export default router;
