import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { grantAdReward } from '../quota/quota-service';

const claimSchema = z.object({
  adSessionId: z.string().min(1).max(256).optional(),
  clientEventId: z.string().min(8).max(256)
});

export const adRewardRoutes: FastifyPluginAsync = async (app) => {
  app.post('/rewards/ad/claim', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const body = claimSchema.parse(request.body);
      const result = await grantAdReward(request.user!.userId, body.clientEventId);
      return sendSuccess(reply, request.requestId, result, result.duplicate ? 'Reward already claimed' : 'Reward granted');
    } catch (error) {
      return sendError(reply, request.requestId, error);
    }
  });
};
