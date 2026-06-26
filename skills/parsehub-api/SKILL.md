---
name: parsehub-api
description: Work on the parsehub-api media parsing backend. Use when modifying provider orchestration, media parse APIs, WeChat mini-program login, quota and ad reward flows, WeChat payment scaffolding, Redis caching/rate limits/circuit breakers, API stability, deployment, or AI handoff docs in this repository.
---

# parsehub-api

Read `AGENTS.md` first. Then load only the reference needed for the task:

- Architecture/module boundaries: `references/architecture-rules.md`
- Public API/versioning: `references/api-rules.md`
- Parse providers/cache/fallback: `references/provider-rules.md`
- Auth/security/payment safety: `references/security-rules.md`
- Tests and verification: `references/testing-rules.md`

Core rules:

- Keep routes thin and business rules in services.
- Never call parser packages directly from routes.
- Preserve `/api/v1` response compatibility.
- Do not hardcode secrets or production credentials.
- Update tests and docs for behavior changes.
