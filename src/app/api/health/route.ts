import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

/**
 * GET /api/health
 *
 * Lightweight health check for UptimeRobot, Docker HEALTHCHECK, and load
 * balancers. Verifies database and Redis connectivity.
 *
 * Returns 200 when everything is healthy, 503 when degraded.
 * Always sets Cache-Control: no-store so monitoring sees fresh results.
 */
export async function GET() {
  const checks = { db: false, redis: false };

  // ---- Database ----
  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {
    // DB unreachable — leave false
  }

  // ---- Redis ----
  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG";
  } catch {
    // Redis unreachable — leave false
  }

  const allHealthy = checks.db && checks.redis;

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      ...checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
