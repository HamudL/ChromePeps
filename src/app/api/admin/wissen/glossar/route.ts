import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createGlossarTermSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

export async function GET() {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const terms = await db.glossarTerm.findMany({
    orderBy: { term: "asc" },
  });
  return NextResponse.json({ success: true, data: terms });
}

export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createGlossarTermSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const collision = await db.glossarTerm.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (collision) {
    return NextResponse.json(
      {
        success: false,
        error: `Slug "${parsed.data.slug}" ist bereits vergeben`,
      },
      { status: 409 },
    );
  }

  const term = await db.glossarTerm.create({
    data: {
      slug: parsed.data.slug,
      term: parsed.data.term,
      acronym: parsed.data.acronym || null,
      shortDef: parsed.data.shortDef,
      longDef: parsed.data.longDef || null,
      relatedPostSlugs: parsed.data.relatedPostSlugs,
    },
  });
  revalidatePath("/wissen/glossar");
  return NextResponse.json({ success: true, data: term }, { status: 201 });
}
