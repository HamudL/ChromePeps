import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { FeaturedProductData } from "@/lib/products/featured";

/**
 * Dark "Featured Product"-Box für den Apotheke-Hero rechts neben Headline
 * + Stats. Ersatz für einen generischen CTA — das tatsächlich featured-te
 * Produkt (Bestseller oder neueste COA) steht direkt neben der
 * Trust-Botschaft. Server-Component; Link führt auf die Detailseite.
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
      className="group relative block bg-[hsl(20_12%_9%)] border border-ink-border text-ink-foreground p-7 rounded-sm transition-colors hover:border-primary/40"
    >
      {/* Corner-Tag */}
      <div className="absolute -top-px left-6 bg-primary text-ink font-mono text-[9.5px] tracking-[0.2em] uppercase font-bold px-2.5 py-1">
        Featured
        {product.coa && (
          <span className="ml-2 opacity-80">· Lot {product.coa.batchNumber}</span>
        )}
      </div>

      <div className="pt-5">
        <p className="text-primary font-mono text-[10px] tracking-[0.2em] uppercase font-semibold">
          {product.categoryName}
        </p>

        <div className="mt-3 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-3xl md:text-[32px] font-semibold tracking-tight leading-none">
              {product.name}
            </h3>
            {subline && (
              <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
                {subline}
              </p>
            )}
          </div>

          {product.image && (
            <div className="relative h-16 w-16 shrink-0 rounded-sm overflow-hidden border border-ink-border bg-[hsl(20_14%_4%)]">
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

        {/* 2x2 Specs (nur bei vorhandener COA) */}
        {product.coa && (
          <dl className="mt-6 grid grid-cols-2 gap-x-6">
            <SpecItem k="Reinheit" v={product.coa.purity != null ? `${product.coa.purity.toFixed(2)}%` : "—"} gold />
            <SpecItem k="Methode" v={`${product.coa.testMethod} 220 nm`} />
            <SpecItem k="Labor" v={product.coa.laboratory} />
            <SpecItem k="Datum" v={testedAt ?? "—"} />
          </dl>
        )}

        {/* Price + CTA */}
        <div className="mt-6 pt-5 border-t border-ink-border flex items-baseline justify-between gap-4">
          <span className="text-[26px] font-semibold tabular-nums leading-none">
            {formatPrice(product.priceInCents)}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-primary text-ink font-mono text-[11px] tracking-[0.15em] uppercase font-semibold px-4 py-2.5 rounded-sm transition-colors group-hover:bg-primary/90">
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
  gold,
}: {
  k: string;
  v: string;
  gold?: boolean;
}) {
  return (
    <div className="py-2.5 border-t border-ink-border">
      <dt className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-ink-muted">
        {k}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-[12px] ${
          gold ? "text-primary font-semibold" : "text-ink-foreground"
        }`}
      >
        {v}
      </dd>
    </div>
  );
}
