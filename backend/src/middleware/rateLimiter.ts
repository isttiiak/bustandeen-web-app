import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import RateLimitHit from '../models/RateLimitHit.js';
import { MongoRateLimitStore } from './mongoRateLimitStore.js';

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

/** Where a limiter keeps its counts. 'memory' (express-rate-limit's default)
 *  is per serverless instance: fine for high-volume flood guards, where an
 *  approximate per-instance cap is enough and a DB write per request is not.
 *  'shared' (MongoDB, see mongoRateLimitStore.ts) is one count across every
 *  instance: used wherever the cap protects money (AI calls), a public form,
 *  or an expensive/abusable endpoint, so it is actually enforced. */
type CounterStore = 'memory' | 'shared';

const storeFor = (store: CounterStore, limiterName: string) =>
  store === 'shared' ? { store: new MongoRateLimitStore(limiterName) } : {};

const makeLimit = (
  windowMs: number,
  max: number,
  message: object,
  limiterName: string,
  store: CounterStore = 'memory'
) =>
  rateLimit({
    windowMs,
    max: isDev ? 100_000 : max,
    ...storeFor(store, limiterName),
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
  'ai',
  'shared'
);

// ── Per-UID limiters (applied AFTER requireAuth so req.user.uid is set) ──────
// Keying off UID rather than IP prevents a single user from exhausting the
// limit by rotating IPs, and prevents one IP (NAT/proxy) from blocking others.

const makeUidLimit = (
  windowMs: number,
  max: number,
  message: object,
  limiterName: string,
  store: CounterStore = 'shared'
) =>
  rateLimit({
    windowMs,
    max: isDev ? 100_000 : max,
    ...storeFor(store, limiterName),
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

/** Naseeh data chat: 30 free-text questions per day per UID. Each one is a
 *  model request (it only picks which lookup to run), so it has its own cap
 *  instead of eating the shared 20/day AI allowance. */
export const aiChatLimiter = makeUidLimit(
  24 * 60 * 60 * 1000,
  30,
  {
    ok: false,
    error: 'Daily question limit reached. Try the quick questions, or come back tomorrow.',
  },
  'aiChat'
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
  'sadaqahSubmit',
  'shared'
);

/** Backup export: 20 per hour per UID - it reads ~25 collections, so this
 *  keeps a script from hammering it (Backup and Excel each make one call). */
export const dataExportLimiter = makeUidLimit(
  60 * 60 * 1000,
  20,
  { ok: false, error: 'Too many data exports. Try again in an hour.' },
  'dataExport'
);

/** Public receipt-verification lookups (the QR target): 60 per 15 min per IP —
 *  generous for real scans, tight enough that guessing signatures is pointless. */
export const sadaqahVerifyLimiter = makeLimit(
  15 * 60 * 1000,
  60,
  { ok: false, error: 'Too many verification attempts. Please try again later.' },
  'sadaqahVerify',
  'shared'
);

/** Feedback/contact submissions: own limiter, same shape as
 *  sadaqahSubmitLimiter — a shared instance would conflate two unrelated
 *  quotas (a donor rate-limited on donations shouldn't also be blocked from
 *  sending feedback, and vice versa). */
export const feedbackSubmitLimiter = makeLimit(
  60 * 60 * 1000,
  5,
  { ok: false, error: 'Too many messages sent. Please try again in an hour.' },
  'feedbackSubmit',
  'shared'
);

/** Forgot password (public, sends an email): 5 per hour per IP, and 3 per
 *  hour per email address so nobody can flood one inbox from many IPs. Both
 *  shared (Mongo, keys hashed by the store). The answer is the same whether
 *  or not the account exists. */
const RESET_MESSAGE = {
  ok: false,
  error: 'Too many reset requests. Please try again in an hour.',
};
export const passwordResetIpLimiter = makeLimit(
  60 * 60 * 1000,
  5,
  RESET_MESSAGE,
  'passwordResetIp',
  'shared'
);
/** A shared limiter keyed by the (validated, lower-cased) body.email. */
const makeEmailLimit = (windowMs: number, max: number, message: object, limiterName: string) =>
  rateLimit({
    windowMs,
    max: isDev ? 100_000 : max,
    ...storeFor('shared', limiterName),
    keyGenerator: (req: Request) =>
      String((req.body as { email?: unknown })?.email ?? '').toLowerCase() || 'none',
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    message,
    handler: makeThrottledHandler(limiterName, message),
  });
export const passwordResetEmailLimiter = makeEmailLimit(
  60 * 60 * 1000,
  3,
  RESET_MESSAGE,
  'passwordResetEmail'
);

/** Email-first sign-up step 1 (public, sends an email): 5 per hour per IP,
 *  3 per hour per address. Same answer whether or not the email is known. */
const SIGNUP_MESSAGE = {
  ok: false,
  error: 'Too many sign-up requests. Please try again in an hour.',
};
export const signupIpLimiter = makeLimit(60 * 60 * 1000, 5, SIGNUP_MESSAGE, 'signupIp', 'shared');
export const signupEmailLimiter = makeEmailLimit(60 * 60 * 1000, 3, SIGNUP_MESSAGE, 'signupEmail');

/** Resend the verification email: 3 per hour per signed-in user. */
export const verificationEmailLimiter = makeUidLimit(
  60 * 60 * 1000,
  3,
  { ok: false, error: 'Too many emails sent. Please try again in an hour.' },
  'verificationEmail'
);

/** Admin session confirm: 20 per 15 min per IP — the first admin-panel call
 *  after a Firebase sign-in (adminAccount.controller.ts's sessionHandler).
 *  Firebase itself throttles password guesses; this just stops someone with
 *  an unrelated Firebase ID token from hammering the AdminAccount lookup. */
export const adminSessionLimiter = makeLimit(
  15 * 60 * 1000,
  20,
  { ok: false, error: 'Too many attempts. Please try again later.' },
  'adminSession',
  'shared'
);

/** Admin second-factor codes: 10 per 15 min per admin (uid, set by
 *  requireAdminIdentity before this runs), one count across instances. A
 *  6-digit code has a million values; 10 tries per window keeps guessing
 *  hopeless. Enrolment start/confirm share the count. */
export const adminMfaLimiter = makeUidLimit(
  15 * 60 * 1000,
  10,
  { ok: false, error: 'Too many code attempts. Please wait 15 minutes and try again.' },
  'adminMfa'
);

/** CSP violation reports: 60 per 15 min per IP. Browsers send one report per
 *  violation, so a single misconfigured page can burst; anything beyond this
 *  is noise or abuse. Throttled requests still get a 429 (browsers ignore it). */
/** App error reports: 30 per 15 min per IP (flood guard, per instance). The
 *  app itself sends each distinct error once and at most 10 per page load. */
export const clientErrorLimiter = makeLimit(
  15 * 60 * 1000,
  30,
  { ok: false, error: 'Too many reports.' },
  'clientError'
);

export const cspReportLimiter = makeLimit(
  15 * 60 * 1000,
  60,
  { ok: false, error: 'Too many reports.' },
  'cspReport'
);
