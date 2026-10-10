import admin from 'firebase-admin';
import AdminAccount, { AdminRole, AnsarDomain, IAdminAccount } from '../models/AdminAccount.js';
import { isFirebaseInitialized } from '../config/firebaseAdmin.js';

class AdminAccountError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

let bootstrapAttempted = false;

/** The slice of firebase-admin's Auth that linkFirebaseUser needs, so the
 *  decision can be tested with a fake. */
export interface FirebaseAuthLike {
  getUserByEmail(email: string): Promise<{ uid: string; emailVerified: boolean }>;
  createUser(props: {
    email: string;
    password: string;
    displayName?: string;
    emailVerified: boolean;
  }): Promise<{ uid: string }>;
  updateUser(
    uid: string,
    props: { password: string; emailVerified: boolean; displayName?: string }
  ): Promise<unknown>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

/** How the Firebase side of a new admin was set up. */
export type FirebaseLink = 'created' | 'linked' | 'reclaimed';

const isUserNotFound = (err: unknown): boolean =>
  (err as { code?: string })?.code === 'auth/user-not-found';

/**
 * Finds or creates the Firebase account behind a new admin.
 *
 * - No account for the email: create one with the given password ('created').
 * - An email-verified account: its owner proved the address, so it is linked
 *   as is and keeps its own password ('linked').
 * - An account that never verified the email: anyone can sign up in the app
 *   with an address they don't own, so linking it would hand the panel to
 *   whoever registered it first. Its password is replaced with the one the
 *   Servant chose, the email is marked verified and its sessions are revoked
 *   ('reclaimed').
 *
 * Throws on any lookup error other than "not found"; never guesses.
 */
export const linkFirebaseUser = async (
  auth: FirebaseAuthLike,
  input: { email: string; password?: string; displayName?: string }
): Promise<{ uid: string; link: FirebaseLink }> => {
  let existing: { uid: string; emailVerified: boolean } | null = null;
  try {
    existing = await auth.getUserByEmail(input.email);
  } catch (err) {
    if (!isUserNotFound(err)) throw err;
  }

  if (!existing) {
    if (!input.password) {
      throw new AdminAccountError('A password is needed to create this account', 400);
    }
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
    });
    return { uid: created.uid, link: 'created' };
  }

  if (existing.emailVerified) return { uid: existing.uid, link: 'linked' };

  if (!input.password) {
    throw new AdminAccountError(
      'This email has an unverified account; a password is needed to take it over',
      409
    );
  }
  await auth.updateUser(existing.uid, {
    password: input.password,
    emailVerified: true,
    ...(input.displayName ? { displayName: input.displayName } : {}),
  });
  await auth.revokeRefreshTokens(existing.uid);
  return { uid: existing.uid, link: 'reclaimed' };
};

/**
 * Ensures the initial Servant and (optionally) first Ansar exist as
 * AdminAccount rows, so a fresh deploy has a working admin login without any
 * manual DB step. Idempotent in two ways: a process-level flag skips repeat
 * work on a warm serverless instance (called on every request there, see
 * api/index.ts), and per-email the AdminAccount lookup means an email
 * already registered is left untouched — in particular this NEVER resets an
 * existing account's password, only creates the Firebase user + AdminAccount
 * row the very first time. Every admin added after this initial pair goes
 * through the Servant-only "add Ansar" flow below, never through env vars.
 */
export const bootstrapAdminAccounts = async (): Promise<void> => {
  if (bootstrapAttempted || !isFirebaseInitialized()) return;
  bootstrapAttempted = true;

  const candidates: {
    email?: string;
    password?: string;
    role: AdminRole;
    ansarDomain: AnsarDomain | null;
  }[] = [
    {
      email: process.env.SERVANT_EMAIL,
      password: process.env.SERVANT_BOOTSTRAP_PASSWORD,
      role: 'servant',
      ansarDomain: null,
    },
    {
      // The original single Ansar — its real-world job has always been the
      // "everything except sadaqah" queue (it's the default
      // ZIKR_REQUEST_REVIEW_EMAIL), so it bootstraps straight into 'general'.
      // sadaqah@bustandeen.com is a separate account added later via the
      // Servant-only "add Ansar" UI, never through env vars.
      email: process.env.ANSAR_EMAIL,
      password: process.env.ANSAR_BOOTSTRAP_PASSWORD,
      role: 'ansar',
      ansarDomain: 'general',
    },
  ];

  for (const { email, password, role, ansarDomain } of candidates) {
    if (!email) continue;
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await AdminAccount.findOne({ email: normalizedEmail });
    if (existing) continue;

    try {
      let linked: { uid: string; link: FirebaseLink };
      try {
        linked = await linkFirebaseUser(admin.auth(), { email: normalizedEmail, password });
      } catch (err) {
        if (err instanceof AdminAccountError) {
          console.warn(`[adminAccount] Skipping bootstrap for ${normalizedEmail}: ${err.message}.`);
          continue;
        }
        throw err;
      }

      await AdminAccount.create({
        firebaseUid: linked.uid,
        email: normalizedEmail,
        role,
        ansarDomain,
        active: true,
        createdBy: 'bootstrap',
        sessionsValidAfter: new Date(),
      });
      console.warn(`[adminAccount] Bootstrapped ${role} account: ${normalizedEmail}`);
    } catch (err) {
      console.error(`[adminAccount] Failed to bootstrap ${normalizedEmail}:`, err);
    }
  }
};

let ansarDomainBackfillAttempted = false;

/**
 * One-time migration for accounts created before ansarDomain existed: any
 * pre-existing 'ansar' row with no domain set is the original
 * ansar@bustandeen.com, whose real job has always been "everything except
 * sadaqah" — see the bootstrap comment above. Must complete before
 * requireDomain starts enforcing scoping, otherwise that account would fail
 * every domain check. Idempotent the same way bootstrapAdminAccounts is (a
 * process-level flag on warm instances; the $set below is also a no-op once
 * every row already has a domain).
 */
export const backfillAnsarDomains = async (): Promise<void> => {
  if (ansarDomainBackfillAttempted) return;
  ansarDomainBackfillAttempted = true;
  try {
    const result = await AdminAccount.updateMany(
      { role: 'ansar', ansarDomain: null },
      { $set: { ansarDomain: 'general' } }
    );
    if (result.modifiedCount > 0) {
      console.warn(
        `[adminAccount] Backfilled ansarDomain:'general' on ${result.modifiedCount} account(s)`
      );
    }
  } catch (err) {
    console.error('[adminAccount] Failed to backfill ansarDomain', err);
  }
};

export const listAdminAccounts = async (): Promise<IAdminAccount[]> =>
  AdminAccount.find().sort({ createdAt: 1 });

/**
 * Servant-only: registers a new admin (normally an Ansar, though a Servant
 * could add another Servant too). The Firebase side goes through
 * linkFirebaseUser, so an unverified account someone registered under the
 * email first is reclaimed, never linked as is.
 */
export const createAdminAccount = async (input: {
  email: string;
  password: string;
  displayName?: string;
  role: AdminRole;
  ansarDomain?: AnsarDomain | null;
  createdBy: string;
}): Promise<{ account: IAdminAccount; link: FirebaseLink }> => {
  const email = input.email.trim().toLowerCase();
  const existing = await AdminAccount.findOne({ email });
  if (existing) throw new AdminAccountError('An admin account with this email already exists', 409);

  const { uid, link } = await linkFirebaseUser(admin.auth(), {
    email,
    password: input.password,
    displayName: input.displayName,
  });

  const account = await AdminAccount.create({
    firebaseUid: uid,
    email,
    displayName: input.displayName,
    role: input.role,
    ansarDomain: input.role === 'ansar' ? (input.ansarDomain ?? null) : null,
    active: true,
    createdBy: input.createdBy,
    sessionsValidAfter: new Date(),
  });
  return { account, link };
};

/**
 * Servant-only — reassigns an existing Ansar to a different operational area
 * (e.g. sadaqah → general or vice versa). Never valid for a 'servant' row
 * (the Servant always bypasses domain scoping entirely, so it has no
 * meaningful domain to set) — enforced here rather than trusting the caller.
 */
export const setAdminAccountDomain = async (
  id: string,
  ansarDomain: AnsarDomain
): Promise<IAdminAccount> => {
  const account = await AdminAccount.findById(id);
  if (!account) throw new AdminAccountError('Admin account not found', 404);
  if (account.role !== 'ansar') {
    throw new AdminAccountError('Only an Ansar account has a reassignable domain', 400);
  }
  account.ansarDomain = ansarDomain;
  await account.save();
  return account;
};

/**
 * Activate/deactivate — the normal way to remove an Ansar's access. Does not
 * delete the Firebase account itself (nothing else in the app depends on
 * that identity, but there's no reason to destroy it either); it just stops
 * requireAdminAuth from accepting this uid.
 */
export const setAdminAccountActive = async (
  id: string,
  active: boolean,
  actingServantEmail: string
): Promise<IAdminAccount> => {
  const account = await AdminAccount.findById(id);
  if (!account) throw new AdminAccountError('Admin account not found', 404);
  if (account.role === 'servant' && account.email === actingServantEmail && !active) {
    throw new AdminAccountError('You cannot deactivate your own account', 400);
  }
  account.active = active;
  await account.save();
  return account;
};

export interface AdminTag {
  role: AdminRole;
  active: boolean;
}

/**
 * Every AdminAccount uid (active or not) with its role. Staff accounts that
 * once signed into the main app also have a User document; the admin user
 * directory badges them and the user counts leave them out.
 */
export const getAdminTagsByUid = async (): Promise<Map<string, AdminTag>> => {
  const rows = await AdminAccount.find().select('firebaseUid role active').lean();
  return new Map(rows.map((r) => [r.firebaseUid, { role: r.role, active: r.active }]));
};

/**
 * Whether this Firebase uid is an active admin's login. Staff who also use the
 * app share that uid with their User document, so deleting or disabling that
 * User would delete or block the admin's own panel login too.
 */
export const isActiveAdminUid = async (uid: string): Promise<boolean> =>
  !!(await AdminAccount.exists({ firebaseUid: uid, active: true }));

/** User filter fragment that leaves out every AdminAccount uid. */
export const excludeAdminUids = async (): Promise<{ uid: { $nin: string[] } }> => ({
  uid: { $nin: [...(await getAdminTagsByUid()).keys()] },
});
