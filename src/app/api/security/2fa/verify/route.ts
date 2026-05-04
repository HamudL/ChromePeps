import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  verifyTotpCode,
  generateRecoveryCodes,
} from "@/lib/two-factor";
import { writeAuditLog } from "@/lib/admin-audit";

/**
 * POST /api/security/2fa/verify
 *
 * Bestätigt die Setup-Phase: User scannt den QR mit seiner App,
 * tippt den ersten generierten Code ein, der hier verifiziert wird.
 * Bei Erfolg:
 *  - `totpEnabledAt = now()`
 *  - 10 Recovery-Codes generieren, plain returnen, hashes speichern
 *
 * Returnt die Plain-Recovery-Codes EINMALIG. Frontend muss den User
 * davor warnen: das ist der einzige Moment wo er die Codes sieht.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

const schema = z.object({
  code: z.string().min(6).max(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Code fehlt oder ist ungültig." },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, totpSecret: true, totpEnabledAt: true },
  });
  if (!user?.totpSecret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Kein 2FA-Setup gestartet. Bitte erst /api/security/2fa/setup aufrufen.",
      },
      { status: 400 },
    );
  }
  if (user.totpEnabledAt) {
    return NextResponse.json(
      { success: false, error: "2FA ist bereits aktiv." },
      { status: 400 },
    );
  }

  const ok = verifyTotpCode(parsed.data.code, user.totpSecret);
  if (!ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Code stimmt nicht. Bitte aktuelle 6 Ziffern aus deiner App.",
      },
      { status: 400 },
    );
  }

  const { plain, hashed } = await generateRecoveryCodes();

  await db.user.update({
    where: { id: user.id },
    data: {
      totpEnabledAt: new Date(),
      totpRecoveryCodes: hashed,
    },
  });

  // Audit-Log: 2FA-Aktivierung ist sicherheitsrelevant.
  await writeAuditLog(req, {
    action: "2fa.enable",
    entity: "user",
    entityId: user.id,
    payload: { recoveryCodesIssued: hashed.length },
  });

  return NextResponse.json({
    success: true,
    data: { recoveryCodes: plain },
  });
}
