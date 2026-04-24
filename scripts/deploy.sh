#!/usr/bin/env bash
# =============================================================================
# ChromePeps Deploy Script (LEGACY — local-build path)
#
# ⚠️  DEPRECATED: das Live-Deploy-Skript ist `docker/deploy.sh`. Dieses
# hier baut das Image AUF dem VPS und OOM-killt zuverlässig auf der
# 1.8 GB-Maschine. Es bleibt nur als Fallback erhalten, falls GHCR
# komplett unerreichbar ist und du das Image lokal auf dem VPS bauen
# musst (Notfall, nicht regulär).
#
# Reguläres Deploy: `cd /opt/chromepeps/docker && ./deploy.sh` — das
# Skript zieht das von GitHub-Actions vorgebaute Image aus GHCR,
# macht ein DB-Backup, fährt `prisma db push` und tauscht den
# Container atomar aus. ~30 s statt ~4 min, kein OOM.
#
# Usage (Notfall-Pfad):
#   cd /opt/chromepeps && ./scripts/deploy.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log() { echo -e "${GREEN}[deploy]${NC} $1"; }
err() { echo -e "${RED}[deploy]${NC} $1"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
COMPOSE="docker compose -f docker/docker-compose.yml --env-file .env"

# Check .env exists
if [[ ! -f .env ]]; then
  err ".env file not found! Copy .env.example to .env and fill in values."
  exit 1
fi

log "Pulling latest code..."
git pull origin main

log "Building new image..."
$COMPOSE build app

log "Starting database and redis (if not running)..."
$COMPOSE up -d postgres redis
sleep 3

log "Running database migrations..."
$COMPOSE run --rm app npx prisma migrate deploy || {
  err "migrate deploy failed, trying db push..."
  $COMPOSE run --rm app npx prisma db push
}

log "Restarting application..."
$COMPOSE up -d app

log "Waiting for health check..."
sleep 10

if docker inspect --format='{{.State.Health.Status}}' chromepeps-app 2>/dev/null | grep -q "healthy"; then
  log "Application is healthy!"
else
  log "Application started (health check pending — check with: docker ps)"
fi

log "Starting Nginx..."
$COMPOSE up -d nginx
docker exec chromepeps-nginx nginx -s reload 2>/dev/null || true

log "Pruning old images..."
docker image prune -f

log "Deploy complete!"
