#!/usr/bin/env bash
# =============================================================================
# ChromePeps Deploy Script (Pull-based, no local build)
#
# Images are built by GitHub Actions and pushed to GHCR. This script only:
#  1. Backs up the database
#  2. Pulls latest code (for prisma schema)
#  3. Pulls the pre-built image from GHCR
#  4. Runs prisma db push
#  5. Restarts containers
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

# 4. Recreate app + nginx with the new image (DB + Redis untouched)
log "[4/5] Restarting app + nginx..."
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

# 5. Run prisma db push in the new container
log "[5/5] Running post-deploy tasks..."
docker compose exec -T app npx prisma db push --skip-generate 2>&1 || true

# Cleanup: remove old dangling images
docker image prune -f 2>/dev/null || true

log "=== Deploy complete! ==="
docker compose ps
log "Free memory:"
free -h
