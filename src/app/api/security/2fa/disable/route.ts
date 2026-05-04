import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  verifyTotpCode,
  consumeRecoveryCode,
} from "@/lib/two-factor";
import { writeAuditLog } from "@/lib/admin-audit";

/**
 * POST /api/security/2fa/disable
 *
 * Schaltet 2FA für den eingeloggten User ab. Verlangt Bestätigung
 * via Passwort + 2FA-Code (TOTP oder Recovery). Damit kann ein
 * gestohlenes Cookie alleine das 2FA NICHT abschalten.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

const schema = z.object({
  password: z.string().min(1),
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
      { success: false, error: "Passwort und 2FA-Code müssen ausgefüllt sein." },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      passwordHash: true,
      totpSecret: true,
      totpEnabledAt: true,
      totpRecoveryCodes: true,
    },
  });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { success: false, error: "User hat kein Passwort gesetzt." },
      { status: 400 },
    );
  }
  if (!user.totpEnabledAt || !user.totpSecret) {
    return NextResponse.json(
      { success: false, error: "2FA ist nicht aktiv." },
      { status: 400 },
    );
  }

  const passwordOk = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );
  if (!passwordOk) {
    return NextResponse.json(
      { success: false, error: "Passwort ist falsch." },
      { status: 400 },
    );
  }

  // Code prüfen — TOTP oder Recovery, beides erlaubt.
  let codeOk = verifyTotpCode(parsed.data.code, user.totpSecret);
  if (!codeOk) {
    const newCodes = await consumeRecoveryCode(
      parsed.data.code,
      user.totpRecoveryCodes,
    );
    codeOk = newCodes !== null;
    // Recovery-Code-Verbrauch wird hier NICHT persistiert weil wir
    // gleich alle Recovery-Codes löschen — kein Punkt.
  }
  if (!codeOk) {
    return NextResponse.json(
      { success: false, error: "2FA-Code ist falsch oder abgelaufen." },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      totpSecret: null,
      totpEnabledAt: null,
      totpRecoveryCodes: [],
    },
  });

  await writeAuditLog(req, {
    action: "2fa.disable",
    entity: "user",
    entityId: user.id,
  });

  return NextResponse.json({ success: true });
}
