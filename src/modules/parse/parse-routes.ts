import type { FastifyPluginAsync } from 'fastify';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { listPlatformStatus } from '../providers/platforms';
import { parseRequestSchema } from './schemas/parse-schema';
import { parseMedia } from './parse-service';

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/platforms', async (request, reply) => {
    return sendSuccess(reply, request.requestId, {
      platforms: listPlatformStatus()
    });
  });

  app.post('/parse', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const body = parseRequestSchema.parse(request.body);
      const ip = request.ip;
      const result = await parseMedia({
        requestId: request.requestId,
        userId: request.user!.userId,
        platform: body.platform,
        input: body.input,
        ip
      });

      return sendSuccess(reply, request.requestId, result, 'Parsed successfully', 'PARSE_OK');
    } catch (error) {
      return sendError(reply, request.requestId, error);
    }
  });
};
