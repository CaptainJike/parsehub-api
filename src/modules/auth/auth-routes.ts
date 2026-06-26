import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client';
import { sendError, sendSuccess } from '../../shared/http/api-response';
import { signAccessToken, signRefreshToken } from '../../shared/security/jwt';
import { sha256 } from '../../shared/security/hash';
import { code2Session } from './wechat-service';
import { grantSignupBonus } from '../quota/quota-service';

const wechatLoginSchema = z.object({
  code: z.string().min(1).max(256),
  nickname: z.string().max(100).optional(),
  avatar: z.string().url().max(1000).optional()
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/wechat-login', async (request, reply) => {
    try {
      const body = wechatLoginSchema.parse(request.body);
      const session = await code2Session(body.code);

      const existing = await prisma.user.findUnique({ where: { openid: session.openid } });
      const user = await prisma.user.upsert({
        where: { openid: session.openid },
        create: {
          openid: session.openid,
          unionid: session.unionid,
          nickname: body.nickname,
          avatar: body.avatar,
          lastLoginAt: new Date()
        },
        update: {
          unionid: session.unionid,
          nickname: body.nickname,
          avatar: body.avatar,
          lastLoginAt: new Date()
        }
      });

      if (!existing) {
        await grantSignupBonus(user.id);
      }

      const principal = { userId: user.id, openid: user.openid, role: 'user' as const };
      const accessToken = signAccessToken(principal);
      const refreshToken = signRefreshToken(principal);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return sendSuccess(reply, request.requestId, {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar
        }
      });
    } catch (error) {
      return sendError(reply, request.requestId, error);
    }
  });
};
