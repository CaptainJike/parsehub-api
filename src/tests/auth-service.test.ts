import { UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../shared/security/jwt';

const mocks = vi.hoisted(() => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn()
    },
    $transaction: vi.fn()
  };

  return {
    prisma,
    grantSignupBonus: vi.fn()
  };
});

vi.mock('../shared/prisma/client', () => ({
  prisma: mocks.prisma
}));

vi.mock('../modules/quota/quota-service', () => ({
  grantSignupBonus: mocks.grantSignupBonus
}));

import { refreshAuthToken } from '../modules/auth/auth-service';

describe('auth service refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.prisma) => Promise<unknown>) => callback(mocks.prisma));
  });

  it('rotates refresh tokens and returns a fresh token pair', async () => {
    const currentRefreshToken = signRefreshToken({ userId: 'user_1', openid: 'openid_1', role: 'user' });

    mocks.prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      userId: 'user_1',
      tokenHash: 'hash_1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user_1',
        openid: 'openid_1',
        status: UserStatus.ACTIVE
      }
    });
    mocks.prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.refreshToken.create.mockResolvedValue({
      id: 'rt_2'
    });

    const result = await refreshAuthToken(currentRefreshToken);

    expect(mocks.prisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String) },
      include: { user: true }
    });
    expect(mocks.prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rt_1',
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) }
      },
      data: { revokedAt: expect.any(Date) }
    });
    expect(mocks.prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date)
      }
    });
    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).not.toBe(currentRefreshToken);
    expect(verifyAccessToken(result.accessToken)).toMatchObject({ userId: 'user_1', openid: 'openid_1', role: 'user' });
    expect(verifyRefreshToken(result.refreshToken)).toMatchObject({ userId: 'user_1', openid: 'openid_1', role: 'user' });
  });

  it('rejects replayed refresh tokens after they are already rotated', async () => {
    const currentRefreshToken = signRefreshToken({ userId: 'user_1', openid: 'openid_1', role: 'user' });

    mocks.prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      userId: 'user_1',
      tokenHash: 'hash_1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user_1',
        openid: 'openid_1',
        status: UserStatus.ACTIVE
      }
    });
    mocks.prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(refreshAuthToken(currentRefreshToken)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      statusCode: 401
    });
    expect(mocks.prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects using an access token as a refresh token', async () => {
    const accessToken = signAccessToken({ userId: 'user_1', openid: 'openid_1', role: 'user' });

    await expect(refreshAuthToken(accessToken)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      statusCode: 401
    });
    expect(mocks.prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});
