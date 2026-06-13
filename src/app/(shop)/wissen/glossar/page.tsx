import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { breadcrumbJsonLd, safeJsonLd } from "@/lib/json-ld";
import { GlossarClient } from "./glossar-client";

/**
 * /wissen/glossar — Wissenschafts-Glossar A–Z mit Live-Suche.
 *
 * Server-Component lädt alle Begriffe (kompakt, ~100 Felder pro Eintrag)
 * und übergibt an Client-Wrapper für Live-Filtering + Buchstaben-Bucketing.
 *
 * `force-dynamic`: zur Build-Zeit existiert keine DATABASE_URL — ein
 * ISR-Prerender würde scheitern. Glossar-Daten ändern sich selten,
 * aber Read-Performance ist auch dynamisch noch gut (eine Query, ~100
 * Rows mit kompakten Feldern). Caching auf Edge-Niveau übernimmt
 * Cloudflare/Nginx wenn nötig.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Glossar: Wissenschaftliche Begriffe A bis Z",
  description:
    "Begriffe, Akronyme und Methoden, kurz und präzise. Live-Suche in Begriff und Definition.",
  alternates: { canonical: "/wissen/glossar" },
};

export default async function WissenGlossarPage() {
  const terms = await db.glossarTerm.findMany({
    orderBy: { term: "asc" },
    select: {
      slug: true,
      term: true,
      acronym: true,
      shortDef: true,
      updatedAt: true,
    },
  });

  // Latest update across all terms — für die Hero-Stat.
  const lastUpdate = terms.reduce<Date | null>(
    (acc, t) => (acc && acc > t.updatedAt ? acc : t.updatedAt),
    null,
  );

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Wissen", path: "/wissen" },
    { name: "Glossar", path: "/wissen/glossar" },
  ]);

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbSchema),
        }}
      />

      {/* Seitenkopf */}
      <section className="border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 apo-grid-light" aria-hidden="true" />
        <div className="container relative py-16 md:py-24">
          <nav
            aria-label="Breadcrumb"
            className="mono-label text-muted-foreground flex items-center gap-2"
            style={{ fontSize: 10.5 }}
          >
            <Link href="/wissen" className="hover:text-foreground">
              Wissen
            </Link>
            <ChevronRight size={11} />
            <span className="text-foreground">Glossar</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end mt-7">
            <div>
              <span className="eyebrow">Nachschlagewerk · A–Z</span>
              <h1 className="mt-4 display-title text-[60px] md:text-[88px] leading-[0.95]">
                Glossar.
              </h1>
              <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-foreground/85">
                Begriffe, Akronyme und Methoden, kurz und präzise.
                {" "}{terms.length} Einträge, fortlaufend kuratiert.
                Live-Suche in Begriff und Definition.
              </p>
            </div>
            {/* Mono-Readout: Bestand + letzter Stand. */}
            <dl className="flex md:flex-col gap-x-10 gap-y-5 md:text-right md:pb-1">
              <div>
                <dt className="stat-key">Einträge</dt>
                <dd className="stat-value mt-1.5 text-3xl">
                  {terms.length}
                </dd>
              </div>
              {lastUpdate && (
                <div>
                  <dt className="stat-key">Stand</dt>
                  <dd
                    className="mt-1.5 font-mono text-[13px] tabular-nums"
                    style={{ letterSpacing: "0.02em" }}
                  >
                    {lastUpdate.toLocaleDateString("de-DE")}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="tick-rule mt-10" aria-hidden="true" />
        </div>
      </section>

      <GlossarClient terms={terms} />
    </div>
  );
}
