"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";

const SHIPPING_THRESHOLD_CENTS = 10000; // 100 EUR
const SHIPPING_COST_CENTS = 599; // 5.99 EUR
const TAX_RATE = 0.19; // 19%

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
  const shipping = subtotal >= SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_COST_CENTS;
  const taxableAmount = subtotal + shipping;
  const estimatedTax = Math.round(taxableAmount * TAX_RATE);
  const total = taxableAmount + estimatedTax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Ihr Warenkorb ist leer</h1>
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Warenkorb</h1>
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
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
                          {item.quantity >= item.stock && (
                            <span className="text-xs text-amber-600 ml-1">
                              Max stock
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
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
              <CardTitle>Bestellübersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Zwischensumme ({items.reduce((s, i) => s + i.quantity, 0)} Artikel)
                </span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versandkosten (geschätzt)</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">Kostenlos</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>

              {shipping > 0 && (
                <p className="text-xs text-muted-foreground">
                  Kostenloser Versand ab {formatPrice(SHIPPING_THRESHOLD_CENTS)}
                </p>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  MwSt. (19%, geschätzt)
                </span>
                <span>{formatPrice(estimatedTax)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Gesamt</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button className="w-full" size="lg" asChild>
                <Link href="/checkout">
                  Zur Kasse
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Versand und Steuern werden an der Kasse berechnet. Alle Preise inkl. MwSt.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
