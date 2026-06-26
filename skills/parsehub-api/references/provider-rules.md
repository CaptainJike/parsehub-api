# Provider Rules

- All parsing goes through `ParseProvider`.
- `btch-downloader` is the first provider and must remain wrapped by `BtchProvider`.
- Add new providers by implementing `ParseProvider` and registering in the provider registry.
- Do not expose `mediafire` or `aio` by default.
- Cache by `parse:cache:{platform}:{sha256(input)}`.
- Use timeout and circuit breaker state for provider failures.
- Provider errors should become `AppError` instances with stable codes.
