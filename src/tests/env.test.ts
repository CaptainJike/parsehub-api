import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function importEnvModule() {
  return import('../config/env.js');
}

describe('env configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('rejects local CORS origins in production', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: '12345678901234567890123456789012',
      WECHAT_APP_ID: 'wx-app-id',
      WECHAT_APP_SECRET: 'wx-app-secret',
      CORS_ORIGINS: 'https://frontend.example.com,http://localhost:5173'
    };

    await expect(importEnvModule()).rejects.toThrow(/CORS_ORIGINS must not include local origins/);
  });

  it('accepts explicit public CORS origins in production', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: '12345678901234567890123456789012',
      WECHAT_APP_ID: 'wx-app-id',
      WECHAT_APP_SECRET: 'wx-app-secret',
      CORS_ORIGINS: 'https://frontend.example.com,https://admin.example.com'
    };

    const envModule = await importEnvModule();
    expect(envModule.corsOrigins).toEqual(['https://frontend.example.com', 'https://admin.example.com']);
  });
});
