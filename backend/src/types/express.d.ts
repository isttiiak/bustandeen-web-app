import type { AdminRole, AnsarDomain } from '../models/AdminAccount.js';

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
        /** Only meaningful for role:'ansar' — which single operational area
         * this account may touch (null for servant, which bypasses domain
         * checks entirely via requireDomain). */
        ansarDomain: AnsarDomain | null;
      };
    }
  }
}
