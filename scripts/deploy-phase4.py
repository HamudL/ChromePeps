"""
Phase 4 VPS deploy pipeline.

Runs the canonical ChromePeps deploy sequence:
  1. git pull origin main
  2. stage .env into /tmp so the compose build can source it
  3. docker compose build --no-cache app  (sourcing .env into the shell)
  4. docker compose up -d --force-recreate app
  5. prisma db push   (creates the new `invoices` table)
  6. restart nginx
  7. container health check
"""
import sys
import time
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

COMPOSE = "docker compose -f docker/docker-compose.yml"

STEPS = [
    (
        "git-pull",
        "cd /opt/chromepeps && git pull origin main",
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
        f"{COMPOSE} build --no-cache app 2>&1 | tail -n 50",
        1800,
    ),
    (
        "up-app",
        "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
        f"{COMPOSE} up -d --force-recreate app",
        300,
    ),
    (
        "wait-app",
        "sleep 5 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep chromepeps",
        30,
    ),
    (
        "prisma-db-push",
        "docker exec chromepeps-app npx prisma db push 2>&1 | tail -n 40",
        300,
    ),
    (
        "restart-nginx",
        "docker restart chromepeps-nginx",
        60,
    ),
    (
        "health",
        "docker ps --format '{{.Names}}\\t{{.Status}}' | grep chromepeps",
        15,
    ),
    (
        "cleanup-env",
        "echo ChromePeps | sudo -S rm -f /tmp/chromepeps.env && echo ok",
        15,
    ),
]


def run(client: paramiko.SSHClient, name: str, cmd: str, timeout: int) -> int:
    print(f"\n=== [{name}] ===")
    print(f"$ {cmd[:200]}{'...' if len(cmd) > 200 else ''}")
    sys.stdout.flush()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    stdin.close()
    # Stream output as it arrives.
    out_data = stdout.read().decode("utf-8", "replace")
    err_data = stderr.read().decode("utf-8", "replace")
    rc = stdout.channel.recv_exit_status()
    if out_data:
        print(out_data.rstrip())
    if err_data:
        print("STDERR:", err_data.rstrip())
    print(f"[{name}] exit={rc}")
    sys.stdout.flush()
    return rc


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}:{PORT} ...")
    client.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )
    print("Connected.")

    overall_start = time.time()
    try:
        for name, cmd, timeout in STEPS:
            step_start = time.time()
            rc = run(client, name, cmd, timeout)
            step_elapsed = time.time() - step_start
            print(f"[{name}] took {step_elapsed:.1f}s")
            if rc != 0:
                print(f"\n!!! Step '{name}' failed with exit {rc}. Aborting.")
                return rc
    finally:
        client.close()
        total = time.time() - overall_start
        print(f"\nTotal wall time: {total:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
