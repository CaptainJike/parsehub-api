import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../shared/prisma/client';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { getQuotaSummary } from '../quota/quota-service';

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const quota = await getQuotaSummary(userId);

      return sendSuccess(reply, request.requestId, {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        quota
      });
    } catch (error) {
      return sendError(reply, request.requestId, error);
    }
  });
};
