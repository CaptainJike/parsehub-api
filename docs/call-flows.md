# Call Flows

## WeChat Login

1. Mini-program calls `wx.login`.
2. Mini-program sends `code` to `POST /api/v1/auth/wechat-login`.
3. Backend calls WeChat `code2Session`, or mock login in non-production.
4. Backend upserts user by `openid`.
5. New users receive signup bonus credits.
6. Backend returns access and refresh tokens.

## Parse Media

1. Mini-program calls `POST /api/v1/parse` with Bearer token.
2. Backend validates JWT.
3. Backend detects or validates platform.
4. Backend rejects unsupported platforms and unsafe URLs.
5. Backend checks Redis rate limits.
6. Backend reads parse cache.
7. Cache hit returns data without quota consumption.
8. Cache miss consumes quota.
9. Provider registry calls `btch-downloader` provider.
10. Successful result is cached and recorded.
11. Failed result is recorded with stable error code.

## Ad Reward

1. Mini-program shows rewarded video ad.
2. Client calls `/api/v1/rewards/ad/claim` after complete view.
3. Backend checks idempotency and daily reward limit.
4. Backend increments ad credits and writes quota ledger.

## Payment

1. Mini-program creates order with `/api/v1/orders`.
2. Backend returns payment params.
3. Mini-program calls `wx.requestPayment`.
4. WeChat calls notify endpoint.
5. Backend verifies signature and grants entitlements.
6. MVP contains mock notify handling; production must implement real verification.
