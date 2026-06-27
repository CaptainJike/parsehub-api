import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from '../shared/security/hash';

const mocks = vi.hoisted(() => ({
  consumeFixedWindowLimit: vi.fn(),
  getJsonCache: vi.fn(),
  setJsonCache: vi.fn(),
  consumeParseQuota: vi.fn(),
  providerParse: vi.fn(),
  parseRequestCreate: vi.fn(),
  redisSet: vi.fn(),
  redisGet: vi.fn(),
  redisDel: vi.fn()
}));

vi.mock('../shared/redis/rate-limit', () => ({
  consumeFixedWindowLimit: mocks.consumeFixedWindowLimit
}));

vi.mock('../shared/redis/cache', () => ({
  getJsonCache: mocks.getJsonCache,
  setJsonCache: mocks.setJsonCache
}));

vi.mock('../shared/redis/client', () => ({
  getRedis: () => ({
    set: mocks.redisSet,
    get: mocks.redisGet,
    del: mocks.redisDel
  })
}));

vi.mock('../shared/prisma/client', () => ({
  prisma: {
    parseRequest: {
      create: mocks.parseRequestCreate
    }
  }
}));

vi.mock('../modules/quota/quota-service', () => ({
  consumeParseQuota: mocks.consumeParseQuota
}));

vi.mock('../modules/providers', async () => {
  const actual = await vi.importActual<typeof import('../modules/providers')>('../modules/providers');
  return {
    ...actual,
    providerRegistry: {
      parse: mocks.providerParse
    }
  };
});

import { AppError } from '../shared/errors/app-error';
import { parseMedia } from '../modules/parse/parse-service';

describe('parse service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeFixedWindowLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetSeconds: 60
    });
    mocks.getJsonCache.mockResolvedValue(null);
    mocks.setJsonCache.mockResolvedValue(undefined);
    mocks.consumeParseQuota.mockResolvedValue({
      quotaUsed: true,
      source: 'daily_free'
    });
    mocks.providerParse.mockResolvedValue({
      provider: 'btch-downloader',
      platform: 'douyin',
      raw: { status: true },
      normalized: { title: 'demo' }
    });
    mocks.parseRequestCreate.mockResolvedValue(undefined);
    mocks.redisSet.mockResolvedValue('OK');
    mocks.redisGet.mockResolvedValue(null);
    mocks.redisDel.mockResolvedValue(1);
  });

  it('resolves share text to a public url for platform detection, cache keys, and provider input', async () => {
    const shareText =
      '4.15 复制打开抖音，看看【观世行侠的作品】干货分享，尾盘黄金半小时，隔夜套利全攻略# 股票 ... https://v.douyin.com/R_et2Jg-q00/ 07/12 :6pm Fho:/ l@C.hO';
    const resolvedInput = 'https://v.douyin.com/R_et2Jg-q00/';
    const cacheKey = `parse:cache:douyin:${sha256(resolvedInput)}`;

    const result = await parseMedia({
      requestId: 'req_1',
      userId: 'user_1',
      platform: 'auto',
      input: shareText,
      ip: '1.1.1.1'
    });

    expect(result).toMatchObject({
      platform: 'douyin',
      provider: 'btch-downloader',
      resolvedInput,
      cacheHit: false,
      quotaUsed: true,
      data: { title: 'demo' }
    });
    expect(mocks.getJsonCache).toHaveBeenNthCalledWith(1, cacheKey);
    expect(mocks.getJsonCache).toHaveBeenNthCalledWith(2, cacheKey);
    expect(mocks.providerParse).toHaveBeenCalledWith({
      platform: 'douyin',
      input: resolvedInput,
      requestId: 'req_1',
      timeoutMs: expect.any(Number)
    });
    expect(mocks.setJsonCache).toHaveBeenCalledWith(cacheKey, { title: 'demo' }, expect.any(Number));
    expect(mocks.parseRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'req_1',
        userId: 'user_1',
        platform: 'douyin',
        inputHash: sha256(resolvedInput),
        provider: 'btch-downloader'
      })
    });
  });

  it('keeps the stable invalid-url failure when no extractable url exists for an explicit platform', async () => {
    await expect(
      parseMedia({
        requestId: 'req_2',
        userId: 'user_2',
        platform: 'douyin',
        input: '复制打开抖音，看看这个作品，没有链接'
      })
    ).rejects.toMatchObject({
      code: 'INVALID_URL',
      statusCode: 400
    });

    expect(mocks.providerParse).not.toHaveBeenCalled();
    expect(mocks.getJsonCache).not.toHaveBeenCalled();
  });
});
