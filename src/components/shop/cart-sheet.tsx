"use client";

/**
 * Idea 05 — Cart Sheet as "lab receipt"
 *
 * Same Zustand wiring, same controls, different presentation. The footer
 * becomes a proper receipt with dashed dividers, subtotal / shipping / VAT
 * breakdown (estimated from subtotal), and an "Included" block that surfaces
 * differentiators (CoA PDF per item, cold shipping, 14-day right of
 * withdrawal) at the exact moment the user decides to buy.
 *
 * Prices already include VAT, so the VAT share is derived from the gross
 * total (not added on top). Shipping uses the canonical constants from
 * `lib/order/calculate-totals` — if you change the business rule there,
 * the cart receipt follows automatically.
 */

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  TAX_RATE,
} from "@/lib/order/calculate-totals";

export function CartSheet() {
  // Individual selectors — never use object selectors or call store methods
  // inside selectors with Zustand v5 + React 19 (causes Error #185
  // infinite loop).
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const closeCart = useCartStore((s) => s.closeCart);

  // Derived values — computed from `items` outside the selector so
  // Zustand doesn't re-trigger on identity changes of returned objects.
  const totalPrice = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // VAT is baked into the gross price — extract the share for the receipt.
  // Matches calculateOrderTotals' tax-extraction formula exactly.
  const vatShare = Math.round(totalPrice - totalPrice / (1 + TAX_RATE));
  const shippingFree = totalPrice >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingCents = shippingFree ? 0 : STANDARD_SHIPPING_CENTS;

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Warenkorb
            {itemCount > 0 && (
              <span className="font-mono text-xs text-muted-foreground ml-1">
                · {itemCount} Artikel
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-muted-foreground">
            <ShoppingBag className="h-12 w-12" />
            <p className="font-medium">Ihr Warenkorb ist leer</p>
            <p className="text-sm text-center">
              Entdecken Sie unser Sortiment an hochwertigen Research Peptides.
            </p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href="/products">Produkte entdecken</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-4"
                  >
                    <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={closeCart}
                        className="text-sm font-medium hover:underline line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm font-semibold mt-1 tabular-nums">
                        {formatPrice(item.priceInCents)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
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
                        <span className="text-sm w-6 text-center font-mono">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto text-destructive"
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt footer */}
            <SheetFooter className="flex-col gap-0 sm:flex-col p-0 border-t bg-muted/30">
              <div className="px-6 py-5 space-y-1.5">
                <ReceiptRow
                  k="Zwischensumme (netto)"
                  v={formatPrice(totalPrice - vatShare)}
                />
                <ReceiptRow
                  k="Versand DHL"
                  v={shippingFree ? "Gratis" : formatPrice(shippingCents)}
                  positive={shippingFree}
                />
                <ReceiptRow k="MwSt. 19 %" v={formatPrice(vatShare)} />

                <DashedDivider />

                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                    Gesamt
                  </span>
                  <span className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Included block — das einzige Extra, das wir hier
                    konkret zusagen können, ist der CoA-Versand. "Kühl-
                    versand & Lot-Tracking" und "14 Tage Widerrufsrecht"
                    waren im Design-Handoff Platzhalter, gehören aber
                    inhaltlich nicht in die Sheet-Quittung. */}
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="font-mono text-[9.5px] tracking-[0.15em] uppercase text-primary font-semibold mb-2">
                    Zusätzlich inklusive
                  </p>
                  <ul className="space-y-1">
                    <IncludedItem>
                      {itemCount} × Janoshik CoA (PDF, Lot‑spezifisch)
                    </IncludedItem>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 border-t space-y-2 bg-background">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={closeCart}
                  asChild
                >
                  <Link href="/checkout">
                    Zur Kasse — {formatPrice(totalPrice)}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={closeCart}
                  asChild
                >
                  <Link href="/cart">Warenkorb ansehen</Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- helpers ---------- */

function ReceiptRow({
  k,
  v,
  positive,
}: {
  k: string;
  v: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between font-mono text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={
          positive
            ? "text-[hsl(140_50%_35%)] font-medium"
            : "text-foreground tabular-nums"
        }
      >
        {v}
      </span>
    </div>
  );
}

function DashedDivider() {
  return (
    <div
      aria-hidden
      className="h-px my-2"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, hsl(var(--border)) 0, hsl(var(--border)) 4px, transparent 4px, transparent 8px)",
      }}
    />
  );
}

function IncludedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Check className="h-3 w-3 text-primary shrink-0" strokeWidth={3} />
      {children}
    </li>
  );
}
