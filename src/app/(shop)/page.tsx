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
    desc: "Jede Charge unabhängig im Drittlabor getestet",
  },
  {
    icon: Truck,
    title: "Kostenloser Versand",
    desc: "Ab 100\u00A0\u20AC Bestellwert innerhalb der EU",
  },
  {
    icon: Euro,
    title: "Faire Preise",
    desc: "Premium-Peptide zu transparenten Preisen",
  },
  {
    icon: Zap,
    title: "Schnelle Lieferung",
    desc: "Temperaturkontrollierte Expresslieferung",
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
      <section className="relative overflow-hidden hero-glow bg-gradient-to-b from-background via-muted/40 to-background">
        {/* Decorative grid */}
        <div className="absolute inset-0 subtle-grid opacity-40" />
        <div className="container relative py-20 md:py-28 lg:py-32">
          <FadeUp>
            <div className="mx-auto max-w-3xl text-center space-y-8">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm border-primary/30 bg-primary/5"
              >
                <FlaskConical className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Research Use Only
              </Badge>

              <HeroLogo />

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Premium-Forschungspeptide mit verifizierter Reinheit. Streng
                getestet, zuverlässig beschafft für Ihre Laboranforderungen.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button asChild size="lg" className="gap-2 px-8 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                  <Link href="/products">
                    Produkte ansehen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base hover:bg-primary/5 transition-all duration-300">
                  <Link href="/analysezertifikate">Analysezertifikate</Link>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Trust Indicators ── */}
      <FadeUp delay={0.1}>
        <section className="border-y border-border/60 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30">
          <div className="container py-6 md:py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="group flex items-start gap-3 rounded-xl glass-card px-4 py-4 hover:shadow-md transition-all duration-300 cursor-default"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors duration-300 shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── Research Disclaimer ── */}
      <section className="bg-muted/40">
        <div className="container py-3">
          <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* ── Warum ChromePeps? ── */}
      <section className="section-glow">
        <div className="container py-16 md:py-20">
          <FadeUp>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Warum ChromePeps?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Qualität, Transparenz und Zuverlässigkeit
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {whyCards.map((card, i) => (
              <FadeUp key={card.title} delay={i * 0.1}>
                <Card className="group h-full border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 mb-5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">
                      {card.desc}
                    </p>
                    <Link
                      href={card.link}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group/link"
                    >
                      {card.linkText}
                      <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform duration-200" />
                    </Link>
                  </CardContent>
                </Card>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qualitätsprozess ── */}
      <section className="bg-gradient-to-b from-muted/40 via-muted/20 to-background">
        <div className="container py-16 md:py-20">
          <FadeUp>
            <div className="text-center mb-14">
              <Badge variant="outline" className="px-3 py-1 text-xs mb-4 border-primary/30 bg-primary/5">
                <ShieldCheck className="mr-1 h-3 w-3 text-primary" />
                Qualitätssicherung
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Unser Qualitätsprozess
              </h2>
              <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
                Vom Eingang bis zur Verpackung — vier Schritte für höchste
                Qualität
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {processSteps.map((step, i) => (
              <FadeUp key={step.step} delay={i * 0.1}>
                <div className="group text-center space-y-4 relative">
                  {/* Connecting line (hidden on mobile/last item) */}
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] w-[calc(100%-32px)] h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  <div className="mx-auto relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/10 group-hover:border-primary/25 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                    <step.icon className="h-6 w-6 text-primary" />
                    <span className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {step.step.replace("0", "")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {step.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.4}>
            <div className="mt-12 text-center">
              <Button asChild variant="outline" className="gap-2 hover:bg-primary/5 transition-all duration-300">
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
        <section className="section-glow">
          <div className="container py-16 md:py-20">
            <FadeUp>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Nach Kategorie shoppen
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Entdecken Sie unser Sortiment an Forschungspeptiden
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, i) => (
                <FadeUp key={category.id} delay={i * 0.08}>
                  <Link href={`/products?category=${category.slug}`}>
                    <Card className="group overflow-hidden h-full border-border/50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer">
                      <div className="relative h-48 bg-muted overflow-hidden">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt={category.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60">
                            <FlaskConical className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {category.description}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {category._count.products}{" "}
                            {category._count.products === 1
                              ? "Produkt"
                              : "Produkte"}
                          </p>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bestseller ── */}
      {bestsellers.length > 0 && (
        <section className="bg-gradient-to-b from-muted/30 to-background">
          <div className="container py-16 md:py-20">
            <FadeUp>
              <div className="flex items-end justify-between mb-10">
                <div>
                  <Badge variant="outline" className="px-3 py-1 text-xs mb-3 border-primary/30 bg-primary/5">
                    Meistverkauft
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Bestseller
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    Unsere beliebtesten Forschungspeptide
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="hidden sm:flex gap-1.5 hover:bg-primary/5 transition-all duration-300"
                >
                  <Link href="/products">
                    Alle Produkte <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.map((product, i) => (
                <FadeUp key={product.id} delay={i * 0.08}>
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
      <section className="border-t bg-muted/20">
        <div className="container py-10 text-center">
          <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-xl bg-primary/5 mb-4">
            <FlaskConical className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
