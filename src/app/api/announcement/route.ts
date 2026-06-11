import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";

const CACHE_KEY = "announcement";
const CACHE_TTL = 300; // 5 min

/**
 * GET /api/announcement — public, returns the current announcement text.
 *
 * Eigene öffentliche Route, damit die sitewide AnnouncementBar nicht
 * gegen /api/admin/* fetchen muss — Admin-Namespace bleibt damit
 * komplett auth-gated. Response-Shape und Redis-Cache (gleicher Key,
 * Invalidierung via PUT /api/admin/announcement) sind identisch zum
 * bisherigen Admin-GET.
 */
export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached !== null) {
    return NextResponse.json({ success: true, data: cached });
  }

  const setting = await db.siteSetting.findUnique({
    where: { key: "announcement" },
  });

  const data = { text: setting?.value ?? "", enabled: !!setting?.value };
  await cacheSet(CACHE_KEY, data, CACHE_TTL);

  return NextResponse.json({ success: true, data });
}
