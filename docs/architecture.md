# Architecture

## Summary

`parsehub-api` is a modular monolith. It keeps deployment simple while enforcing internal module boundaries that can later be split into services.

```text
Mini Program
  -> HTTPS / Nginx / WAF
  -> Fastify API
      -> auth
      -> users
      -> quota
      -> parse
      -> providers
      -> ad-rewards
      -> payments
      -> admin
  -> MySQL
  -> Redis
  -> External parse providers
```

## Module Rules

- Routes validate inputs and call services.
- Services contain business rules.
- Repositories use Prisma and hide persistence details when logic grows.
- Providers wrap external parsing libraries or APIs.
- Shared infrastructure lives under `src/shared`.

## Data Stores

- MySQL stores users, quota ledgers, parse records, orders, payment records, ad rewards, API keys, and refresh tokens.
- Redis stores parse cache, rate limits, locks, and provider circuit state.

## Availability Strategy

- Parse results are cached by `platform + sha256(input)`.
- Provider failures are recorded in Redis and can open a circuit.
- New providers can be added without changing route contracts.
- `/healthz` is process-only; `/readyz` checks dependencies.

## Decision Defaults

- Do not proxy media files in MVP.
- Use `btch-downloader` only through `BtchProvider`.
- Keep `/api/v1` stable and version future breaking changes.
