import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import { isActiveAdminUid } from '../services/adminAccount.service.js';
import * as userPrefsService from '../services/userPrefs.service.js';
import { isAdminEmail } from '../middleware/auth.js';
import type { AvatarId } from '../utils/avatars.js';

export const getUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.user.uid);
    if (!user) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return;
    }
    // Weak ETag keyed on updatedAt — cuts payload bytes for the very common
    // case where profile data hasn't changed since the client's last fetch.
    const etag = `W/"${user.updatedAt.getTime()}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.json({
      ok: true,
      user: userService.toClientUser(user),
      isAdmin: isAdminEmail(req.user.email),
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      displayName,
      photoUrl,
      avatarId,
      gender,
      birthDate,
      firstName,
      lastName,
      occupation,
      bio,
      city,
      country,
      hijriOffset,
      dayStartMode,
      aiEnabled,
      onboarded,
    } = req.body as {
      displayName?: string;
      photoUrl?: string;
      avatarId?: AvatarId | null;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
      birthDate?: string;
      firstName?: string;
      lastName?: string;
      occupation?: string;
      bio?: string;
      city?: string;
      country?: string;
      hijriOffset?: number | null;
      dayStartMode?: 'fajr' | 'midnight' | 'maghrib';
      aiEnabled?: boolean;
      onboarded?: true;
    };

    const user = await userService.updateUser(req.user.uid, {
      displayName,
      photoUrl,
      avatarId,
      gender,
      birthDate,
      firstName,
      lastName,
      occupation,
      bio,
      city,
      country,
      hijriOffset,
      dayStartMode,
      aiEnabled,
      onboarded,
    });

    res.json({ ok: true, user: user && userService.toClientUser(user) });
  } catch (err) {
    next(err);
  }
};

export const linkGoogleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { googleEmail, googleUid } = req.body as { googleEmail: string; googleUid: string };
    const user = await userService.linkGoogleProvider(req.user.uid, googleEmail, googleUid);
    res.json({ ok: true, user: user && userService.toClientUser(user) });
  } catch (err) {
    next(err);
  }
};

export const unlinkGoogleHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { providerUid } = req.body as { providerUid: string };
    const user = await userService.unlinkGoogleProvider(req.user.uid, providerUid);
    res.json({ ok: true, user: user && userService.toClientUser(user) });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    const user = await userService.setPrimaryEmail(req.user.uid, email);
    res.json({ ok: true, user: user && userService.toClientUser(user) });
  } catch (err) {
    next(err);
  }
};

export const deleteAccountHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // An admin's panel login is this same Firebase account; deleting it here
    // would lock them out of the panel. The Servant deactivates it first.
    if (await isActiveAdminUid(req.user.uid)) {
      res.status(409).json({ ok: false, error: 'staff_account' });
      return;
    }
    await userService.deleteAccount(req.user.uid);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ── Full-account backup & restore (Istiak's spec, v4.9) ─────────────────────

export const exportAllHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exportBackup } = await import('../services/backup.service.js');
    res.json({ ok: true, backup: await exportBackup(req.user.uid) });
  } catch (err) {
    next(err);
  }
};

/** Old "All my data" route, kept for PWAs still running a pre-U6 Settings
 * page: it now returns the same version-3 backup. Remove after 2026-10-24. */
export const exportEverythingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exportBackup } = await import('../services/backup.service.js');
    res.json({ ok: true, data: await exportBackup(req.user.uid) });
  } catch (err) {
    next(err);
  }
};

export const importAllHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as { app?: string; version?: number } & Record<string, unknown>;
    const backupService = await import('../services/backup.service.js');
    if (
      body?.app !== 'ihsan' ||
      !backupService.SUPPORTED_BACKUP_VERSIONS.includes(body?.version as number)
    ) {
      res.status(400).json({
        ok: false,
        error: `Not a Bustandeen backup file (expected app "ihsan", version ${backupService.SUPPORTED_BACKUP_VERSIONS.join(' or ')}).`,
      });
      return;
    }
    const counts = await backupService.importBackup(req.user.uid, body);
    res.json({ ok: true, counts });
  } catch (err) {
    next(err);
  }
};

export const getPrefsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ ok: true, prefs: await userPrefsService.getPrefs(req.user.uid) });
  } catch (err) {
    next(err);
  }
};

export const putPrefsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prefs } = req.body as { prefs: Record<string, { v: string; t: number }> };
    res.json({ ok: true, prefs: await userPrefsService.mergePrefs(req.user.uid, prefs) });
  } catch (err) {
    next(err);
  }
};
