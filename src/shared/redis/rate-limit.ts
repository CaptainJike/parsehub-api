import { getRedis } from './client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export async function consumeFixedWindowLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (limit <= 0) {
    return { allowed: false, remaining: 0, resetSeconds: windowSeconds };
  }

  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    const ttl = await redis.ttl(key);
    return {
      allowed: count <= limit,
      remaining: Math.max(limit - count, 0),
      resetSeconds: ttl > 0 ? ttl : windowSeconds
    };
  } catch {
    return { allowed: true, remaining: limit, resetSeconds: windowSeconds };
  }
}
