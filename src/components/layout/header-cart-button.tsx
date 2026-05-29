"use client";

import { useEffect, useRef, useState } from "react";
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

  // Kurzer Scale-Pop, sobald sich die Anzahl ändert — macht das
  // Hinzufügen sichtbar spürbar. `key={bump}` remountet das Badge und
  // spielt die Pop-Animation erneut ab. prefers-reduced-motion wird vom
  // globalen Catch-All in globals.css neutralisiert.
  const [bump, setBump] = useState(0);
  const prev = useRef(totalItems);
  useEffect(() => {
    if (totalItems !== prev.current) {
      const increased = totalItems > prev.current;
      prev.current = totalItems;
      if (increased) setBump((b) => b + 1);
    }
  }, [totalItems]);

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
        <Badge
          key={bump}
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px] animate-pop"
        >
          {totalItems}
        </Badge>
      )}
    </Button>
  );
}
