import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { breadcrumbJsonLd } from "@/lib/json-ld";
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
  title: "Glossar — Wissenschaftliche Begriffe A–Z",
  description:
    "Begriffe, Akronyme und Methoden — kurz, präzise, nachschlagbar. Live-Suche in Begriff und Definition.",
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
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Hero */}
      <section className="border-b border-border relative overflow-hidden">
        <div
          className="absolute inset-0 apo-grid opacity-100"
          aria-hidden="true"
        />
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

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end mt-5">
            <div>
              <span className="mono-tag text-primary">
                Nachschlagewerk · A–Z
              </span>
              <h1 className="mt-3 font-serif text-[60px] md:text-[88px] leading-[0.95] tracking-[-0.025em] font-medium">
                Glossar.
              </h1>
              <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-foreground/85">
                Begriffe, Akronyme und Methoden — kurz, präzise,
                nachschlagbar. {terms.length} Einträge, fortlaufend
                kuratiert. Live-Suche in Begriff und Definition.
              </p>
            </div>
            <dl
              className="font-mono text-[12px] flex md:flex-col gap-5 md:text-right"
              style={{ letterSpacing: "0.02em" }}
            >
              <div>
                <dt className="mono-tag text-muted-foreground">Einträge</dt>
                <dd className="mt-1 text-[28px] font-semibold tabular-nums">
                  {terms.length}
                </dd>
              </div>
              {lastUpdate && (
                <div>
                  <dt className="mono-tag text-muted-foreground">Update</dt>
                  <dd className="mt-1 text-[13px]">
                    {lastUpdate.toLocaleDateString("de-DE")}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      <GlossarClient terms={terms} />
    </div>
  );
}
