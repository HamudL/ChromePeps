import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWishlistStore } from "@/store/wishlist-store";

// Mock fetch globally for API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("wishlist-store", () => {
  beforeEach(() => {
    useWishlistStore.setState({ ids: new Set(), loaded: false });
    mockFetch.mockReset();
  });

  describe("isWishlisted()", () => {
    it("returns false for unknown product", () => {
      expect(useWishlistStore.getState().isWishlisted("unknown")).toBe(false);
    });

    it("returns true for wishlisted product", () => {
      useWishlistStore.setState({ ids: new Set(["prod-1"]) });
      expect(useWishlistStore.getState().isWishlisted("prod-1")).toBe(true);
    });
  });

  describe("toggle()", () => {
    it("adds a product optimistically", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      useWishlistStore.getState().toggle("prod-1");

      // Optimistic — immediately in the set
      expect(useWishlistStore.getState().ids.has("prod-1")).toBe(true);
    });

    it("removes a wishlisted product optimistically", async () => {
      useWishlistStore.setState({ ids: new Set(["prod-1"]) });
      mockFetch.mockResolvedValueOnce({ ok: true });

      useWishlistStore.getState().toggle("prod-1");

      expect(useWishlistStore.getState().ids.has("prod-1")).toBe(false);
    });

    it("reverts on API failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await useWishlistStore.getState().toggle("prod-1");

      // Should have been added then reverted
      expect(useWishlistStore.getState().ids.has("prod-1")).toBe(false);
    });

    it("reverts on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await useWishlistStore.getState().toggle("prod-1");

      expect(useWishlistStore.getState().ids.has("prod-1")).toBe(false);
    });

    it("calls POST /api/wishlist with productId", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await useWishlistStore.getState().toggle("prod-1");

      expect(mockFetch).toHaveBeenCalledWith("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1" }),
      });
    });
  });

  describe("load()", () => {
    it("fetches wishlist from API", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: ["p1", "p2"] }),
      });

      await useWishlistStore.getState().load();

      expect(useWishlistStore.getState().ids).toEqual(new Set(["p1", "p2"]));
      expect(useWishlistStore.getState().loaded).toBe(true);
    });

    it("does not reload when already loaded", async () => {
      useWishlistStore.setState({ loaded: true, ids: new Set(["p1"]) });

      await useWishlistStore.getState().load();

      // fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sets loaded=true even on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("fail"));

      await useWishlistStore.getState().load();

      expect(useWishlistStore.getState().loaded).toBe(true);
    });
  });
});
