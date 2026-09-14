import admin from 'firebase-admin';
import AdminAccount, { AdminRole, IAdminAccount } from '../models/AdminAccount.js';
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

  const candidates: { email?: string; password?: string; role: AdminRole }[] = [
    {
      email: process.env.SERVANT_EMAIL,
      password: process.env.SERVANT_BOOTSTRAP_PASSWORD,
      role: 'servant',
    },
    {
      email: process.env.ANSAR_EMAIL,
      password: process.env.ANSAR_BOOTSTRAP_PASSWORD,
      role: 'ansar',
    },
  ];

  for (const { email, password, role } of candidates) {
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
        active: true,
        createdBy: 'bootstrap',
      });
      console.log(`[adminAccount] Bootstrapped ${role} account: ${normalizedEmail}`);
    } catch (err) {
      console.error(`[adminAccount] Failed to bootstrap ${normalizedEmail}:`, err);
    }
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
