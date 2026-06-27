import { UserStatus } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/prisma/client';
import { sha256 } from '../../shared/security/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AuthPrincipal
} from '../../shared/security/jwt';
import { grantSignupBonus } from '../quota/quota-service';

export interface LoginUserInput {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar?: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface LoginResult extends AuthTokenPair {
  user: {
    id: string;
    nickname: string | null;
    avatar: string | null;
  };
}

function buildPrincipal(user: { id: string; openid: string }): AuthPrincipal {
  return {
    userId: user.id,
    openid: user.openid,
    role: 'user'
  };
}

async function issueTokenPair(userId: string, principal: AuthPrincipal): Promise<AuthTokenPair> {
  const accessToken = signAccessToken(principal);
  const refreshToken = signRefreshToken(principal);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000)
    }
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
  };
}

export async function loginWithWechatUser(input: LoginUserInput): Promise<LoginResult> {
  const existing = await prisma.user.findUnique({ where: { openid: input.openid } });
  const user = await prisma.user.upsert({
    where: { openid: input.openid },
    create: {
      openid: input.openid,
      unionid: input.unionid,
      nickname: input.nickname,
      avatar: input.avatar,
      lastLoginAt: new Date()
    },
    update: {
      unionid: input.unionid,
      nickname: input.nickname,
      avatar: input.avatar,
      lastLoginAt: new Date()
    }
  });

  if (!existing) {
    await grantSignupBonus(user.id);
  }

  const tokens = await issueTokenPair(user.id, buildPrincipal(user));

  return {
    ...tokens,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar
    }
  };
}

export async function refreshAuthToken(refreshToken: string): Promise<AuthTokenPair> {
  const principal = verifyRefreshToken(refreshToken);
  const tokenHash = sha256(refreshToken);

  return prisma.$transaction(async (tx) => {
    const persistedToken = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!persistedToken || persistedToken.revokedAt || persistedToken.expiresAt <= new Date()) {
      throw new AppError({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
        statusCode: 401
      });
    }

    if (persistedToken.user.status !== UserStatus.ACTIVE) {
      throw new AppError({
        code: 'USER_DISABLED',
        message: 'User is disabled.',
        statusCode: 403
      });
    }

    if (persistedToken.userId !== principal.userId) {
      throw new AppError({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
        statusCode: 401
      });
    }

    const revokeResult = await tx.refreshToken.updateMany({
      where: {
        id: persistedToken.id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { revokedAt: new Date() }
    });

    if (revokeResult.count !== 1) {
      throw new AppError({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
        statusCode: 401
      });
    }

    const nextPrincipal = buildPrincipal({
      id: persistedToken.user.id,
      openid: persistedToken.user.openid
    });
    const nextAccessToken = signAccessToken(nextPrincipal);
    const nextRefreshToken = signRefreshToken(nextPrincipal);

    await tx.refreshToken.create({
      data: {
        userId: persistedToken.userId,
        tokenHash: sha256(nextRefreshToken),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000)
      }
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
    };
  });
}
