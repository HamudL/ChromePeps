#!/usr/bin/env bash
# =============================================================================
# ChromePeps Rollback Script
#
# Spielt das letzte Pre-Deploy-Image (`chromepeps:previous`) auf den
# laufenden App-Container zurück. Erwartet, dass `deploy.sh` vor dem
# Pull das aktuelle Image als `chromepeps:previous` getaggt hat.
#
# Datenbank wird NICHT zurückgerollt — wenn die letzte Migration
# semantische Daten-Veränderungen enthielt (Backfill, Drop columns),
# muss zusätzlich das DB-Backup aus /opt/chromepeps/backups/ eingespielt
# werden. Das ist eine bewusste Entscheidung:
#   - 95 % aller Rollbacks sind App-Bugs ohne Schema-Side-Effects
#   - DB-Restore ist destruktiv und braucht manuelle Bestätigung
#
# Usage: cd /opt/chromepeps/docker && bash rollback.sh
# =============================================================================
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$COMPOSE_DIR")"
cd "$COMPOSE_DIR"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_DIR/.env"
  set +a
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== ChromePeps Rollback ==="

# 1. Sanity-Check: chromepeps:previous existiert?
if ! docker image inspect chromepeps:previous >/dev/null 2>&1; then
  log "ERROR: Kein chromepeps:previous-Image gefunden. Rollback nicht möglich."
  log "  Kontext: deploy.sh tagged das aktuelle Image vor jedem Pull als"
  log "  chromepeps:previous. Bei einem fresh-VPS ohne vorherigen Deploy"
  log "  gibt es kein Tag-Target."
  log "  Manueller Recovery: 'docker pull ghcr.io/hamudl/chromepeps:<sha>'"
  log "  mit dem letzten bekannt-guten SHA aus dem CI-History."
  exit 1
fi

PREV_DIGEST=$(docker image inspect chromepeps:previous --format '{{.Id}}' | cut -c8-19)
CUR_DIGEST=$(docker image inspect ghcr.io/hamudl/chromepeps:latest --format '{{.Id}}' 2>/dev/null | cut -c8-19 || echo "none")
log "Vorheriges Image:  ${PREV_DIGEST}"
log "Aktuelles Image:   ${CUR_DIGEST}"

if [ "$PREV_DIGEST" = "$CUR_DIGEST" ]; then
  log "WARNING: previous und current Image sind identisch. Rollback wäre ein No-op."
  log "  Wenn du sicher bist, force-rollback per 'docker compose down && docker compose up -d'"
  exit 1
fi

# 2. Optional: aktuelles Image als 'rollback-aborted' sichern, falls
#    der Rollback selbst Probleme macht und du wieder vor wollen würdest.
docker tag ghcr.io/hamudl/chromepeps:latest chromepeps:rollback-aborted 2>/dev/null || true

# 3. previous-Image als latest re-taggen, damit docker compose es nutzt.
docker tag chromepeps:previous ghcr.io/hamudl/chromepeps:latest
log "[1/3] previous → latest re-tagged"

# 4. App-Container neu starten mit dem alten Image.
#    --force-recreate stellt sicher dass das neue (alte) Image gepullt wird.
log "[2/3] Restarting app container with previous image..."
docker compose up -d --force-recreate app

# 5. Health-Check.
log "[3/3] Waiting for app to become healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q --spider http://127.0.0.1:3000/ 2>/dev/null; then
    log "App is healthy after ${i}s"
    log "=== Rollback complete! ==="
    log "Falls die letzte Migration unrückgängig zu machen ist:"
    log "  ls -lh /opt/chromepeps/backups/ | head -5"
    log "  zcat /opt/chromepeps/backups/<dump>.sql.gz | docker compose exec -T postgres psql -U chromepeps -d chromepeps"
    exit 0
  fi
  sleep 1
done

log "WARNING: App nicht healthy nach 30s. Logs prüfen:"
log "  docker compose logs --tail 100 app"
exit 1
