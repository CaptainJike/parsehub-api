import Redis from 'ioredis';
import { env } from '../../config/env';

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false
    });

    globalForRedis.redis.on('error', () => {
      // Connection errors are handled at call sites so the API can degrade safely.
    });
  }

  return globalForRedis.redis;
}

export async function pingRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status === 'wait') {
    await redis.connect();
  }
  await redis.ping();
}

export async function closeRedis(): Promise<void> {
  if (globalForRedis.redis) {
    globalForRedis.redis.disconnect();
    globalForRedis.redis = undefined;
  }
}
