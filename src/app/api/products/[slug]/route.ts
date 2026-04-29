import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { updateProductSchema } from "@/validators/product";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";
import { slugify } from "@/lib/utils";

// GET /api/products/[slug] — public (cached) or admin (uncached, includes inactive)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Admin users can view inactive products (needed for edit page)
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(slug);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const product = await db.product.findUnique({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        variants: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
        reviews: {
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await cacheSet(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);
    return NextResponse.json({ success: true, data: product });
  }

  // Admin: no isActive filter, no cache, include all variants + components
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: { orderBy: { priceInCents: "asc" } },
      components: {
        orderBy: { sortOrder: "asc" },
        include: {
          component: {
            select: {
              id: true,
              name: true,
              slug: true,
              sku: true,
              isActive: true,
            },
          },
        },
      },
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: product });
}

// PATCH /api/products/[slug] — admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const body = await req.json();

  const existing = await db.product.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  const parsed = updateProductSchema.safeParse({ ...body, id: existing.id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const {
    id,
    images,
    variants: incomingVariants,
    components: incomingComponents,
    ...updateData
  } = parsed.data;
  const newSlug = updateData.name ? slugify(updateData.name) : undefined;

  // Self-reference verhindern: ein Produkt darf sich nicht selbst als
  // Komponente listen — das würde die Mail-Logik in einer Endlosschleife
  // landen lassen (oder zumindest doppelte Anhänge erzeugen).
  if (
    incomingComponents !== undefined &&
    incomingComponents.some((c) => c.componentProductId === id)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Ein Produkt kann sich nicht selbst als Komponente referenzieren",
      },
      { status: 400 },
    );
  }

  // Check for slug collision when renaming
  if (newSlug && newSlug !== slug) {
    const slugTaken = await db.product.findUnique({ where: { slug: newSlug } });
    if (slugTaken) {
      return NextResponse.json(
        { success: false, error: "A product with this name already exists" },
        { status: 409 }
      );
    }
  }

  const product = await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...updateData,
        ...(newSlug && { slug: newSlug }),
        ...(images !== undefined && {
          images: {
            deleteMany: {},
            createMany: { data: images },
          },
        }),
      },
    });

    // Sync Blend-Komponenten: deleteMany + createMany ist hier sauberer
    // als upsert, weil ProductComponent kein natürlicher Key (SKU)
    // existiert — die Identität ergibt sich aus (parent, component).
    // Plain replace genügt; es gibt keine FK-Beziehungen, die wir
    // erhalten müssten.
    if (incomingComponents !== undefined) {
      await tx.productComponent.deleteMany({
        where: { parentProductId: id },
      });
      if (incomingComponents.length > 0) {
        await tx.productComponent.createMany({
          data: incomingComponents.map((c, idx) => ({
            parentProductId: id,
            componentProductId: c.componentProductId,
            sortOrder: c.sortOrder ?? idx,
          })),
        });
      }
    }

    // Sync variants: upsert by SKU, remove those no longer present
    if (incomingVariants !== undefined) {
      const incomingSkus = new Set(incomingVariants.map((v) => v.sku));

      // Delete variants whose SKU is no longer in the list
      await tx.productVariant.deleteMany({
        where: {
          productId: id,
          sku: { notIn: [...incomingSkus] },
        },
      });

      // Upsert each variant — parallelisiert. upsert lässt sich nicht
      // batchen wie createMany, aber Promise.all bündelt den Client-
      // Roundtrip-Overhead. Bei 5 Variants ~3-4 Roundtrips gespart.
      await Promise.all(
        incomingVariants.map((v) =>
          tx.productVariant.upsert({
            where: { sku: v.sku },
            update: {
              name: v.name,
              priceInCents: v.priceInCents,
              stock: v.stock,
              isActive: v.isActive ?? true,
            },
            create: {
              productId: id,
              name: v.name,
              sku: v.sku,
              priceInCents: v.priceInCents,
              stock: v.stock,
              isActive: v.isActive ?? true,
            },
          }),
        ),
      );
    }

    return tx.product.findUnique({
      where: { id },
      include: { images: true, variants: true, category: true },
    });
  });

  // Invalidate caches (Redis + ISR)
  await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(slug));
  if (newSlug && newSlug !== slug) {
    await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(newSlug));
  }
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);
  await cacheDelPattern("homepage:*");

  // Cart-Cache der betroffenen User invalidieren. Der gecachte Cart-
  // Snapshot enthält stock/price/isActive/name/image — alles was sich
  // bei einem Product-PATCH ändern kann. Ohne Invalidierung würde der
  // User im Cart noch die alten Werte sehen, der Server-Side-Stock-
  // Check beim Checkout würde dann ggf. den Order rejecten — UX-
  // verwirrend ("Add to Cart" funktionierte aber Checkout sagt
  // out-of-stock).
  //
  // Bewusst nur die betroffenen Carts statt cart:* — bei vielen
  // gleichzeitig aktiven Carts blast-radius gering halten.
  const affectedCarts = await db.cart.findMany({
    where: { items: { some: { productId: id } } },
    select: { userId: true },
  });
  if (affectedCarts.length > 0) {
    await Promise.all(
      affectedCarts.map((c) => cacheDel(CACHE_KEYS.CART(c.userId))),
    );
  }

  revalidatePath(`/products/${newSlug ?? slug}`);
  revalidatePath("/products");

  return NextResponse.json({ success: true, data: product });
}

// DELETE /api/products/[slug] — admin only (hard delete)
// Cascades to variants, images, reviews, cart items.
// OrderItems have productId/variantId set to null (order history preserved
// via snapshot fields: productName, variantName, sku, priceInCents).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { slug } = await params;

  const product = await db.product.findUnique({ where: { slug } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Carts mit diesem Produkt VOR dem Delete sammeln — danach sind die
  // CartItems via Cascade weg und der Lookup würde nichts mehr finden.
  // Cache muss aber auch dann invalidiert werden, sonst zeigt der
  // gecachte Snapshot noch das nicht mehr existierende Item.
  const affectedCarts = await db.cart.findMany({
    where: { items: { some: { productId: product.id } } },
    select: { userId: true },
  });

  await db.product.delete({ where: { slug } });

  await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(slug));
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);
  await cacheDelPattern("homepage:*");
  if (affectedCarts.length > 0) {
    await Promise.all(
      affectedCarts.map((c) => cacheDel(CACHE_KEYS.CART(c.userId))),
    );
  }
  revalidatePath(`/products/${slug}`);
  revalidatePath("/products");

  return NextResponse.json({ success: true });
}
