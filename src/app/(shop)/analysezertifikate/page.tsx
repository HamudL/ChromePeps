/**
 * ⚠️  PUBLIC ACCESS DISABLED
 *
 * This route is intentionally blocked by src/middleware.ts. The CoA listing
 * is no longer a public feature — certificates are sent privately per email
 * alongside each order confirmation.
 *
 * Do NOT remove this file without also removing the matching redirect rule
 * in src/middleware.ts, and do NOT re-expose this route unless the business
 * decision changes. If you're looking for why /analysezertifikate shows a
 * redirect, that's the reason. Admins can still manage certificates from
 * /admin/certificates.
 */
export const dynamic = "force-dynamic";

import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { AnalysezertifikateSearch } from "./search-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analysezertifikate | ChromePeps",
  description:
    "Drittlabor-verifizierte Analysezertifikate für alle ChromePeps-Peptide. Jede Charge wird durch Janoshik unabhängig getestet.",
};

interface ProductWithCerts {
  id: string;
  name: string;
  slug: string;
  images: { url: string }[];
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
      images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
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
      {/* Hero (dark) */}
      <section className="section-dark">
        <div className="container py-16 md:py-20 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Analysezertifikate
          </h1>
          <p className="text-white/60 max-w-xl mx-auto">
            Jede Charge wird durch Janoshik unabhängig auf Reinheit getestet.
            Alle Ergebnisse sind öffentlich verifizierbar.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-10 md:py-14">
        <AnalysezertifikateSearch products={products} />

        {products.length === 0 && (
          <div className="text-center py-16">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Aktuell sind keine Analysezertifikate verfügbar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
