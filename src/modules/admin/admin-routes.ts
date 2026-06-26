import type { FastifyPluginAsync } from 'fastify';
import { sendSuccess } from '../../shared/http/api-response';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/summary', { preHandler: app.authenticate }, async (request, reply) => {
    return sendSuccess(reply, request.requestId, {
      message: 'Admin module placeholder. Add RBAC before exposing production operations.'
    });
  });
};
