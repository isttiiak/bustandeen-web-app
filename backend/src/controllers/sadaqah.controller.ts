import { Request, Response, NextFunction } from 'express';
import * as sadaqahService from '../services/sadaqah.service.js';

export const submitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // No requireAuth on this route — guests can donate — so req.user may be
    // genuinely undefined at runtime despite its non-optional declared type.
    const userId = req.user?.uid ?? null;
    const donation = await sadaqahService.submitDonation(req.body, req.ip ?? 'unknown', userId);
    res.json({ ok: true, id: donation._id, status: donation.status });
  } catch (err) {
    // The only unique index on this collection is the partial one on
    // transactionId, so any E11000 here means that — worth a message more
    // specific than the global handler's generic "Duplicate entry".
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ ok: false, error: 'This transaction ID has already been submitted.' });
      return;
    }
    next(err);
  }
};

export const verifyReceiptHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id ?? '');
    const sig = typeof req.query.s === 'string' ? req.query.s : '';
    res.json({ ok: true, ...(await sadaqahService.checkReceipt(id, sig)) });
  } catch (err) {
    next(err);
  }
};

export const getStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await sadaqahService.getPublicStats();
    res.json({ ok: true, ...stats });
  } catch (err) {
    next(err);
  }
};

/**
 * The bKash/Nagad numbers are backend-only env vars (never hardcoded, never
 * VITE_-prefixed) so they can be changed without a frontend rebuild+deploy —
 * this just hands them to the donate page to render.
 */
export const getConfigHandler = (_req: Request, res: Response): void => {
  res.json({
    ok: true,
    bkashNumber: process.env.SADAQAH_BKASH_NUMBER ?? null,
    nagadNumber: process.env.SADAQAH_NAGAD_NUMBER ?? null,
    nagadEnabled: false,
  });
};
