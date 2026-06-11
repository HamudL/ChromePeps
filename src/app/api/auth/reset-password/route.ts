import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/validators/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { hashResetToken } from "@/lib/password-reset";
import { purgeSessionUserCache } from "@/lib/auth";

/**
 * POST /api/auth/reset-password
 *
 * Verifies a reset token, sets a new password, and marks the token as used.
 * Tokens are single-use — once marked usedAt, they cannot be replayed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Rate limit by IP — 10 attempts per 15 minutes
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`reset:ip:${ip}`, {
    maxRequests: 10,
    windowMs: 15 * 60_000,
  });
  if (!ipLimit.success) return rateLimitExceeded(ipLimit);

  const tokenHash = hashResetToken(parsed.data.token);

  const tokenRecord = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Der Link ist ung\u00fcltig oder abgelaufen. Bitte fordern Sie einen neuen Link an.",
      },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: tokenRecord.userId },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Benutzer nicht gefunden." },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(parsed.data.password, 12);

  // Update password and mark token used in a single transaction so a
  // race can't let the token be replayed. sessionVersion-Increment
  // invalidiert alle bestehenden JWT-Sessions: Genau das ist der
  // Sinn eines Passwort-Resets nach Account-Kompromittierung \u2014 ein
  // Angreifer mit gestohlenem Session-Cookie behielt sonst Zugriff.
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
    }),
    db.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all other outstanding tokens for this user too.
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, id: { not: tokenRecord.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  // Session-Cache r\u00e4umen, damit die Invalidierung sofort greift (nicht
  // erst nach Ablauf der 60s-Cache-TTL). Zentraler Helper \u2014 Key-Format
  // lebt ausschlie\u00dflich in src/lib/auth.ts.
  await purgeSessionUserCache(user.id);

  return NextResponse.json({
    success: true,
    message: "Ihr Passwort wurde erfolgreich ge\u00e4ndert.",
  });
}
