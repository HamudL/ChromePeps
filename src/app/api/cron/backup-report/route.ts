import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCronAuth } from "@/lib/cron-auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { sendOpsAlertEmail } from "@/lib/mail/send";

/**
 * POST /api/cron/backup-report — Meldekanal des VPS-Backup-Skripts.
 *
 * docker/backup/pg-backup.sh meldet nach jedem Lauf (und der tägliche
 * Watchdog bei veralteten Backups) hierher. Erfolge werden nur geloggt
 * (Anti-Spam — niemand liest tägliche "alles ok"-Mails, bis er sie
 * ignoriert); FEHLER gehen als Ops-Alert-Mail an alle Admins über die
 * vorhandene Resend-Infrastruktur — der Host selbst hat keinerlei
 * Mail-Tooling.
 *
 * Authentifizierung via `Authorization: Bearer ${CRON_SECRET}` — wie
 * die übrigen Cron-Endpoints. Antwortet bewusst auch im Fehlerfall des
 * Mail-Versands mit 200: Das Skript soll nicht retrien (der Watchdog
 * meldet am Folgetag erneut), und der Fehler steht im Response-Body.
 *
 * Body: { ok: boolean, message?: string, detail?: string }
 */
export async function POST(req: NextRequest) {
  const authResult = checkCronAuth(req);
  if (authResult) return authResult;

  const body = (await parseJsonBody(req)) as {
    ok?: unknown;
    message?: unknown;
    detail?: unknown;
  } | null;

  if (body === null || typeof body.ok !== "boolean") {
    return NextResponse.json(
      { success: false, error: "Body muss { ok: boolean, ... } sein." },
      { status: 400 }
    );
  }

  const message =
    typeof body.message === "string" && body.message
      ? body.message.slice(0, 500)
      : null;
  const detail =
    typeof body.detail === "string" && body.detail
      ? body.detail.slice(0, 2000)
      : null;

  if (body.ok) {
    // Erfolg: nur Server-Log als Paper-Trail (greppbar via docker logs).
    console.info(`[backup-report] OK${message ? `: ${message}` : ""}`);
    return NextResponse.json({ success: true, data: { alerted: false } });
  }

  console.error(
    `[backup-report] FEHLER: ${message ?? "(keine Meldung)"}${detail ? ` — ${detail}` : ""}`
  );

  const admins = await db.user.findMany({
    where: { role: "ADMIN", emailVerified: { not: null } },
    select: { email: true },
  });
  const recipients = admins.map((a) => a.email).filter(Boolean);

  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        alerted: false,
        warning:
          "Backup-Fehler geloggt, aber kein ADMIN-User mit verifizierter Email vorhanden.",
      },
    });
  }

  const [primaryRecipient, ...bccRecipients] = recipients;
  const lines = [
    message ?? "Das Backup-Skript hat einen Fehler gemeldet.",
    ...(detail ? [detail] : []),
    `Gemeldet: ${new Date().toISOString()}`,
    "Runbook: docker/backup/README.md im Repo (Prüfen → Backup manuell starten → Restore-Test).",
  ];
  const result = await sendOpsAlertEmail({
    to: primaryRecipient,
    bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
    title: "Datenbank-Backup fehlgeschlagen",
    lines,
  });

  return NextResponse.json({
    success: true,
    data: {
      alerted: result.success,
      recipients: recipients.length,
      ...(result.success ? {} : { mailError: result.error }),
    },
  });
}
