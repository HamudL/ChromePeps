"""
Route-level smoke tests for Phase 4.

Verifies that the new endpoints exist and behave correctly without auth:
  - /verify-email/success          200 HTML
  - /verify-email/error             200 HTML
  - /api/auth/verify-email          (no token) -> redirect to error page
  - /api/auth/resend-verification   (no session) -> 401
  - /api/reviews                    (no session) -> 401
  - /api/orders/<fake>/invoice      (no session) -> 401
"""
import sys
import paramiko

HOST = "217.160.68.64"
PORT = 2222
USER = "deploy"
PASSWORD = "ChromePeps"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CHECKS = [
    ("verify-success page",  "GET",  "https://chromepeps.com/verify-email/success",             "200"),
    ("verify-error page",    "GET",  "https://chromepeps.com/verify-email/error?reason=invalid", "200"),
    ("verify-email no token","GET",  "https://chromepeps.com/api/auth/verify-email",             "307"),
    ("resend-verify no auth","POST", "https://chromepeps.com/api/auth/resend-verification",      "401"),
    ("reviews POST no auth", "POST", "https://chromepeps.com/api/reviews",                       "401"),
    ("invoice no auth",      "GET",  "https://chromepeps.com/api/orders/bogus/invoice",          "401"),
]


def main() -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD,
                   look_for_keys=False, allow_agent=False, timeout=30)
    failed = 0
    try:
        for name, method, url, expected in CHECKS:
            if method == "POST":
                cmd = f"curl -sk -o /dev/null -w '%{{http_code}}' -X POST -H 'Content-Type: application/json' -d '{{}}' {url}"
            else:
                cmd = f"curl -sk -o /dev/null -w '%{{http_code}}' {url}"
            stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
            stdin.close()
            code = stdout.read().decode().strip()
            ok = code == expected
            mark = "OK " if ok else "FAIL"
            print(f"[{mark}] {name:28s} {method:4s} expected={expected} got={code}")
            if not ok:
                failed += 1
    finally:
        client.close()
    print(f"\n{failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
