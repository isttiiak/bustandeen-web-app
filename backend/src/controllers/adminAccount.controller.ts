import { Request, Response, NextFunction } from 'express';
import AdminAccount from '../models/AdminAccount.js';
import * as adminAccountService from '../services/adminAccount.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status) {
    res.status(status).json({ ok: false, error: (err as Error).message });
    return;
  }
  next(err);
};

/**
 * Confirms an admin's Firebase sign-in actually maps to an active
 * AdminAccount row, and tells the frontend which role it holds. Also stamps
 * lastLoginAt — the only place that field is ever written, so it reflects
 * every successful admin-panel entry, not just the AdminAccount CRUD below.
 */
export const sessionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ ok: false, error: 'admin_session_required' });
      return;
    }
    await AdminAccount.updateOne(
      { firebaseUid: req.admin.uid },
      { $set: { lastLoginAt: new Date() } }
    );
    res.json({
      ok: true,
      email: req.admin.email,
      role: req.admin.role,
      ansarDomain: req.admin.ansarDomain,
    });
  } catch (err) {
    next(err);
  }
};

export const listHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accounts = await adminAccountService.listAdminAccounts();
    res.json({
      ok: true,
      accounts: accounts.map((a) => ({
        id: a._id,
        email: a.email,
        displayName: a.displayName,
        role: a.role,
        ansarDomain: a.ansarDomain,
        active: a.active,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        lastLoginAt: a.lastLoginAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const createHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, displayName, role, ansarDomain } = req.body as {
      email: string;
      password: string;
      displayName?: string;
      role: 'servant' | 'ansar';
      ansarDomain?: 'sadaqah' | 'general';
    };
    const account = await adminAccountService.createAdminAccount({
      email,
      password,
      displayName,
      role,
      ansarDomain,
      createdBy: req.admin!.email,
    });
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'account.create',
      targetType: 'AdminAccount',
      targetId: String(account._id),
      metadata: { email: account.email, role: account.role, ansarDomain: account.ansarDomain },
    });
    res.status(201).json({
      ok: true,
      account: {
        id: account._id,
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        ansarDomain: account.ansarDomain,
        active: account.active,
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const setActiveHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { active } = req.body as { active: boolean };
    const account = await adminAccountService.setAdminAccountActive(
      req.params.id as string,
      active,
      req.admin!.email
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: active ? 'account.activate' : 'account.deactivate',
      targetType: 'AdminAccount',
      targetId: String(account._id),
    });
    res.json({ ok: true, account: { id: account._id, active: account.active } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
