import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateTotpSecret,
  buildOtpauthUrl,
} from "@/lib/two-factor";

/**
 * POST /api/security/2fa/setup
 *
 * Erzeugt ein neues TOTP-Secret für den eingeloggten User UND
 * speichert es im User-Datensatz, ABER ohne `totpEnabledAt` zu setzen.
 * Das markiert den Status "Setup läuft, aber noch nicht bestätigt".
 *
 * Returnt:
 *  - `secret`: Base32 (für manuelles Abtippen in Authenticator-App)
 *  - `qrDataUrl`: data:image/png;base64,... (QR-Code als img-src)
 *
 * Wenn der User bereits 2FA aktiv hat (`totpEnabledAt` gesetzt):
 * 400, weil sonst das Live-2FA überschrieben würde. Disable + Setup
 * neu ist der saubere Weg.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, totpEnabledAt: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );
  }
  if (user.totpEnabledAt) {
    return NextResponse.json(
      {
        success: false,
        error:
          "2FA ist bereits aktiv. Bitte erst deaktivieren bevor du neu einrichtest.",
      },
      { status: 400 },
    );
  }

  const secret = generateTotpSecret();
  const otpauth = buildOtpauthUrl(secret, user.email);
  // QRCode.toDataURL liefert einen data:image/png;base64-String, den
  // wir direkt in <img src=...> stecken können — keine dauerhafte
  // Datei nötig.
  const qrDataUrl = await QRCode.toDataURL(otpauth, {
    width: 240,
    margin: 1,
  });

  // Secret schon jetzt persistieren (ohne enabledAt). Falls der User
  // den Browser zumacht bevor er bestätigt, ist nichts kaputt — der
  // nächste Setup-Versuch generiert eh ein neues Secret und
  // überschreibt diesen "halben" Zustand.
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabledAt: null },
  });

  return NextResponse.json({
    success: true,
    data: { secret, qrDataUrl },
  });
}
