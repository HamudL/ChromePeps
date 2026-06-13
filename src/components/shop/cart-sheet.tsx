"use client";

/**
 * Cart-Sheet als kompaktes Bestellprotokoll.
 *
 * Gleiche Zustand-Verdrahtung, gleiche Controls — die Präsentation folgt
 * der Beleg-Sprache: Positionen als Protokollzeilen mit Haarlinien, Mono-
 * Beträge, Summenblock mit Netto/Versand/MwSt.-Aufschlüsselung und
 * Doppellinie über dem Gesamtbetrag. Der "Inklusive"-Block macht das
 * CoA-Versprechen genau im Kaufmoment sichtbar.
 *
 * Preise sind Brutto — der MwSt.-Anteil wird aus dem Gesamtbetrag
 * herausgerechnet (nicht aufgeschlagen). Versand nutzt die kanonischen
 * Konstanten aus `lib/order/calculate-totals` — ändert sich dort die
 * Geschäftsregel, folgt die Quittung automatisch.
 */

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, Check, Lock } from "lucide-react";
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
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
              <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5">
              <p className="mono-tag text-primary-strong">
                Protokoll · 0 Positionen
              </p>
              <p className="text-base font-semibold tracking-tight">
                Noch keine Peptide ausgewählt
              </p>
              <p className="mx-auto max-w-[16rem] text-sm text-muted-foreground leading-relaxed">
                Jede Charge HPLC&#8209;geprüft, mit CoA&#8209;PDF und Lot&#8209;Nummer
                per E&#8209;Mail. Entdecken Sie das Sortiment.
              </p>
            </div>
            <Button variant="gold" onClick={closeCart} asChild>
              <Link href="/products">Sortiment entdecken</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Free-Shipping-Fortschritt — zeigt direkt im Kaufmoment, wie
                viel bis zum Gratisversand fehlt (AOV-Hebel). Schwelle &
                Subtotal kommen aus derselben Quelle wie die Receipt-Werte. */}
            <FreeShippingProgress subtotal={totalPrice} />

            {/* Positionen als Protokollzeilen mit Haarlinien */}
            <div className="flex-1 overflow-y-auto px-6">
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-4 py-4"
                  >
                    <div className="relative h-20 w-20 rounded-sm overflow-hidden border border-border bg-card flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-1"
                          sizes="80px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-mono text-[9px] tracking-[0.1em] uppercase text-muted-foreground">
                          Kein Bild
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-semibold tracking-tight hover:text-primary-strong transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <span className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
                          {formatPrice(item.priceInCents * item.quantity)}
                        </span>
                      </div>
                      {item.variantName && (
                        <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-muted-foreground mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatPrice(item.priceInCents)} / Stk.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
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
                          className="text-sm w-6 text-center font-mono tabular-nums"
                          aria-label={`Menge: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={`Menge von ${item.name} erhöhen`}
                          // Plus deaktivieren, sobald der beim Hinzufügen
                          // bekannte Lagerbestand erreicht ist — vorher
                          // ließ sich beliebig hochklicken und erst der
                          // Checkout hat abgelehnt. (Alt-Items aus dem
                          // persistierten Cart ohne stock-Feld bleiben
                          // bedienbar: undefined-Vergleich ist false.)
                          disabled={item.quantity >= item.stock}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto text-destructive"
                          aria-label={`${item.name} aus Warenkorb entfernen`}
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Beleg-Footer */}
            <SheetFooter className="flex-col gap-0 sm:flex-col p-0 border-t bg-muted/30">
              <div className="px-6 py-5 space-y-1.5">
                <ReceiptRow
                  k="Zwischensumme (netto)"
                  v={formatPrice(totalPrice - vatShare)}
                />
                <ReceiptRow
                  k="Versand DHL"
                  v={shippingFree ? "Gratis" : `ab ${formatPrice(shippingCents)}`}
                  positive={shippingFree}
                />
                <ReceiptRow k="MwSt. 19 %" v={formatPrice(vatShare)} />

                {/* Doppellinie über dem Gesamtbetrag — Belegabschluss */}
                <div className="mt-3 border-t-[3px] border-double border-foreground/80 pt-2 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground font-semibold">
                    Gesamt
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-tight tabular-nums">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Included block — das einzige Extra, das wir hier
                    konkret zusagen können, ist der CoA-Versand. "Kühl-
                    versand & Lot-Tracking" und "14 Tage Widerrufsrecht"
                    waren im Design-Handoff Platzhalter, gehören aber
                    inhaltlich nicht in die Sheet-Quittung. */}
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="mono-tag text-primary-strong mb-2">
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
                  variant="gold"
                  className="w-full gap-2"
                  size="lg"
                  onClick={closeCart}
                  asChild
                >
                  <Link href="/checkout">
                    Zur Kasse · {formatPrice(totalPrice)}
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
                {/* Vertrauenssignal direkt am Bezahl-Moment — Mono-Zeile
                    in der Sprache der site-weiten .trust-pill. */}
                <p className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
                  <Lock className="h-3 w-3 text-primary-strong" strokeWidth={2.5} aria-hidden />
                  SSL&#8209;verschlüsselter Checkout
                </p>
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
            ? "text-success font-medium"
            : "text-foreground tabular-nums"
        }
      >
        {v}
      </span>
    </div>
  );
}

function IncludedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Check className="h-3 w-3 text-primary-strong shrink-0" strokeWidth={3} />
      {children}
    </li>
  );
}

function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotal);
  const pct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100),
  );

  return (
    <div className="border-b px-6 py-3">
      {reached ? (
        <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.04em] text-success">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
          Gratisversand freigeschaltet
        </p>
      ) : (
        <>
          <p className="mb-1.5 font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
            Noch{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatPrice(remaining)}
            </span>{" "}
            bis zum Gratisversand
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-sm bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fortschritt bis zum Gratisversand"
          >
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
