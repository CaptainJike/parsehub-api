import { z } from 'zod';

function assertSafeProductionCorsOrigins(value: string): void {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      throw new Error(`CORS_ORIGINS must not include local origins in production: ${origin}`);
    }
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default('postgresql://parsehub:parsehub_password@localhost:5432/parsehub?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('development-secret-change-me-32chars'),
  JWT_ISSUER: z.string().default('parsehub-api'),
  JWT_AUDIENCE: z.string().default('parsehub-miniapp'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  WECHAT_APP_ID: z.string().default(''),
  WECHAT_APP_SECRET: z.string().default(''),
  ENABLE_MOCK_WECHAT: z.coerce.boolean().default(true),
  CORS_ORIGINS: z.string().default(''),
  PARSE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  PARSE_TOTAL_TIMEOUT_MS: z.coerce.number().int().positive().default(35_000),
  CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3),
  CIRCUIT_TTL_SECONDS: z.coerce.number().int().positive().default(180),
  DAILY_FREE_QUOTA: z.coerce.number().int().nonnegative().default(3),
  SIGNUP_BONUS_QUOTA: z.coerce.number().int().nonnegative().default(5),
  AD_REWARD_QUOTA: z.coerce.number().int().positive().default(3),
  AD_REWARD_DAILY_LIMIT: z.coerce.number().int().nonnegative().default(10),
  WECHAT_PAY_MOCK: z.coerce.boolean().default(true),
  WECHAT_PAY_NOTIFY_SECRET: z.string().default('')
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (!env.WECHAT_APP_ID || !env.WECHAT_APP_SECRET) {
    throw new Error('WECHAT_APP_ID and WECHAT_APP_SECRET are required in production.');
  }

  assertSafeProductionCorsOrigins(env.CORS_ORIGINS);
}

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
