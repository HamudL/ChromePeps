import { describe, it, expect, beforeEach, vi } from "vitest";
import { toast } from "sonner";
import { useWishlistStore } from "@/store/wishlist-store";

// Sonner mocken — der Store toastet jetzt selbst (Erfolg erst nach
// Server-Bestätigung, 401 → Login-Hinweis); kein Toaster im Test-DOM.
vi.mock("sonner", () => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { toast: toastFn };
});

// Mock fetch globally for API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("wishlist-store", () => {
  beforeEach(() => {
    useWishlistStore.setState({ ids: new Set(), loaded: false, userId: null });
    mockFetch.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
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

    it("reverts and shows login hint on 401 (guest)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await useWishlistStore.getState().toggle("prod-1");

      // Kein vorgetäuschter Erfolg: Optimistic-Add wird zurückgerollt …
      expect(useWishlistStore.getState().ids.has("prod-1")).toBe(false);
      // … und der Gast bekommt den Login-Hinweis statt eines Erfolgs.
      expect(toast.error).toHaveBeenCalledWith(
        "Bitte anmelden, um Artikel zu merken"
      );
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("toasts success only after the server confirmed", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await useWishlistStore.getState().toggle("prod-1");

      expect(toast.success).toHaveBeenCalledWith("Zur Merkliste hinzugefügt");
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

    it("does not reload when already loaded for the same user", async () => {
      useWishlistStore.setState({
        loaded: true,
        ids: new Set(["p1"]),
        userId: null,
      });

      await useWishlistStore.getState().load(null);

      // fetch should not have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("reloads when the auth user changes (login/logout)", async () => {
      // Alte Liste eines Gasts/anderen Users liegt noch im Store …
      useWishlistStore.setState({
        loaded: true,
        ids: new Set(["old-product"]),
        userId: null,
      });
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: ["new-product"] }),
      });

      // … neuer User loggt sich ein → trotz loaded=true neu laden.
      await useWishlistStore.getState().load("user-1");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(useWishlistStore.getState().ids).toEqual(
        new Set(["new-product"])
      );
      expect(useWishlistStore.getState().userId).toBe("user-1");
    });

    it("sets loaded=true even on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("fail"));

      await useWishlistStore.getState().load();

      expect(useWishlistStore.getState().loaded).toBe(true);
    });
  });
});
