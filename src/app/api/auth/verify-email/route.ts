import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashEmailVerifyToken } from "@/lib/email-verify";

/**
 * GET /api/auth/verify-email?token=...
 *
 * Click target for the verification email. Verifies the token, marks the
 * user's email as verified, and redirects to /verify-email/success (or
 * /verify-email/error on failure). We redirect rather than returning JSON so
 * users clicking the link in their mail client land on a proper page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  if (!token || typeof token !== "string") {
    return NextResponse.redirect(
      new URL("/verify-email/error?reason=missing", baseUrl)
    );
  }

  const tokenHash = hashEmailVerifyToken(token);

  // Look up the verification token by its hash (token field stores the hash).
  const record = await db.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record) {
    return NextResponse.redirect(
      new URL("/verify-email/error?reason=invalid", baseUrl)
    );
  }

  if (record.expires < new Date()) {
    // Clean up expired token so it can be re-requested.
    await db.verificationToken
      .delete({
        where: {
          identifier_token: {
            identifier: record.identifier,
            token: record.token,
          },
        },
      })
      .catch(() => {});
    return NextResponse.redirect(
      new URL("/verify-email/error?reason=expired", baseUrl)
    );
  }

  // Find user by email (identifier) and mark verified.
  const user = await db.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/verify-email/error?reason=no_user", baseUrl)
    );
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    // Delete this token (one-shot).
    db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: record.identifier,
          token: record.token,
        },
      },
    }),
    // Invalidate any other outstanding verify tokens for the same email.
    db.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  return NextResponse.redirect(new URL("/verify-email/success", baseUrl));
}
