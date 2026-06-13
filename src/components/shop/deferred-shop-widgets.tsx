"use client";

import dynamic from "next/dynamic";

/**
 * Wrapper für nicht-LCP-Widgets im (shop)-Layout. Cookie-Banner,
 * Announcement-Bar, Research-Disclaimer, Wishlist-Initializer und
 * Google-Analytics blockieren den ersten Paint nicht — sie sind alles
 * Banner/Modals oder reine Side-Effects, die nach Hydration erscheinen.
 *
 * Lazy-import sie hier mit `ssr: false`, damit jeder Widget-Chunk
 * separat geladen wird, NACHDEM die Page interaktiv ist. Spart auf
 * jeder (shop)-Route die direkte Bundle-Aufnahme aus dem Layout-Chunk.
 *
 * Wenn ein Widget Daten lädt (z. B. AnnouncementBar fetcht
 * /api/announcement), passiert das weiterhin synchron im
 * Browser — nur das JS dafür kommt out-of-critical-path.
 */
const CookieBanner = dynamic(
  () =>
    import("@/components/shop/cookie-banner").then((m) => m.CookieBanner),
  { ssr: false },
);

const AnnouncementBar = dynamic(
  () =>
    import("@/components/layout/announcement-bar").then(
      (m) => m.AnnouncementBar,
    ),
  { ssr: false },
);

const ResearchDisclaimer = dynamic(
  () =>
    import("@/components/shop/research-disclaimer").then(
      (m) => m.ResearchDisclaimer,
    ),
  { ssr: false },
);

const WishlistInitializer = dynamic(
  () =>
    import("@/components/shop/wishlist-initializer").then(
      (m) => m.WishlistInitializer,
    ),
  { ssr: false },
);

const GoogleAnalytics = dynamic(
  () =>
    import("@/components/analytics/google-analytics").then(
      (m) => m.GoogleAnalytics,
    ),
  { ssr: false },
);

export function DeferredShopWidgets() {
  return (
    <>
      <AnnouncementBar />
      <CookieBanner />
      <GoogleAnalytics />
      <WishlistInitializer />
      <ResearchDisclaimer />
    </>
  );
}
