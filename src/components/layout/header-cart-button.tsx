"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cart-store";

/**
 * Client-Island: Cart-Icon mit Live-Badge aus dem Zustand-Cart-Store.
 * Vorher Teil des fully-client Headers — jetzt isolierter Mini-Bundle,
 * der Rest der Header-Markup bleibt SSR-HTML.
 */
export function HeaderCartButton() {
  // Individual selector — Zustand v5 + React 19 verträgt keine
  // Object-Selectors oder Methoden-Calls innerhalb des Selectors.
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={openCart}
      aria-label={`Warenkorb${totalItems > 0 ? ` (${totalItems})` : ""}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
          {totalItems}
        </Badge>
      )}
    </Button>
  );
}
