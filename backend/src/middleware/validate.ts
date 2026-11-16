import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { CLIENT_DAY_CODE } from '../validation/clientDay.js';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const issues = (result.error as ZodError).issues;
      // A wrong device clock is the one 400 the user can fix themselves; the
      // app shows its own translated message for this code (audit P0-3).
      const wrongDeviceDate = issues.some(
        (e) => (e as { params?: { code?: string } }).params?.code === CLIENT_DAY_CODE
      );
      res.status(400).json({
        ok: false,
        error: 'Validation failed',
        ...(wrongDeviceDate ? { code: CLIENT_DAY_CODE } : {}),
        details: issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // Apply coerced/parsed values back to req
    const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
    // Replace, do not merge (audit 2026-11-16 P0-10): merging kept every key
    // the schema strips, so `Object.assign(doc, req.body)` style controllers
    // could set fields the schema never allowed. A schema with no `body`
    // leaves the request body alone.
    if (data.body !== undefined) req.body = data.body;
    // Express 5 re-parses `req.query` from the URL on every read, so assigning
    // onto it changes a throwaway object and controllers kept getting the raw
    // strings (audit 2026-11-16 P0-1: "phrase=0" read as truthy). Define the
    // parsed values on the request itself. Keys the schema does not name are
    // kept as they arrived, so a controller reading one behaves as before.
    if (data.query && typeof data.query === 'object') {
      Object.defineProperty(req, 'query', {
        value: { ...req.query, ...(data.query as Record<string, unknown>) },
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
