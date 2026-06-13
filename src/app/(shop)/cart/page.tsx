"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingCart,
  Check,
  FlaskConical,
  Lock,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/order/calculate-totals";
import { CartCrossSell } from "@/components/shop/cart-cross-sell";
import { CartPromoInput } from "@/components/shop/cart-promo-input";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="h-4 w-40 shimmer-gold rounded-sm" />
          <div className="mt-4 h-10 w-64 shimmer-gold rounded-sm" />
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 shimmer-gold rounded-sm" />
            ))}
          </div>
          <div className="h-72 shimmer-gold rounded-sm" />
        </div>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );
  // Versand-Logik konsistent mit lib/order/calculate-totals. Cart zeigt
  // keinen Promo-Discount und KEIN konkretes Land an — der finale Preis
  // pro Land kommt erst im Checkout, wenn die Adresse bekannt ist. Wir
  // nehmen den DE-Standard-Tarif als "ab"-Anchor und kommunizieren das
  // über das Label ("ab"). Free-Shipping-Schwelle gilt EU-weit, also
  // ist der Free-Hinweis weiter exakt korrekt.
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shipping = isFreeShipping ? 0 : STANDARD_SHIPPING_CENTS;
  const total = subtotal + shipping;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-md">
          <div className="tick-rule" aria-hidden />
          <div className="space-y-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
              <FlaskConical className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <span className="eyebrow justify-center">
                Bestellprotokoll · 0 Positionen
              </span>
              <h1 className="display-title text-3xl">
                Ihr Warenkorb ist leer
              </h1>
            </div>
            <p className="text-muted-foreground">
              Sie haben noch keine Produkte in Ihren Warenkorb gelegt.
              Entdecken Sie unser Sortiment an hochwertigen Research Peptides.
            </p>
            <Button variant="gold" size="lg" asChild>
              <Link href="/products">
                Produkte entdecken
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="tick-rule" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Protokollkopf */}
      <header className="mb-8">
        <span className="eyebrow">Bestellprotokoll</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="display-title text-3xl md:text-4xl">Warenkorb</h1>
          <div className="flex items-center gap-4">
            <span className="mono-label text-muted-foreground">
              {itemCount} Artikel · {items.length}{" "}
              {items.length === 1 ? "Position" : "Positionen"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={clearCart}
            >
              Warenkorb leeren
            </Button>
          </div>
        </div>
        <div className="tick-rule mt-5" aria-hidden />
      </header>

      <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
        {/* Positionen als Protokollzeilen */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="mono-tag text-muted-foreground">Position</span>
            <span className="mono-tag text-muted-foreground">Summe</span>
          </div>

          <ul className="divide-y divide-border">
            {items.map((item, idx) => {
              const itemSubtotal = item.priceInCents * item.quantity;
              return (
                <li
                  key={`${item.productId}-${item.variantId}`}
                  className="py-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="hidden w-7 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground sm:block">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Produktbild */}
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-border bg-card"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-1"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                          Kein Bild
                        </div>
                      )}
                    </Link>

                    {/* Bezeichnung + Stepper */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.slug}`}
                        className="gold-underline line-clamp-2 font-semibold leading-snug hover:text-primary-strong"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatPrice(item.priceInCents)} / Stk.
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={`Menge von ${item.name} verringern`}
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity - 1
                            )
                          }
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <span
                          className="w-8 text-center font-mono text-sm tabular-nums"
                          aria-label={`Menge: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={item.quantity >= item.stock}
                          aria-label={`Menge von ${item.name} erhöhen`}
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity + 1
                            )
                          }
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        {/* Max-Bestand-Hint mit konkreter Zahl
                            wurde entfernt — Stock-Werte sind Admin-
                            Info, nicht customer-facing. Der +-Button
                            wird trotzdem disabled wenn Max erreicht
                            (siehe oben). */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-1 h-9 w-9 text-destructive hover:text-destructive"
                          aria-label={`${item.name} aus Warenkorb entfernen`}
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {/* Zeilensumme */}
                    <p className="whitespace-nowrap pt-0.5 text-right font-mono font-semibold tabular-nums">
                      {formatPrice(itemSubtotal)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border pt-5">
            <Button variant="outline" asChild>
              <Link href="/products">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Weiter einkaufen
              </Link>
            </Button>
          </div>
        </div>

        {/* Summenblock als Beleg */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-4">
              <span className="eyebrow">Beleg</span>
              <CardTitle className="display-title mt-2 text-xl">
                Zusammenfassung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    Zwischensumme · {itemCount} Artikel
                  </span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Versand</span>
                  {isFreeShipping ? (
                    <span className="font-medium text-success">Kostenlos</span>
                  ) : (
                    <span className="tabular-nums">
                      ab {formatPrice(shipping)}
                    </span>
                  )}
                </div>
              </div>

              {isFreeShipping ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Gratisversand freigeschaltet
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Noch{" "}
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {formatPrice(FREE_SHIPPING_THRESHOLD_CENTS - subtotal)}
                    </span>{" "}
                    bis zum Gratisversand.
                  </p>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-sm bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.min(
                      100,
                      Math.round((subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100),
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Fortschritt bis zum Gratisversand"
                  >
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Endgültige Versandkosten je nach Lieferland im Checkout.
                  </p>
                </div>
              )}

              <hr className="rule-gold" />

              <CartPromoInput />

              {/* Summenzeile mit Doppellinie — Abschluss des Belegs */}
              <div className="border-t-[3px] border-double border-foreground/80 pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="stat-key">Gesamt</span>
                  <span className="font-mono text-2xl font-semibold tabular-nums">
                    {isFreeShipping ? (
                      formatPrice(total)
                    ) : (
                      <>ab {formatPrice(total)}</>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  Alle Preise inkl. 19% MwSt.
                </p>
              </div>

              <Button variant="gold" className="w-full" size="lg" asChild>
                <Link href="/checkout">
                  Zur Kasse
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="trust-pill">
                  <Lock className="h-3 w-3" aria-hidden />
                  SSL
                </span>
                <span className="trust-pill">
                  <FlaskConical className="h-3 w-3" aria-hidden />
                  CoA je Charge
                </span>
                <span className="trust-pill">
                  <PackageCheck className="h-3 w-3" aria-hidden />
                  Diskret
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CartCrossSell />
    </div>
  );
}
