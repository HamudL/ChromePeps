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
# Die Deploy-Dumps enthalten dieselbe Kunden-PII wie das Nacht-Backup und
# werden daher analog zu docker/backup/pg-backup.sh AES-256-verschlüsselt
# (openssl enc -aes-256-cbc -pbkdf2). Der Schlüssel kommt aus
# BACKUP_ENCRYPTION_KEY in der .env (oben via `source` exportiert) — dieselbe
# Variable wie im Nacht-Backup. Fehlt der Key, wird das Deploy-Backup
# übersprungen (statt einen Klartext-Dump abzulegen).
log "[1/5] Backing up database..."
BACKUP_DIR="/opt/chromepeps/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  log "  WARNING: BACKUP_ENCRYPTION_KEY fehlt in .env — überspringe Deploy-Backup (kein unverschlüsselter Dump). Continuing deploy..."
else
  BACKUP_FILE="$BACKUP_DIR/deploy_$TIMESTAMP.sql.gz.enc"
  # pg_dump → gzip → openssl AES-256 (pipefail bricht die Pipe ab, wenn
  # pg_dump/gzip/openssl fehlschlägt). Der Klartext-Dump berührt nie die Platte.
  if docker compose exec -T postgres pg_dump -U chromepeps chromepeps 2>/dev/null \
      | gzip \
      | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$BACKUP_ENCRYPTION_KEY" -out "$BACKUP_FILE"; then
    log "  Backup saved: deploy_$TIMESTAMP.sql.gz.enc ($(du -h "$BACKUP_FILE" | cut -f1))"
    ls -t "$BACKUP_DIR"/deploy_*.sql.gz.enc 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null || true
  else
    # Partielle/kaputte Ausgabe entfernen, damit kein unbrauchbarer Rest bleibt.
    rm -f "$BACKUP_FILE"
    log "  WARNING: Backup failed (DB might not be running). Continuing deploy..."
  fi
fi

# 2. Pull latest code (needed for prisma schema + docker-compose.yml changes)
log "[2/5] Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin main
cd "$COMPOSE_DIR"

# 3. Pull the pre-built image from GHCR
#    If pull fails, the old running container stays up — no downtime.
log "[3/5] Pulling latest image from GHCR..."
# Vor dem pull das aktuelle (gleich-zu-überschreibende) Image als
# `chromepeps:previous` taggen — damit `docker/rollback.sh` einen
# garantierten Reset-Punkt hat. Wenn das aktuelle Image fehlt
# (z.B. erster Deploy nach docker prune), wird das übersprungen.
CURRENT_IMAGE="ghcr.io/hamudl/chromepeps:latest"
if docker image inspect "$CURRENT_IMAGE" >/dev/null 2>&1; then
  docker tag "$CURRENT_IMAGE" "chromepeps:previous" 2>/dev/null || true
  log "  Tagged current image as chromepeps:previous (rollback target)"
fi

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

# Baseline-Adoption (einmalig, selbstheilend): Die Migrations-Historie wurde
# zu einer einzigen Baseline-Migration (00000000000000_baseline) gesquasht,
# weil die alte 14-teilige Kette auf einer frischen DB nicht mehr anwendbar
# war. Die bestehende Prod-DB hat aber bereits alle Tabellen (via db push)
# und die ALTEN Migrationsnamen in _prisma_migrations. Ohne diesen Guard
# würde `migrate deploy` die Baseline als "pending" sehen und ihre CREATE
# TABLEs gegen bereits existierende Tabellen laufen lassen → harter Abbruch.
# Der Guard markiert die Baseline als applied (OHNE ihre SQL auszuführen),
# WENN die Kern-Tabellen existieren, die Baseline aber noch nicht vermerkt
# ist. Auf einer frischen DB (keine _prisma_migrations / keine products-
# Tabelle) greift der Guard NICHT — dort wendet migrate deploy die Baseline
# regulär an. Idempotent: nach dem ersten Deploy ist die Baseline vermerkt
# und der Guard ist ein No-op. Lokal gegen frische UND prod-artige DB verifiziert.
BASELINE_MIGRATION="00000000000000_baseline"
ADOPT_SQL="SELECT CASE
  WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations')
   AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
   AND NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name='${BASELINE_MIGRATION}')
  THEN 'adopt' ELSE 'skip' END;"
NEEDS_ADOPT=$(docker compose exec -T postgres psql -U chromepeps -d chromepeps -tAc "$ADOPT_SQL" 2>/dev/null | tr -d '[:space:]' || true)
if [ "$NEEDS_ADOPT" = "adopt" ]; then
  log "  Baseline noch nicht vermerkt, Tabellen existieren → markiere ${BASELINE_MIGRATION} als applied (kein Re-Create)."
  if ! docker compose run --rm --no-deps -T app npx prisma migrate resolve --applied "$BASELINE_MIGRATION"; then
    log "ERROR: Baseline-Adoption (migrate resolve) fehlgeschlagen. Alter Container serviert weiter. Abbruch."
    exit 1
  fi
fi

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
  if docker compose exec -T app wget -q --spider http://127.0.0.1:3000/api/health/live 2>/dev/null; then
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
