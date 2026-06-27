# Security

## Authentication

- Mini-program users authenticate via WeChat login and backend-issued JWT.
- Access tokens are short lived.
- Refresh tokens are stored as hashes.

## API Keys

- API keys are reserved for internal channels and future partner integrations.
- Store only salted hashes.
- Never log full keys.
- Apply per-key rate limits before expensive operations.

## Input Validation

- Validate every request with Zod.
- For parse input, accept either a direct media URL or share text that contains a public `http` or `https` URL.
- For URL platforms, only allow `http` and `https`.
- When share text contains multiple links, use the first valid public URL in appearance order.
- Block `localhost`, private IPs, link-local IPs, and local schemes.
- Keep input length bounded.

## Payments

- Production WeChat Pay notify must verify signatures.
- Payment callbacks must be idempotent.
- Entitlement grants must happen in a transaction.

## Logging

- Log request id, platform, provider, elapsed time, and stable error code.
- Do not log tokens, payment secrets, raw API keys, or full sensitive identifiers.

## Production Requirements

- Use HTTPS.
- Configure CORS with explicit origins.
- Use WAF/CDN where possible.
- Keep `.env` outside version control.
- Rotate secrets regularly.
