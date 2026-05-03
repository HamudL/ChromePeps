import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuthorSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

// GET /api/admin/wissen/authors — Liste aller Authors mit Post-Count
export async function GET() {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const authors = await db.author.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json({ success: true, data: authors });
}

// POST /api/admin/wissen/authors
export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createAuthorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  // Slug-Kollision prüfen — sauberer 409 statt Prisma-P2002.
  const existing = await db.author.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: `Slug "${parsed.data.slug}" ist bereits vergeben`,
      },
      { status: 409 },
    );
  }

  const author = await db.author.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      title: parsed.data.title || null,
      bio: parsed.data.bio || null,
      avatar: parsed.data.avatar || null,
      orcid: parsed.data.orcid || null,
    },
  });
  return NextResponse.json({ success: true, data: author }, { status: 201 });
}
