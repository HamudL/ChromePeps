"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Minus, Plus, Check, Copy, Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";

/* ----------------------------------------------------------------
 * Image Gallery
 * ----------------------------------------------------------------*/

interface GalleryImage {
  url: string;
  alt: string;
}

export function ImageGallery({
  images,
  fit = "cover",
  frameless = false,
}: {
  images: GalleryImage[];
  productName?: string;
  /**
   * Wie das Bild in seinen Aspect-Square-Slot passt.
   * - "cover" (default, für lifestyle/product-shots mit Hintergrund)
   * - "contain" (für freigestellte Vial-Bilder ohne Hintergrund —
   *   verhindert Beschnitt und lässt ggf. einen Frame-Hintergrund
   *   drum herum sichtbar)
   */
  fit?: "cover" | "contain";
  /**
   * Entfernt den eigenen Gallery-Frame (Border + Background). Der
   * umgebende Container liefert dann den visuellen Rahmen — nützlich,
   * wenn die Gallery z.B. innerhalb eines Apotheke-Media-Frames mit
   * Grid-Pattern sitzen soll, damit der Pattern bis unter die
   * freigestellte Vial durchscheint.
   */
  frameless?: boolean;
}) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-sm">
        No Image Available
      </div>
    );
  }

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const mainFrame = frameless
    ? "relative aspect-square overflow-hidden"
    : "relative aspect-square rounded-lg border bg-muted overflow-hidden";

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className={mainFrame}>
        <Image
          src={images[selected].url}
          alt={images[selected].alt}
          fill
          className={fitClass}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`Bild ${i + 1} anzeigen`}
              className={cn(
                "relative h-16 w-16 shrink-0 rounded-md border overflow-hidden bg-muted transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                i === selected
                  ? "ring-2 ring-primary border-primary"
                  : "opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                className={fitClass}
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
 * Variant Buy Panel
 * ----------------------------------------------------------------
 *
 * Früher waren `VariantSelector` und `AddToCartButton` zwei
 * voneinander unabhängige Components, die per `window.dispatchEvent`
 * kommunizierten. Das war fragil:
 *   - Zwei PDP-Tabs offen → Variant-Auswahl in Tab A setzte den
 *     Preis in Tab B mit, weil beide auf denselben globalen Event
 *     hörten.
 *   - Unter React 19 Strict Mode (dev) wurde `useEffect` doppelt
 *     invoked → zwei Listener, State-Update feuerte zweimal, Button
 *     flickerte.
 *
 * Jetzt: ein kombinierter Panel-Component der den `selectedVariant`-
 * State lokal hält. Keine globalen Events mehr.
 * ----------------------------------------------------------------*/

interface VariantOption {
  id: string;
  name: string;
  priceInCents: number;
  stock: number;
}

interface VariantBuyPanelProduct {
  id: string;
  name: string;
  slug: string;
  priceInCents: number;
  stock: number;
  image: string | null;
  compareAtPriceInCents: number | null;
}

export function VariantBuyPanel({
  product,
  variants,
  priceDisplay,
}: {
  product: VariantBuyPanelProduct;
  variants: VariantOption[];
  /**
   * Der server-berechnete Anzeige-Preis für das Preisband zwischen
   * Variants und CTA. Kann eine Range sein ("9,99 € – 19,99 €"), ein
   * Einzelpreis oder etwas anderes. Wird hier nur gerendert, nicht
   * interpretiert.
   */
  priceDisplay: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  const effectivePrice = selectedVariant
    ? selectedVariant.priceInCents
    : product.priceInCents;
  const isOutOfStock = effectiveStock <= 0;
  const needsVariant = variants.length > 0 && !selectedVariant;
  const hasSale =
    product.compareAtPriceInCents !== null &&
    product.compareAtPriceInCents > product.priceInCents;

  function handleSelectVariant(v: VariantOption) {
    if (v.stock <= 0) return;
    setSelectedVariant(v);
    // reset quantity falls die vorherige Auswahl eine höhere Zahl
    // erlaubt hatte, die neue Variante aber weniger Stock hat
    setQuantity((q) => Math.min(q, v.stock, 99));
    setAdded(false);
  }

  function handleAdd() {
    if (isOutOfStock || needsVariant) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      quantity,
      name: product.name,
      variantName: selectedVariant?.name ?? null,
      priceInCents: effectivePrice,
      image: product.image,
      slug: product.slug,
      stock: effectiveStock,
    });
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Variant-Buttons */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Variante wählen</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const outOfStock = variant.stock <= 0;
              const isSelected = selectedVariant?.id === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={outOfStock}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectVariant(variant)}
                  className={cn(
                    "rounded-md border px-4 py-2 text-sm font-medium transition-all",
                    "hover:border-primary hover:text-primary",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isSelected &&
                      "bg-primary text-primary-foreground border-primary hover:text-primary-foreground"
                  )}
                >
                  {variant.name}
                  <span
                    className={cn(
                      "ml-1.5 text-xs",
                      isSelected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatPrice(variant.priceInCents)} inkl. MwSt.
                  </span>
                  {outOfStock && (
                    <span className="ml-1 text-xs">(Ausverkauft)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preis-Band (Apotheke-Stil) */}
      <div className="flex items-baseline justify-between gap-4 py-5 border-y border-border">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[32px] font-bold tracking-[-0.02em] tabular-nums leading-none">
            {selectedVariant
              ? formatPrice(selectedVariant.priceInCents)
              : priceDisplay}
          </span>
          {variants.length === 0 && hasSale && product.compareAtPriceInCents && (
            <span className="text-base text-muted-foreground line-through tabular-nums">
              {formatPrice(product.compareAtPriceInCents)}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground text-right max-w-[180px] leading-relaxed">
          Inkl. 19 % MwSt.
          <br />
          Gratis Versand ab 200 €
        </p>
      </div>

      {/* Mengen-Wähler */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Menge</label>
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Menge verringern"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-10 text-center text-sm font-medium">
            {quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-l-none"
            onClick={() =>
              setQuantity((q) => Math.min(q + 1, effectiveStock, 99))
            }
            disabled={quantity >= Math.min(effectiveStock, 99)}
            aria-label="Menge erhöhen"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {/* Stock-Cap bleibt im Button-disabled aktiv, aber die exakte
            Lagerzahl ist Customer-facing nicht relevant — siehe Q2-Direktive. */}
      </div>

      {/* In den Warenkorb */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={isOutOfStock || needsVariant}
        onClick={handleAdd}
      >
        {added ? (
          <>
            <Check className="h-5 w-5" />
            Hinzugefügt
          </>
        ) : isOutOfStock ? (
          "Ausverkauft"
        ) : needsVariant ? (
          "Variante wählen"
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            In den Warenkorb — {formatPrice(effectivePrice * quantity)}
          </>
        )}
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Sequence Copy Block
 * A framed monospace display of the amino acid sequence with a
 * copy-to-clipboard button. Small convenience for researchers who
 * want to paste sequences straight into their lab notebook or
 * bioinformatics tool without retyping them.
 * ----------------------------------------------------------------*/

export function SequenceCopyBlock({ sequence }: { sequence: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sequence);
      setCopied(true);
      // Reset the "Copied" state after ~1.5 s so repeated copies
      // still give visual feedback on each click.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can fail in insecure contexts (http:); in that
      // case do nothing — the plain-text sequence is still visible.
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <Dna className="h-3.5 w-3.5 text-primary" />
          Aminosäuresequenz
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs"
          aria-label="Sequenz kopieren"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Kopieren
            </>
          )}
        </Button>
      </div>
      {/* Sequence body */}
      <div className="overflow-x-auto p-4">
        <code className="font-mono text-sm break-all leading-relaxed text-foreground/90">
          {sequence}
        </code>
      </div>
    </div>
  );
}
