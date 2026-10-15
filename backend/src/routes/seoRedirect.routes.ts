import { Router, Request, Response } from 'express';

/**
 * Old SEO page URLs that no longer exist (2026-10-15): the per-city Qibla
 * pages are gone and only ~500 cities keep prayer-time and Ramadan pages.
 * vercel.json sends these paths here ONLY when no prerendered file matched,
 * so a kept city is always served as its static page. Each answers a
 * permanent redirect to the live page that does the same job for any place:
 * the Qibla compass, the on-device prayer times, the Ramadan calendar index.
 */
const router = Router();

const LANG = '(?:(bn|ar)/)?';
const send = (res: Response, to: string) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.redirect(301, to);
};

router.get(new RegExp(`^/${LANG}qibla/.+`), (_req: Request, res: Response) => send(res, '/qibla'));
router.get(new RegExp(`^/${LANG}prayer-times/.+`), (_req: Request, res: Response) =>
  send(res, '/prayer-times')
);
router.get(new RegExp(`^/${LANG}ramadan-calendar/.+`), (req: Request, res: Response) => {
  const lang = /^\/(bn|ar)\//.exec(req.path)?.[1];
  send(res, lang ? `/${lang}/ramadan-calendar` : '/ramadan-calendar');
});

export default router;
