import type { AdminRole } from '../models/AdminAccount.js';

export {};

declare global {
  namespace Express {
    interface Request {
      user: {
        uid: string;
        email?: string;
        [key: string]: unknown;
      };
      /** Set by requireAdminAuth — the AdminAccount record backing this
       * request's verified Firebase identity. Absent on non-admin routes. */
      admin?: {
        uid: string;
        email: string;
        role: AdminRole;
      };
    }
  }
}
