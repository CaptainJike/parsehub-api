# Testing Rules

- Add unit tests for platform detection, URL safety, quota decisions, ad reward idempotency, API key checks, and error mapping.
- Add integration tests for Redis cache hit/miss and provider fallback when practical.
- Run `npm test` before handoff.
- Run `npm run build` after TypeScript, Prisma, or dependency changes.
- State any unrun verification in the final response.
