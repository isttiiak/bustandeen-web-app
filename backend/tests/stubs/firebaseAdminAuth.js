// Test-only stand-in for 'firebase-admin/auth'. firebase-admin 14 pulls in
// jwks-rsa -> jose (ESM-only), which Jest cannot require() on Node < 24.9.
// Tests run with DEV_AUTH_BYPASS and never reach real Firebase, and the app
// only calls getAuth() once Firebase Admin is initialized (never in tests).
export function getAuth() {
  throw new Error('Firebase Admin auth is not available in tests');
}
