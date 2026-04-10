#!/usr/bin/env bash
# =============================================================================
# ChromePeps Safe Deploy Script
# Prevents OOM by: stop app → build image → start app
# Usage: cd /opt/chromepeps/docker && ./deploy.sh
# =============================================================================
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$COMPOSE_DIR"

echo "=== ChromePeps Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') Starting deploy..."

# 1. Pull latest code
echo ""
echo "[1/6] Pulling latest code..."
cd ..
git pull origin main
cd "$COMPOSE_DIR"

# 2. Run prisma db push inside the CURRENT running container (before we stop it)
echo ""
echo "[2/6] Pushing database schema..."
docker compose exec -T app npx prisma db push --skip-generate 2>&1 || echo "DB push skipped (container may not be running)"

# 3. Stop the app container to free memory for the build
echo ""
echo "[3/6] Stopping app container to free memory for build..."
docker compose stop app
docker compose rm -f app

# 4. Build the new image (with all memory now available)
echo ""
echo "[4/6] Building new app image..."
docker compose build --no-cache app

# 5. Start everything back up
echo ""
echo "[5/6] Starting containers..."
docker compose up -d

# 6. Run prisma operations in the NEW container
echo ""
echo "[6/6] Running post-deploy tasks..."
sleep 5
docker compose exec -T app npx prisma db push --skip-generate 2>&1 || true
docker compose exec -T app npx prisma generate 2>&1 || true

echo ""
echo "=== Deploy complete! ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') All services running."
docker compose ps
