import { create } from "zustand";
import { toast } from "sonner";

interface WishlistState {
  ids: Set<string>;
  loaded: boolean;
  /**
   * User, für den `ids` geladen wurde (null = Gast). Ohne dieses Feld
   * überlebt das `loaded`-Flag einen Auth-Wechsel — nach Logout bzw.
   * Login eines anderen Users bliebe sonst die alte Merkliste stehen.
   * `load` lädt bei Mismatch neu statt früh auszusteigen.
   */
  userId: string | null;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  load: (userId?: string | null) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loaded: false,
  userId: null,

  isWishlisted: (productId: string) => get().ids.has(productId),

  toggle: async (productId: string) => {
    const was = get().ids.has(productId);
    // Optimistic update — das Herz reagiert sofort, ohne Network-Wait.
    set((state) => {
      const next = new Set(state.ids);
      if (was) next.delete(productId);
      else next.add(productId);
      return { ids: next };
    });

    // Rollback auf den Zustand vor dem optimistischen Update.
    const revert = () =>
      set((state) => {
        const next = new Set(state.ids);
        if (was) next.add(productId);
        else next.delete(productId);
        return { ids: next };
      });

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        // Erfolg erst NACH Server-Bestätigung melden — vorher zeigte
        // die UI auch Gästen (Server: 401) einen Erfolgs-Toast.
        if (was) toast("Von Merkliste entfernt");
        else toast.success("Zur Merkliste hinzugefügt");
      } else {
        revert();
        if (res.status === 401) {
          // Gast: kein Erfolg vortäuschen, sondern zum Login einladen.
          toast.error("Bitte anmelden, um Artikel zu merken");
        } else {
          toast.error("Merkliste konnte nicht aktualisiert werden");
        }
      }
    } catch {
      revert();
      toast.error("Merkliste konnte nicht aktualisiert werden");
    }
  },

  load: async (userId = null) => {
    // Schon geladen UND gleiche Identität → nichts tun. Bei einem
    // Auth-Wechsel (anderer User / Logout) wird neu geladen, damit
    // niemand die Merkliste des vorherigen Users sieht.
    if (get().loaded && get().userId === userId) return;
    // Identität wechselt: die alten ids gehören dem VORHERIGEN User —
    // sofort leeren, BEVOR der Fetch läuft. Sonst würde ein
    // fehlschlagender Fetch (Netz-Blip beim Logout) die fremde
    // Merkliste stehen lassen, und der Early-Return oben verhindert
    // bis zum Hard-Reload jede Korrektur.
    const identityChanged = get().userId !== userId;
    if (identityChanged) {
      set({ ids: new Set<string>() });
    }
    try {
      const res = await fetch("/api/wishlist");
      const json = await res.json();
      if (json.success) {
        set({ ids: new Set(json.data), loaded: true, userId });
      } else {
        set({ loaded: true, userId });
      }
    } catch {
      set({ loaded: true, userId });
    }
  },
}));
