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
      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await admin.auth().getUserByEmail(normalizedEmail);
      } catch {
        if (!password) {
          console.warn(
            `[adminAccount] Skipping bootstrap for ${normalizedEmail}: no Firebase account exists and no bootstrap password was provided.`
          );
          continue;
        }
        firebaseUser = await admin.auth().createUser({
          email: normalizedEmail,
          password,
          emailVerified: true,
        });
      }

      await AdminAccount.create({
        firebaseUid: firebaseUser.uid,
        email: normalizedEmail,
        role,
        ansarDomain,
        active: true,
        createdBy: 'bootstrap',
      });
      console.log(`[adminAccount] Bootstrapped ${role} account: ${normalizedEmail}`);
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
      console.log(
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
 * could add another Servant too). Creates the Firebase account if an email
 * doesn't already have one — a fresh hire never needs a Firebase account set
 * up out-of-band first.
 */
export const createAdminAccount = async (input: {
  email: string;
  password: string;
  displayName?: string;
  role: AdminRole;
  ansarDomain?: AnsarDomain | null;
  createdBy: string;
}): Promise<IAdminAccount> => {
  const email = input.email.trim().toLowerCase();
  const existing = await AdminAccount.findOne({ email });
  if (existing) throw new AdminAccountError('An admin account with this email already exists', 409);

  let firebaseUser: admin.auth.UserRecord;
  try {
    firebaseUser = await admin.auth().getUserByEmail(email);
  } catch {
    firebaseUser = await admin.auth().createUser({
      email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
    });
  }

  return AdminAccount.create({
    firebaseUid: firebaseUser.uid,
    email,
    displayName: input.displayName,
    role: input.role,
    ansarDomain: input.role === 'ansar' ? (input.ansarDomain ?? null) : null,
    active: true,
    createdBy: input.createdBy,
  });
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
