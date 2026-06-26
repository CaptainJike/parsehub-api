import { getRedis } from './client';

export async function getJsonCache<T>(key: string): Promise<T | null> {
  try {
    const value = await getRedis().get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache failures must not fail parsing.
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // Ignore cache delete failures.
  }
}
