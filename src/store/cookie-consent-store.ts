import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CookieConsentState {
  /**
   * Whether the user has made a decision (accepted or rejected).
   * `null` means the user has not yet seen/acted on the banner.
   */
  decision: "accepted" | "rejected" | null;
  decidedAt: number | null;
  accept: () => void;
  reject: () => void;
  reset: () => void;
}

export const useCookieConsent = create<CookieConsentState>()(
  persist(
    (set) => ({
      decision: null,
      decidedAt: null,
      accept: () => set({ decision: "accepted", decidedAt: Date.now() }),
      reject: () => set({ decision: "rejected", decidedAt: Date.now() }),
      reset: () => set({ decision: null, decidedAt: null }),
    }),
    {
      name: "chromepeps-cookie-consent",
    }
  )
);
