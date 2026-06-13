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
 * ----------------------------------------------------------------
 * Ruhige Specimen-Abbildung: ein statisches Hauptbild plus
 * Thumbnail-Leiste. Der frühere Pointer-Tilt-Effekt ist bewusst
 * entfernt — das Dossier zeigt die Probe, es spielt nicht mit ihr.
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
  /**
   * Wie das Bild in seinen Aspect-Square-Slot passt.
   * - "cover" (für Lifestyle-/Produkt-Shots mit Hintergrund)
   * - "contain" (für freigestellte Vial-Bilder ohne Hintergrund —
   *   verhindert Beschnitt und lässt den Frame-Hintergrund
   *   drum herum sichtbar)
   */
  fit?: "cover" | "contain";
  /**
   * Entfernt den eigenen Gallery-Frame (Border + Background). Der
   * umgebende Container liefert dann den visuellen Rahmen — nützlich,
   * wenn die Gallery innerhalb des Dossier-Media-Frames mit
   * Raster-Pattern sitzt, damit das Pattern bis unter die
   * freigestellte Vial durchscheint.
   */
  frameless?: boolean;
}) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-sm border border-border bg-muted font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Kein Bild verfügbar
      </div>
    );
  }

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const mainFrame = frameless
    ? "relative aspect-square overflow-hidden"
    : "relative aspect-square overflow-hidden rounded-sm border border-border bg-muted";

  return (
    <div className="space-y-3">
      {/* Hauptbild — statisch, priority für LCP. */}
      <div className={mainFrame}>
        <Image
          src={images[selected].url}
          alt={images[selected].alt}
          fill
          className={fitClass}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          draggable={false}
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
              aria-pressed={i === selected}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border bg-card transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                i === selected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border opacity-60 hover:border-primary/40 hover:opacity-100"
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
      {/* Varianten — eckige Specimen-Buttons mit Mono-Preis */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <span className="field-label !mb-0">Variante wählen</span>
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
                    "rounded-sm border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary hover:text-primary-strong"
                  )}
                >
                  {variant.name}
                  <span
                    className={cn(
                      "ml-2 font-mono text-xs tabular-nums",
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

      {/* Preis-Band — Messwert in Mono, tabular. */}
      <div className="flex items-baseline justify-between gap-4 border-y border-border py-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[30px] font-semibold leading-none tracking-tight tabular-nums">
            {selectedVariant
              ? formatPrice(selectedVariant.priceInCents)
              : priceDisplay}
          </span>
          {variants.length === 0 && hasSale && product.compareAtPriceInCents && (
            <span className="font-mono text-base tabular-nums text-muted-foreground line-through">
              {formatPrice(product.compareAtPriceInCents)}
            </span>
          )}
        </div>
        <p className="max-w-[180px] text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
          Inkl. 19 % MwSt.
          <br />
          Gratis Versand ab 200 €
        </p>
      </div>

      {/* Mengen-Wähler */}
      <div className="flex items-center gap-3">
        <span
          id="pdp-qty-label"
          className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Menge
        </span>
        <div
          role="group"
          aria-labelledby="pdp-qty-label"
          className="flex items-center rounded-sm border border-border"
        >
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
          <span className="w-10 text-center font-mono text-sm font-medium tabular-nums">
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
        variant="gold"
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
            In den Warenkorb · {formatPrice(effectivePrice * quantity)}
          </>
        )}
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Sequence Copy Block
 * Gerahmte Mono-Darstellung der Aminosäuresequenz mit
 * Copy-to-Clipboard-Button. Kleine Convenience für Forschende, die
 * Sequenzen direkt ins Laborjournal oder Bioinformatik-Tool
 * übernehmen wollen, ohne sie abzutippen.
 * ----------------------------------------------------------------*/

export function SequenceCopyBlock({ sequence }: { sequence: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sequence);
      setCopied(true);
      // "Kopiert"-State nach ~1,5 s zurücksetzen, damit wiederholtes
      // Kopieren bei jedem Klick visuelles Feedback gibt.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard-API kann in unsicheren Kontexten (http:) fehlschlagen;
      // dann passiert nichts — die Sequenz bleibt als Text sichtbar.
    }
  };

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Dna className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
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
      {/* Sequenz */}
      <div className="overflow-x-auto p-4">
        <code className="break-all font-mono text-sm leading-relaxed text-foreground/90">
          {sequence}
        </code>
      </div>
    </div>
  );
}
