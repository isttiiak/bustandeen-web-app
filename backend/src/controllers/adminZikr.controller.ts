import { Request, Response, NextFunction } from 'express';
import * as zikrRequestService from '../services/zikrRequest.service.js';
import { ZikrRequestStatus } from '../models/ZikrRequest.js';

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
    const request = await zikrRequestService.approveRequest(
      paramString(req.params.id),
      req.user.email ?? '',
      req.body,
      req.admin?.role === 'ansar' ? 'ansar' : 'sadaqah'
    );
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
    const request = await zikrRequestService.rejectRequest(
      paramString(req.params.id),
      req.user.email ?? '',
      adminNote,
      emailBody,
      req.admin?.role === 'ansar' ? 'ansar' : 'sadaqah'
    );
    res.json({ ok: true, request });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
