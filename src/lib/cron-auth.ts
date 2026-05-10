import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Bearer-Auth-Check für Cron-Endpoints. Returnt eine NextResponse wenn
 * nicht autorisiert, `null` bei Erfolg.
 *
 * Wenn CRON_SECRET nicht gesetzt ist, returnt 503 — verhindert dass
 * ein Endpoint bei fehlerhafter Konfiguration aus Versehen offen ist.
 */
export function checkCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "CRON_SECRET nicht konfiguriert — Endpoint deaktiviert für Sicherheit.",
      },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}
