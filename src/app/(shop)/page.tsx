export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  Truck,
  CreditCard,
  Eye,
  Microscope,
  Package,
  BadgeCheck,
  Euro,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { RESEARCH_DISCLAIMER } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import type { ProductCardData } from "@/types";

import { RecentlyViewed } from "@/components/shop/recently-viewed";
import { FadeUp } from "./home-animations";
import { HeroLogo } from "./hero-logo";

async function getBestsellers(): Promise<ProductCardData[]> {
  const [products, bestsellerIds] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, isBestseller: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: productCardSelect,
    }),
    getBestsellerProductIds(),
  ]);

  return products.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));
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

const trustItems = [
  {
    icon: BadgeCheck,
    title: "Qualitätsgeprüft",
    desc: "Jede Charge wird unabhängig im Drittlabor getestet",
  },
  {
    icon: Truck,
    title: "Kostenloser Versand",
    desc: "Ab 100\u00A0\u20AC Bestellwert innerhalb der EU",
  },
  {
    icon: Euro,
    title: "Faire Preise",
    desc: "Premium-Peptide zu transparenten, wettbewerbsfähigen Preisen",
  },
  {
    icon: Zap,
    title: "Schnelle Lieferung",
    desc: "Sichere, temperaturkontrollierte Expresslieferung",
  },
];

const whyCards = [
  {
    icon: Microscope,
    title: "Drittlabor-geprüft",
    desc: "Alle Peptide werden durch das unabhängige Analyselabor Janoshik auf Reinheit verifiziert.",
    link: "/qualitaetskontrolle",
    linkText: "Mehr zur Qualitätskontrolle",
  },
  {
    icon: CreditCard,
    title: "Sichere Zahlung",
    desc: "Bezahlen Sie bequem per Stripe (Kreditkarte, Apple Pay, Google Pay) oder per Banküberweisung.",
    link: "/zahlung",
    linkText: "Zahlungsoptionen",
  },
  {
    icon: Eye,
    title: "Transparente Ergebnisse",
    desc: "Alle Analysezertifikate sind öffentlich einsehbar und unabhängig verifizierbar.",
    link: "/analysezertifikate",
    linkText: "Zertifikate ansehen",
  },
];

const processSteps = [
  {
    icon: Package,
    step: "01",
    title: "Chargen-Handling",
    desc: "Lagerung bei -24\u00B0C, eindeutige Lot-Nummer für jede Charge",
  },
  {
    icon: Microscope,
    step: "02",
    title: "Analytische Prüfung",
    desc: "HPLC, qNMR und LC-MS durch unabhängiges Drittlabor",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Sterile Verpackung",
    desc: "Präzisionswaagen und sterile Handhabung für maximale Integrität",
  },
  {
    icon: Eye,
    step: "04",
    title: "Online verifizierbar",
    desc: "Alle Ergebnisse öffentlich einsehbar mit eindeutiger Chargennummer",
  },
];

export default async function HomePage() {
  const [bestsellers, categories] = await Promise.all([
    getBestsellers(),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden chrome-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(217,55%,45%,0.08),transparent_70%)]" />
        <div className="container relative py-16 md:py-24">
          <FadeUp>
            <div className="mx-auto max-w-3xl text-center space-y-6">
              <Badge variant="outline" className="px-4 py-1 text-sm">
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                Research Use Only
              </Badge>

              <HeroLogo />

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Premium-Forschungspeptide mit verifizierter Reinheit. Streng
                getestet, zuverlässig beschafft für Ihre Laboranforderungen.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/products">
                    Produkte ansehen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/analysezertifikate">Analysezertifikate</Link>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Trust Indicators ── */}
      <FadeUp delay={0.1}>
        <section className="border-y bg-muted/20">
          <div className="container py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm px-4 py-4"
                >
                  <item.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── Research Disclaimer ── */}
      <section className="border-b bg-muted/50">
        <div className="container py-4">
          <p className="text-center text-xs text-muted-foreground">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* ── Warum ChromePeps? ── */}
      <section className="container py-12 md:py-16">
        <FadeUp>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Warum ChromePeps?
            </h2>
            <p className="mt-1 text-muted-foreground">
              Qualität, Transparenz und Zuverlässigkeit
            </p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whyCards.map((card, i) => (
            <FadeUp key={card.title} delay={i * 0.08}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mb-4">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-4">
                    {card.desc}
                  </p>
                  <Link
                    href={card.link}
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {card.linkText}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Qualitätsprozess ── */}
      <section className="border-y bg-muted/20">
        <div className="container py-12 md:py-16">
          <FadeUp>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Unser Qualitätsprozess
              </h2>
              <p className="mt-1 text-muted-foreground">
                Vom Eingang bis zur Verpackung — vier Schritte für höchste
                Qualität
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <FadeUp key={step.step} delay={i * 0.08}>
                <div className="text-center space-y-3">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {step.step}
                  </p>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.3}>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/qualitaetskontrolle">
                  Mehr erfahren
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Kategorien ── */}
      {categories.length > 0 && (
        <section className="container py-12 md:py-16">
          <FadeUp>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Nach Kategorie shoppen
              </h2>
              <p className="mt-1 text-muted-foreground">
                Entdecken Sie unser Sortiment an Forschungspeptiden
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, i) => (
              <FadeUp key={category.id} delay={i * 0.08}>
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
                        {category._count.products === 1
                          ? "Produkt"
                          : "Produkte"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {/* ── Bestseller ── */}
      {bestsellers.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="container py-12 md:py-16">
            <FadeUp>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Bestseller
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    Unsere beliebtesten Forschungspeptide
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden sm:flex gap-1"
                >
                  <Link href="/products">
                    Alle Produkte <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.map((product, i) => (
                <FadeUp key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} />
                </FadeUp>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/products">Alle Produkte</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Recently Viewed ── */}
      <RecentlyViewed />

      {/* ── Bottom Disclaimer ── */}
      <section className="border-t bg-muted/30">
        <div className="container py-8 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
