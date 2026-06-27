import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

export interface AuthPrincipal {
  userId: string;
  openid?: string;
  role: 'user' | 'admin';
}

interface TokenPayload extends AuthPrincipal {
  typ?: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}

function resolveTokenType(payload: TokenPayload): 'access' | 'refresh' | undefined {
  if (payload.typ) {
    return payload.typ;
  }

  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
    return undefined;
  }

  const lifetimeSeconds = payload.exp - payload.iat;
  const accessDelta = Math.abs(lifetimeSeconds - env.ACCESS_TOKEN_TTL_SECONDS);
  const refreshDelta = Math.abs(lifetimeSeconds - env.REFRESH_TOKEN_TTL_SECONDS);

  return accessDelta <= refreshDelta ? 'access' : 'refresh';
}

export function signAccessToken(principal: AuthPrincipal): string {
  return jwt.sign({ ...principal, typ: 'access', jti: randomUUID() }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

export function signRefreshToken(principal: AuthPrincipal): string {
  return jwt.sign({ ...principal, typ: 'refresh', jti: randomUUID() }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

export function verifyAccessToken(token: string): AuthPrincipal {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as TokenPayload;

    if (typeof payload !== 'object' || !payload.userId) {
      throw new Error('Invalid token payload');
    }

    if (resolveTokenType(payload) === 'refresh') {
      throw new Error('Refresh token cannot be used as access token');
    }

    return {
      userId: String(payload.userId),
      openid: payload.openid ? String(payload.openid) : undefined,
      role: payload.role === 'admin' ? 'admin' : 'user'
    };
  } catch {
    throw new AppError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token.',
      statusCode: 401
    });
  }
}

export function verifyRefreshToken(token: string): AuthPrincipal {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as TokenPayload;

    if (typeof payload !== 'object' || !payload.userId) {
      throw new Error('Invalid token payload');
    }

    if (resolveTokenType(payload) === 'access') {
      throw new Error('Access token cannot be used as refresh token');
    }

    return {
      userId: String(payload.userId),
      openid: payload.openid ? String(payload.openid) : undefined,
      role: payload.role === 'admin' ? 'admin' : 'user'
    };
  } catch {
    throw new AppError({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token is invalid or expired.',
      statusCode: 401
    });
  }
}
