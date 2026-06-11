import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail/client";
import NewsletterConfirmEmail from "@/emails/newsletter-confirm";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { newsletterUnsubscribeToken } from "@/lib/newsletter";
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
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`newsletter:${ip}`, {
    maxRequests: 5,
    windowMs: 300_000, // 5 per 5 min
  });
  if (!limit.success) return rateLimitExceeded(limit);

  // Kaputtes JSON → 400 via safeParse statt unbehandelter 500.
  const body = await req.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  // Check if already subscribed and confirmed. Abgemeldete Subscriber
  // (unsubscribedAt gesetzt) fallen bewusst NICHT unter den Early-Return —
  // die durchlaufen den Upsert unten und bekommen einen frischen
  // Double-Opt-in (Re-Subscribe).
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.confirmedAt && !existing.unsubscribedAt) {
    // Don't reveal subscription status, just return success
    return NextResponse.json({ success: true });
  }

  // Upsert (re-subscribing resets the token for a new confirmation email
  // and clears a previous unsubscribe)
  const subscriber = await db.newsletterSubscriber.upsert({
    where: { email },
    update: { token: crypto.randomUUID(), confirmedAt: null, unsubscribedAt: null },
    create: { email },
  });

  const confirmUrl = `${BASE_URL}/api/newsletter/confirm?token=${subscriber.token}`;
  // Abmelde-Link gehört in JEDE Newsletter-Mail — auch in die Opt-in-
  // Bestätigung (einzige Mail, die Subscriber aktuell erhalten). Ohne
  // diesen Link wäre die Unsubscribe-Route konstruktionsbedingt
  // unerreichbar: niemand käme je an einen gültigen Token.
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(
    email
  )}&token=${newsletterUnsubscribeToken(email)}`;

  const mailResult = await sendMail({
    to: email,
    subject: "Newsletter-Anmeldung bestätigen — ChromePeps",
    react: createElement(NewsletterConfirmEmail, { confirmUrl, unsubscribeUrl }),
    tag: "newsletter-confirm",
    // Wird im Subscribe-Request awaited (Route antwortet 502 bei
    // Fehlschlag) — kein Retry-Backoff im User-facing Pfad.
    retries: 0,
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
