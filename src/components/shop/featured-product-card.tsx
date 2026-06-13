import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { FeaturedProductData } from "@/lib/products/featured";

/**
 * Featured-Produkt als Ink-Einschub neben dem Shop-Seitenkopf — ein
 * dunkles Dossier-Panel im Protokoll-Stil. Ersatz für einen generischen
 * CTA: das tatsächlich featured-te Produkt (Bestseller oder neueste COA)
 * steht direkt neben der Trust-Botschaft. `card-ink` rescoped die
 * Akzent-Tokens auf helles Mint, damit text-primary lesbar bleibt.
 * Server-Component; Link führt auf die Detailseite.
 */
export function FeaturedProductCard({
  product,
}: {
  product: FeaturedProductData;
}) {
  const testedAt = product.coa
    ? new Date(product.coa.testDate).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : null;

  const subline =
    product.form && product.weight
      ? `${product.weight} · ${product.form}`
      : product.weight ?? product.form ?? product.shortDesc ?? "";

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card-ink group relative block rounded-sm border border-ink-border bg-ink p-7 text-ink-foreground transition-colors hover:border-primary/40"
    >
      {/* Specimen-Tag in der oberen Kante — eckig, Mono */}
      <div className="absolute -top-px left-6 bg-primary px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
        Featured
        {product.coa && (
          <span className="ml-2 opacity-80">· Lot {product.coa.batchNumber}</span>
        )}
      </div>

      <div className="pt-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {product.categoryName}
        </p>

        <div className="mt-3 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-3xl font-medium leading-none tracking-[-0.015em] md:text-[32px]">
              {product.name}
            </h3>
            {subline && (
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                {subline}
              </p>
            )}
          </div>

          {product.image && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border border-ink-border bg-[hsl(218_35%_5%)]">
              <Image
                src={product.image.url}
                alt={product.image.alt ?? product.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
        </div>

        {/* Mess-Lineal (card-ink-Variante) als Trenner zum Datenteil */}
        <div aria-hidden className="tick-rule mt-6" />

        {/* 2x2 Specs (nur bei vorhandener COA) */}
        {product.coa && (
          <dl className="grid grid-cols-2 gap-x-6">
            <SpecItem
              k="Reinheit"
              v={product.coa.purity != null ? `${product.coa.purity.toFixed(2)} %` : "n. v."}
              accent
            />
            <SpecItem k="Methode" v={`${product.coa.testMethod} 220 nm`} />
            <SpecItem k="Labor" v={product.coa.laboratory} />
            <SpecItem k="Datum" v={testedAt ?? "n. v."} />
          </dl>
        )}

        {/* Preis + CTA */}
        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-ink-border pt-5">
          <span className="font-mono text-[24px] font-semibold leading-none tabular-nums">
            {formatPrice(product.priceInCents)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-colors group-hover:bg-primary/90">
            Ansehen
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SpecItem({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div className="border-b border-ink-border py-2.5 last:border-b-0 [&:nth-last-child(2)]:border-b-0">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
        {k}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-[12px] ${
          accent ? "font-semibold text-primary" : "text-ink-foreground"
        }`}
      >
        {v}
      </dd>
    </div>
  );
}
