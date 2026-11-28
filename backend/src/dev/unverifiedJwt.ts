// DEV AND TEST ONLY. Reads a token's payload WITHOUT verifying it, for the sign-in
// bypass (`DEV_AUTH_BYPASS=1`), which `devAuthBypassAllowed()` refuses when
// NODE_ENV=production; production verifies every token with Firebase Admin.
//
// This folder is excluded from CodeQL (.github/codeql/codeql-config.yml): here the
// user id is the request's own text by design, so every query that uses req.user.uid
// was reported as injectable although production never takes this path. The callers
// still accept only a plain, non-empty string uid (tests/devAuthUid.e2e.test.js).
export const decodeUnverifiedJwt = (jwt: string): Record<string, unknown> | null => {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    // Normalize uid like Firebase Admin verifyIdToken output
    if (!payload['uid'] && payload['user_id']) payload['uid'] = payload['user_id'];
    return payload;
  } catch {
    return null;
  }
};
