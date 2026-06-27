import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { errorResponseSchema, successResponseSchema } from '../../shared/http/openapi';
import { code2Session } from './wechat-service';
import { loginWithWechatUser, refreshAuthToken } from './auth-service';

const wechatLoginSchema = z.object({
  code: z.string().min(1).max(256),
  nickname: z.string().max(100).optional(),
  avatar: z.string().url().max(1000).optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(4096)
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/wechat-login',
    {
      attachValidation: true,
      schema: {
        tags: ['auth'],
        summary: 'Login with WeChat mini-program code',
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            code: { type: 'string', minLength: 1, maxLength: 256 },
            nickname: { type: 'string', maxLength: 100 },
            avatar: { type: 'string', format: 'uri', maxLength: 1000 }
          },
          required: ['code']
        },
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              tokenType: { type: 'string', enum: ['Bearer'] },
              expiresIn: { type: 'integer' },
              user: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string' },
                  nickname: { type: 'string', nullable: true },
                  avatar: { type: 'string', nullable: true }
                },
                required: ['id', 'nickname', 'avatar']
              }
            },
            required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'user']
          }),
          400: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (request.validationError) {
          return sendError(reply, request.requestId, request.validationError);
        }
        const body = wechatLoginSchema.parse(request.body);
        const session = await code2Session(body.code);
        const result = await loginWithWechatUser({
          openid: session.openid,
          unionid: session.unionid,
          nickname: body.nickname,
          avatar: body.avatar
        });

        return sendSuccess(reply, request.requestId, {
          ...result
        });
      } catch (error) {
        return sendError(reply, request.requestId, error);
      }
    }
  );

  app.post(
    '/refresh',
    {
      attachValidation: true,
      schema: {
        tags: ['auth'],
        summary: 'Refresh access token pair',
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            refreshToken: { type: 'string', minLength: 1, maxLength: 4096 }
          },
          required: ['refreshToken']
        },
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              tokenType: { type: 'string', enum: ['Bearer'] },
              expiresIn: { type: 'integer' }
            },
            required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn']
          }),
          400: errorResponseSchema(),
          401: errorResponseSchema(),
          403: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (request.validationError) {
          return sendError(reply, request.requestId, request.validationError);
        }
        const body = refreshTokenSchema.parse(request.body);
        const result = await refreshAuthToken(body.refreshToken);
        return sendSuccess(reply, request.requestId, result);
      } catch (error) {
        return sendError(reply, request.requestId, error);
      }
    }
  );
};
