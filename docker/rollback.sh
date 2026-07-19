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

# 4. App- UND nginx-Container neu starten.
#    --pull never: Die compose-Datei hat für app `pull_policy: always`
#    (richtig fürs normale Deploy), aber hier würde ein erneuter Pull das
#    soeben re-getaggte :latest sofort wieder mit dem kaputten Remote-Image
#    überschreiben — der Rollback wäre ein No-op. `--pull never` (Compose
#    v2.13+) übersteuert die pull_policy und erzwingt das lokale Image.
#    nginx ist build-basiert (kein Pull) und wird MIT recreated: sein
#    Upstream `server app:3000;` (nginx.conf) wird nur beim Config-Load
#    aufgelöst und cacht die Container-IP für die Prozesslaufzeit. Wird nur
#    der app-Container ersetzt, bekommt er eine neue Docker-IP, während
#    nginx weiter auf die alte, tote IP proxied → HTTP 502 für ALLE. Genau
#    dieses Muster macht deploy.sh bereits richtig (--force-recreate app nginx).
log "[2/3] Restarting app + nginx with previous image..."
docker compose up -d --pull never --force-recreate app nginx

# 5. Health-Check — ZWEISTUFIG:
#    (a) App-intern: bootet der (alte) Container überhaupt?
#    (b) Durch nginx vom Host: erreicht der Reverse-Proxy die NEUE App-IP?
#    Der frühere Check testete nur (a) direkt im app-Container und meldete
#    fälschlich "healthy", während extern wegen der stale Upstream-IP alles
#    502 warf. (b) fängt genau das ab. curl ist auf dem VPS vorhanden
#    (setup-server.sh nutzt es); --resolve schickt SNI/Host korrekt an den
#    Haupt-vhost, -k ignoriert die localhost-Cert-Namensabweichung.
log "[3/3] Waiting for app to become healthy (intern)..."
APP_OK=0
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q --spider http://127.0.0.1:3000/api/health/live 2>/dev/null; then
    APP_OK=1
    log "App container healthy after ${i}s"
    break
  fi
  sleep 1
done
if [ "$APP_OK" -ne 1 ]; then
  log "ERROR: App nicht healthy nach 30s. Rollback-Image bootet nicht. Logs prüfen:"
  log "  docker compose logs --tail 100 app"
  exit 1
fi

# :- Default nötig: unter `set -u` würde eine ungesetzte NEXT_PUBLIC_APP_URL
# (nicht in .env) den Rollback sonst hier abbrechen.
PROXY_HOST="${NEXT_PUBLIC_APP_URL:-https://chromepeps.com}"
PROXY_HOST="${PROXY_HOST#*://}"
PROXY_HOST="${PROXY_HOST%%/*}"
PROXY_HOST="${PROXY_HOST:-chromepeps.com}"
log "Verifying reverse proxy (nginx → app) für ${PROXY_HOST}..."
PROXY_OK=0
for i in $(seq 1 15); do
  if curl -skf --max-time 5 --resolve "${PROXY_HOST}:443:127.0.0.1" \
       "https://${PROXY_HOST}/api/health/live" >/dev/null 2>&1; then
    PROXY_OK=1
    log "Reverse proxy healthy after ${i}s"
    break
  fi
  sleep 1
done
if [ "$PROXY_OK" -ne 1 ]; then
  log "ERROR: App läuft, aber nginx erreicht sie nicht (502) — Rollback UNVOLLSTÄNDIG."
  log "  nginx-Upstream/-Config prüfen:"
  log "    docker compose exec nginx nginx -t"
  log "    docker compose logs --tail 50 nginx"
  log "  Notfalls nginx erneut recreaten: docker compose up -d --force-recreate nginx"
  exit 1
fi

log "=== Rollback complete! ==="
log "Falls die letzte Migration unrückgängig zu machen ist:"
log "  ls -lh /opt/chromepeps/backups/ | head -5"
log "  zcat /opt/chromepeps/backups/<dump>.sql.gz | docker compose exec -T postgres psql -U chromepeps -d chromepeps"
exit 0
