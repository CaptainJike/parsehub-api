import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { corsOrigins } from './config/env';
import { pingPrisma, prisma } from './shared/prisma/client';
import { closeRedis, pingRedis } from './shared/redis/client';
import { sendError, sendSuccess } from './shared/http/api-response';
import { openApiOptions, successResponseSchema, errorResponseSchema } from './shared/http/openapi';
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
  app.register(swagger, openApiOptions);
  app.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
    transformStaticCSP: (header) => header,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
  app.register(authPlugin);

  app.get(
    '/healthz',
    {
      schema: {
        tags: ['system'],
        summary: 'Process health check',
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              service: { type: 'string' },
              healthy: { type: 'boolean' }
            },
            required: ['service', 'healthy']
          })
        }
      }
    },
    async (request, reply) => {
      return sendSuccess(reply, request.requestId, {
        service: 'parsehub-api',
        healthy: true
      });
    }
  );

  app.get(
    '/readyz',
    {
      schema: {
        tags: ['system'],
        summary: 'Dependency readiness check',
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              database: { type: 'boolean' },
              redis: { type: 'boolean' }
            },
            required: ['database', 'redis']
          }),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
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
    }
  );

  app.get(
    '/openapi.json',
    {
      schema: {
        tags: ['system'],
        summary: 'Export OpenAPI specification',
        response: {
          200: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    },
    async () => app.swagger()
  );

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
