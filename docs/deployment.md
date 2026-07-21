# Deployment

## Local

```bash
cp .env.example .env
npm install
npm run docker:up
```

This starts `api + mysql + redis` together. The API container runs `prisma migrate deploy` on boot, so the first startup automatically creates or updates tables from the checked-in migrations.

Check status with:

```bash
docker compose ps
docker compose logs -f api
```

For manual local services:

```bash
npm install
npm run prisma:migrate
npm run dev
```

`npm run dev` and `npm start` automatically load `.env` through Node.js `process.loadEnvFile()`, so you do not need to pass `NODE_OPTIONS=--env-file=.env` manually.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Notes:

- `api` listens on `${API_BIND_IP:-127.0.0.1}:${API_PORT:-3000}` by default, so Nginx on the host can reverse proxy to it without exposing the raw API port publicly.
- `mysql` and `redis` are published to `127.0.0.1` only, so they are reachable from the server itself but not exposed publicly by default.
- Inside Docker Compose, the API automatically uses the internal service addresses `mysql:3306` and `redis:6379`; you do not need to rewrite `DATABASE_URL` or `REDIS_URL` for containers.
- If you change `MYSQL_DATABASE`, `MYSQL_USER`, or `MYSQL_PASSWORD`, keep the manual `DATABASE_URL` in `.env` consistent for non-Docker local runs.
- `docker-compose.yml` requires a real `.env` file because `env_file: .env` is part of the service definition.

To stop services:

```bash
docker compose down
```

## Aliyun ECS Single-Host

This repository supports a single-host ECS deployment where `api + mysql + redis` all run on the same server with Docker Compose.

### Prerequisites

- ECS instance with Docker Engine and Docker Compose plugin installed.
- Node.js is optional for runtime, but useful if you want to run `npm test` and `npm run build` on the server before release.
- Nginx installed on the host.
- HTTPS certificate and private key already issued for your API domain.
- ECS security group allows `80` and `443` only. Do not expose `3000`, `3306`, or `6379` publicly.

### Production Environment File

1. Copy the template and edit it on the server:

```bash
cp .env.production.example .env
```

2. Update at least these values before the first boot:

- `NODE_ENV=production`
- `API_BIND_IP=127.0.0.1`
- `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` to strong random passwords
- `DATABASE_URL` to the matching local MySQL password
- `JWT_SECRET` to a random value of at least 32 characters
- `WECHAT_APP_ID` and `WECHAT_APP_SECRET` to the real mini-program credentials
- `ENABLE_MOCK_WECHAT=false`
- `CORS_ORIGINS` to your real HTTPS origin list, or leave it empty if no browser origin should be allowed yet
- `WECHAT_PAY_MOCK=true` until real WeChat Pay notify verification is implemented

### Boot Steps

```bash
npm test
npm run build
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

The `api` container runs `prisma migrate deploy` on boot, so checked-in migrations are applied automatically before Fastify starts.

### Nginx Reverse Proxy

- Use [docker/nginx.parsehub-api.conf.example](/Users/zhuxucai/workspace/github/parsehub-api/docker/nginx.parsehub-api.conf.example) as the starting point.
- Replace `api.example.com` with your real API domain.
- Replace certificate paths with the real certificate and private key paths on the server.
- Keep `proxy_pass http://127.0.0.1:3000;` so public traffic goes through Nginx instead of the raw container port.

### Functional Boundaries

- WeChat login is real in production. There is no mock login path when `NODE_ENV=production`.
- WeChat Pay remains mock-only in the current repository. Do not treat payment endpoints as production payment capability yet.
- `Product` rows are not seeded automatically. If you expose order creation later, initialize products explicitly first.
- The only active parse provider is `btch-downloader`, wrapped through `src/modules/providers`.

### Acceptance Checks

- `curl https://your-domain/healthz`
- `curl https://your-domain/readyz`
- `curl https://your-domain/api/v1/platforms`
- Confirm WeChat login works with real mini-program credentials.
- Confirm authenticated `/api/v1/parse` completes validation, quota consumption, provider execution, cache write, and database recording.
- Confirm the public internet cannot reach `3000`, `3306`, or `6379`.

## Release Checklist

- `npm test`
- `npm run build`
- `docker compose up -d --build`
- `docker compose ps`
- `docker compose logs -f api`
- Confirm `/healthz`.
- Confirm `/readyz`.
- Confirm `/api/v1/platforms`.
- Confirm WeChat login succeeds in production with real credentials.
- Confirm authenticated `/api/v1/parse` succeeds end-to-end.
- Confirm Nginx HTTPS reverse proxy is active.
- Confirm `3000`, `3306`, and `6379` are not publicly reachable.
- Confirm mini-program request domain is configured.
- Confirm production secrets are not committed.
