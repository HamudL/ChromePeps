#!/usr/bin/env bash
# =============================================================================
# ChromePeps SSL-Renewal-Reparatur (idempotent, läuft bei jedem Deploy)
#
# Hintergrund: Das Erstzertifikat kam von `certbot certonly --standalone`
# (scripts/setup-server.sh). certbot merkt sich standalone dauerhaft als
# Renewal-Methode — und standalone braucht Port 80 exklusiv, der aber vom
# nginx-Container rund um die Uhr belegt ist (docker-compose.yml "80:80").
# Folge: Jede nächtliche Erneuerung schlug still fehl (--quiet), nach 90
# Tagen lief das Zertifikat ab → NET::ERR_CERT_DATE_INVALID für alle
# Besucher.
#
# Was dieses Skript tut:
#   1. Ersetzt den Renewal-Cron durch eine Variante mit pre/post-Hooks, die
#      nginx nur dann kurz stoppen, wenn certbot wirklich erneuert — die
#      Hooks laufen laut certbot-Doku nur bei tatsächlich fälliger
#      Erneuerung (alle ~60 Tage), nicht bei jedem nächtlichen Lauf.
#   2. Erneuert sofort, falls das Zertifikat fehlt, abgelaufen ist oder in
#      <30 Tagen abläuft. nginx wird dafür gestoppt und in JEDEM Fall
#      wieder gestartet — auch wenn certbot fehlschlägt (sonst wäre die
#      Seite ganz offline statt nur mit abgelaufenem Zertifikat).
#
# Erwartet einen User mit sudo-NOPASSWD und docker-Gruppenmitgliedschaft —
# wie der deploy-User aus scripts/setup-server.sh.
# =============================================================================
set -uo pipefail

DOMAIN="chromepeps.com"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
NGINX_CONTAINER="chromepeps-nginx"
CRON_LINE="0 3 * * * certbot renew --quiet --pre-hook 'docker stop ${NGINX_CONTAINER}' --post-hook 'docker start ${NGINX_CONTAINER}'"

log() { echo "[fix-ssl] $*"; }

# ---- 1. Renewal-Cron reparieren (root-Crontab) ----
OLD_CRON="$(sudo crontab -l 2>/dev/null || true)"
if printf '%s\n' "$OLD_CRON" | grep -qxF "$CRON_LINE" \
   && [ "$(printf '%s\n' "$OLD_CRON" | grep -c 'certbot renew')" -eq 1 ]; then
  log "Renewal-Cron ist bereits korrekt."
else
  { printf '%s\n' "$OLD_CRON" | grep -v 'certbot renew' | grep -v '^[[:space:]]*$'; printf '%s\n' "$CRON_LINE"; } | sudo crontab -
  log "Renewal-Cron ersetzt: nginx-Stop/Start-Hooks statt still fehlschlagendem standalone-renew."
fi

# ---- 2. Zertifikat bei Bedarf sofort erneuern ----
if sudo test -f "$CERT" && sudo openssl x509 -checkend $((30 * 24 * 3600)) -noout -in "$CERT" >/dev/null 2>&1; then
  log "Zertifikat noch >30 Tage gültig — keine Sofort-Erneuerung nötig."
  sudo openssl x509 -enddate -noout -in "$CERT" | sed 's/^/[fix-ssl]   /'
  exit 0
fi

log "Zertifikat fehlt, ist abgelaufen oder läuft in <30 Tagen ab — erneuere jetzt."
log "Stoppe nginx (standalone-certbot braucht Port 80)..."
docker stop "$NGINX_CONTAINER" >/dev/null 2>&1 || true

# --no-random-sleep-on-renew: certbot schläft non-interaktiv sonst bis zu
# 8 Minuten (Lastverteilung für Let's Encrypt) — das würde das
# command_timeout des CI-Deploy-Steps sprengen. Im nächtlichen Cron bleibt
# der Random-Sleep bewusst aktiv.
RC=0
sudo certbot renew --no-random-sleep-on-renew || RC=$?

log "Starte nginx wieder..."
docker start "$NGINX_CONTAINER" >/dev/null 2>&1 || true

if [ "$RC" -ne 0 ]; then
  log "FEHLER: certbot renew scheiterte (Exit $RC). nginx läuft wieder mit dem alten Zertifikat."
  log "Details: /var/log/letsencrypt/letsencrypt.log"
  exit "$RC"
fi

log "Erneuerung erfolgreich:"
sudo openssl x509 -enddate -noout -in "$CERT" | sed 's/^/[fix-ssl]   /'
