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
  const { isWishlisted, toggle } = useWishlistStore();
  const active = isWishlisted(productId);

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
