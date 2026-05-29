"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/store/wishlist-store";

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  // Zustand v5 + React 19: NUR Einzel-Property-Selektoren (kein Objekt-
  // Destructuring) — sonst abonniert jede der 12-20 Karten den ganzen
  // Store und re-rendert bei jeder ids-Änderung (Error #185-Risiko).
  // `active` selektiert ein Primitive (boolean) → re-rendert nur, wenn
  // sich GENAU dieses Produkt ändert.
  const toggle = useWishlistStore((s) => s.toggle);
  const active = useWishlistStore((s) => s.ids.has(productId));

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        toggle(productId);
        if (active) {
          toast("Von Merkliste entfernt");
        } else {
          toast.success("Zur Merkliste hinzugefügt");
        }
      }}
      aria-label={active ? "Von Merkliste entfernen" : "Zur Merkliste hinzufügen"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          active ? "fill-red-500 text-red-500" : "text-muted-foreground"
        }`}
      />
    </Button>
  );
}
