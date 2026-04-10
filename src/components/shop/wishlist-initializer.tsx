"use client";

import { useEffect } from "react";
import { useWishlistStore } from "@/store/wishlist-store";

/** Loads the wishlist IDs from the API once when the shop mounts. */
export function WishlistInitializer() {
  const load = useWishlistStore((s) => s.load);
  useEffect(() => { load(); }, [load]);
  return null;
}
