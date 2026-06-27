import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { bearerSecurity, errorResponseSchema, successResponseSchema } from '../../shared/http/openapi';
import { prisma } from '../../shared/prisma/client';
import { createOpaqueToken } from '../../shared/security/hash';

const createOrderSchema = z.object({
  productId: z.string().min(1).max(128),
  payType: z.literal('wechat')
});

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/orders',
    {
      attachValidation: true,
      preHandler: app.authenticate,
      schema: {
        tags: ['payments'],
        summary: 'Create an order',
        security: bearerSecurity,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            productId: { type: 'string', minLength: 1, maxLength: 128 },
            payType: { type: 'string', enum: ['wechat'] }
          },
          required: ['productId', 'payType']
        },
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              orderId: { type: 'string' },
              outTradeNo: { type: 'string' },
              amountCents: { type: 'integer' },
              paymentParams: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  mock: { type: 'boolean' },
                  outTradeNo: { type: 'string' },
                  message: { type: 'string' }
                },
                required: ['mock']
              }
            },
            required: ['orderId', 'outTradeNo', 'amountCents', 'paymentParams']
          }),
          400: errorResponseSchema(),
          401: errorResponseSchema(),
          404: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (request.validationError) {
          return sendError(reply, request.requestId, request.validationError);
        }
        const body = createOrderSchema.parse(request.body);
        const product = await prisma.product.findUnique({ where: { id: body.productId } });
        if (!product || !product.enabled) {
          throw new AppError({
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product is unavailable.',
            statusCode: 404
          });
        }

        const outTradeNo = createOpaqueToken('order');
        const order = await prisma.order.create({
          data: {
            userId: request.user!.userId,
            productId: product.id,
            amountCents: product.priceCents,
            outTradeNo
          }
        });

        const paymentParams = env.WECHAT_PAY_MOCK
          ? { mock: true, outTradeNo }
          : { mock: false, message: 'Configure WeChat Pay signer before production use.' };

        return sendSuccess(reply, request.requestId, {
          orderId: order.id,
          outTradeNo,
          amountCents: order.amountCents,
          paymentParams
        });
      } catch (error) {
        return sendError(reply, request.requestId, error);
      }
    }
  );

  app.post(
    '/payments/wechat/notify',
    {
      schema: {
        tags: ['payments'],
        summary: 'Handle WeChat Pay callback',
        description: 'MVP mock callback endpoint. Production must verify WeChat Pay signatures before enabling.',
        response: {
          200: successResponseSchema({
            type: 'object',
            additionalProperties: false,
            properties: {
              received: { type: 'boolean' },
              mock: { type: 'boolean' }
            },
            required: ['received', 'mock']
          }),
          501: errorResponseSchema(),
          500: errorResponseSchema()
        }
      }
    },
    async (request, reply) => {
      try {
        if (!env.WECHAT_PAY_MOCK) {
          throw new AppError({
            code: 'PAYMENT_NOTIFY_NOT_CONFIGURED',
            message: 'Wechat Pay notify verification is not configured.',
            statusCode: 501
          });
        }

        return sendSuccess(reply, request.requestId, {
          received: true,
          mock: true
        });
      } catch (error) {
        return sendError(reply, request.requestId, error);
      }
    }
  );
};
