#!/usr/bin/env bash
# =============================================================================
# ChromePeps Deploy Script (Pull-based, no local build)
#
# Images are built by GitHub Actions and pushed to GHCR. This script only:
#  1. Backs up the database
#  2. Pulls latest code (for prisma schema)
#  3. Pulls the pre-built image from GHCR
#  4. Applies any schema changes via `prisma db push` using a one-off
#     container BEFORE restarting the app. This closes a window where
#     the new app code used to start serving requests against the OLD
#     schema — backwards-compatible changes (nullable columns etc.)
#     worked, but anything reading a new column would crash.
#  5. Restarts app + nginx with the new image
#
# This avoids the OOM kills that happened when building Next.js on the
# 1.8 GB VPS. Deploy now takes ~30 seconds instead of 4 minutes.
#
# Usage: cd /opt/chromepeps/docker && ./deploy.sh
# =============================================================================
set -euo pipefail

# SICHERHEIT: Niemals docker compose down --volumes verwenden!
# Das löscht die Datenbank unwiderruflich.

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$COMPOSE_DIR")"
cd "$COMPOSE_DIR"

# Export .env vars for runtime config
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_DIR/.env"
  set +a
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== ChromePeps Deploy ==="

# 1. Backup database before deploy
log "[1/5] Backing up database..."
BACKUP_DIR="/opt/chromepeps/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if docker compose exec -T postgres pg_dump -U chromepeps chromepeps 2>/dev/null | gzip > "$BACKUP_DIR/deploy_$TIMESTAMP.sql.gz"; then
  log "  Backup saved: deploy_$TIMESTAMP.sql.gz ($(du -h "$BACKUP_DIR/deploy_$TIMESTAMP.sql.gz" | cut -f1))"
  ls -t "$BACKUP_DIR"/deploy_*.sql.gz 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null || true
else
  log "  WARNING: Backup failed (DB might not be running). Continuing deploy..."
fi

# 2. Pull latest code (needed for prisma schema + docker-compose.yml changes)
log "[2/5] Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin main
cd "$COMPOSE_DIR"

# 3. Pull the pre-built image from GHCR
#    If pull fails, the old running container stays up — no downtime.
log "[3/5] Pulling latest image from GHCR..."
if ! docker compose pull app; then
  log "ERROR: Image pull failed! Old container is still running. Check GitHub Actions status."
  exit 1
fi

# 4. Apply schema changes BEFORE the restart. `compose run` spins up a
#    one-off container from the freshly pulled image, inheriting the
#    existing env file + network, applies pending migrations / pushes
#    the schema, and exits. The old app container is still serving
#    traffic during this step. Only when the schema is up to date do
#    we cut over.
#
# Two-step strategy:
#   (a) `prisma migrate deploy` — wendet pending Migrations aus
#       prisma/migrations/ an, idempotent (skipped wenn nichts pending).
#       Wichtig für Migrations mit Backfill-SQL (z.B. denormalisiert →
#       FK-Modell-Refactoring), die `db push` nicht abdecken kann.
#   (b) `prisma db push --skip-generate` — sichert ab dass das laufende
#       Schema mit der schema.prisma 1:1 matched. Wenn (a) lief, sieht
#       (b) "no changes". Wenn (a) nichts hatte (z.B. ad-hoc Schema-
#       Tweaks ohne Migration), pflegt (b) sie ein.
log "[4/5] Applying database schema..."
if ! docker compose run --rm --no-deps -T app npx prisma migrate deploy; then
  log "ERROR: prisma migrate deploy failed. Old app container is still serving. Aborting deploy."
  exit 1
fi
if ! docker compose run --rm --no-deps -T app npx prisma db push --skip-generate; then
  log "ERROR: prisma db push failed (after migrate deploy). Old app container is still serving. Aborting deploy."
  exit 1
fi

# 5. Recreate app + nginx with the new image (DB + Redis untouched)
log "[5/5] Restarting app + nginx..."
docker compose up -d --force-recreate app nginx

# Wait for app to become healthy
log "Waiting for app to become healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q --spider http://127.0.0.1:3000/ 2>/dev/null; then
    log "App is healthy after ${i}s"
    break
  fi
  sleep 1
done

# Cleanup: remove old dangling images
docker image prune -f 2>/dev/null || true

log "=== Deploy complete! ==="
docker compose ps
log "Free memory:"
free -h
