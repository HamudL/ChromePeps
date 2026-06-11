import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

const CACHE_KEY = "announcement";
const CACHE_TTL = 300; // 5 min

/**
 * GET /api/admin/announcement — returns the current announcement text.
 * Wird vom Admin-UI (/admin/announcement) gelesen; die öffentliche
 * AnnouncementBar nutzt die auth-freie Spiegel-Route /api/announcement.
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

/** PUT /api/admin/announcement — admin only, update announcement text */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Kaputtes JSON → 400. Wichtig: ohne den Guard würde ein defekter
  // Body als `text = ""` durchrutschen und das Announcement LÖSCHEN.
  let body: { text?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json(
      { success: false, error: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (text) {
    await db.siteSetting.upsert({
      where: { key: "announcement" },
      update: { value: text },
      create: { key: "announcement", value: text },
    });
  } else {
    await db.siteSetting.deleteMany({ where: { key: "announcement" } });
  }

  await cacheDel(CACHE_KEY);

  return NextResponse.json({ success: true, data: { text, enabled: !!text } });
}
