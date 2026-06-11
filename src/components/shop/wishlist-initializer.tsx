"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/store/wishlist-store";

/**
 * Lädt die Wishlist-IDs, sobald der Shop mountet — und lädt sie bei
 * einem Auth-Wechsel (Login/Logout/anderer User) neu, damit nie die
 * Merkliste eines vorherigen Users stehen bleibt. Der Store vergleicht
 * dazu die übergebene userId mit der zuletzt geladenen.
 */
export function WishlistInitializer() {
  const load = useWishlistStore((s) => s.load);
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    // Solange die Session noch lädt, ist die Identität unbekannt —
    // warten, sonst würde erst als Gast und direkt danach als User
    // geladen (doppelter Fetch).
    if (status === "loading") return;
    load(userId);
  }, [load, status, userId]);

  return null;
}
