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
        autoIndex: true,
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
