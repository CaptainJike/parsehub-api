import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../shared/prisma/client';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { bearerSecurity, errorResponseSchema, successResponseSchema } from '../../shared/http/openapi';
import { getQuotaSummary } from '../quota/quota-service';

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/me',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['users'],
        summary: 'Get current user profile and quota summary',
        security: bearerSecurity,
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              user: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string' },
                  nickname: { type: 'string', nullable: true },
                  avatar: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  lastLoginAt: { type: 'string', format: 'date-time', nullable: true }
                },
                required: ['id', 'nickname', 'avatar', 'status', 'createdAt', 'lastLoginAt']
              },
              quota: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  dailyFreeLimit: { type: 'integer' },
                  dailyFreeUsed: { type: 'integer' },
                  adCredits: { type: 'integer' },
                  purchasedCredits: { type: 'integer' },
                  memberUntil: { type: 'string', format: 'date-time', nullable: true }
                },
                required: ['dailyFreeLimit', 'dailyFreeUsed', 'adCredits', 'purchasedCredits', 'memberUntil']
              }
            },
            required: ['user', 'quota']
          }),
          401: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
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
    }
  );
};
