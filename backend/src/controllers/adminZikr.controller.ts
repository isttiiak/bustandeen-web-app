import { Request, Response, NextFunction } from 'express';
import * as zikrRequestService from '../services/zikrRequest.service.js';
import { ZikrRequestStatus } from '../models/ZikrRequest.js';
import { GlobalZikrCategory } from '../models/GlobalZikrLibraryItem.js';
import { logAdminAction } from '../services/adminAudit.service.js';
import * as zikrAudioService from '../services/zikrAudio.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status === 404 || status === 409) {
    res.status(status).json({ ok: false, error: (err as Error).message });
    return;
  }
  next(err);
};

export const listHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as ZikrRequestStatus | undefined;
    const requests = await zikrRequestService.listRequests(status);
    res.json({ ok: true, requests });
  } catch (err) {
    next(err);
  }
};

export const emailDraftHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const type = req.query.type as 'approved' | 'rejected';
    const draft = await zikrRequestService.getEmailDraft(paramString(req.params.id), type);
    res.json({ ok: true, ...draft });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const approveHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This whole route file is domain-scoped to 'general' (requireDomain in
    // adminZikr.routes.ts) — the sender identity is fixed to the
    // ansar@bustandeen.com domain, not by which admin (Servant or the
    // general Ansar) happens to click.
    const id = paramString(req.params.id);
    const request = await zikrRequestService.approveRequest(
      id,
      req.user.email ?? '',
      req.body,
      'ansar'
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'zikrRequest.approve',
      targetType: 'ZikrRequest',
      targetId: id,
    });
    res.json({ ok: true, request });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const rejectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { adminNote, emailBody } = req.body as { adminNote?: string; emailBody?: string };
    const id = paramString(req.params.id);
    const request = await zikrRequestService.rejectRequest(
      id,
      req.user.email ?? '',
      adminNote,
      emailBody,
      'ansar'
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'zikrRequest.reject',
      targetType: 'ZikrRequest',
      targetId: id,
    });
    res.json({ ok: true, request });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

/** Servant-only (see adminZikr.routes.ts) — re-categorize an already-
 * published library item. Not full CRUD, just this one field. */
export const updateLibraryCategoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category } = req.body as { category: GlobalZikrCategory };
    const id = paramString(req.params.id);
    const item = await zikrRequestService.updateLibraryItemCategory(id, category);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'library.updateCategory',
      targetType: 'GlobalZikrLibraryItem',
      targetId: id,
      metadata: { category },
    });
    res.json({ ok: true, item });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

/** Any admin in the 'general' domain — content-sourcing work, not a
 * Servant-only edit. Returns curated-name audio assets only; the frontend
 * cross-references against its own imported curated list (backend has no
 * access to frontend/src/utils/zikrLibrary.ts, same boundary
 * zikrDuplicateMatch.ts already respects) and against the library items also
 * returned here (those carry their own audioUrl field directly). */
export const audioStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [curated, libraryItems] = await Promise.all([
      zikrAudioService.listCuratedAudio(),
      zikrRequestService.listGlobalLibrary(),
    ]);
    res.json({ ok: true, curated, libraryItems });
  } catch (err) {
    next(err);
  }
};

export const setCuratedAudioHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { audioUrl } = req.body as { audioUrl: string };
    const name = paramString(req.params.name);
    const asset = await zikrAudioService.setCuratedAudio(name, audioUrl, req.admin!.email);
    res.json({ ok: true, asset });
  } catch (err) {
    next(err);
  }
};

export const setLibraryItemAudioHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { audioUrl } = req.body as { audioUrl: string };
    const id = paramString(req.params.id);
    const item = await zikrRequestService.setLibraryItemAudio(id, audioUrl);
    res.json({ ok: true, item });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const listLibraryHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const items = await zikrRequestService.listGlobalLibrary();
    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
};

/** Servant-only full-field edit of an already-published library item. */
export const updateLibraryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    const item = await zikrRequestService.updateLibraryItem(id, req.body);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'library.update',
      targetType: 'GlobalZikrLibraryItem',
      targetId: id,
    });
    res.json({ ok: true, item });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

/** Servant-only — retire a duplicate/bad library entry. */
export const deleteLibraryItemHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    await zikrRequestService.deleteLibraryItem(id);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'library.delete',
      targetType: 'GlobalZikrLibraryItem',
      targetId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
