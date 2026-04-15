import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail/client";
import NewsletterConfirmEmail from "@/emails/newsletter-confirm";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { createElement } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Use Zod for email validation rather than an inline regex — matches the
// rest of the codebase and catches more edge cases (RFC-5321 length limits,
// tripled dots, etc.) than the previous `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/** POST /api/newsletter — subscribe (sends double-opt-in email) */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const limit = await rateLimit(`newsletter:${ip}`, {
    maxRequests: 5,
    windowMs: 300_000, // 5 per 5 min
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  // Check if already subscribed and confirmed
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.confirmedAt) {
    // Don't reveal subscription status, just return success
    return NextResponse.json({ success: true });
  }

  // Upsert (re-subscribing resets the token for a new confirmation email)
  const subscriber = await db.newsletterSubscriber.upsert({
    where: { email },
    update: { token: crypto.randomUUID(), confirmedAt: null },
    create: { email },
  });

  const confirmUrl = `${BASE_URL}/api/newsletter/confirm?token=${subscriber.token}`;

  const mailResult = await sendMail({
    to: email,
    subject: "Newsletter-Anmeldung bestätigen — ChromePeps",
    react: createElement(NewsletterConfirmEmail, { confirmUrl }),
    tag: "newsletter-confirm",
  });

  if (!mailResult.success) {
    console.error("[newsletter] Confirmation email failed:", mailResult.error);
    return NextResponse.json(
      {
        success: false,
        error: "Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
