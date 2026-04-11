"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_ITEMS = 8;

export interface RecentlyViewedItem {
  id: string;
  name: string;
  slug: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  purity: string | null;
  weight: string | null;
  image: string | null;
  imageAlt: string | null;
  categoryName: string;
  categorySlug: string;
  viewedAt: number; // timestamp
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  trackView: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clearAll: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],

      trackView: (item) =>
        set((state) => {
          // Remove existing entry for same product (dedup)
          const filtered = state.items.filter((i) => i.id !== item.id);
          // Prepend new entry, keep max items
          return {
            items: [{ ...item, viewedAt: Date.now() }, ...filtered].slice(
              0,
              MAX_ITEMS
            ),
          };
        }),

      clearAll: () => set({ items: [] }),
    }),
    {
      name: "chromepeps-recently-viewed",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
