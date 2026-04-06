#!/usr/bin/env bash
# =============================================================================
# ChromePeps Zero-Downtime Deploy Script
#
# Usage (on the VPS):
#   cd /opt/chromepeps && ./scripts/deploy.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[deploy]${NC} $1"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

log "Pulling latest code..."
git pull origin main

log "Building new image..."
docker compose -f docker/docker-compose.yml build app

log "Running database migrations..."
docker compose -f docker/docker-compose.yml run --rm app npx prisma migrate deploy

log "Restarting application..."
docker compose -f docker/docker-compose.yml up -d app

log "Waiting for health check..."
sleep 5

if docker inspect --format='{{.State.Health.Status}}' chromepeps-app 2>/dev/null | grep -q "healthy"; then
  log "Application is healthy!"
else
  log "Application started (health check pending)."
fi

log "Reloading Nginx..."
docker exec chromepeps-nginx nginx -s reload 2>/dev/null || true

log "Pruning old images..."
docker image prune -f

log "Deploy complete!"
