import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import RateLimitHit from '../models/RateLimitHit.js';

// In development all requests share localhost IP — disable rate limiting entirely
const isDev = process.env.NODE_ENV !== 'production';

/** Fired only when a request is actually throttled — see RateLimitHit.ts for
 *  why this is DB-backed instead of reading the limiter's own in-memory
 *  store. Best-effort: never let a logging failure affect the 429 response. */
const makeThrottledHandler =
  (limiterName: string, message: object) => (req: Request, res: Response) => {
    RateLimitHit.create({
      limiterName,
      path: req.path,
      ip: req.ip ?? 'unknown',
      uid: req.user?.uid,
    }).catch((err) => console.error('Failed to write rate-limit hit log:', err));
    res.status(429).json(message);
  };

const makeLimit = (windowMs: number, max: number, message: object, limiterName: string) =>
  rateLimit({
    windowMs,
    max: isDev ? 100_000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    handler: makeThrottledHandler(limiterName, message),
  });

/** Auth endpoints: brute-force guard — 30 per 15 min per IP */
export const authLimiter = makeLimit(
  15 * 60 * 1000,
  30,
  { ok: false, error: 'Too many requests, please try again later.' },
  'auth'
);

/** General API — 500 per 15 min per IP.
 *  React Query fires several queries on mount (summary, analytics, salat).
 *  100 was too low for normal multi-tab / focus-switching usage. */
export const generalLimiter = makeLimit(
  15 * 60 * 1000,
  500,
  { ok: false, error: 'Too many requests, please try again later.' },
  'general'
);

/** Zikr increment: 300 per minute — allows fast tapping */
export const zikrLimiter = makeLimit(
  60 * 1000,
  300,
  { ok: false, error: 'Too many zikr requests.' },
  'zikr'
);

/** AI suggestions: 10 per hour — expensive endpoint */
export const aiLimiter = makeLimit(
  60 * 60 * 1000,
  10,
  { ok: false, error: 'AI suggestion limit reached. Try again later.' },
  'ai'
);

// ── Per-UID limiters (applied AFTER requireAuth so req.user.uid is set) ──────
// Keying off UID rather than IP prevents a single user from exhausting the
// limit by rotating IPs, and prevents one IP (NAT/proxy) from blocking others.

const makeUidLimit = (windowMs: number, max: number, message: object, limiterName: string) =>
  rateLimit({
    windowMs,
    max: isDev ? 100_000 : max,
    keyGenerator: (req: Request) => req.user?.uid ?? req.ip ?? 'unknown',
    // Suppress the IP-fallback validation warning — the IP path is only reached
    // if requireAuth somehow fails before this middleware, which would 401 first.
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    message,
    handler: makeThrottledHandler(limiterName, message),
  });

/** AI suggestions: 20 per day per UID — the IP-based `aiLimiter` above guards
 *  the endpoint before auth even runs; this catches one signed-in user
 *  burning the shared IP allowance across a NAT/proxy or many devices. */
export const aiUserLimiter = makeUidLimit(
  24 * 60 * 60 * 1000,
  20,
  { ok: false, error: 'Daily AI limit reached. Try again tomorrow.' },
  'aiUser'
);

/** Friend-connect: 10 per hour per UID — prevents invite-code spam */
export const socialConnectLimiter = makeUidLimit(
  60 * 60 * 1000,
  10,
  { ok: false, error: 'Too many connection attempts. Try again in an hour.' },
  'socialConnect'
);

/** Account import: 10 per hour per UID — prevents backup-flood abuse */
export const importLimiter = makeUidLimit(
  60 * 60 * 1000,
  10,
  { ok: false, error: 'Too many import attempts. Try again in an hour.' },
  'import'
);

/** Sadaqah submissions: 5 per hour per IP — the endpoint is unauthenticated
 *  (guests can donate), so this must be IP-keyed rather than UID-keyed. */
export const sadaqahSubmitLimiter = makeLimit(
  60 * 60 * 1000,
  5,
  { ok: false, error: 'Too many donation submissions. Please try again in an hour.' },
  'sadaqahSubmit'
);

/** Full data export: 10 per hour per UID - it reads ~20 collections, so this
 *  keeps a script from hammering it. */
export const dataExportLimiter = makeUidLimit(
  60 * 60 * 1000,
  10,
  { ok: false, error: 'Too many data exports. Try again in an hour.' },
  'dataExport'
);

/** Public receipt-verification lookups (the QR target): 60 per 15 min per IP —
 *  generous for real scans, tight enough that guessing signatures is pointless. */
export const sadaqahVerifyLimiter = makeLimit(
  15 * 60 * 1000,
  60,
  { ok: false, error: 'Too many verification attempts. Please try again later.' },
  'sadaqahVerify'
);

/** Feedback/contact submissions: own limiter, same shape as
 *  sadaqahSubmitLimiter — a shared instance would conflate two unrelated
 *  quotas (a donor rate-limited on donations shouldn't also be blocked from
 *  sending feedback, and vice versa). */
export const feedbackSubmitLimiter = makeLimit(
  60 * 60 * 1000,
  5,
  { ok: false, error: 'Too many messages sent. Please try again in an hour.' },
  'feedbackSubmit'
);

/** Admin session confirm: 20 per 15 min per IP — the first admin-panel call
 *  after a Firebase sign-in (adminAccount.controller.ts's sessionHandler).
 *  Firebase itself throttles password guesses; this just stops someone with
 *  an unrelated Firebase ID token from hammering the AdminAccount lookup. */
export const adminSessionLimiter = makeLimit(
  15 * 60 * 1000,
  20,
  { ok: false, error: 'Too many attempts. Please try again later.' },
  'adminSession'
);
