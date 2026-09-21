import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import * as userPrefsService from '../services/userPrefs.service.js';
import { isAdminEmail } from '../middleware/auth.js';

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
    res.json({ ok: true, user, isAdmin: isAdminEmail(req.user.email) });
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
    } = req.body as {
      displayName?: string;
      photoUrl?: string;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
      birthDate?: string;
      firstName?: string;
      lastName?: string;
      occupation?: string;
      bio?: string;
      city?: string;
      country?: string;
      hijriOffset?: number;
      dayStartMode?: 'fajr' | 'midnight' | 'maghrib';
      aiEnabled?: boolean;
    };

    const user = await userService.updateUser(req.user.uid, {
      displayName,
      photoUrl,
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
    });

    res.json({ ok: true, user });
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
    res.json({ ok: true, user });
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
    res.json({ ok: true, user });
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
    res.json({ ok: true, user });
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
    const backupService = await import('../services/backup.service.js');
    const data = await backupService.exportAll(req.user.uid);
    res.json({ ok: true, backup: data });
  } catch (err) {
    next(err);
  }
};

/** Read-only "download all my data" - broader than the restorable backup. */
export const exportEverythingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exportEverything } = await import('../services/dataExport.service.js');
    const data = await exportEverything(req.user.uid);
    res.json({ ok: true, data });
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
    if (body?.app !== 'ihsan' || body?.version !== backupService.BACKUP_VERSION) {
      res.status(400).json({
        ok: false,
        error: `Not a Bustandeen backup file (expected app "ihsan", version ${backupService.BACKUP_VERSION}).`,
      });
      return;
    }
    const counts = await backupService.importAll(
      req.user.uid,
      body as unknown as import('../services/backup.service.js').BackupFile
    );
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
