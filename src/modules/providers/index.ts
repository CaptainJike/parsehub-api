import { BtchProvider } from './btch/btch-provider';
import { NoopProvider } from './noop/noop-provider';
import { ProviderRegistry } from './provider-registry';

export const providerRegistry = new ProviderRegistry([new BtchProvider(), new NoopProvider()]);

export * from './platforms';
export * from './types';
