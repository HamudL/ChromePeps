import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { forgotPasswordSchema } from "@/validators/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { generatePasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail/send";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/constants";

// Fester, gültiger bcrypt-Hash (cost 12) ausschließlich für den
// Constant-Time-Dummy-Vergleich bei NICHT existierenden Konten. Muss ein
// echter bcrypt-Hash sein, sonst kehrt bcrypt.compare sofort zurück und die
// Zeitangleichung entfällt. Entspricht KEINEM realen Passwort.
const DUMMY_PASSWORD_HASH =
  "$2b$12$96jNl9gRahjQn8.xENkm1.nT26kh1bKwSvgTj1fa4OrLRuJ.gUSz6";

/**
 * POST /api/auth/forgot-password
 *
 * Always returns `{ success: true }` regardless of whether the email exists,
 * to avoid leaking which addresses are registered. Rate-limited per email AND
 * per IP to prevent abuse.
 */
export async function POST(req: NextRequest) {
  // Kaputter Body → null → safeParse scheitert mit 400 (email ist Pflichtfeld).
  const body = await parseJsonBody(req);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid email address" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Rate limit by email — 3 resets per 15 minutes
  const emailLimit = await rateLimit(`forgot:email:${email}`, {
    maxRequests: 3,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.success) return rateLimitExceeded(emailLimit);

  // Rate limit by IP — 10 requests per 15 minutes
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`forgot:ip:${ip}`, {
    maxRequests: 10,
    windowMs: 15 * 60_000,
  });
  if (!ipLimit.success) return rateLimitExceeded(ipLimit);

  const user = await db.user.findUnique({ where: { email } });

  // Konstante-Zeit-Semantik gegen User-Enumeration: Der existierende Pfad
  // leistet DB-Writes + (awaited) Mailversand. Damit die Antwortzeit keinen
  // Rückschluss auf die Existenz eines Kontos erlaubt, verrichtet der
  // Nicht-existiert-Zweig unten vergleichbare bcrypt-Arbeit. Die einheitliche
  // Erfolgsantwort bleibt in beiden Fällen identisch.
  if (user) {
    try {
      const { rawToken, tokenHash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

      // Invalidate any existing unused tokens for this user, then create
      // a fresh one. We don't delete — we set usedAt so an audit trail
      // remains for abuse investigation.
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await db.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: Math.floor(PASSWORD_RESET_TOKEN_TTL_MS / 60_000),
      });
    } catch (err) {
      // Log but don't expose to client — we never reveal whether the email
      // exists or whether the mail send succeeded.
      console.error("[forgot-password] internal error:", err);
    }
  } else {
    // Kein Konto zu dieser Adresse: bewusst vergleichbare bcrypt-Arbeit
    // leisten (Dummy-Vergleich gegen einen konstanten Hash), damit die
    // Antwortzeit sich nicht messbar vom Versandpfad unterscheidet und so
    // keine Konto-Enumeration ermöglicht. Das Ergebnis ist stets false und
    // wird verworfen.
    try {
      await bcrypt.compare(email, DUMMY_PASSWORD_HASH);
    } catch {
      /* Ergebnis irrelevant — nur die investierte Zeit zählt. */
    }
  }

  return NextResponse.json({
    success: true,
    message:
      "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zur\u00fccksetzen verschickt.",
  });
}
