#!/usr/bin/env bash
# =============================================================================
# ChromePeps Safe Deploy Script
# Prevents OOM by: stop app + nginx → prune cache → build image → start all
# Usage: cd /opt/chromepeps/docker && ./deploy.sh
# =============================================================================
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$COMPOSE_DIR")"
cd "$COMPOSE_DIR"

# Export .env vars so docker compose build args (NEXT_PUBLIC_*) are available
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_DIR/.env"
  set +a
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== ChromePeps Deploy ==="

# 1. Pull latest code
log "[1/7] Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin main
cd "$COMPOSE_DIR"

# 2. Run prisma db push inside the CURRENT running container (before we stop it)
log "[2/7] Pushing database schema..."
docker compose exec -T app npx prisma db push --skip-generate 2>&1 || log "DB push skipped (container may not be running)"

# 3. Stop app + nginx to free memory for the build
#    DB and Redis stay up — they use little memory and are needed after build.
log "[3/7] Stopping app + nginx to free memory for build..."
docker compose stop app nginx 2>/dev/null || true
docker compose rm -f app nginx 2>/dev/null || true
# Force-remove by container name in case compose lost track of them
docker rm -f chromepeps-app chromepeps-nginx 2>/dev/null || true

# 4. Prune Docker build cache + dangling images to free disk
#    Prevents the multi-GB cache buildup that filled the disk in the past.
log "[4/7] Pruning Docker build cache..."
docker builder prune --force 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# 5. Build the new images (app + nginx)
#    Uses Docker layer caching (no --no-cache) to save RAM and time.
#    Only layers that changed are rebuilt.
log "[5/7] Building images..."
if ! docker compose build app; then
  log "ERROR: App build failed! Attempting to restart old image..."
  docker compose rm -f app 2>/dev/null || true
  docker compose up -d || true
  exit 1
fi
docker compose build nginx 2>/dev/null || true

# 6. Start everything back up
log "[6/7] Starting containers..."
docker compose up -d

# Wait for app to become healthy before running post-deploy tasks
log "Waiting for app to become healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q --spider http://127.0.0.1:3000/ 2>/dev/null; then
    log "App is healthy after ${i}s"
    break
  fi
  sleep 1
done

# 7. Run prisma operations in the NEW container
log "[7/7] Running post-deploy tasks..."
docker compose exec -T app npx prisma db push --skip-generate 2>&1 || true
docker compose exec -T app npx prisma generate 2>&1 || true

# Post-deploy cleanup: remove old dangling images from the build
docker image prune -f 2>/dev/null || true

log "=== Deploy complete! ==="
docker compose ps
log "Free memory:"
free -h
