#!/usr/bin/env bash
# =============================================================================
# ChromePeps Deploy Script
#
# Usage (on the VPS):
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
