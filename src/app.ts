import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { corsOrigins } from './config/env';
import { pingPrisma, prisma } from './shared/prisma/client';
import { closeRedis, pingRedis } from './shared/redis/client';
import { sendError, sendSuccess } from './shared/http/api-response';
import requestContextPlugin from './shared/observability/request-context';
import authPlugin from './shared/http/auth-plugin';
import { authRoutes } from './modules/auth/auth-routes';
import { userRoutes } from './modules/users/user-routes';
import { parseRoutes } from './modules/parse/parse-routes';
import { adRewardRoutes } from './modules/ad-rewards/ad-reward-routes';
import { paymentRoutes } from './modules/payments/payment-routes';
import { adminRoutes } from './modules/admin/admin-routes';

export function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true
  });

  app.register(requestContextPlugin);
  app.register(helmet);
  app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : false
  });
  app.register(authPlugin);

  app.get('/healthz', async (request, reply) => {
    return sendSuccess(reply, request.requestId, {
      service: 'parsehub-api',
      healthy: true
    });
  });

  app.get('/readyz', async (request, reply) => {
    try {
      await pingPrisma();
      await pingRedis();
      return sendSuccess(reply, request.requestId, {
        database: true,
        redis: true
      });
    } catch (error) {
      return sendError(reply, request.requestId, error);
    }
  });

  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(userRoutes, { prefix: '/api/v1' });
  app.register(parseRoutes, { prefix: '/api/v1' });
  app.register(adRewardRoutes, { prefix: '/api/v1' });
  app.register(paymentRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api/v1' });

  app.addHook('onClose', async () => {
    await closeRedis();
    await prisma.$disconnect();
  });

  return app;
}
