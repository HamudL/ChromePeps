# Datenbank-Backups — Runbook

## Was läuft automatisch (root-Crontab, Block `chromepeps backup`)

| Wann | Was |
|---|---|
| täglich 03:30 | `pg-backup.sh` — `pg_dump -Fc` → AES-256-verschlüsselt nach `/opt/chromepeps-backups/` → Integritätscheck (`pg_restore --list`) → Rotation (14 Tage) |
| täglich 09:10 | `pg-backup.sh --watchdog` — alarmiert, wenn das neueste Backup älter als 26 h oder verdächtig klein ist |

Beide melden an `POST /api/cron/backup-report` (CRON_SECRET): **Fehler → Ops-Alert-Mail an alle Admins** (Resend), Erfolge nur ins Server-Log. Kein Alarm heißt also nicht "alles gut" — der Watchdog ist der Beweis, dass der Kanal lebt: er meldet auch, wenn das Backup einfach NIE lief.

## ⚠️ Der Verschlüsselungs-Key

`BACKUP_ENCRYPTION_KEY` in `/opt/chromepeps/.env`. **Ohne diesen Key sind alle Backups wertlos.** Der Key MUSS zusätzlich außerhalb des Servers gesichert sein (Passwort-Manager) — ein Backup, dessen Key zusammen mit dem Server stirbt, schützt nicht vor Serververlust.

## Restore (Ernstfall)

```bash
# 1. Neuestes Backup ansehen
ls -lt /opt/chromepeps-backups/

# 2. IMMER zuerst den Restore-Test gegen eine Temp-DB fahren:
sudo /opt/chromepeps/docker/backup/restore-test.sh

# 3. Echter Restore (überschreibt die Produktions-DB!):
#    App stoppen, damit nichts parallel schreibt:
cd /opt/chromepeps/docker && docker compose stop app

#    DB leeren + restoren (KEY aus .env):
KEY=$(sudo grep '^BACKUP_ENCRYPTION_KEY=' /opt/chromepeps/.env | cut -d= -f2- | tr -d '"')
openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$KEY" \
  -in /opt/chromepeps-backups/chromepeps-<TIMESTAMP>.dump.enc \
| docker compose exec -T postgres \
    pg_restore -U chromepeps -d chromepeps --clean --if-exists --no-owner

docker compose start app
```

Bei Totalverlust des Servers: neuen VPS per `scripts/setup-server.sh` aufsetzen, `.env` aus der Sicherung einspielen, leere DB per Deploy migrieren lassen, dann Restore wie oben (Backup-Datei kommt vom Offsite-Standort).

## Restore-Test

`restore-test.sh` restored das neueste Backup in eine temporäre DB `restore_test` im laufenden Container (Produktion bleibt unberührt), zählt users/orders/products und räumt auf. **Monatlich manuell ausführen** — ein ungetesteter Restore-Pfad rostet.

## Offsite

Stufe 1 (aktiv): täglicher Pull des neuesten Backups auf den Betreiber-Rechner (Claude-Scheduled-Task `pull-db-backup`). Schützt gegen Serververlust, hängt aber davon ab, dass der Rechner regelmäßig läuft.

Stufe 2 (empfohlen, offen): echtes Cloud-Offsite per rclone → Backblaze B2/S3 (~1 €/Monat). Braucht einen Account des Betreibers; danach in `pg-backup.sh` nach der Rotation ein `rclone copy "$OUT" remote:chromepeps-backups/` ergänzen und den Watchdog um einen Remote-Freshness-Check erweitern.
