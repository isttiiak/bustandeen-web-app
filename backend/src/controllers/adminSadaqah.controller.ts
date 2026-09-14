import { Request, Response, NextFunction } from 'express';
import * as sadaqahService from '../services/sadaqah.service.js';

// req.params values are typed string | string[] (Express 5) — none of these
// routes use repeated-param patterns, so just take the first value, matching
// the same normalization zikr.controller.ts's removeTypeHandler already does.
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

export const listPendingHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donations = await sadaqahService.listPending();
    res.json({ ok: true, donations });
  } catch (err) {
    next(err);
  }
};

export const listAllHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as 'pending' | 'verified' | 'rejected' | undefined;
    // Re-read as Number rather than trusting req.query's declared string type —
    // validate() already coerced these, matching how getTimeOfDayHandler does
    // the same for its own zod-coerced query params.
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await sadaqahService.listAll(status, page, limit);
    res.json({ ok: true, ...result });
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
    const type = req.query.type as 'verified' | 'rejected';
    const draft = await sadaqahService.getEmailDraft(paramString(req.params.id), type);
    res.json({ ok: true, ...draft });
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
    const { emailBody } = req.body as { emailBody: string };
    const donation = await sadaqahService.verifyDonation(
      paramString(req.params.id),
      req.user.email ?? '',
      emailBody,
      req.admin?.role === 'ansar' ? 'ansar' : 'sadaqah'
    );
    res.json({ ok: true, donation });
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
    const { emailBody } = req.body as { emailBody: string };
    const donation = await sadaqahService.rejectDonation(
      paramString(req.params.id),
      req.user.email ?? '',
      emailBody,
      req.admin?.role === 'ansar' ? 'ansar' : 'sadaqah'
    );
    res.json({ ok: true, donation });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const deleteDonationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await sadaqahService.deleteDonation(paramString(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const listExpensesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expenses = await sadaqahService.listExpenses();
    res.json({ ok: true, expenses });
  } catch (err) {
    next(err);
  }
};

export const addExpenseHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // validate() already ran addExpenseSchema's z.coerce.date() over this —
    // req.body.date is a real Date instance here, not a string.
    const { date, amount, description } = req.body as {
      date: Date;
      amount: number;
      description: string;
    };
    const expense = await sadaqahService.addExpense(
      date,
      amount,
      description,
      req.user.email ?? ''
    );
    res.json({ ok: true, expense });
  } catch (err) {
    next(err);
  }
};

export const deleteExpenseHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await sadaqahService.deleteExpense(paramString(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const upsertQuarterlyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await sadaqahService.upsertQuarterly(paramString(req.params.quarter), req.body);
    res.json({ ok: true, stats });
  } catch (err) {
    next(err);
  }
};

export const deleteQuarterlyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await sadaqahService.deleteQuarterly(paramString(req.params.quarter));
    res.json({ ok: true, stats });
  } catch (err) {
    next(err);
  }
};
