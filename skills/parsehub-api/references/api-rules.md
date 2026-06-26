# API Rules

- Public endpoints stay under `/api/v1`.
- Breaking changes require `/api/v2`.
- Use the standard response shape from `docs/api-contract.md`.
- Include `requestId` in all responses.
- Use stable `code` values for mini-program client behavior.
- Validate request bodies with Zod.
- Protected endpoints require Bearer JWT.
