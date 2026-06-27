import type { FastifyPluginAsync } from 'fastify';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { bearerSecurity, errorResponseSchema, successResponseSchema } from '../../shared/http/openapi';
import { enabledPlatforms, listPlatformStatus } from '../providers/platforms';
import { parseRequestSchema } from './schemas/parse-schema';
import { parseMedia } from './parse-service';

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/platforms',
    {
      schema: {
        tags: ['parse'],
        summary: 'List public platform status',
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              platforms: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    platform: { type: 'string' },
                    enabled: { type: 'boolean' },
                    maintained: { type: 'boolean' }
                  },
                  required: ['platform', 'enabled', 'maintained']
                }
              }
            },
            required: ['platforms']
          })
        }
      }
    },
    async (request, reply) => {
      return sendSuccess(reply, request.requestId, {
        platforms: listPlatformStatus()
      });
    }
  );

  app.post(
    '/parse',
    {
      attachValidation: true,
      preHandler: app.authenticate,
      schema: {
        tags: ['parse'],
        summary: 'Parse a media URL or share text',
        security: bearerSecurity,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            platform: {
              type: 'string',
              enum: ['auto', ...enabledPlatforms],
              default: 'auto'
            },
            input: {
              type: 'string',
              minLength: 1,
              maxLength: 3000,
              description: 'Direct media URL or share text containing a public http/https URL.'
            }
          },
          required: ['input']
        },
        response: {
          200: successResponseSchema(
            {
              type: 'object',
              additionalProperties: true,
              properties: {
                platform: { type: 'string' },
                provider: { type: 'string' },
                resolvedInput: { type: 'string' },
                cacheHit: { type: 'boolean' },
                quotaUsed: { type: 'boolean' },
                elapsedMs: { type: 'integer' },
                data: {}
              },
              required: ['platform', 'cacheHit', 'quotaUsed', 'elapsedMs', 'data']
            },
            {
              code: { type: 'string', enum: ['PARSE_OK'] },
              message: { type: 'string', enum: ['Parsed successfully'] }
            }
          ),
          400: errorResponseSchema(),
          401: errorResponseSchema(),
          402: errorResponseSchema(),
          429: errorResponseSchema(),
          500: errorResponseSchema(),
          502: errorResponseSchema(),
          503: errorResponseSchema(),
          504: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (request.validationError) {
          return sendError(reply, request.requestId, request.validationError);
        }
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
    }
  );
};
