import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { verifyAccessToken, type AuthPrincipal } from '../security/jwt';
import { AppError } from '../errors/app-error';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthPrincipal;
  }
}

export function getBearerToken(header: string | undefined): string {
  if (!header) {
    throw new AppError({
      code: 'UNAUTHORIZED',
      message: 'Authorization header is required.',
      statusCode: 401
    });
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError({
      code: 'UNAUTHORIZED',
      message: 'Authorization header must use Bearer token.',
      statusCode: 401
    });
  }

  return token;
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user');
  app.decorate('authenticate', async (request) => {
    const token = getBearerToken(request.headers.authorization);
    request.user = verifyAccessToken(token);
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest): Promise<void>;
  }
}

export default fp(authPlugin, { name: 'auth-plugin' });
