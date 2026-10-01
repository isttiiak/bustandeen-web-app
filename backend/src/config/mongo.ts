import mongoose from 'mongoose';

/**
 * Serverless-safe connection: the connect promise is cached at module scope so
 * warm Vercel invocations reuse the existing socket instead of reconnecting
 * (the module stays alive between requests on the same instance). The
 * long-lived local/Render server uses the exact same function — calling it
 * again is a no-op once connected.
 */
let cached: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  if (!cached) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');
    mongoose.set('strictQuery', true);
    cached = mongoose
      .connect(uri, {
        dbName: 'ihsan',
        // Indexes are managed explicitly: `npm run sync-indexes` (dry run),
        // then `npm run sync-indexes -- --apply`. Never build them implicitly
        // on a cold start, and never from local dev either: backend/.env points
        // at the live Atlas database, so a dev server with autoIndex on would
        // change production indexes (it did once, 2026-10-01). Only the test
        // suite (mongodb-memory-server) builds them automatically, or a local
        // DB that opts in with MONGO_AUTO_INDEX=1.
        autoIndex: process.env.NODE_ENV === 'test' || process.env.MONGO_AUTO_INDEX === '1',
        // Atlas M0 caps total connections at 500 — with Fluid Compute warm
        // instances persist longer, so we raise the per-instance pool to 10
        // while keeping minPoolSize:1 so idle instances don't hold spare sockets.
        // family:4 forces IPv4 to avoid DNS round-trip jitter on some Vercel regions.
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        family: 4,
      })
      .then((m) => {
        if (process.env.NODE_ENV !== 'test') console.warn('MongoDB connected');
        return m;
      })
      .catch((err) => {
        cached = null; // let the next invocation retry instead of caching the failure
        throw err;
      });
  }
  await cached;
};
