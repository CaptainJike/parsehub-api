import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { prisma } from '../../shared/prisma/client';
import { createOpaqueToken } from '../../shared/security/hash';

const createOrderSchema = z.object({
  productId: z.string().min(1).max(128),
  payType: z.literal('wechat')
});

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/orders', { preHandler: app.authenticate }, async (request, reply) => {
    try {
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
  });

  app.post('/payments/wechat/notify', async (request, reply) => {
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
  });
};
