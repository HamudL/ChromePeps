import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItemLocal } from "@/types";

interface CartState {
  items: CartItemLocal[];
  isOpen: boolean;
  // Im Warenkorb hinterlegter Gutscheincode. Bewusst ADDITIV und NICHT
  // Teil des Item-Sync-/Payload-Pfads (PUT /api/cart) — nur ein UI-Hint,
  // der an der Kasse vorbefüllt wird. Server-Validierung bleibt im Checkout.
  promoCode: string | null;

  // Actions
  addItem: (item: CartItemLocal) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => void;
  clearCart: () => void;
  setItems: (items: CartItemLocal[]) => void;
  setPromoCode: (code: string | null) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed helpers
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,

      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) =>
              i.productId === item.productId && i.variantId === item.variantId
          );

          if (existingIndex > -1) {
            const updated = [...state.items];
            const existing = updated[existingIndex];
            const newQty = Math.min(existing.quantity + item.quantity, 99);
            updated[existingIndex] = { ...existing, quantity: newQty };
            return { items: updated };
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(i.productId === productId && i.variantId === variantId)
          ),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) =>
                  !(i.productId === productId && i.variantId === variantId)
              ),
            };
          }

          return {
            items: state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.min(quantity, 99) }
                : i
            ),
          };
        }),

      clearCart: () => set({ items: [], promoCode: null }),

      setItems: (items) => set({ items }),

      setPromoCode: (code) => set({ promoCode: code }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.priceInCents * item.quantity,
          0
        ),
    }),
    {
      name: "chromepeps-cart",
      partialize: (state) => ({
        items: state.items,
        promoCode: state.promoCode,
      }),
    }
  )
);
