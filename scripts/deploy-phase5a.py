"""
Phase 5A VPS deploy.

No schema changes this round (no prisma db push needed). Pipeline:
  1. git pull origin main
  2. stage .env for build-arg sourcing
  3. docker compose build --no-cache app
  4. docker compose up -d --force-recreate app
  5. nginx restart
  6. health check + home-page smoke curl
"""
import sys
import time
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

COMPOSE = "docker compose -f docker/docker-compose.yml"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

STEPS = [
    (
        "git-pull",
        "cd /opt/chromepeps && git pull origin main 2>&1 | tail -n 20",
        120,
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
        f"{COMPOSE} build --no-cache app 2>&1 | tail -n 15",
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
        "smoke-csv-auth",
        "curl -sk -o /dev/null -w 'csv-export:%{http_code}\\n' https://chromepeps.com/api/admin/orders/export",
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
    safe_print(f"$ {cmd[:240]}{'...' if len(cmd) > 240 else ''}")
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
