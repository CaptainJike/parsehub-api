import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prismaDisconnect: vi.fn(),
  pingPrisma: vi.fn(),
  pingRedis: vi.fn(),
  closeRedis: vi.fn()
}));

vi.mock('../shared/prisma/client', () => ({
  prisma: {
    $disconnect: mocks.prismaDisconnect
  },
  pingPrisma: mocks.pingPrisma
}));

vi.mock('../shared/redis/client', () => ({
  pingRedis: mocks.pingRedis,
  closeRedis: mocks.closeRedis
}));

describe('openapi docs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pingPrisma.mockResolvedValue(undefined);
    mocks.pingRedis.mockResolvedValue(undefined);
    mocks.closeRedis.mockResolvedValue(undefined);
    mocks.prismaDisconnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('serves the OpenAPI document and Swagger UI', async () => {
    const { buildApp } = await import('../app.js');
    const app = buildApp();
    await app.ready();

    const specResponse = await app.inject({
      method: 'GET',
      url: '/openapi.json'
    });

    const spec = specResponse.json();
    expect(specResponse.statusCode).toBe(200);
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toBe('parsehub-api');
    expect(spec.paths).toHaveProperty('/api/v1/parse');
    expect(spec.paths).toHaveProperty('/api/v1/auth/wechat-login');
    expect(spec.paths).toHaveProperty('/api/v1/orders');

    const docsResponse = await app.inject({
      method: 'GET',
      url: '/docs'
    });

    expect([200, 302]).toContain(docsResponse.statusCode);

    await app.close();
  });
});
