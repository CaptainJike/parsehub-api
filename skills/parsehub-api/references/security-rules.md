# Security Rules

- Never commit `.env` files.
- Never log tokens, API keys, WeChat secrets, payment secrets, or full sensitive identifiers.
- Only allow public `http` and `https` URLs for URL platforms.
- Block localhost, private IPs, link-local IPs, and local schemes.
- Store refresh tokens and API keys as hashes.
- Verify WeChat Pay signatures before production payment release.
- Payment and reward callbacks must be idempotent.
