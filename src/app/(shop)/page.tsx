export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  CreditCard,
  Eye,
  Mail,
  Microscope,
  Package,
} from "lucide-react";
import { db } from "@/lib/db";
import { RESEARCH_DISCLAIMER } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import type { ProductCardData } from "@/types";

import { FadeUp } from "./home-animations";
import { HeroLogo } from "./hero-logo";
import { PeptideNetwork } from "@/components/shop/peptide-network";
import { TrustBar } from "@/components/shop/trust-bar";
import { LiveMetrics } from "@/components/shop/live-metrics";

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

/**
 * Zahlen für den LiveMetrics-Block: getestete Chargen (alle veröffentlichten
 * COAs), Ø Reinheit der letzten 12 Monate (nur COAs mit purity-Wert),
 * ausgelieferte echte Bestellungen (Testbestellungen ausgenommen). Wird
 * direkt als Props an <LiveMetrics> durchgereicht; Defaults aus der
 * Komponente werden so nie angezeigt.
 */
async function getLiveMetrics() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [batchCount, avgPurity, deliveredCount] = await Promise.all([
    db.certificateOfAnalysis.count({ where: { isPublished: true } }),
    db.certificateOfAnalysis.aggregate({
      where: {
        isPublished: true,
        purity: { not: null },
        testDate: { gte: twelveMonthsAgo },
      },
      _avg: { purity: true },
    }),
    db.order.count({
      where: { status: "DELIVERED", isTestOrder: false },
    }),
  ]);

  return {
    batchCount,
    avgPurity: avgPurity._avg.purity ?? null,
    deliveredCount,
  };
}

export default async function HomePage() {
  const [bestsellers, categories, liveMetrics] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getLiveMetrics(),
  ]);

  // Metrics-Kacheln mit echten Zahlen befüllen. Zahlen <= 0 bzw. null
  // (z.B. noch keine COA eingepflegt) werden nicht als "0 Chargen getestet"
  // angezeigt — wir blenden die jeweilige Kachel dann aus und lassen nur
  // die sinnvollen Werte stehen.
  const metricsYear = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  });
  const liveMetricsTiles: Array<{
    target: number;
    suffix?: string;
    decimals?: number;
    label: string;
    sub?: string;
  }> = [];
  if (liveMetrics.batchCount > 0) {
    liveMetricsTiles.push({
      target: liveMetrics.batchCount,
      label: "Chargen · getestet",
      sub: `Stand ${metricsYear}`,
    });
  }
  if (liveMetrics.avgPurity != null) {
    liveMetricsTiles.push({
      target: Number(liveMetrics.avgPurity.toFixed(2)),
      suffix: "%",
      decimals: 2,
      label: "Ø Reinheit · 12 Monate",
      sub: "HPLC · Janoshik Labs",
    });
  }
  if (liveMetrics.deliveredCount > 0) {
    liveMetricsTiles.push({
      target: liveMetrics.deliveredCount,
      label: "Ausgelieferte Bestellungen",
      sub: "seit Launch",
    });
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative hero-ambient overflow-hidden" aria-label="Hero">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <PeptideNetwork />
        {/* Soft radial vignette keeps the text legible over the particle network */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              "radial-gradient(620px 360px at 50% 50%, hsl(var(--background) / 0.85), transparent 70%)",
          }}
        />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <FadeUp>
            <div className="mx-auto max-w-3xl text-center space-y-8">
              <HeroLogo />

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
                Premium-Forschungspeptide. Laborgeprüfte Reinheit.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button asChild size="lg" className="gap-2 px-8 h-12 text-base">
                  <Link href="/products">
                    Shop
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                  <Link href="/qualitaetskontrolle">Qualitätskontrolle</Link>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Trust Bar (dark) — interaktive Pills mit Evidence-Tooltips ── */}
      <TrustBar />

      {/* ── Live Metrics (light) — echte Zahlen aus DB. Wenn noch keine
          COAs/Orders vorhanden sind, wird die Section ausgeblendet statt
          mit 0-Werten zu werben. ── */}
      {liveMetricsTiles.length > 0 && (
        <LiveMetrics metrics={liveMetricsTiles} />
      )}

      {/* ── Warum ChromePeps? (dark) ── */}
      <section className="section-dark border-t border-white/5">
        <div className="container py-16 md:py-20">
          <FadeUp>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-12">
              Warum ChromePeps?
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Microscope,
                title: "Drittlabor-geprüft",
                desc: "Jede Charge wird durch Janoshik unabhängig auf Reinheit getestet.",
                link: "/qualitaetskontrolle",
                linkText: "Qualitätskontrolle",
              },
              {
                icon: CreditCard,
                title: "Sichere Zahlung",
                desc: "Stripe, Apple Pay, Google Pay oder Banküberweisung.",
                link: "/zahlung",
                linkText: "Zahlungsoptionen",
              },
              {
                icon: Mail,
                title: "CoA zu jeder Bestellung",
                desc: "Das passende Analysezertifikat erhalten Sie automatisch per E-Mail mit Ihrer Bestellung.",
                link: "/qualitaetskontrolle",
                linkText: "Qualitätskontrolle",
              },
            ].map((card, i) => (
              <FadeUp key={card.title} delay={i * 0.1}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 h-full flex flex-col">
                  <card.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-white/60 flex-1 mb-4">{card.desc}</p>
                  <Link
                    href={card.link}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {card.linkText}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qualitätsprozess (light) ── */}
      <section className="container py-16 md:py-20">
        <FadeUp>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-4">
            Unser Qualitätsprozess
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Vier Schritte für höchste Qualität
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {[
            { icon: Package, n: "1", title: "Chargen-Handling", desc: "Lagerung bei -24\u00B0C mit eindeutiger Lot-Nummer" },
            { icon: Microscope, n: "2", title: "Janoshik-Test", desc: "HPLC-Analyse durch unabhängiges Drittlabor" },
            { icon: ShieldCheck, n: "3", title: "Qualitätskontrolle", desc: "Nur Chargen die alle Tests bestehen werden freigegeben" },
            { icon: Eye, n: "4", title: "Online verifizierbar", desc: "Ergebnisse öffentlich einsehbar auf janoshik.com" },
          ].map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.1}>
              <div className="text-center space-y-3">
                <div className="mx-auto relative flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                  <span className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {step.n}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.4}>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/qualitaetskontrolle">
                Mehr erfahren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </FadeUp>
      </section>

      {/* ── Kategorien ── */}
      {categories.length > 0 && (
        <section className="border-t">
          <div className="container py-16 md:py-20">
            <FadeUp>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-12">
                Nach Kategorie shoppen
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat, i) => (
                <FadeUp key={cat.id} delay={i * 0.08}>
                  <Link href={`/products?category=${cat.slug}`}>
                    <Card className="group overflow-hidden h-full hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <div className="relative h-48 bg-muted overflow-hidden">
                        {cat.image ? (
                          <Image
                            src={cat.image}
                            alt={cat.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
                            <FlaskConical className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {cat.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {cat._count.products}{" "}
                              {cat._count.products === 1 ? "Produkt" : "Produkte"}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
        <section className="section-dark">
          <div className="container py-16 md:py-20">
            <FadeUp>
              <div className="flex items-end justify-between mb-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Bestseller
                </h2>
                <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-1.5 border-white/20 text-white hover:bg-white/10">
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
              <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Link href="/products">Alle Produkte</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Disclaimer ── */}
      <section className="border-t">
        <div className="container py-8 text-center">
          <p className="text-xs text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
