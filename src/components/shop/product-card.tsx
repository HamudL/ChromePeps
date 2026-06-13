/**
 * ProductCard — „Probenblatt" (Specimen-Karte) im Chromatogramm-Stil
 *
 * Server-Component (keine `"use client"` directive). Vorher zog jedes Card-
 * Render Zustand (Cart-Store) + Toast in den Client-Bundle und zwang React
 * dazu, jede der 12-20 Karten eines Listings einzeln zu hydraten — Hydration
 * Cost auf /products / /products/category messbar.
 *
 * Jetzt: SSR-only HTML mit zwei Client-Islands (WishlistButton, AddButton).
 * Wenn der User nicht hovert / nichts klickt, läuft NULL Client-JS in der
 * Card.
 *
 * Aufbau wie ein Probenblatt aus dem Analyse-Protokoll:
 *  - Kopfzeile: Mono-Mikrozeile (Kategorie · Index "001 / 247" · Wishlist)
 *  - Media: Produktbild oder CSS-Vial-Fallback (kühles Laborglas)
 *  - Mess-Lineal (tick-rule) als Trenner zum Datenteil
 *  - Name in Fraunces, Spezifikationen als Mono-Tabelle mit Haarlinien
 *  - Fußzeile: Preis (Mono, tabular-nums) + Quick-Add-CTA
 *
 * Props-Signatur unverändert zur vorigen Version, damit alle Call-Sites
 * (Homepage Bestsellers, Related Products, Wishlist, Katalog) ohne
 * Anpassung weiterlaufen.
 */

import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { ProductCardAddButton } from "@/components/shop/product-card-add-button";
import { formatPrice, cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";

interface ProductCardProps {
  product: ProductCardData;
  /**
   * Optionale Position der Karte im Grid (1-basiert). Wird als
   * dezenter Index in der Kopfzeile angezeigt ("017 / 247"). Bei
   * undefined wird der Index ausgeblendet — in Fällen wie
   * Wishlist/Related-Products macht eine "Katalog-Position" keinen
   * Sinn.
   */
  index?: number;
  /**
   * Gesamt-Anzahl im aktuellen Listing (für den Index-Nenner).
   */
  total?: number;
  /**
   * LCP-Hint: die erste(n) Reihe(n) eines Listings setzen priority=true,
   * damit das Produktbild sofort über den Preload-Scanner geladen wird
   * (statt lazy nach dem Layout). Default false — alle übrigen Karten
   * bleiben lazy, damit nur das tatsächliche LCP-Bild bevorzugt lädt.
   */
  priority?: boolean;
}

export function ProductCard({
  product,
  index,
  total,
  priority = false,
}: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const hasDiscount =
    product.compareAtPriceInCents &&
    product.compareAtPriceInCents > product.priceInCents;
  const image = product.images[0];

  const variantPrices = product.variants.map((v) => v.priceInCents);
  const hasVariants = variantPrices.length > 0;
  const minPrice = hasVariants
    ? Math.min(...variantPrices)
    : product.priceInCents;
  const maxPrice = hasVariants
    ? Math.max(...variantPrices)
    : product.priceInCents;

  // Neueste veröffentlichte COA — wir lesen sie aus `certificates[0]`,
  // das `productCardSelect` bereits einzeln per `orderBy testDate desc,
  // take 1` zieht.
  const latestCoa = product.certificates[0];
  const coaPurity = latestCoa?.purity ?? null;
  const coaLot = latestCoa?.batchNumber ?? null;

  const indexLabel =
    typeof index === "number" && typeof total === "number"
      ? `${String(index).padStart(3, "0")} / ${total}`
      : null;

  const priceDisplay =
    hasVariants && minPrice !== maxPrice
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : formatPrice(minPrice);

  return (
    <article
      data-testid="product-card"
      className={cn(
        "group relative flex flex-col",
        "bg-card border border-border rounded-sm",
        // Ruhige, kühle Anhebung: Ink-Schatten + Viridian-Rand-Andeutung —
        // dieselbe taktile Sprache wie Card variant="lift".
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:-translate-y-0.5",
        "hover:shadow-[0_18px_40px_-28px_hsl(218_35%_7%/0.4)]",
        "animate-fade-in",
      )}
    >
      {/* Karten-Link als unsichtbares Overlay über der GESAMTEN Karte.
          Vorher war die ganze Karte ein <Link> mit <button>-Kindern —
          interaktiv-in-interaktiv ist invalides HTML und macht den
          Accessibility-Tree für Screenreader unbrauchbar. Jetzt sind
          Link und Action-Buttons Geschwister: das Overlay (z-[1]) fängt
          Klicks auf die Kartenfläche, die Buttons liegen mit z-10
          DARÜBER und brauchen keine preventDefault/stopPropagation-
          Hacks mehr. Tab-Reihenfolge bleibt: Link → Wishlist → Add. */}
      <Link
        href={`/products/${product.slug}`}
        className="absolute inset-0 z-[1] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* Kopfzeile: Mono-Mikrozeile mit Haarlinie — Kategorie · Index ·
          Wishlist. Liest wie die Kennzeile eines Probenblatts. */}
      <div className="relative flex items-center justify-between gap-2 border-b border-border px-5 py-3 font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-primary-strong">
            {product.category.name}
          </span>
          {product.isBestseller && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-primary/30 bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em] text-primary-strong">
              <span aria-hidden className="h-1 w-1 bg-primary" />
              Bestseller
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {indexLabel && <span className="tabular-nums">{indexLabel}</span>}
          <WishlistCardSlot productId={product.id} />
        </div>
      </div>

      {/* Media — Produktbild oder Vial-Fallback.
          Kein Lot-Label-Overlay (die Lot-Nummer steht unten in der
          Spec-Tabelle). object-contain, damit freigestellte Vial-Bilder
          nicht beschnitten werden. Hintergrund bewusst reines bg-card,
          damit eine transparente Vial ohne grauen Rahmen "floated". */}
      <div className="relative mx-auto my-6 h-[190px] w-full max-w-[240px] px-4">
        {image ? (
          <div className="relative h-full w-full bg-card">
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              priority={priority}
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
            />
          </div>
        ) : (
          // Vial-Fallback als CSS-Gradient — nur wenn kein Produktbild da
          // ist. Hält die Specimen-Karte kohärent statt "Kein Bild"-Text.
          <VialFallback name={product.name} weight={product.weight} lot={coaLot} />
        )}

        {/* "Ausverkauft"-Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-[2px]">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive">
              Ausverkauft
            </span>
          </div>
        )}
      </div>

      {/* Mess-Lineal als Trenner zwischen Media und Datenteil —
          Signatur-Detail der Protokoll-Sprache. */}
      <div aria-hidden className="tick-rule mx-5" />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {/* Name in Fraunces — der einzige Serif-Moment der Karte */}
        <h3 className="relative font-display text-[22px] font-medium leading-tight tracking-[-0.01em] line-clamp-1 transition-colors duration-300 group-hover:text-primary-strong">
          {product.name}
        </h3>

        {/* Spezifikationen als Mono-Tabelle mit Haarlinien — nur Zeilen,
            die auch Daten haben */}
        <dl className="relative mt-3 divide-y divide-border border-y border-border">
          {product.weight && <SpecRow k="Menge" v={product.weight} />}
          {coaPurity != null && (
            <SpecRow k="Reinheit" v={`${coaPurity.toFixed(2)} %`} accent />
          )}
          {coaLot && <SpecRow k="Lot" v={coaLot} />}
        </dl>

        {/* Fußzeile: Preis (Mono, tabular) + Quick-Add */}
        <div className="relative mt-auto flex items-baseline justify-between gap-3 pt-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums">
              {priceDisplay}
            </span>
            {!hasVariants && hasDiscount && (
              <span className="font-mono text-xs text-muted-foreground line-through tabular-nums">
                {formatPrice(product.compareAtPriceInCents!)}
              </span>
            )}
          </div>

          {/* Quick-Add nur bei Variant-freien, verfügbaren Produkten.
              Blendet bei Hover/Fokus ein, ersetzt den Text-CTA, damit das
              Zeilen-Layout stabil bleibt. Client-Island — der Rest der
              Card ist SSR-only. */}
          {!isOutOfStock && !hasVariants ? (
            <ProductCardAddButton
              productId={product.id}
              name={product.name}
              slug={product.slug}
              priceInCents={product.priceInCents}
              stock={product.stock}
              image={image?.url ?? null}
            />
          ) : (
            <span
              className={cn(
                "font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-strong",
                "opacity-0 translate-x-2 transition-all duration-200",
                "group-hover:opacity-100 group-hover:translate-x-0",
                // Tastatur-Fokus: Karte ist der Link — bei Fokus den CTA
                // sichtbar machen, sonst liegt der Fokus auf unsichtbarem Text.
                "group-focus-within:opacity-100 group-focus-within:translate-x-0",
              )}
            >
              Ansehen &rarr;
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Dünner Server-Wrapper um den `"use client"`-WishlistButton. Das
 * `z-10` hebt den Button über das Karten-Link-Overlay (z-[1]), damit
 * Klicks beim Button landen statt zu navigieren — der frühere
 * preventDefault/stopPropagation-Hack im Button entfällt dadurch.
 */
function WishlistCardSlot({ productId }: { productId: string }) {
  return (
    <div className="relative z-10 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <WishlistButton
        productId={productId}
        className="h-8 w-8 rounded-[2px] bg-transparent hover:bg-muted"
      />
    </div>
  );
}

function SpecRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 font-mono text-[12.5px]">
      <span className="uppercase tracking-[0.08em] text-[10.5px] text-muted-foreground">
        {k}
      </span>
      <span
        className={cn(
          "max-w-[60%] truncate text-right tabular-nums",
          accent ? "font-semibold text-primary-strong" : "text-foreground",
        )}
      >
        {v}
      </span>
    </div>
  );
}

function VialFallback({
  name,
  weight,
  lot,
}: {
  name: string;
  weight: string | null;
  lot: string | null;
}) {
  // CSS-Gradient-Vial als ruhiger Fallback — kühles Laborglas mit
  // Viridian-Stich statt Bernstein. Das echte Produktbild hat Vorrang
  // (Image-Branch oben); dieser Branch greift nur, wenn im Katalog noch
  // kein Bild hinterlegt ist.
  return (
    <div
      className="relative mx-auto h-full w-24 rounded-[4px_4px_2px_2px] transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:-translate-y-0.5"
      style={{
        background:
          "linear-gradient(to right, hsl(200 20% 55% / 0.25) 0%, hsl(186 28% 82%) 30%, hsl(180 32% 93%) 50%, hsl(186 28% 82%) 70%, hsl(200 20% 55% / 0.25) 100%)",
        boxShadow:
          "inset 0 0 16px hsl(192 35% 35% / 0.18), 0 6px 18px hsl(215 30% 25% / 0.12)",
      }}
      aria-hidden
    >
      {/* Bördelkappe — kaltes Nachtblau statt Gummi-Braun */}
      <span
        className="absolute -top-3 left-1/2 h-4 w-8 -translate-x-1/2 rounded-[2px]"
        style={{ background: "hsl(218 30% 14%)" }}
      />
      {/* Etikett */}
      <div className="absolute inset-x-0 bottom-[18%] top-[36%] flex flex-col justify-center border-y border-[hsl(196_18%_72%)] bg-background/95 px-1.5">
        <p className="truncate text-center font-mono text-[8px] font-semibold leading-tight text-foreground">
          {lot ?? name}
        </p>
        {weight && (
          <p className="mt-0.5 text-center font-mono text-[7px] leading-tight text-primary-strong">
            {weight}
          </p>
        )}
      </div>
    </div>
  );
}
