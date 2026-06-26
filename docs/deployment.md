# Deployment

## Local

```bash
copy .env.example .env
npm install
npm run docker:up
```

This starts `api + postgres + redis` together. The API container runs `prisma migrate deploy` on boot, so the first startup automatically creates or updates tables from the checked-in migrations.

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

## Docker

```bash
copy .env.example .env
docker compose up -d --build
```

Notes:

- `api` listens on `${API_PORT:-3000}`.
- `postgres` and `redis` are published to `127.0.0.1` only, so they are reachable from the server itself but not exposed publicly by default.
- Inside Docker Compose, the API automatically uses the internal service addresses `postgres:5432` and `redis:6379`; you do not need to rewrite `DATABASE_URL` or `REDIS_URL` for containers.
- If you change `POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD`, keep the manual `DATABASE_URL` in `.env` consistent for non-Docker local runs.

To stop services:

```bash
docker compose down
```

## Aliyun MVP

- ECS or SAE for API instances.
- ApsaraDB RDS PostgreSQL.
- ApsaraDB Redis.
- Nginx reverse proxy.
- HTTPS certificate.
- SLS for logs.
- WAF/CDN if exposed publicly.

## Release Checklist

- `npm test`
- `npm run build`
- `npm run prisma:deploy`
- Confirm `/healthz`.
- Confirm `/readyz`.
- Confirm mini-program request domain is configured.
- Confirm production secrets are not committed.
