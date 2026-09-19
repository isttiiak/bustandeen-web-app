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
import quranRoutes from './routes/quran.routes.js';
import hifzRoutes from './routes/hifz.routes.js';
import socialRoutes from './routes/social.routes.js';
import cycleRoutes from './routes/cycle.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import naturalLogRoutes from './routes/naturalLog.routes.js';
import connectPreviewRoutes from './routes/connectPreview.routes.js';
import sadaqahRoutes from './routes/sadaqah.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
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
import updateEmailRoutes from './routes/updateEmail.routes.js';
import composeEmailRoutes from './routes/composeEmail.routes.js';
import { generalLimiter, authLimiter, zikrLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Vercel serves gzip and brotli compression automatically on all responses
// (including JSON) — no express middleware needed. Verified 2026-09-02:
//   curl -sI -H "Accept-Encoding: br" https://bustandeen.com/api/health
//   → content-encoding: br
const app = express();

// Behind Render/Vercel's proxy: without this, express-rate-limit keys every
// request off the load balancer's IP — one heavy user rate-limits everyone.
app.set('trust proxy', 1);

// Core middleware — CSP configured explicitly to match SPA's runtime needs.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // script-src: self only; no inline scripts or eval in the API layer
        scriptSrc: ["'self'"],
        // connect-src covers Firebase Auth, the Quran audio API, and the AI provider
        connectSrc: [
          "'self'",
          'https://*.googleapis.com', // Firebase Auth + Firestore
          'https://*.firebase.com', // Firebase realtime
          'https://identitytoolkit.googleapis.com',
          'https://api.alquran.cloud', // Quran audio / text
          'https://api.groq.com', // AI companion (Groq)
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        // Tailwind's JIT emits inline style attributes — unsafe-inline is required
        styleSrc: ["'self'", "'unsafe-inline'"],
        // Prevent this app from being embedded as a frame (clickjacking guard)
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);
// Profile photos now go to Firebase Storage (frontend uploads directly, PATCH
// receives only the short https URL). The backup IMPORT route is the heaviest
// payload — 1 MB comfortably covers a full account history.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const isProd = process.env.NODE_ENV === 'production';
app.use(morgan(isProd ? 'combined' : 'dev'));

// CORS — explicit allowlist.
//
// Matched origins:
//   1. Anything in FRONTEND_ORIGIN (comma-separated list, e.g. custom domain)
//   2. https://bustandeen.com  (production domain)
//   3. https://ihsan-web-app-main.vercel.app  (legacy Vercel deployment)
//   4. https://ihsan-web-app-main-<sha>-isttiiak.vercel.app   (deploy preview)
//   5. https://ihsan-web-app-main-git-<branch>-isttiiak.vercel.app  (branch preview)
//
// The `-isttiiak` suffix is Vercel's per-account slug — only the `isttiiak`
// account can generate URLs with that suffix, so this is safe against any
// attacker registering an `ihsan-web-app-main-*` project under their own account.
const rawOrigins = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const allowedOrigins = String(rawOrigins)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Matches only ihsan-web-app-main under the isttiiak Vercel account.
// Drops the old permissive regex that matched any project starting with the name.
const vercelPreviewRegex =
  /^https:\/\/ihsan-web-app-main(?:-(?:git-)?[a-z0-9][a-z0-9-]*-isttiiak)?\.vercel\.app$/i;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      const ok = allowedOrigins.includes(normalized) || vercelPreviewRegex.test(normalized);
      return callback(null, ok);
    },
    // Auth uses Bearer tokens, not cookies — credentials false is correct here.
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Language', 'X-Admin-Token'],
    optionsSuccessStatus: 204,
  })
);

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
app.use('/api/quran', quranRoutes);
app.use('/api/hifz', hifzRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/natural-log', aiLimiter, naturalLogRoutes);
app.use('/api/sadaqah', sadaqahRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
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
