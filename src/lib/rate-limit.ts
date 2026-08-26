import "server-only";
import { rateLimited } from "@/lib/errors";

/**
 * In-process fixed-window rate limiter.
 *
 * Deliberately simple: it protects the login and portal-access endpoints of a
 * single-instance MVP against brute force. A multi-instance deployment should
 * swap this for a shared store (Redis / Upstash) - the call sites do not change.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: allowed ? 0 : existing.resetAt - now,
  };
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = consumeRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    const seconds = Math.ceil(result.retryAfterMs / 1000);
    throw rateLimited(
      `Too many attempts. Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
    );
  }
}

/** Test helper. */
export function __resetRateLimits() {
  buckets.clear();
}
