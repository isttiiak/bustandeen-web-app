import { Request, Response, NextFunction } from 'express';
import * as zikrRequestService from '../services/zikrRequest.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

export const submitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, arabic, meaning, source, sourceUrl, wantsAudio } = req.body as {
      name: string;
      arabic?: string;
      meaning?: string;
      source?: string;
      sourceUrl?: string;
      wantsAudio?: boolean;
    };
    const request = await zikrRequestService.submitRequest(req.user.uid, req.user.email, {
      name,
      arabic,
      meaning,
      source,
      sourceUrl,
      wantsAudio,
    });
    res.json({ ok: true, request });
  } catch (err) {
    next(err);
  }
};

export const listMineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requests = await zikrRequestService.listMine(req.user.uid);
    res.json({ ok: true, requests });
  } catch (err) {
    next(err);
  }
};

export const ackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await zikrRequestService.acknowledge(req.user.uid, paramString(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};

export const libraryHandler = async (
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
