import AdminAccount, { IAdminAccount } from '../models/AdminAccount.js';
import { decryptJson, encryptJson } from '../utils/fieldCrypto.js';
import { issueMfaProof } from '../utils/adminMfaProof.js';
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  otpauthUri,
  verifyTotp,
} from '../utils/totp.js';

/**
 * Admin second factor (T1.4): an authenticator-app code (TOTP) checked here,
 * plus 8 single-use backup codes. No Firebase Identity Platform: upgrading the
 * shared Firebase project would cap the whole app at 3,000 daily users on the
 * Spark plan.
 */

export class AdminMfaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** How long a secret shown during enrolment can still be confirmed. */
export const ENROL_PENDING_MS = 10 * 60 * 1000;

const findActive = async (uid: string): Promise<IAdminAccount> => {
  const account = await AdminAccount.findOne({ firebaseUid: uid, active: true });
  if (!account) throw new AdminMfaError('admin_session_required', 401);
  return account;
};

/** Step 1 of enrolment: a fresh secret for the authenticator app. */
export const startEnrolment = async (
  uid: string
): Promise<{ secret: string; otpauthUri: string }> => {
  const account = await findActive(uid);
  if (account.totpSecretEnc) throw new AdminMfaError('mfa_already_enabled', 409);
  const secret = generateTotpSecret();
  account.totpPendingSecretEnc = encryptJson(secret);
  account.totpPendingAt = new Date();
  await account.save();
  return { secret, otpauthUri: otpauthUri(secret, account.email) };
};

/** Step 2: the first code proves the app holds the secret; enrolment is on. */
export const confirmEnrolment = async (
  uid: string,
  code: string,
  nowMs: number = Date.now()
): Promise<{ backupCodes: string[]; proof: string }> => {
  const account = await findActive(uid);
  if (account.totpSecretEnc) throw new AdminMfaError('mfa_already_enabled', 409);
  const secret = decryptJson<string>(account.totpPendingSecretEnc);
  if (
    !secret ||
    !account.totpPendingAt ||
    nowMs - account.totpPendingAt.getTime() > ENROL_PENDING_MS
  ) {
    throw new AdminMfaError('mfa_enrolment_expired', 410);
  }
  const step = verifyTotp(secret, code.trim(), { nowMs });
  if (step === null) throw new AdminMfaError('mfa_code_invalid', 400);

  const backupCodes = generateBackupCodes();
  const mfaVersion = (account.mfaVersion ?? 0) + 1;
  // Conditional on "still not enrolled", so two racing confirms can't both win.
  const updated = await AdminAccount.findOneAndUpdate(
    { _id: account._id, totpSecretEnc: null },
    {
      $set: {
        totpSecretEnc: encryptJson(secret),
        totpEnabledAt: new Date(nowMs),
        totpLastStep: step,
        backupCodeHashes: backupCodes.map(hashBackupCode),
        mfaVersion,
        totpPendingSecretEnc: null,
        totpPendingAt: null,
      },
    },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AdminMfaError('mfa_already_enabled', 409);
  return { backupCodes, proof: issueMfaProof(uid, mfaVersion, nowMs) };
};

/**
 * Sign-in step: a 6-digit authenticator code or one backup code. Each is
 * accepted once only (the step / the code hash is consumed atomically).
 */
export const verifyCode = async (
  uid: string,
  rawCode: string,
  nowMs: number = Date.now()
): Promise<{ proof: string; usedBackupCode: boolean; backupCodesLeft: number }> => {
  const account = await findActive(uid);
  const secret = decryptJson<string>(account.totpSecretEnc);
  if (!secret) throw new AdminMfaError('mfa_not_enrolled', 409);
  const mfaVersion = account.mfaVersion ?? 0;
  const code = rawCode.trim();

  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(secret, code, { nowMs, lastUsedStep: account.totpLastStep });
    if (step === null) throw new AdminMfaError('mfa_code_invalid', 400);
    const claimed = await AdminAccount.updateOne(
      {
        _id: account._id,
        mfaVersion,
        $or: [{ totpLastStep: null }, { totpLastStep: { $lt: step } }],
      },
      { $set: { totpLastStep: step } }
    );
    if (claimed.modifiedCount !== 1) throw new AdminMfaError('mfa_code_invalid', 400);
    return {
      proof: issueMfaProof(uid, mfaVersion, nowMs),
      usedBackupCode: false,
      backupCodesLeft: account.backupCodeHashes?.length ?? 0,
    };
  }

  const hash = hashBackupCode(code);
  const updated = await AdminAccount.findOneAndUpdate(
    { _id: account._id, mfaVersion, backupCodeHashes: hash },
    { $pull: { backupCodeHashes: hash } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AdminMfaError('mfa_code_invalid', 400);
  return {
    proof: issueMfaProof(uid, mfaVersion, nowMs),
    usedBackupCode: true,
    backupCodesLeft: updated.backupCodeHashes?.length ?? 0,
  };
};

/**
 * Servant: turn an admin's second factor off so they enrol again at their
 * next sign-in (lost phone). Every proof issued before stops working.
 */
export const resetMfa = async (accountId: string): Promise<IAdminAccount> => {
  const account = await AdminAccount.findById(accountId);
  if (!account) throw new AdminMfaError('Admin account not found', 404);
  account.totpSecretEnc = null;
  account.totpPendingSecretEnc = null;
  account.totpPendingAt = null;
  account.totpEnabledAt = null;
  account.totpLastStep = null;
  account.backupCodeHashes = [];
  account.mfaVersion = (account.mfaVersion ?? 0) + 1;
  await account.save();
  return account;
};

/** A fresh proof for the caller (after a password change ends older sessions). */
export const reissueProof = async (uid: string, nowMs: number = Date.now()): Promise<string> => {
  const account = await findActive(uid);
  return issueMfaProof(uid, account.mfaVersion ?? 0, nowMs);
};
