#!/bin/sh
set -eu

echo "[parsehub-api] Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[parsehub-api] Starting API server..."
exec node dist/server.js
