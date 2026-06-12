#!/usr/bin/env bash
# =============================================================================
# ChromePeps Datenbank-Backup
#
# Modi:
#   pg-backup.sh             nächtliches Backup: pg_dump (custom format)
#                            → AES-256-verschlüsselt → Rotation (14 Tage)
#                            → Integritätscheck → Erfolg/Fehler-Report
#   pg-backup.sh --watchdog  prüft NUR, ob das neueste Backup frisch (<26h)
#                            und plausibel groß ist — alarmiert sonst.
#
# Läuft als root via Crontab (Block "chromepeps backup" — siehe README).
# Meldet an POST /api/cron/backup-report (CRON_SECRET-geschützt); Fehler
# werden dort als Ops-Alert-Mail an die Admins eskaliert — der Host
# selbst hat kein Mail-Tooling.
#
# WICHTIG:
#  - BACKUP_DIR liegt bewusst AUSSERHALB von /opt/chromepeps (git pull
#    beim Deploy darf Backups nie anfassen).
#  - BACKUP_ENCRYPTION_KEY in /opt/chromepeps/.env ist Pflicht. OHNE
#    DIESEN KEY SIND DIE BACKUPS WERTLOS — Key zusätzlich an einem
#    zweiten Ort sichern (Passwort-Manager), NICHT nur auf dem Server!
#  - Restore-Runbook: docker/backup/README.md
# =============================================================================
set -u -o pipefail

PROJECT_DIR="/opt/chromepeps"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_DIR="/opt/chromepeps-backups"
RETENTION_DAYS=14
MIN_SIZE_BYTES=10240   # <10 KB = sicher kein echter Dump
MAX_AGE_HOURS=26       # Watchdog: täglicher Cron + 2h Toleranz
REPORT_URL="https://chromepeps.com/api/cron/backup-report"

# ---- .env lesen (root-only Datei) -------------------------------------------
env_value() {
  # Liest VAR=... aus der .env, entfernt umschließende Anführungszeichen.
  grep -E "^${1}=" "$ENV_FILE" | head -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

CRON_SECRET="$(env_value CRON_SECRET || true)"

report() {
  # report <ok:true|false> <message> [detail]
  local ok="$1" msg="$2" detail="${3:-}"
  # Anführungszeichen/Backslashes neutralisieren — die Meldungen sind
  # eigene Strings, aber ein Dateiname mit '"' soll kein JSON brechen.
  msg=${msg//\\/\\\\}; msg=${msg//\"/\\\"}
  detail=${detail//\\/\\\\}; detail=${detail//\"/\\\"}
  if [ -n "$CRON_SECRET" ]; then
    curl -fsS -m 20 -X POST \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"ok\":$ok,\"message\":\"$msg\",\"detail\":\"$detail\"}" \
      "$REPORT_URL" >/dev/null 2>&1 || true
  fi
  echo "[pg-backup] ok=$ok $msg ${detail:+— $detail}"
}

fail() {
  report false "$1" "${2:-}"
  exit 1
}

# ---- Watchdog-Modus ----------------------------------------------------------
if [ "${1:-}" = "--watchdog" ]; then
  newest=$(ls -1t "$BACKUP_DIR"/chromepeps-*.dump.enc 2>/dev/null | head -n1 || true)
  [ -n "$newest" ] || fail "Watchdog: KEIN Backup in $BACKUP_DIR gefunden."
  age_seconds=$(( $(date +%s) - $(stat -c %Y "$newest") ))
  age_hours=$(( age_seconds / 3600 ))
  size=$(stat -c %s "$newest")
  if [ "$age_hours" -ge "$MAX_AGE_HOURS" ]; then
    fail "Watchdog: Neuestes Backup ist ${age_hours}h alt (Limit ${MAX_AGE_HOURS}h)." "$(basename "$newest")"
  fi
  if [ "$size" -lt "$MIN_SIZE_BYTES" ]; then
    fail "Watchdog: Neuestes Backup verdächtig klein (${size} Bytes)." "$(basename "$newest")"
  fi
  report true "Watchdog: Backup frisch (${age_hours}h, ${size} Bytes)."
  exit 0
fi

# ---- Backup-Modus -------------------------------------------------------------
[ -f "$ENV_FILE" ] || fail "ENV-Datei $ENV_FILE fehlt."
KEY="$(env_value BACKUP_ENCRYPTION_KEY || true)"
[ -n "$KEY" ] || fail "BACKUP_ENCRYPTION_KEY fehlt in $ENV_FILE — Backup abgebrochen."

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Compose braucht die .env für die Variablen-Interpolation (sonst
# Leerstring-Warnungen / falsche Container-Metadata — siehe Memory).
set -a; . "$ENV_FILE"; set +a

TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/chromepeps-$TS.dump.enc"

# Dump im Custom-Format (-Fc): intern komprimiert, selektiv
# restaurierbar, pg_restore-kompatibel. Direkt durch openssl gepiped —
# der Klartext-Dump berührt nie die Platte.
if ! docker compose -f "$COMPOSE_FILE" exec -T postgres \
      pg_dump -U chromepeps -d chromepeps -Fc 2>"$BACKUP_DIR/.last-stderr" \
    | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$KEY" -out "$OUT"; then
  detail=$(tail -c 500 "$BACKUP_DIR/.last-stderr" 2>/dev/null || true)
  rm -f "$OUT"
  fail "pg_dump/Verschlüsselung fehlgeschlagen." "$detail"
fi

SIZE=$(stat -c %s "$OUT")
if [ "$SIZE" -lt "$MIN_SIZE_BYTES" ]; then
  rm -f "$OUT"
  fail "Backup verdächtig klein (${SIZE} Bytes) — verworfen."
fi

# Integritätscheck: entschlüsseln + Inhaltsverzeichnis lesen. Schlägt
# fehl bei kaputtem Dump ODER falschem Key — genau die zwei Fehler, die
# man am Backup-Tag bemerken will, nicht am Restore-Tag.
if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$KEY" -in "$OUT" \
    | docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore --list >/dev/null 2>&1; then
  rm -f "$OUT"
  fail "Integritätscheck fehlgeschlagen (pg_restore --list) — Backup verworfen."
fi

# Rotation: alles älter als RETENTION_DAYS löschen.
find "$BACKUP_DIR" -name 'chromepeps-*.dump.enc' -mtime +"$RETENTION_DAYS" -delete

COUNT=$(ls -1 "$BACKUP_DIR"/chromepeps-*.dump.enc 2>/dev/null | wc -l)
report true "Backup ok: $(basename "$OUT"), ${SIZE} Bytes, ${COUNT} Stände vorgehalten."
