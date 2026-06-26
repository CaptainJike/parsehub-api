import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';

export interface AuthPrincipal {
  userId: string;
  openid?: string;
  role: 'user' | 'admin';
}

export function signAccessToken(principal: AuthPrincipal): string {
  return jwt.sign(principal, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

export function signRefreshToken(principal: AuthPrincipal): string {
  return jwt.sign(principal, env.JWT_SECRET, {
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
    });

    if (typeof payload !== 'object' || !payload.userId) {
      throw new Error('Invalid token payload');
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
