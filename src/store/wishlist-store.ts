import { create } from "zustand";

interface WishlistState {
  ids: Set<string>;
  loaded: boolean;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => void;
  load: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  isWishlisted: (productId: string) => get().ids.has(productId),

  toggle: async (productId: string) => {
    const was = get().ids.has(productId);
    // Optimistic update
    set((state) => {
      const next = new Set(state.ids);
      if (was) next.delete(productId);
      else next.add(productId);
      return { ids: next };
    });

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        // Revert on failure
        set((state) => {
          const next = new Set(state.ids);
          if (was) next.add(productId);
          else next.delete(productId);
          return { ids: next };
        });
      }
    } catch {
      // Revert
      set((state) => {
        const next = new Set(state.ids);
        if (was) next.add(productId);
        else next.delete(productId);
        return { ids: next };
      });
    }
  },

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/wishlist");
      const json = await res.json();
      if (json.success) {
        set({ ids: new Set(json.data), loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));
