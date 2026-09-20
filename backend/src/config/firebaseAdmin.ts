import admin from 'firebase-admin';

let initialized = false;

// Environment stores (Render, CI, .env) frequently mangle a PEM private key:
// they wrap it in single/double quotes and/or store the newlines as the literal
// two-character sequence "\n". Normalize both so the cert can be parsed.
const normalizePrivateKey = (raw: string): string => {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
};

export const initFirebaseAdmin = (): void => {
  if (initialized) return;
  // Guard against double-init across hot-reloads (module cache may persist)
  if (admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Firebase Admin not fully configured. Auth verification may fail.');
    }
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
    }),
  });

  initialized = true;
  if (process.env.NODE_ENV !== 'test') {
    console.log('Firebase Admin initialized');
  }
};

export const isFirebaseInitialized = (): boolean => initialized;

export const verifyFirebaseToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  if (!initialized) throw new Error('Firebase Admin not initialized');
  return admin.auth().verifyIdToken(idToken);
};

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
