import type { FastifyPluginAsync } from 'fastify';
import { sendSuccess } from '../../shared/http/api-response';
import { bearerSecurity, successResponseSchema } from '../../shared/http/openapi';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/summary',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['admin'],
        summary: 'Admin summary placeholder',
        security: bearerSecurity,
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              message: { type: 'string' }
            },
            required: ['message']
          })
        }
      }
    },
    async (request, reply) => {
      return sendSuccess(reply, request.requestId, {
        message: 'Admin module placeholder. Add RBAC before exposing production operations.'
      });
    }
  );
};
