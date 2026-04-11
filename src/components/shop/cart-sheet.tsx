"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";

export function CartSheet() {
  // Individual selectors — never use object selectors or call store methods
  // inside selectors with Zustand v5 + React 19 (causes Error #185 infinite loop)
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const closeCart = useCartStore((s) => s.closeCart);
  // Compute derived values from items directly instead of calling store methods
  const totalPrice = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Warenkorb ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="h-12 w-12" />
            <p className="font-medium">Ihr Warenkorb ist leer</p>
            <p className="text-sm text-center">Entdecken Sie unser Sortiment an hochwertigen Research Peptides.</p>
            <Button variant="outline" onClick={closeCart} asChild>
              <Link href="/products">Produkte entdecken</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                    <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
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
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-sm font-semibold mt-1">
                        {formatPrice(item.priceInCents)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto text-destructive"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <SheetFooter className="flex-col gap-3 sm:flex-col">
              <div className="flex justify-between w-full text-lg font-semibold">
                <span>Zwischensumme</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Versand und Steuern werden an der Kasse berechnet.
              </p>
              <Button className="w-full" size="lg" onClick={closeCart} asChild>
                <Link href="/checkout">Zur Kasse</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={closeCart} asChild>
                <Link href="/cart">Warenkorb ansehen</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
