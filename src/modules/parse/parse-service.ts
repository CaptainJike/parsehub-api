import { ParseStatus } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { getJsonCache, setJsonCache } from '../../shared/redis/cache';
import { getRedis } from '../../shared/redis/client';
import { consumeFixedWindowLimit } from '../../shared/redis/rate-limit';
import { prisma } from '../../shared/prisma/client';
import { sha256 } from '../../shared/security/hash';
import { assertPublicHttpUrl, resolveParseInput } from '../../shared/security/url';
import { consumeParseQuota } from '../quota/quota-service';
import { detectPlatform, isPlatform, type Platform } from '../providers/platforms';
import { providerRegistry } from '../providers';

export interface ParseCommand {
  requestId: string;
  userId: string;
  platform: Platform | 'auto';
  input: string;
  ip?: string;
}

export interface ParseResult {
  platform: Platform;
  provider?: string;
  resolvedInput?: string;
  cacheHit: boolean;
  quotaUsed: boolean;
  elapsedMs: number;
  data: unknown;
}

async function withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  const token = `${Date.now()}-${Math.random()}`;
  let locked = false;

  try {
    const result = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
    locked = result === 'OK';
  } catch {
    locked = true;
  }

  if (!locked) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  try {
    return await fn();
  } finally {
    if (locked) {
      try {
        const current = await redis.get(key);
        if (current === token) {
          await redis.del(key);
        }
      } catch {
        // Lock cleanup is best effort.
      }
    }
  }
}

export async function parseMedia(command: ParseCommand): Promise<ParseResult> {
  const startedAt = Date.now();
  const { normalizedInput, resolvedInput, hasPublicUrl } = resolveParseInput(command.input);
  const platform =
    command.platform === 'auto'
      ? detectPlatform(resolvedInput) ?? (!hasPublicUrl ? detectPlatform(normalizedInput) : null)
      : command.platform;

  if (!platform || !isPlatform(platform)) {
    throw new AppError({
      code: 'UNSUPPORTED_PLATFORM',
      message: 'Platform is unsupported or could not be detected.',
      statusCode: 400
    });
  }

  if (platform !== 'pinterest' && platform !== 'yts') {
    assertPublicHttpUrl(resolvedInput);
  }

  const userLimit = await consumeFixedWindowLimit(`rate:user:${command.userId}`, 30, 60);
  if (!userLimit.allowed) {
    throw new AppError({
      code: 'RATE_LIMITED',
      message: 'Too many parse requests. Please try again later.',
      statusCode: 429,
      retryable: true
    });
  }

  if (command.ip) {
    const ipLimit = await consumeFixedWindowLimit(`rate:ip:${command.ip}`, 120, 60);
    if (!ipLimit.allowed) {
      throw new AppError({
        code: 'IP_RATE_LIMITED',
        message: 'Too many requests from this network.',
        statusCode: 429,
        retryable: true
      });
    }
  }

  const inputHash = sha256(resolvedInput);
  const cacheKey = `parse:cache:${platform}:${inputHash}`;
  const cached = await getJsonCache<unknown>(cacheKey);
  if (cached) {
    await prisma.parseRequest.create({
      data: {
        requestId: command.requestId,
        userId: command.userId,
        platform,
        inputHash,
        provider: 'cache',
        status: ParseStatus.CACHE_HIT,
        cacheHit: true,
        quotaUsed: false,
        elapsedMs: Date.now() - startedAt
      }
    });

    return {
      platform,
      provider: 'cache',
      resolvedInput,
      cacheHit: true,
      quotaUsed: false,
      elapsedMs: Date.now() - startedAt,
      data: cached
    };
  }

  const lockKey = `lock:parse:${platform}:${inputHash}`;
  return withLock(lockKey, 30, async () => {
    const secondCached = await getJsonCache<unknown>(cacheKey);
    if (secondCached) {
      return {
        platform,
        provider: 'cache',
        resolvedInput,
        cacheHit: true,
        quotaUsed: false,
        elapsedMs: Date.now() - startedAt,
        data: secondCached
      };
    }

    await consumeParseQuota(command.userId, command.requestId);

    try {
      const providerResult = await providerRegistry.parse({
        platform,
        input: resolvedInput,
        requestId: command.requestId,
        timeoutMs: env.PROVIDER_TIMEOUT_MS
      });

      await setJsonCache(cacheKey, providerResult.normalized, env.PARSE_CACHE_TTL_SECONDS);

      await prisma.parseRequest.create({
        data: {
          requestId: command.requestId,
          userId: command.userId,
          platform,
          inputHash,
          provider: providerResult.provider,
          status: ParseStatus.SUCCESS,
          cacheHit: false,
          quotaUsed: true,
          elapsedMs: Date.now() - startedAt
        }
      });

      return {
        platform,
        provider: providerResult.provider,
        resolvedInput,
        cacheHit: false,
        quotaUsed: true,
        elapsedMs: Date.now() - startedAt,
        data: providerResult.normalized
      };
    } catch (error) {
      await prisma.parseRequest.create({
        data: {
          requestId: command.requestId,
          userId: command.userId,
          platform,
          inputHash,
          status: ParseStatus.FAILED,
          cacheHit: false,
          quotaUsed: true,
          elapsedMs: Date.now() - startedAt,
          errorCode: error instanceof AppError ? error.code : 'PROVIDER_ERROR',
          errorReason: error instanceof Error ? error.message : 'Provider error'
        }
      });
      throw error;
    }
  });
}
