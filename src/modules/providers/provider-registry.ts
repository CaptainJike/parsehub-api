import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { getRedis } from '../../shared/redis/client';
import type { Platform } from './platforms';
import type { ParseProvider, ProviderParseInput, ProviderParseOutput } from './types';

interface ProviderFailureState {
  count: number;
}

export class ProviderRegistry {
  constructor(private readonly providers: ParseProvider[]) {}

  getProviders(platform: Platform): ParseProvider[] {
    return this.providers.filter((provider) => provider.supportedPlatforms.includes(platform));
  }

  async parse(input: ProviderParseInput): Promise<ProviderParseOutput> {
    const providers = this.getProviders(input.platform);
    if (providers.length === 0) {
      throw new AppError({
        code: 'NO_PROVIDER_AVAILABLE',
        message: 'No parse provider is available for this platform.',
        statusCode: 503,
        retryable: true
      });
    }

    const errors: AppError[] = [];
    for (const provider of providers) {
      if (await this.isCircuitOpen(provider.name, input.platform)) {
        continue;
      }

      try {
        const result = await provider.parse(input);
        await this.resetFailure(provider.name, input.platform);
        return result;
      } catch (error) {
        const appError =
          error instanceof AppError
            ? error
            : new AppError({
                code: 'PROVIDER_ERROR',
                message: 'Provider failed to parse the media.',
                statusCode: 502,
                retryable: true
              });
        errors.push(appError);
        await this.recordFailure(provider.name, input.platform);
      }
    }

    throw (
      errors.at(-1) ??
      new AppError({
        code: 'ALL_PROVIDERS_UNAVAILABLE',
        message: 'All parse providers are temporarily unavailable.',
        statusCode: 503,
        retryable: true
      })
    );
  }

  private circuitKey(provider: string, platform: Platform): string {
    return `provider:circuit:${provider}:${platform}`;
  }

  private failureKey(provider: string, platform: Platform): string {
    return `provider:failures:${provider}:${platform}`;
  }

  private async isCircuitOpen(provider: string, platform: Platform): Promise<boolean> {
    try {
      return (await getRedis().exists(this.circuitKey(provider, platform))) === 1;
    } catch {
      return false;
    }
  }

  private async recordFailure(provider: string, platform: Platform): Promise<void> {
    try {
      const redis = getRedis();
      const key = this.failureKey(provider, platform);
      const count = await redis.incr(key);
      await redis.expire(key, env.CIRCUIT_TTL_SECONDS);

      const state: ProviderFailureState = { count };
      if (state.count >= env.CIRCUIT_FAILURE_THRESHOLD) {
        await redis.set(this.circuitKey(provider, platform), 'open', 'EX', env.CIRCUIT_TTL_SECONDS);
      }
    } catch {
      // Circuit state is best effort.
    }
  }

  private async resetFailure(provider: string, platform: Platform): Promise<void> {
    try {
      await getRedis().del(this.failureKey(provider, platform), this.circuitKey(provider, platform));
    } catch {
      // Circuit state is best effort.
    }
  }
}
