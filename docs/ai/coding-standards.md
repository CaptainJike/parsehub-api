# Coding Standards

## TypeScript

- Use strict TypeScript.
- Prefer explicit interfaces at module boundaries.
- Use Zod for request validation.
- Throw `AppError` for expected failures.
- Keep route handlers thin.

## Fastify

- Register routes by module.
- Use `preHandler: app.authenticate` for protected user endpoints.
- Return through `sendSuccess` or `sendError`.

## Prisma

- Use transactions for quota, order, payment, and entitlement changes.
- Do not concatenate SQL strings.
- Add indexes for frequent query paths.

## Redis

- Cache failures must degrade safely.
- Rate limit failures should fail open for ordinary traffic but must be revisited for abuse-sensitive endpoints.
- Use TTLs on all temporary keys.

## Tests

- Put tests close to source under `src/tests` for MVP.
- Add unit tests before adding complicated integration tests.
