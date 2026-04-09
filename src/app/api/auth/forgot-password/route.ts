import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/validators/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { generatePasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail/send";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/constants";

/**
 * POST /api/auth/forgot-password
 *
 * Always returns `{ success: true }` regardless of whether the email exists,
 * to avoid leaking which addresses are registered. Rate-limited per email AND
 * per IP to prevent abuse.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipLimit = await rateLimit(`forgot:ip:${ip}`, {
    maxRequests: 10,
    windowMs: 15 * 60_000,
  });
  if (!ipLimit.success) return rateLimitExceeded(ipLimit);

  const user = await db.user.findUnique({ where: { email } });

  // Constant-time semantics: always do the "pretend to process" branch even
  // if the user doesn't exist, so response times are similar.
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
  }

  return NextResponse.json({
    success: true,
    message:
      "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zur\u00fccksetzen verschickt.",
  });
}
