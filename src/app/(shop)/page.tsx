import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FlaskConical, ShieldCheck, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProductCardData } from "@/types";

import { HomeAnimations } from "./home-animations";

async function getFeaturedProducts(): Promise<ProductCardData[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      slug: true,
      shortDesc: true,
      priceInCents: true,
      compareAtPriceInCents: true,
      purity: true,
      weight: true,
      isActive: true,
      stock: true,
      images: {
        select: { url: true, alt: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      category: {
        select: { name: true, slug: true },
      },
    },
  });

  return products;
}

async function getCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden chrome-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(217,55%,45%,0.08),transparent_70%)]" />
        <div className="container relative py-20 md:py-32">
          <HomeAnimations.FadeUp>
            <div className="mx-auto max-w-3xl text-center space-y-6">
              <Badge variant="outline" className="px-4 py-1 text-sm">
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                Research Use Only
              </Badge>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight chrome-text">
                {APP_NAME}
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Premium research peptides with verified purity. Rigorously
                tested, reliably sourced for your laboratory needs.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/products">
                    Browse Catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/products?sort=newest">New Arrivals</Link>
                </Button>
              </div>
            </div>
          </HomeAnimations.FadeUp>

          {/* Trust indicators */}
          <HomeAnimations.FadeUp delay={0.2}>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <span>Third-Party Purity Verified</span>
              </div>
              <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                <FlaskConical className="h-5 w-5 text-primary shrink-0" />
                <span>Lab-Grade Quality</span>
              </div>
              <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                <span>Fast EU Shipping</span>
              </div>
            </div>
          </HomeAnimations.FadeUp>
        </div>
      </section>

      {/* Research Disclaimer Banner */}
      <section className="border-y bg-muted/50">
        <div className="container py-4">
          <p className="text-center text-xs text-muted-foreground">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="container py-16 md:py-20">
          <HomeAnimations.FadeUp>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Newest Products
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Recently added to our research catalog
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden sm:flex gap-1">
                <Link href="/products">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </HomeAnimations.FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, i) => (
              <HomeAnimations.FadeUp key={product.id} delay={i * 0.05}>
                <ProductCard product={product} />
              </HomeAnimations.FadeUp>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button asChild variant="outline">
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        </section>
      )}

      <Separator />

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container py-16 md:py-20">
          <HomeAnimations.FadeUp>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Shop by Category
              </h2>
              <p className="mt-1 text-muted-foreground">
                Explore our range of research peptides
              </p>
            </div>
          </HomeAnimations.FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, i) => (
              <HomeAnimations.FadeUp key={category.id} delay={i * 0.08}>
                <Link href={`/products?category=${category.slug}`}>
                  <Card className="group overflow-hidden h-full hover:shadow-lg transition-shadow duration-300">
                    <div className="relative h-48 bg-muted overflow-hidden">
                      {category.image ? (
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center chrome-gradient">
                          <FlaskConical className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {category._count.products}{" "}
                        {category._count.products === 1 ? "product" : "products"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </HomeAnimations.FadeUp>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Disclaimer */}
      <section className="border-t bg-muted/30">
        <div className="container py-10 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
