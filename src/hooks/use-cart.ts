"use client";

import { useCallback } from "react";
import { useCartStore } from "@/store/cart-store";
import type { CartItemLocal } from "@/types";

export function useCart() {
  const store = useCartStore();

  const addItem = useCallback(
    (item: CartItemLocal) => {
      store.addItem(item);
      store.openCart();
    },
    [store]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string | null = null) => {
      store.removeItem(productId, variantId);
    },
    [store]
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      store.updateQuantity(productId, variantId, quantity);
    },
    [store]
  );

  return {
    items: store.items,
    isOpen: store.isOpen,
    totalItems: store.totalItems(),
    totalPrice: store.totalPrice(),
    addItem,
    removeItem,
    updateQuantity,
    clearCart: store.clearCart,
    toggleCart: store.toggleCart,
    openCart: store.openCart,
    closeCart: store.closeCart,
  };
}
