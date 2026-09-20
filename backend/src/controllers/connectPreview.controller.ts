import { Request, Response, NextFunction } from 'express';
import * as socialService from '../services/social.service.js';

/** Minimal HTML-attribute/text escaping — displayName is arbitrary user
 * input and this string is interpolated directly into an HTML document. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SITE_URL = 'https://bustandeen.com';
const FALLBACK_IMAGE = `${SITE_URL}/og-image.jpg`;
const FALLBACK_TITLE = 'Bustandeen - Nourish Your Deen';
const FALLBACK_DESCRIPTION =
  "Zikr, salat, fasting, Quran and prayer times — with streaks, authentic references, and friends to race toward good. 'So compete with one another in doing good' (Quran 2:148).";

/**
 * Bot-only route (see the `has`-header-matched rewrite in /vercel.json that
 * routes link-unfurl crawlers here instead of the normal SPA shell): renders
 * a lightweight static document with the inviter's real name in the OG tags,
 * so a shared invite link reads "Amir invited you to Bustandeen" instead of
 * generic site branding. A real browser never reaches this handler — it
 * always gets the ordinary React app at this same URL.
 */
export const getConnectPreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawCode = req.params['code'];
    const code = typeof rawCode === 'string' ? rawCode : '';
    const preview = await socialService.getInvitePreview(code);

    const title = preview ? `${preview.displayName} invited you to Bustandeen` : FALLBACK_TITLE;
    const description = preview
      ? `Join ${preview.displayName} on Bustandeen — track salat, zikr, Quran and fasting, and race toward good together.`
      : FALLBACK_DESCRIPTION;
    const image = FALLBACK_IMAGE; // a per-inviter image is a possible future enhancement
    const pageUrl = `${SITE_URL}/connect/${encodeURIComponent(code)}`;

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);

    res.set('Content-Type', 'text/html; charset=utf-8');
    // Belt-and-suspenders — /vercel.json already sets this header for every
    // /connect/* response regardless of which handler serves it.
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.send(
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:site_name" content="Bustandeen" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${image}" />
<meta name="robots" content="noindex, nofollow" />
</head>
<body></body>
</html>`
    );
  } catch (err) {
    next(err);
  }
};
