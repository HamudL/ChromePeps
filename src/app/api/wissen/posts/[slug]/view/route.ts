import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

/**
 * POST /api/wissen/posts/[slug]/view
 *
 * Inkrementiert BlogPost.viewCount für den gegebenen Slug. Anti-Bot
 * via Redis-Lock: 1 View pro IP pro Slug pro Tag (24h Expiry).
 *
 * Wenn Redis nicht erreichbar: fail-open, Inkrement läuft. Dadurch
 * könnten Bots zwar zählen, aber das System verliert keine echten
 * Views bei Redis-Outage.
 *
 * Wenn der Slug nicht existiert: 404, kein Inkrement (verhindert
 * dass Random-Strings die DB belasten).
 *
 * AUDIT_REPORT_v3 §3.4.
 */

interface Ctx {
  params: Promise<{ slug: string }>;
}

const RATE_LIMIT_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  // Anti-bot: Pro IP pro Slug pro Tag nur einmal zählen.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const lockKey = `wissen:view:${slug}:${ip}`;

  let firstView = true;
  try {
    const result = await redis.set(
      lockKey,
      "1",
      "EX",
      RATE_LIMIT_TTL_SECONDS,
      "NX",
    );
    firstView = result === "OK";
  } catch {
    // Redis Outage → fail-open; Inkrement läuft. Bot-Schutz nur best-effort.
    firstView = true;
  }

  if (!firstView) {
    return NextResponse.json({ success: true, data: { counted: false } });
  }

  // Inkrement nur für published Posts. Drafts sollen kein Tracking
  // poisoning bewirken.
  const updated = await db.blogPost.updateMany({
    where: { slug, publishedAt: { not: null } },
    data: { viewCount: { increment: 1 } },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { success: false, error: "Post nicht gefunden oder nicht publiziert" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: { counted: true } });
}
