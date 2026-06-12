#!/usr/bin/env bash
# =============================================================================
# ChromePeps Restore-Test — beweist, dass das neueste Backup WIRKLICH
# wiederherstellbar ist (ein ungetestetes Backup ist kein Backup).
#
#   restore-test.sh [pfad/zum/backup.dump.enc]
#
# Ablauf: neuestes (oder angegebenes) Backup entschlüsseln → in eine
# TEMPORÄRE Datenbank "restore_test" im laufenden Postgres-Container
# restoren → Kerntabellen zählen → Temp-DB droppen. Die Produktions-DB
# "chromepeps" wird zu keinem Zeitpunkt angefasst.
#
# Empfohlen: monatlich manuell ausführen (oder nach jeder größeren
# Migration). Meldet Erfolg/Fehler wie pg-backup.sh an den Ops-Kanal.
# =============================================================================
set -u -o pipefail

PROJECT_DIR="/opt/chromepeps"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_DIR="/opt/chromepeps-backups"
TEST_DB="restore_test"
REPORT_URL="https://chromepeps.com/api/cron/backup-report"

env_value() {
  grep -E "^${1}=" "$ENV_FILE" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}
CRON_SECRET="$(env_value CRON_SECRET || true)"

report() {
  local ok="$1" msg="$2"
  msg=${msg//\\/\\\\}; msg=${msg//\"/\\\"}
  if [ -n "$CRON_SECRET" ]; then
    curl -fsS -m 20 -X POST \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"ok\":$ok,\"message\":\"Restore-Test: $msg\"}" \
      "$REPORT_URL" >/dev/null 2>&1 || true
  fi
  echo "[restore-test] ok=$ok $msg"
}

cleanup() {
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U chromepeps -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" >/dev/null 2>&1 || true
}

fail() {
  cleanup
  report false "$1"
  exit 1
}

KEY="$(env_value BACKUP_ENCRYPTION_KEY || true)"
[ -n "$KEY" ] || fail "BACKUP_ENCRYPTION_KEY fehlt in $ENV_FILE."

BACKUP="${1:-$(ls -1t "$BACKUP_DIR"/chromepeps-*.dump.enc 2>/dev/null | head -n1)}"
[ -n "$BACKUP" ] && [ -f "$BACKUP" ] || fail "Kein Backup gefunden."

set -a; . "$ENV_FILE"; set +a

echo "[restore-test] Teste $(basename "$BACKUP") ..."
cleanup
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U chromepeps -d postgres -c "CREATE DATABASE $TEST_DB;" >/dev/null \
  || fail "CREATE DATABASE $TEST_DB fehlgeschlagen."

# Entschlüsseln + restoren. --no-owner/--no-privileges: die Temp-DB
# gehört dem Standard-User, Original-Ownership ist hier irrelevant.
if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$KEY" -in "$BACKUP" \
    | docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_restore -U chromepeps -d "$TEST_DB" --no-owner --no-privileges >/dev/null 2>&1; then
  fail "pg_restore in $TEST_DB fehlgeschlagen ($(basename "$BACKUP"))."
fi

# Plausibilität: Kerntabellen müssen existieren und zählbar sein.
COUNTS=$(docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U chromepeps -d "$TEST_DB" -tA -c \
  "SELECT 'users='||(SELECT count(*) FROM users)||' orders='||(SELECT count(*) FROM orders)||' products='||(SELECT count(*) FROM products);" \
  2>/dev/null) || fail "Zähl-Query auf $TEST_DB fehlgeschlagen."

cleanup
report true "erfolgreich — $(basename "$BACKUP") → $COUNTS"
