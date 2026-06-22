"use client";

import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

interface ProductCardAddButtonProps {
  productId: string;
  name: string;
  slug: string;
  priceInCents: number;
  stock: number;
  image: string | null;
}

/**
 * Quick-Add-Button als Client-Island in der ansonsten Server-gerenderten
 * ProductCard. Vorher war die gesamte ProductCard `"use client"` weil
 * useCartStore hier hängt — dadurch zahlte jede einzelne Card (12-20
 * pro Listing) den Hydration-Cost für statisches Markup.
 *
 * Jetzt: nur dieser kleine Button hydratet, der Rest der Card ist
 * reines SSR-HTML.
 */
export function ProductCardAddButton({
  productId,
  name,
  slug,
  priceInCents,
  stock,
  image,
}: ProductCardAddButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  // Kein preventDefault/stopPropagation mehr nötig: der Button liegt in
  // der ProductCard nicht mehr IM Link, sondern als Geschwister mit
  // z-10 über dem Karten-Link-Overlay — Klicks erreichen den Link gar
  // nicht erst.
  function handleAddToCart() {
    addItem({
      productId,
      variantId: null,
      quantity: 1,
      name,
      variantName: null,
      priceInCents,
      image,
      slug,
      stock,
    });
    openCart();
    toast.success(`${name} zum Warenkorb hinzugefügt`);
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      aria-label={`${name} in den Warenkorb`}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] uppercase font-semibold text-primary",
        // z-10 hebt den Button über das Karten-Link-Overlay (z-[1]),
        // sonst würde jeder Klick die Produktseite öffnen.
        "relative z-10",
        "opacity-0 translate-x-2 transition-all duration-250",
        "group-hover:opacity-100 group-hover:translate-x-0",
        "hover:text-primary/80",
        // Tastatur-Fokus: Button sichtbar machen, sobald er selbst oder
        // der Karten-Link fokussiert ist — sonst läge der Fokus auf
        // unsichtbarem Text (analog zum "Ansehen →"-Fallback).
        "group-focus-within:opacity-100 group-focus-within:translate-x-0",
      )}
    >
      <ShoppingCart className="h-3 w-3" />
      Add
    </button>
  );
}
