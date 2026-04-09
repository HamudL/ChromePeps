import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sentry-test
 *
 * Intentionally throws a server error so we can verify end-to-end that:
 *   1. the Sentry SDK booted via instrumentation.ts
 *   2. unhandled route-handler errors are captured via onRequestError
 *   3. the event actually lands in the Sentry dashboard
 *
 * Admin-only so random visitors can't spam our error budget. Safe to leave
 * in production — it doesn't touch the DB or any side effects.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  throw new Error(
    "[sentry-test] Intentional server error — if you see this in Sentry, the integration works."
  );
}
