import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/newsletter/confirm?token=... — confirms double-opt-in */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/?newsletter=invalid", req.url));
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { token },
  });

  if (!subscriber) {
    return NextResponse.redirect(new URL("/?newsletter=invalid", req.url));
  }

  if (subscriber.confirmedAt) {
    return NextResponse.redirect(new URL("/?newsletter=already", req.url));
  }

  // Check token age (7 days)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - subscriber.createdAt.getTime() > sevenDays) {
    return NextResponse.redirect(new URL("/?newsletter=expired", req.url));
  }

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { confirmedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/?newsletter=confirmed", req.url));
}
