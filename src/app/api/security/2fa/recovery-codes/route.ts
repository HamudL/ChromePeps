import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import {
  verifyTotpCode,
  generateRecoveryCodes,
} from "@/lib/two-factor";
import { writeAuditLog } from "@/lib/admin-audit";

/**
 * POST /api/security/2fa/recovery-codes
 *
 * Regeneriert die Recovery-Codes für den eingeloggten User. Verlangt
 * Passwort + 2FA-Code (TOTP, KEIN Recovery-Code) damit ein gestohlener
 * Cookie + bekanntes Passwort nicht ausreicht.
 *
 * Returnt 10 NEUE Plain-Codes — die alten werden ersetzt.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

const schema = z.object({
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/, "TOTP muss 6 Ziffern sein."),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Sehr eng: Jeder erfolgreiche Call invalidiert ALLE alten Recovery-
  // Codes — und die Passwort/TOTP-Prüfungen unten sollen nicht als
  // Brute-Force-Orakel missbraucht werden können.
  const limit = await rateLimit(`2fa-recovery:${session.user.id}`, {
    maxRequests: 3,
    windowMs: 3_600_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  // Kaputter Body → null → safeParse scheitert mit 400 (beide Felder Pflicht).
  const body = await parseJsonBody(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Ungültige Eingabe.",
      },
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
    },
  });
  if (!user?.passwordHash || !user.totpEnabledAt || !user.totpSecret) {
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

  const codeOk = verifyTotpCode(parsed.data.totpCode, user.totpSecret);
  if (!codeOk) {
    return NextResponse.json(
      { success: false, error: "TOTP-Code ist falsch." },
      { status: 400 },
    );
  }

  const { plain, hashed } = await generateRecoveryCodes();

  await db.user.update({
    where: { id: user.id },
    data: { totpRecoveryCodes: hashed },
  });

  await writeAuditLog(req, {
    action: "2fa.recovery_codes_regenerate",
    entity: "user",
    entityId: user.id,
    payload: { count: hashed.length },
  });

  return NextResponse.json({
    success: true,
    data: { recoveryCodes: plain },
  });
}
