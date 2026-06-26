import type { Platform } from './platforms';

export interface ProviderParseInput {
  platform: Platform;
  input: string;
  requestId: string;
  timeoutMs: number;
}

export interface ProviderParseOutput {
  provider: string;
  platform: Platform;
  raw: unknown;
  normalized: unknown;
}

export interface ParseProvider {
  name: string;
  supportedPlatforms: Platform[];
  parse(input: ProviderParseInput): Promise<ProviderParseOutput>;
}
