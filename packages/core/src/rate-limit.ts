import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : undefined;

/** Factory so each route can define its own bucket (e.g. "job-post", "login", "lead-purchase"). */
export function createRateLimiter(bucket: string, limit = 10, windowSeconds = 60) {
  if (!redis) {
    // Dev fallback: no-op limiter so local dev without Upstash doesn't break.
    return { limit: async () => ({ success: true, remaining: limit, reset: 0, limit }) };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `asaplocal:${bucket}`,
  });
}

export async function checkRateLimit(bucket: string, identifier: string, limit = 10, windowSeconds = 60) {
  const limiter = createRateLimiter(bucket, limit, windowSeconds);
  const { success, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    const err = new Error("Too many requests — please slow down.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).statusCode = 429;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).resetAt = reset;
    throw err;
  }
  return { remaining };
}
