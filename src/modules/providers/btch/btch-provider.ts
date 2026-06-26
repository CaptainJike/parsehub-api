import {
  capcut,
  cocofun,
  douyin,
  fbdown,
  gdrive,
  igdl,
  kuaishou,
  pinterest,
  snackvideo,
  soundcloud,
  spotify,
  threads,
  ttdl,
  twitter,
  xiaohongshu,
  xiaohongshuProfile,
  youtube,
  yts
} from 'btch-downloader';
import { AppError } from '../../../shared/errors/app-error';
import { enabledPlatforms, type Platform } from '../platforms';
import type { ParseProvider, ProviderParseInput, ProviderParseOutput } from '../types';

type BtchFunction = (input: string) => Promise<unknown>;

const functions: Record<Platform, BtchFunction> = {
  instagram: igdl,
  tiktok: ttdl,
  facebook: fbdown,
  twitter,
  youtube,
  capcut,
  gdrive,
  pinterest,
  douyin,
  xiaohongshu,
  xiaohongshuProfile,
  snackvideo,
  cocofun,
  spotify,
  yts,
  soundcloud,
  threads,
  kuaishou
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AppError({
          code: 'PROVIDER_TIMEOUT',
          message: 'Parse provider timed out.',
          statusCode: 504,
          retryable: true
        })
      );
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

export class BtchProvider implements ParseProvider {
  readonly name = 'btch-downloader';
  readonly supportedPlatforms = [...enabledPlatforms];

  async parse(input: ProviderParseInput): Promise<ProviderParseOutput> {
    const fn = functions[input.platform];
    if (!fn) {
      throw new AppError({
        code: 'PLATFORM_NOT_SUPPORTED_BY_PROVIDER',
        message: 'This platform is not supported by the provider.',
        statusCode: 400
      });
    }

    const raw = await withTimeout(fn(input.input), input.timeoutMs);

    if (raw && typeof raw === 'object' && 'status' in raw && (raw as { status?: unknown }).status === false) {
      throw new AppError({
        code: 'PROVIDER_PARSE_FAILED',
        message:
          typeof (raw as { message?: unknown }).message === 'string'
            ? String((raw as { message?: unknown }).message)
            : 'Provider failed to parse the media.',
        statusCode: 502,
        retryable: true
      });
    }

    return {
      provider: this.name,
      platform: input.platform,
      raw,
      normalized: raw
    };
  }
}
