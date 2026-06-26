import { AppError } from '../../../shared/errors/app-error';
import type { ParseProvider, ProviderParseInput, ProviderParseOutput } from '../types';

export class NoopProvider implements ParseProvider {
  readonly name = 'reserved-fallback';
  readonly supportedPlatforms = [];

  async parse(_input: ProviderParseInput): Promise<ProviderParseOutput> {
    throw new AppError({
      code: 'NO_FALLBACK_PROVIDER',
      message: 'No fallback provider is configured for this platform.',
      statusCode: 503,
      retryable: true
    });
  }
}
