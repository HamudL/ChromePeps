import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartSheet } from "@/components/shop/cart-sheet";
import { CookieBanner } from "@/components/shop/cookie-banner";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { WishlistInitializer } from "@/components/shop/wishlist-initializer";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Toaster } from "sonner";

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
      <AnnouncementBar />
      <Header />
      <CartSheet />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
      <CookieBanner />
      <GoogleAnalytics />
      <WishlistInitializer />
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
