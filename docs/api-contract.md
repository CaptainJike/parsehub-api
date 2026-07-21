# API Contract

## Response Shape

All public API responses use:

```ts
{
  requestId: string;
  status: boolean;
  code: string;
  message: string;
  data?: unknown;
  error?: {
    reason: string;
    retryable: boolean;
  };
}
```

## Endpoints

### `GET /healthz`

Process health check. Does not require database or Redis.

### `GET /readyz`

Checks MySQL and Redis.

### `POST /api/v1/auth/wechat-login`

Body:

```json
{
  "code": "wx.login code",
  "nickname": "optional",
  "avatar": "optional https url"
}
```

Returns access token, refresh token, and basic user data.

### `POST /api/v1/auth/refresh`

Body:

```json
{
  "refreshToken": "backend refresh token"
}
```

Returns a rotated access token and refresh token pair.
Refresh tokens are single-use after a successful rotation.
If the refresh token is invalid, expired, revoked, or replayed, the API returns stable code `INVALID_REFRESH_TOKEN`.

### `GET /api/v1/me`

Requires Bearer token. Returns user profile and quota summary.

### `GET /api/v1/platforms`

Returns enabled and disabled platform status. `mediafire` and `aio` are disabled by default.

### `POST /api/v1/parse`

Requires Bearer token.

Body:

```json
{
  "platform": "auto",
  "input": "https://example.com/media-url"
}
```

`platform` may be `auto` or an enabled platform id.
`input` may be a direct media URL or copied share text that contains a public `http` or `https` URL.

Returns platform, provider, cache status, quota status, elapsed time, provider data, and an optional `resolvedInput` field containing the exact URL sent to the provider.

### `POST /api/v1/rewards/ad/claim`

Requires Bearer token.

Body:

```json
{
  "adSessionId": "optional-client-session-id",
  "clientEventId": "idempotency-key"
}
```

Grants ad credits once per `userId + clientEventId`.

### `POST /api/v1/orders`

Requires Bearer token.

Body:

```json
{
  "productId": "credits-100",
  "payType": "wechat"
}
```

Returns order data and payment params. Real WeChat Pay signing must be configured before production.

### `POST /api/v1/payments/wechat/notify`

Payment callback endpoint. MVP has a mock branch; production must verify WeChat Pay signatures.

## Stability Rules

- Do not remove fields from `/api/v1` responses.
- Add optional fields only when safe for existing mini-program clients.
- Use stable `code` values for client behavior.
- Add `/api/v2` for breaking changes.
- When parse share text contains multiple links, use the first valid public URL in appearance order.
