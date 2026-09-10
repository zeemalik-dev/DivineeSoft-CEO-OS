import { HttpError } from "@/lib/auth/session";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter, per process. Enough for login brute-force and AI spend
 * control on a single-region deployment; swap the Map for Redis if you scale out.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${seconds}s.`);
  }
}
