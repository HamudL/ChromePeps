"""
Phase 5B-Sentry VPS deploy.

Adds Sentry error tracking + performance monitoring. No schema changes.
Pipeline:
  1. git pull origin main
  2. ensure .env has Sentry vars (idempotent append)
  3. stage .env for build-arg sourcing
  4. docker compose build --no-cache app (Sentry source maps upload here)
  5. docker compose up -d --force-recreate app
  6. nginx restart
  7. health check + smoke tests
  8. smoke /api/admin/sentry-test (expect 403 → proves route exists)
  9. cleanup staged env

Usage:
  SENTRY_AUTH_TOKEN=sntryu_xxx python scripts/deploy-phase5b-sentry.py

The auth token is read from the local environment so it never lives in the
repo. If it's already set on the VPS .env, you can leave it unset locally —
the env-upsert step will just keep the existing value.
"""
import os
import sys
import time
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

COMPOSE = "docker compose -f docker/docker-compose.yml"

# Sentry config — DSN is safe to commit (public by design, only allows sending
# events), ORG/PROJECT are slugs. The AUTH_TOKEN is a secret, so it's read
# from the local environment and never committed to the repo.
SENTRY_DSN = "https://d7903741403517da98e5d96e9b5acb72@o4511192553291776.ingest.de.sentry.io/4511192643534928"
SENTRY_ORG = "chromepeps"
SENTRY_PROJECT = "javascript-nextjs"
SENTRY_AUTH_TOKEN = os.environ.get("SENTRY_AUTH_TOKEN", "")

if not SENTRY_AUTH_TOKEN:
    print(
        "WARN: SENTRY_AUTH_TOKEN not set in local env — skipping token upsert.\n"
        "      Source map uploads will be disabled unless the token is already\n"
        "      present in /opt/chromepeps/.env on the VPS."
    )

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Env upsert: append missing Sentry vars to /opt/chromepeps/.env if not already
# present. Uses grep -q to check idempotently so reruns don't duplicate lines.
# The auth token line is only emitted if a local SENTRY_AUTH_TOKEN is set.
_token_upsert = (
    f"grep -q \"^SENTRY_AUTH_TOKEN=\" $ENV_FILE || echo \"SENTRY_AUTH_TOKEN={SENTRY_AUTH_TOKEN}\" >> $ENV_FILE; "
    if SENTRY_AUTH_TOKEN
    else ""
)

ENV_UPSERT_CMD = (
    "sudo -S bash -c '"
    "ENV_FILE=/opt/chromepeps/.env; "
    f"grep -q \"^NEXT_PUBLIC_SENTRY_DSN=\" $ENV_FILE || echo \"NEXT_PUBLIC_SENTRY_DSN={SENTRY_DSN}\" >> $ENV_FILE; "
    f"grep -q \"^SENTRY_DSN=\" $ENV_FILE || echo \"SENTRY_DSN={SENTRY_DSN}\" >> $ENV_FILE; "
    f"grep -q \"^SENTRY_ORG=\" $ENV_FILE || echo \"SENTRY_ORG={SENTRY_ORG}\" >> $ENV_FILE; "
    f"grep -q \"^SENTRY_PROJECT=\" $ENV_FILE || echo \"SENTRY_PROJECT={SENTRY_PROJECT}\" >> $ENV_FILE; "
    f"{_token_upsert}"
    "echo UPSERT_OK; "
    "grep -c \"^SENTRY\" $ENV_FILE || true"
    "'"
)

STEPS = [
    (
        "git-pull",
        "cd /opt/chromepeps && git pull origin main 2>&1 | tail -n 20",
        120,
    ),
    (
        "env-upsert",
        "echo ChromePeps | " + ENV_UPSERT_CMD,
        30,
    ),
    (
        "stage-env",
        "echo ChromePeps | sudo -S cp /opt/chromepeps/.env /tmp/chromepeps.env "
        "&& echo ChromePeps | sudo -S chmod 644 /tmp/chromepeps.env "
        "&& ls -l /tmp/chromepeps.env",
        30,
    ),
    (
        "build-app",
        "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
        f"CI=1 {COMPOSE} build --no-cache app 2>&1 | tail -n 25",
        1800,
    ),
    (
        "up-app",
        "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
        f"{COMPOSE} up -d --force-recreate app 2>&1 | tail -n 30",
        300,
    ),
    (
        "wait-app",
        "sleep 6 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep chromepeps",
        30,
    ),
    (
        "restart-nginx",
        "docker restart chromepeps-nginx",
        60,
    ),
    (
        "health",
        "sleep 3 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep chromepeps",
        30,
    ),
    (
        "smoke-home",
        "curl -sk -o /dev/null -w 'home:%{http_code}\\n' https://chromepeps.com/",
        30,
    ),
    (
        "smoke-products",
        "curl -sk -o /dev/null -w 'products:%{http_code}\\n' https://chromepeps.com/products",
        30,
    ),
    (
        "smoke-sentry-test",
        "curl -sk -o /dev/null -w 'sentry-test:%{http_code}\\n' https://chromepeps.com/api/admin/sentry-test",
        30,
    ),
    (
        "smoke-monitoring-tunnel",
        "curl -sk -o /dev/null -w 'monitoring:%{http_code}\\n' https://chromepeps.com/monitoring",
        30,
    ),
    (
        "cleanup-env",
        "echo ChromePeps | sudo -S rm -f /tmp/chromepeps.env && echo ok",
        15,
    ),
]


def safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((text + "\n").encode("utf-8", "replace"))


def run(client: paramiko.SSHClient, name: str, cmd: str, timeout: int) -> int:
    safe_print(f"\n=== [{name}] ===")
    # Redact secrets from echo'd command.
    display_cmd = cmd.replace(SENTRY_AUTH_TOKEN, "sntryu_REDACTED")
    safe_print(f"$ {display_cmd[:300]}{'...' if len(display_cmd) > 300 else ''}")
    sys.stdout.flush()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    stdin.close()
    out_data = stdout.read().decode("utf-8", "replace")
    err_data = stderr.read().decode("utf-8", "replace")
    rc = stdout.channel.recv_exit_status()
    if out_data:
        safe_print(out_data.rstrip())
    if err_data:
        safe_print("STDERR: " + err_data.rstrip())
    safe_print(f"[{name}] exit={rc}")
    sys.stdout.flush()
    return rc


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    safe_print(f"Connecting to {USER}@{HOST}:{PORT} ...")
    client.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )
    safe_print("Connected.")

    overall_start = time.time()
    try:
        for name, cmd, timeout in STEPS:
            step_start = time.time()
            rc = run(client, name, cmd, timeout)
            elapsed = time.time() - step_start
            safe_print(f"[{name}] took {elapsed:.1f}s")
            if rc != 0:
                safe_print(f"\n!!! Step '{name}' failed with exit {rc}. Aborting.")
                return rc
    finally:
        client.close()
        safe_print(f"\nTotal wall time: {time.time() - overall_start:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
