import type { Request, Response, NextFunction } from 'express';
import * as clientErrorService from '../services/clientError.service.js';

/** Always 204: the browser gets nothing back. */
export const reportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Awaited: on serverless, work left running after the response may be frozen.
    await clientErrorService.recordClientError(req.body as clientErrorService.ClientErrorReport);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
