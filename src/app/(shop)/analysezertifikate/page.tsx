export const dynamic = "force-dynamic";

import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
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
      <section className="relative overflow-hidden hero-glow bg-gradient-to-b from-background via-muted/40 to-background">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="container relative py-14 md:py-20 text-center">
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-sm mb-4 inline-flex border-primary/30 bg-primary/5"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Drittlabor-verifiziert
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Analytische Testergebnisse
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Durchsuchen Sie unsere Analysezertifikate nach Produktname. Jede
            Charge wird unabhängig auf Reinheit und Sicherheit getestet.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-10 md:py-14">
        <AnalysezertifikateSearch products={products} />

        {products.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/5 mb-4">
              <ShieldCheck className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">
              Aktuell sind keine Analysezertifikate verfügbar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
