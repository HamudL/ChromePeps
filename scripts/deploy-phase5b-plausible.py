"""
Phase 5B-Plausible VPS deploy.

Self-hosted Plausible Analytics on analytics.chromepeps.com.  No code build
needed (only nginx config + new containers).  Pipeline:
  1.  git pull
  2.  upsert Plausible env vars into /opt/chromepeps/.env
  3.  stage .env
  4.  pull Plausible + ClickHouse images
  5.  temporarily hide analytics.conf from nginx (cert doesn't exist yet)
  6.  start plausible + clickhouse + plausible_db containers
  7.  restart nginx (HTTP only — serves ACME challenge for analytics subdomain)
  8.  issue SSL cert via certbot webroot
  9.  restore analytics.conf
  10. reload nginx (now HTTPS works for analytics.chromepeps.com)
  11. smoke test
  12. cleanup

Prerequisites:
  - DNS A record: analytics.chromepeps.com -> 217.160.68.64  (already set)
  - certbot installed on VPS host
"""
import os
import sys
import time
import base64
import secrets
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

COMPOSE = "docker compose -f docker/docker-compose.yml"

# Generate a strong 64-byte secret for Plausible sessions.
# Only used on first deploy — the upsert is idempotent.
PLAUSIBLE_SECRET_KEY_BASE = base64.urlsafe_b64encode(secrets.token_bytes(64)).decode()

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((text + "\n").encode("utf-8", "replace"))


def run(client: paramiko.SSHClient, name: str, cmd: str, timeout: int) -> int:
    safe_print(f"\n=== [{name}] ===")
    display = cmd[:400] + ("..." if len(cmd) > 400 else "")
    safe_print(f"$ {display}")
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


# ---- Env upsert (idempotent) ----
ENV_UPSERT_CMD = (
    "sudo -S bash -c '"
    "ENV_FILE=/opt/chromepeps/.env; "
    'grep -q "^PLAUSIBLE_BASE_URL=" $ENV_FILE || echo "PLAUSIBLE_BASE_URL=https://analytics.chromepeps.com" >> $ENV_FILE; '
    f'grep -q "^PLAUSIBLE_SECRET_KEY_BASE=" $ENV_FILE || echo "PLAUSIBLE_SECRET_KEY_BASE={PLAUSIBLE_SECRET_KEY_BASE}" >> $ENV_FILE; '
    'grep -q "^PLAUSIBLE_DISABLE_REGISTRATION=" $ENV_FILE || echo "PLAUSIBLE_DISABLE_REGISTRATION=true" >> $ENV_FILE; '
    "echo UPSERT_OK; "
    'grep -c "^PLAUSIBLE" $ENV_FILE || true'
    "'"
)


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
        banner_timeout=60,
    )
    safe_print("Connected.")

    overall_start = time.time()
    try:
        # 1. git pull
        rc = run(client, "git-pull",
                 "cd /opt/chromepeps && git pull origin main 2>&1 | tail -n 20", 120)
        if rc != 0:
            return rc

        # 2. env upsert
        rc = run(client, "env-upsert", "echo ChromePeps | " + ENV_UPSERT_CMD, 30)
        if rc != 0:
            return rc

        # 3. stage env
        rc = run(client, "stage-env",
                 "echo ChromePeps | sudo -S cp /opt/chromepeps/.env /tmp/chromepeps.env "
                 "&& echo ChromePeps | sudo -S chmod 644 /tmp/chromepeps.env "
                 "&& ls -l /tmp/chromepeps.env", 30)
        if rc != 0:
            return rc

        # 4. Pull images for Plausible stack
        rc = run(client, "pull-images",
                 "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
                 f"{COMPOSE} pull plausible plausible_db plausible_events_db 2>&1 | tail -n 20",
                 600)
        if rc != 0:
            return rc

        # 5. Check if cert already exists
        _, cert_stdout, _ = client.exec_command(
            "test -f /etc/letsencrypt/live/analytics.chromepeps.com/fullchain.pem && echo EXISTS || echo MISSING",
            timeout=10,
        )
        cert_status = cert_stdout.read().decode().strip()
        safe_print(f"\n[cert-check] {cert_status}")

        need_cert = cert_status != "EXISTS"

        if need_cert:
            # 5a. Temporarily hide analytics.conf so nginx starts without the cert
            rc = run(client, "hide-analytics-conf",
                     "echo ChromePeps | sudo -S mv /opt/chromepeps/docker/nginx/conf.d/analytics.conf "
                     "/opt/chromepeps/docker/nginx/conf.d/analytics.conf.disabled "
                     "&& echo HIDDEN", 15)
            if rc != 0:
                return rc

        # 6. Start all Plausible services
        rc = run(client, "up-plausible",
                 "cd /opt/chromepeps && set -a && . /tmp/chromepeps.env && set +a && "
                 f"{COMPOSE} up -d plausible_db plausible_events_db plausible 2>&1 | tail -n 30",
                 300)
        if rc != 0:
            return rc

        # 7. Restart nginx (with HTTP block serving analytics.chromepeps.com for ACME)
        rc = run(client, "restart-nginx",
                 "docker restart chromepeps-nginx 2>&1", 60)
        if rc != 0:
            return rc

        # 8. Wait for containers to settle
        rc = run(client, "wait-settle",
                 "sleep 5 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep -E 'chromepeps|plausible|clickhouse'",
                 30)

        if need_cert:
            # 9. Issue cert via certbot webroot
            #    The certbot-webroot Docker volume name is "docker_certbot-webroot"
            #    (docker compose project name "docker" + volume name).
            #    We use certbot on the host with --webroot pointing to the volume mount.
            #
            #    First find the actual mount point of the volume.
            rc = run(client, "certbot-issue",
                     "echo ChromePeps | sudo -S certbot certonly "
                     "--webroot -w $(docker volume inspect docker_certbot-webroot --format '{{.Mountpoint}}') "
                     "-d analytics.chromepeps.com "
                     "--non-interactive --agree-tos "
                     "--email admin@chromepeps.com "
                     "--cert-name analytics.chromepeps.com "
                     "2>&1 | tail -n 20",
                     120)
            if rc != 0:
                # Fallback: try standalone if webroot fails
                safe_print("[certbot-issue] Webroot failed, trying standalone ...")
                run(client, "stop-nginx-for-cert", "docker stop chromepeps-nginx", 30)
                rc = run(client, "certbot-standalone",
                         "echo ChromePeps | sudo -S certbot certonly "
                         "--standalone -d analytics.chromepeps.com "
                         "--non-interactive --agree-tos "
                         "--email admin@chromepeps.com "
                         "--cert-name analytics.chromepeps.com "
                         "--http-01-port 80 "
                         "2>&1 | tail -n 20",
                         120)
                run(client, "start-nginx-after-cert", "docker start chromepeps-nginx", 30)
                if rc != 0:
                    safe_print("\n!!! Certbot failed. Cannot proceed with HTTPS.")
                    return rc

            # 10. Restore analytics.conf
            rc = run(client, "restore-analytics-conf",
                     "echo ChromePeps | sudo -S mv /opt/chromepeps/docker/nginx/conf.d/analytics.conf.disabled "
                     "/opt/chromepeps/docker/nginx/conf.d/analytics.conf "
                     "&& echo RESTORED", 15)
            if rc != 0:
                return rc

            # 11. Reload nginx with HTTPS config
            rc = run(client, "reload-nginx-https",
                     "docker restart chromepeps-nginx 2>&1", 60)
            if rc != 0:
                return rc

        # 12. Health check
        rc = run(client, "health",
                 "sleep 3 && docker ps --format '{{.Names}}\\t{{.Status}}' | grep -E 'chromepeps|plausible|clickhouse'",
                 30)

        # 13. Smoke tests
        rc = run(client, "smoke-main",
                 "curl -sk -o /dev/null -w 'chromepeps.com:%{http_code}\\n' https://chromepeps.com/", 30)
        rc = run(client, "smoke-analytics",
                 "curl -sk -o /dev/null -w 'analytics:%{http_code}\\n' https://analytics.chromepeps.com/", 30)
        rc = run(client, "smoke-script",
                 "curl -sk -o /dev/null -w 'script.js:%{http_code}\\n' https://analytics.chromepeps.com/js/script.js", 30)

        # 14. Cleanup
        run(client, "cleanup-env",
            "echo ChromePeps | sudo -S rm -f /tmp/chromepeps.env && echo ok", 15)

    finally:
        client.close()
        safe_print(f"\nTotal wall time: {time.time() - overall_start:.1f}s")

    safe_print("\n" + "=" * 60)
    safe_print("Plausible deploy complete!")
    safe_print("Next steps:")
    safe_print("  1. Open https://analytics.chromepeps.com/ in your browser")
    safe_print("  2. Create your admin account (first user = owner)")
    safe_print("  3. Add site: chromepeps.com")
    safe_print("  4. Verify tracking: visit chromepeps.com, then check the dashboard")
    safe_print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
