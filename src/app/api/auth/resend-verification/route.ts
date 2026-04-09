import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { generateEmailVerifyToken } from "@/lib/email-verify";
import { sendEmailVerifyEmail } from "@/lib/mail/send";
import { EMAIL_VERIFY_TOKEN_TTL_MS } from "@/lib/constants";

/**
 * POST /api/auth/resend-verification
 *
 * Lets a logged-in user request a fresh verification mail. Rate-limited to
 * prevent abuse. If the user is already verified, we return success without
 * doing anything.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`resend-verify:${session.user.id}`, {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json({
      success: true,
      data: { alreadyVerified: true },
    });
  }

  // Invalidate any existing verify tokens for this email first.
  await db.verificationToken.deleteMany({
    where: { identifier: user.email },
  });

  const { rawToken, tokenHash } = generateEmailVerifyToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS);

  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token: tokenHash,
      expires: expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`;

  await sendEmailVerifyEmail({
    to: user.email,
    name: user.name,
    verifyUrl,
    expiresInHours: 24,
  });

  return NextResponse.json({ success: true });
}
