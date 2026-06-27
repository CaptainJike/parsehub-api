import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { bearerSecurity, errorResponseSchema, successResponseSchema } from '../../shared/http/openapi';
import { grantAdReward } from '../quota/quota-service';

const claimSchema = z.object({
  adSessionId: z.string().min(1).max(256).optional(),
  clientEventId: z.string().min(8).max(256)
});

export const adRewardRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/rewards/ad/claim',
    {
      attachValidation: true,
      preHandler: app.authenticate,
      schema: {
        tags: ['rewards'],
        summary: 'Claim ad reward credits',
        security: bearerSecurity,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            adSessionId: { type: 'string', minLength: 1, maxLength: 256 },
            clientEventId: { type: 'string', minLength: 8, maxLength: 256 }
          },
          required: ['clientEventId']
        },
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              rewardAmount: { type: 'integer' },
              duplicate: { type: 'boolean' }
            },
            required: ['rewardAmount', 'duplicate']
          }),
          400: errorResponseSchema(),
          401: errorResponseSchema(),
          429: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (request.validationError) {
          return sendError(reply, request.requestId, request.validationError);
        }
        const body = claimSchema.parse(request.body);
        const result = await grantAdReward(request.user!.userId, body.clientEventId);
        return sendSuccess(reply, request.requestId, result, result.duplicate ? 'Reward already claimed' : 'Reward granted');
      } catch (error) {
        return sendError(reply, request.requestId, error);
      }
    }
  );
};
