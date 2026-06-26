# AI Workflow

## Start Here

1. Read `AGENTS.md`.
2. Identify the affected module.
3. Read the relevant docs before editing:
   - API: `docs/api-contract.md`
   - Providers: `docs/provider-strategy.md`
   - Security: `docs/security.md`
   - Deployment: `docs/deployment.md`
4. Read `skills/parsehub-api/SKILL.md` when the task touches product workflows.

## Working Rules

- Keep code in the module that owns the behavior.
- Do not call parsing packages outside Provider classes.
- Add or update tests for behavior changes.
- Update docs when public APIs, provider behavior, or operational commands change.
- Preserve `/api/v1` compatibility.

## Handoff

Before final response:

- Run relevant tests.
- Run build when TypeScript or Prisma changes.
- Mention any commands that could not be run.
- Mention changed public APIs and docs.
