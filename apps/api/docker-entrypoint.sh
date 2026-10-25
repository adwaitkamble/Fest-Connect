#!/bin/sh
set -e

echo "[FestConnect API Entrypoint] Ensuring database migrations are applied..."
node dist/db/migrate.js

if [ "$RUN_SEEDS" = "true" ]; then
  echo "[FestConnect API Entrypoint] RUN_SEEDS=true: Seeding development demo accounts..."
  node dist/db/seed.js || echo "[FestConnect API Entrypoint] Seed notice: skipped or already applied."
fi

echo "[FestConnect API Entrypoint] Starting FestConnect API server..."
exec "$@"
