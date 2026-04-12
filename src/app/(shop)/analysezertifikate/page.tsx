export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysezertifikateSearch } from "./search-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analysezertifikate | ChromePeps",
  description:
    "Drittlabor-verifizierte Analysezertifikate für alle ChromePeps-Peptide. Jede Charge wird unabhängig auf Reinheit und Sicherheit getestet.",
};

interface ProductWithCerts {
  id: string;
  name: string;
  slug: string;
  _count: { certificates: number };
}

async function getProductsWithCertificates(): Promise<ProductWithCerts[]> {
  return db.product.findMany({
    where: {
      isActive: true,
      certificates: { some: { isPublished: true } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { certificates: { where: { isPublished: true } } },
      },
    },
  });
}

export default async function AnalysezertifikatePage() {
  const products = await getProductsWithCertificates();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden chrome-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(217,55%,45%,0.08),transparent_70%)]" />
        <div className="container relative py-12 md:py-16 text-center">
          <Badge
            variant="outline"
            className="px-4 py-1 text-sm mb-4 inline-flex"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Drittlabor-verifiziert
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Analytische Testergebnisse
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Durchsuchen Sie unsere Analysezertifikate nach Produktname. Jede
            Charge wird unabhängig auf Reinheit und Sicherheit getestet.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-10 md:py-14">
        <AnalysezertifikateSearch products={products} />

        {products.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              Aktuell sind keine Analysezertifikate verfügbar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
