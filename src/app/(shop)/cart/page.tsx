"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/order/calculate-totals";

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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Warenkorb</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-72 bg-muted animate-pulse rounded-lg" />
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

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Ihr Warenkorb ist leer</h1>
          <p className="text-muted-foreground">
            Sie haben noch keine Produkte in Ihren Warenkorb gelegt.
            Entdecken Sie unser Sortiment an hochwertigen Research Peptides.
          </p>
          <Button size="lg" asChild>
            <Link href="/products">
              Produkte entdecken
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-5">
        <div>
          <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-strong">
            Warenkorb · {items.reduce((s, i) => s + i.quantity, 0)} Artikel
          </p>
          <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.02em] md:text-4xl">
            Warenkorb
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={clearCart}
        >
          Warenkorb leeren
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const itemSubtotal = item.priceInCents * item.quantity;
            return (
              <Card key={`${item.productId}-${item.variantId}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-md overflow-hidden bg-muted flex-shrink-0"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 96px, 112px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <Link
                            href={`/products/${item.slug}`}
                            className="font-semibold hover:underline line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          {item.variantName && (
                            <p className="text-sm text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatPrice(item.priceInCents)} pro Stk.
                          </p>
                        </div>
                        <p className="font-semibold text-right whitespace-nowrap">
                          {formatPrice(itemSubtotal)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity - 1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            disabled={item.quantity >= item.stock}
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity + 1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {/* Max-Bestand-Hint mit konkreter Zahl
                              wurde entfernt — Stock-Werte sind Admin-
                              Info, nicht customer-facing. Der +-Button
                              wird trotzdem disabled wenn Max erreicht
                              (siehe oben). */}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="pt-2">
            <Button variant="outline" asChild>
              <Link href="/products">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Weiter einkaufen
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Bestellübersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Zwischensumme ({items.reduce((s, i) => s + i.quantity, 0)} Artikel)
                </span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versandkosten</span>
                <span>
                  {isFreeShipping ? (
                    <span className="text-success font-medium">Kostenlos</span>
                  ) : (
                    <>ab {formatPrice(shipping)}</>
                  )}
                </span>
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
                    <span className="font-semibold text-foreground">
                      {formatPrice(FREE_SHIPPING_THRESHOLD_CENTS - subtotal)}
                    </span>{" "}
                    bis zum Gratisversand.
                  </p>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
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
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
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

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Gesamt
                </span>
                <span className="text-2xl font-bold tabular-nums tracking-tight">
                  {isFreeShipping ? formatPrice(total) : <>ab {formatPrice(total)}</>}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Alle Preise inkl. 19% MwSt.
              </p>

              <Button className="w-full" size="lg" asChild>
                <Link href="/checkout">
                  Zur Kasse
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
