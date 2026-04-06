"use client";

import { useCallback } from "react";
import { useCartStore } from "@/store/cart-store";
import type { CartItemLocal } from "@/types";

export function useCart() {
  // Individual selectors — never use useCartStore() without a selector
  // or call store methods inside selectors with Zustand v5 + React 19.
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const storeAddItem = useCartStore((s) => s.addItem);
  const storeRemoveItem = useCartStore((s) => s.removeItem);
  const storeUpdateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);

  // Compute derived values directly from items instead of calling store methods
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);

  const addItem = useCallback(
    (item: CartItemLocal) => {
      storeAddItem(item);
      openCart();
    },
    [storeAddItem, openCart]
  );

  const removeItem = useCallback(
    (productId: string, variantId: string | null = null) => {
      storeRemoveItem(productId, variantId);
    },
    [storeRemoveItem]
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      storeUpdateQuantity(productId, variantId, quantity);
    },
    [storeUpdateQuantity]
  );

  return {
    items,
    isOpen,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
  };
}
