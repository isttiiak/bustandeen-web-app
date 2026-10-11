import { Request, Response, NextFunction } from 'express';
import * as adminMfaService from '../services/adminMfa.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status) {
    res.status(status).json({ ok: false, error: (err as Error).message });
    return;
  }
  next(err);
};

export const startEnrolmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminMfaService.startEnrolment(req.admin!.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const confirmEnrolmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { backupCodes, proof } = await adminMfaService.confirmEnrolment(
      req.admin!.uid,
      (req.body as { code: string }).code
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'account.mfaEnrolled',
      targetType: 'AdminAccount',
      targetId: req.admin!.email,
    });
    res.json({ ok: true, backupCodes, mfaProof: proof });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const verifyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminMfaService.verifyCode(
      req.admin!.uid,
      (req.body as { code: string }).code
    );
    if (result.usedBackupCode) {
      await logAdminAction({
        actorEmail: req.admin!.email,
        actorRole: req.admin!.role,
        action: 'account.mfaBackupCodeUsed',
        targetType: 'AdminAccount',
        targetId: req.admin!.email,
        metadata: { backupCodesLeft: result.backupCodesLeft },
      });
    }
    res.json({
      ok: true,
      mfaProof: result.proof,
      usedBackupCode: result.usedBackupCode,
      backupCodesLeft: result.backupCodesLeft,
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

/** Servant-only: an admin lost their authenticator; they enrol again. */
export const resetHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const account = await adminMfaService.resetMfa(req.params.id as string);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'account.mfaReset',
      targetType: 'AdminAccount',
      targetId: String(account._id),
      metadata: { email: account.email },
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
