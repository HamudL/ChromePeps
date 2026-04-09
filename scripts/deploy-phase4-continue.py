"""
Continuation of Phase 4 deploy after the build already ran.
Skips git-pull / stage-env / build-app and picks up from up-app.
"""
import sys
import time
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

COMPOSE = "docker compose -f docker/docker-compose.yml"

# Make stdout tolerant of Docker buildkit unicode chars on Windows cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

STEPS = [
    (
        "verify-image",
        "docker images chromepeps-app --format '{{.Repository}}:{{.Tag}}\\t{{.CreatedSince}}\\t{{.Size}}' | head -n 3 "
        "&& docker images | grep -E 'docker-app|chromepeps-app' | head -n 3",
        30,
    ),
    (
        "up-app",
        "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
        f"{COMPOSE} up -d --force-recreate app 2>&1 | tail -n 40",
        300,
    ),
    (
        "wait-app",
        "sleep 6 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep chromepeps",
        30,
    ),
    (
        "prisma-db-push",
        "docker exec chromepeps-app npx prisma db push 2>&1 | tail -n 60",
        300,
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
        "cleanup-env",
        "echo ChromePeps | sudo -S rm -f /tmp/chromepeps.env && echo ok",
        15,
    ),
]


def safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        # Last-resort fallback if reconfigure didn't apply.
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
            if rc != 0 and name not in ("verify-image",):
                safe_print(f"\n!!! Step '{name}' failed with exit {rc}. Aborting.")
                return rc
    finally:
        client.close()
        safe_print(f"\nTotal wall time: {time.time() - overall_start:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
