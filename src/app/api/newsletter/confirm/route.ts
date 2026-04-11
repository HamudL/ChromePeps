import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** GET /api/newsletter/confirm?token=... — confirms double-opt-in */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=invalid`);
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { token },
  });

  if (!subscriber) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=invalid`);
  }

  if (subscriber.confirmedAt) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=already`);
  }

  // Check token age (7 days)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - subscriber.createdAt.getTime() > sevenDays) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=expired`);
  }

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { confirmedAt: new Date() },
  });

  return NextResponse.redirect(`${BASE_URL}/?newsletter=confirmed`);
}
