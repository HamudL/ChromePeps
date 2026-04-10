import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/store/cart-store";
import type { CartItemLocal } from "@/types";

// Helper — creates a cart item with sensible defaults
function makeItem(overrides: Partial<CartItemLocal> = {}): CartItemLocal {
  return {
    productId: "prod-1",
    variantId: null,
    quantity: 1,
    name: "BPC-157 5mg",
    variantName: null,
    priceInCents: 3990,
    image: null,
    slug: "bpc-157-5mg",
    stock: 50,
    ...overrides,
  };
}

describe("cart-store", () => {
  beforeEach(() => {
    // Reset store between tests
    useCartStore.setState({ items: [], isOpen: false });
  });

  // ----------------------------------------------------------------
  // addItem
  // ----------------------------------------------------------------
  describe("addItem()", () => {
    it("adds a new item to empty cart", () => {
      useCartStore.getState().addItem(makeItem());
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe("prod-1");
    });

    it("increments quantity when same product is added again", () => {
      useCartStore.getState().addItem(makeItem({ quantity: 2 }));
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("treats different variantIds as separate items", () => {
      useCartStore.getState().addItem(makeItem({ variantId: "var-a" }));
      useCartStore.getState().addItem(makeItem({ variantId: "var-b" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("caps quantity at 99", () => {
      useCartStore.getState().addItem(makeItem({ quantity: 50 }));
      useCartStore.getState().addItem(makeItem({ quantity: 60 }));
      expect(useCartStore.getState().items[0].quantity).toBe(99);
    });
  });

  // ----------------------------------------------------------------
  // removeItem
  // ----------------------------------------------------------------
  describe("removeItem()", () => {
    it("removes an item by productId + variantId", () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().removeItem("prod-1", null);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("only removes the matching variant", () => {
      useCartStore.getState().addItem(makeItem({ variantId: "var-a" }));
      useCartStore.getState().addItem(makeItem({ variantId: "var-b" }));
      useCartStore.getState().removeItem("prod-1", "var-a");
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].variantId).toBe("var-b");
    });

    it("does nothing when item not found", () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().removeItem("nonexistent", null);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------------
  // updateQuantity
  // ----------------------------------------------------------------
  describe("updateQuantity()", () => {
    it("updates quantity of existing item", () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity("prod-1", null, 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("removes item when quantity ≤ 0", () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity("prod-1", null, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("caps quantity at 99", () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity("prod-1", null, 150);
      expect(useCartStore.getState().items[0].quantity).toBe(99);
    });
  });

  // ----------------------------------------------------------------
  // clearCart
  // ----------------------------------------------------------------
  describe("clearCart()", () => {
    it("empties all items", () => {
      useCartStore.getState().addItem(makeItem({ productId: "a" }));
      useCartStore.getState().addItem(makeItem({ productId: "b" }));
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // setItems
  // ----------------------------------------------------------------
  describe("setItems()", () => {
    it("replaces cart contents entirely", () => {
      useCartStore.getState().addItem(makeItem({ productId: "old" }));
      const newItems = [makeItem({ productId: "new-1" }), makeItem({ productId: "new-2" })];
      useCartStore.getState().setItems(newItems);
      expect(useCartStore.getState().items).toHaveLength(2);
      expect(useCartStore.getState().items[0].productId).toBe("new-1");
    });
  });

  // ----------------------------------------------------------------
  // Cart visibility
  // ----------------------------------------------------------------
  describe("cart visibility", () => {
    it("toggleCart() flips isOpen", () => {
      expect(useCartStore.getState().isOpen).toBe(false);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(true);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });

    it("openCart() / closeCart()", () => {
      useCartStore.getState().openCart();
      expect(useCartStore.getState().isOpen).toBe(true);
      useCartStore.getState().closeCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Computed helpers
  // ----------------------------------------------------------------
  describe("totalItems()", () => {
    it("sums all item quantities", () => {
      useCartStore.getState().addItem(makeItem({ productId: "a", quantity: 3 }));
      useCartStore.getState().addItem(makeItem({ productId: "b", quantity: 2 }));
      expect(useCartStore.getState().totalItems()).toBe(5);
    });

    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().totalItems()).toBe(0);
    });
  });

  describe("totalPrice()", () => {
    it("sums price × quantity for all items", () => {
      useCartStore.getState().addItem(
        makeItem({ productId: "a", priceInCents: 1000, quantity: 2 })
      );
      useCartStore.getState().addItem(
        makeItem({ productId: "b", priceInCents: 500, quantity: 3 })
      );
      // 2×1000 + 3×500 = 3500
      expect(useCartStore.getState().totalPrice()).toBe(3500);
    });

    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().totalPrice()).toBe(0);
    });
  });
});
