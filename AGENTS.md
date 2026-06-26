# AGENTS.md - parsehub-api

> Last verified: 2026-06-26

## Project Goal

`parsehub-api` is an independent backend service for a WeChat mini-program media parsing product. It exposes stable API endpoints for login, quota, media parsing, ad rewards, orders, and payment callbacks.

This repository is separate from `E:\github\btch-downloader`. Do not add product backend code to the SDK repository.

## Architecture

- Runtime: Node.js 20+, TypeScript, Fastify.
- Data: PostgreSQL via Prisma.
- Cache and control plane: Redis.
- First parse provider: `btch-downloader`.
- Provider access must go through `src/modules/providers`.
- Public API version prefix: `/api/v1`.
- Stable response shape: `requestId`, `status`, `code`, `message`, `data`, `error`.

## Must Read Before Work

- API changes: read `docs/api-contract.md`.
- Parse/provider changes: read `docs/provider-strategy.md`.
- Auth, API keys, URL validation, payment, or secrets: read `docs/security.md`.
- Architecture decisions: read `docs/architecture.md`.
- Deployment work: read `docs/deployment.md`.
- AI handoff and skill rules: read `docs/ai/ai-workflow.md` and `docs/ai/skill-development.md`.
- Project skill: read `skills/parsehub-api/SKILL.md`; then load only the relevant reference file.

## Hard Rules

- Do not write business code inside `E:\github\btch-downloader`.
- Do not bypass the Provider layer when calling parsing libraries or upstream APIs.
- Do not expose `mediafire` or `aio` unless product owners explicitly re-enable them.
- Do not hardcode secrets, production URLs, payment keys, or WeChat secrets.
- Do not log access tokens, refresh tokens, API keys, raw payment secrets, or full user identifiers.
- Do not return stack traces in API responses.
- Do not introduce breaking API changes under `/api/v1`; add `/api/v2` for breaking changes.
- Do not proxy or store media files in MVP; return metadata and download links only.

## Common Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate
npm run docker:up
npm run docker:down
```

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start Postgres and Redis with Docker Compose or point env vars to existing services.
3. Run `npm install`.
4. Run `npm run prisma:migrate`.
5. Run `npm run dev`.

## Acceptance Checklist

- `/healthz` returns without database or Redis dependency.
- `/readyz` checks PostgreSQL and Redis.
- `/api/v1/platforms` lists enabled and disabled platforms.
- Authenticated `/api/v1/parse` validates input, checks cache, consumes quota, calls Provider, records parse history, and returns the stable response shape.
- Tests pass before handoff.
