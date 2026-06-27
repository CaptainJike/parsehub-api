import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import requestContextPlugin from '../shared/observability/request-context';

const mocks = vi.hoisted(() => ({
  loginWithWechatUser: vi.fn(),
  refreshAuthToken: vi.fn(),
  code2Session: vi.fn()
}));

vi.mock('../modules/auth/auth-service', () => ({
  loginWithWechatUser: mocks.loginWithWechatUser,
  refreshAuthToken: mocks.refreshAuthToken
}));

vi.mock('../modules/auth/wechat-service', () => ({
  code2Session: mocks.code2Session
}));

import { authRoutes } from '../modules/auth/auth-routes';

describe('auth routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.register(requestContextPlugin);
    app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('refreshes tokens through the public endpoint', async () => {
    mocks.refreshAuthToken.mockResolvedValue({
      accessToken: 'access_2',
      refreshToken: 'refresh_2',
      tokenType: 'Bearer',
      expiresIn: 900
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'refresh_1' }
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.refreshAuthToken).toHaveBeenCalledWith('refresh_1');
    expect(response.json()).toMatchObject({
      status: true,
      code: 'OK',
      message: 'OK',
      data: {
        accessToken: 'access_2',
        refreshToken: 'refresh_2',
        tokenType: 'Bearer',
        expiresIn: 900
      }
    });
  });

  it('returns a stable validation error when refreshToken is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      status: false,
      code: 'INVALID_REQUEST',
      message: 'Request validation failed.',
      error: {
        reason: 'INVALID_REQUEST',
        retryable: false
      }
    });
  });
});
