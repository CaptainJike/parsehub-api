# Provider Strategy

## Current Provider

`btch-downloader` is the first provider. It is a client SDK that calls its own upstream backend. Treat it as an external dependency, not as an owned parser.

## Provider Interface

All providers implement:

```ts
interface ParseProvider {
  name: string;
  supportedPlatforms: Platform[];
  parse(input: ProviderParseInput): Promise<ProviderParseOutput>;
}
```

## Adding Providers

1. Create a provider under `src/modules/providers/<name>`.
2. Implement `ParseProvider`.
3. Add it to `providerRegistry`.
4. Add tests for success, failure, timeout, and unsupported platform.
5. Update this document if behavior changes.

## Rules

- Routes must never import external parser packages directly.
- Provider errors must become stable `AppError` codes.
- Provider calls must use timeouts.
- Provider fallback order belongs in the registry/config layer.
- Do not enable `mediafire` or `aio` unless there is an explicit product decision.

## Redis Keys

- `parse:cache:{platform}:{sha256(input)}`
- `lock:parse:{platform}:{sha256(input)}`
- `provider:circuit:{provider}:{platform}`
- `provider:failures:{provider}:{platform}`
