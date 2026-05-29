import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartSheet } from "@/components/shop/cart-sheet";
import { ResearchBanner } from "@/components/layout/research-banner";
import { Toaster } from "sonner";
import { RevealController } from "@/components/shop/reveal-controller";
import { DeferredShopWidgets } from "@/components/shop/deferred-shop-widgets";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip-to-content link — visible only on keyboard focus (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Zum Inhalt springen
      </a>
      <Header />
      <ResearchBanner />
      <CartSheet />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
      {/* Non-LCP-Widgets — Cookie-Banner, Disclaimer, Analytics, etc.
          Werden per next/dynamic(ssr:false) in eigene Chunks gesplittet
          und nach Hydration nachgeladen. Außerhalb des kritischen Pfads. */}
      <DeferredShopWidgets />
      <RevealController />
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
