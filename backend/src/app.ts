import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import zikrRoutes from './routes/zikr.routes.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/user.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import salatRoutes from './routes/salat.routes.js';
import fastingRoutes from './routes/fasting.routes.js';
import adhkarRoutes from './routes/adhkar.routes.js';
import quranRoutes from './routes/quran.routes.js';
import hifzRoutes from './routes/hifz.routes.js';
import socialRoutes from './routes/social.routes.js';
import cycleRoutes from './routes/cycle.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import naturalLogRoutes from './routes/naturalLog.routes.js';
import naseehRoutes from './routes/naseeh.routes.js';
import connectPreviewRoutes from './routes/connectPreview.routes.js';
import sadaqahRoutes from './routes/sadaqah.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import moonSightingRoutes from './routes/moonSighting.routes.js';
import adminSadaqahRoutes from './routes/adminSadaqah.routes.js';
import adminZikrRoutes from './routes/adminZikr.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import adminUsersRoutes from './routes/adminUsers.routes.js';
import adminAccountRoutes from './routes/adminAccount.routes.js';
import adminAuditRoutes from './routes/adminAudit.routes.js';
import adminFeedbackRoutes from './routes/adminFeedback.routes.js';
import adminMailboxRoutes from './routes/adminMailbox.routes.js';
import adminStatsRoutes from './routes/adminStats.routes.js';
import adminOpsRoutes from './routes/adminOps.routes.js';
import adminAnnouncementRoutes from './routes/adminAnnouncement.routes.js';
import adminMoonSightingRoutes from './routes/adminMoonSighting.routes.js';
import updateEmailRoutes from './routes/updateEmail.routes.js';
import composeEmailRoutes from './routes/composeEmail.routes.js';
import cspReportRoutes from './routes/cspReport.routes.js';
import { generalLimiter, authLimiter, zikrLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { isVercelPreviewOrigin, previewConfigFromEnv } from './utils/corsOrigins.js';

// Vercel serves gzip and brotli compression automatically on all responses
// (including JSON) — no express middleware needed. Verified 2026-09-02:
//   curl -sI -H "Accept-Encoding: br" https://bustandeen.com/api/health
//   → content-encoding: br
const app = express();

// Behind Render/Vercel's proxy: without this, express-rate-limit keys every
// request off the load balancer's IP — one heavy user rate-limits everyone.
app.set('trust proxy', 1);

// Core middleware. The API only ever returns JSON (plus the metadata-only
// /connect/:code preview page for link crawlers), so its CSP allows nothing
// to load at all. The SPA's own CSP lives in /vercel.json (static layer).
app.use(
  helmet({
    contentSecurityPolicy: {
      // Exactly these directives: helmet's defaults (font-src https:, img-src
      // data:, …) only loosen a policy that should allow nothing.
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        // Clickjacking guard
        frameAncestors: ["'none'"],
      },
    },
  })
);
// Profile photos now go to Firebase Storage (frontend uploads directly, PATCH
// receives only the short https URL), so 1 MB covers every route but one.
// The backup IMPORT gets 20 MB (decoded): Settings sends the file gzipped
// (Content-Encoding: gzip, which body-parser inflates), so it also stays
// under Vercel's 4.5 MB request cap. Largest account at U6: ~0.4 MB.
const jsonDefault = express.json({ limit: '1mb' });
const jsonImport = express.json({ limit: '20mb' });
app.use((req, res, next) =>
  (req.path === '/api/user/import' ? jsonImport : jsonDefault)(req, res, next)
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const isProd = process.env.NODE_ENV === 'production';
app.use(morgan(isProd ? 'combined' : 'dev'));

// CORS — explicit allowlist.
//
// Matched origins:
//   1. Anything in FRONTEND_ORIGIN (comma-separated list, e.g. the production
//      domain https://bustandeen.com and local dev)
//   2. Vercel previews of this project under this account (utils/corsOrigins.ts;
//      slugs configurable via VERCEL_PREVIEW_BASES / VERCEL_PREVIEW_OWNER)
const rawOrigins = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const allowedOrigins = String(rawOrigins)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
const previewConfig = previewConfigFromEnv();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      const ok =
        allowedOrigins.includes(normalized) || isVercelPreviewOrigin(normalized, previewConfig);
      return callback(null, ok);
    },
    // Auth uses Bearer tokens, not cookies — credentials false is correct here.
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Content-Encoding',
      'Authorization',
      'X-Admin-Token',
      'X-Client-Op-Id',
    ],
    optionsSuccessStatus: 204,
  })
);

// CSP violation reports have their own limiter and must not eat into a
// visitor's general API allowance, so they are mounted before it.
app.use('/api/csp-report', cspReportRoutes);

// Apply general rate limiter globally
app.use(generalLimiter);

// Health check (no auth, no rate limit beyond general)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Bustandeen API is healthy' });
});

// Bot-only invite-link unfurl preview — NOT under /api; only reached in
// production when vercel.json's User-Agent-matched rewrite routes a
// link-unfurl crawler here instead of the normal SPA shell. See
// connectPreview.routes.ts.
app.use('/connect', connectPreviewRoutes);

// Routes with per-route rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/zikr', zikrLimiter, zikrRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/salat', salatRoutes);
app.use('/api/fasting', fastingRoutes);
app.use('/api/adhkar', adhkarRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/hifz', hifzRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/natural-log', aiLimiter, naturalLogRoutes);
app.use('/api/naseeh', naseehRoutes);
app.use('/api/sadaqah', sadaqahRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/calendar', moonSightingRoutes);
app.use('/api/admin/sadaqah', adminSadaqahRoutes);
app.use('/api/admin/zikr-requests', adminZikrRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/accounts', adminAccountRoutes);
app.use('/api/admin/audit-log', adminAuditRoutes);
// Must precede /api/admin/feedback so 'mailbox' is never read as a feedback :id.
app.use('/api/admin/feedback/mailbox', adminMailboxRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/ops', adminOpsRoutes);
app.use('/api/admin/announcements', adminAnnouncementRoutes);
app.use('/api/admin/moon-sighting', adminMoonSightingRoutes);
app.use('/api/admin/compose-email', composeEmailRoutes);
app.use('/api/admin/update-emails', updateEmailRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// Global error handler — must be last middleware (4 params)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(err, req, res, next);
});

export default app;
