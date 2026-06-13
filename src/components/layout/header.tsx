import Link from "next/link";
import { HeaderMobileMenu } from "./header-mobile-menu";
import { HeaderBrand } from "./header-brand";
import { HeaderSearch } from "./header-search";
import { ThemeToggle } from "./theme-toggle";
import { HeaderCartButton } from "./header-cart-button";
import { HeaderAuthSlot } from "./header-auth-slot";

/**
 * Header — Server Component OHNE Session-Zugriff.
 *
 * Historie in zwei Schritten:
 *  1. Früher war der ganze Header `"use client"` (useSession + Cart +
 *     Menu-State in einem File) → komplette Header-Markup in jedem
 *     Client-Bundle.
 *  2. Danach Server-Component mit `await auth()` → schlankes Bundle,
 *     ABER: auth() liest Cookies und deoptete damit den GESAMTEN
 *     (shop)-Baum auf per-Request-SSR. Selbst /impressum war dynamic,
 *     `revalidate` wirkungslos (dokumentiert im alten (shop)/layout-
 *     Kommentar).
 *
 * Jetzt: Die Markup-Struktur bleibt Server-HTML, der session-abhängige
 * Slot ist ein kleines Client-Island (HeaderAuthSlot, useSession über
 * den Root-SessionProvider). Damit ist der Layoutbaum statik-fähig und
 * Statik/ISR funktioniert wieder pro Seite. Client-Islands:
 *   - HeaderMobileMenu (Sheet-State)
 *   - HeaderBrand (usePathname zum Hide-Logo-on-Home)
 *   - HeaderCartButton (Zustand-Badge)
 *   - HeaderAuthSlot (Session: UserMenu vs. Anmelden-Link)
 */

const navLinks = [
  { href: "/products", label: "Shop" },
  { href: "/wissen", label: "Wissen" },
  { href: "/qualitaetskontrolle", label: "Qualität" },
  { href: "/faq", label: "FAQ" },
  { href: "/ueber-uns", label: "Über uns" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Mobile menu — Client Island (Sheet + open-state). */}
        <HeaderMobileMenu links={navLinks} />

        {/* Logo — Client Island wegen usePathname-Conditional. */}
        <HeaderBrand />

        {/* Desktop nav — reines HTML (kein usePathname → Layout bleibt
            statik-fähig). Aktiv-State lebt im Mobile-Menü-Island; hier
            reine CSS-Hover-Gold-Underline. */}
        <nav
          aria-label="Hauptnavigation"
          className="hidden items-center gap-7 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="gold-underline py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <ThemeToggle />
          <HeaderSearch />
          <HeaderCartButton />
          <HeaderAuthSlot />
        </div>
      </div>
    </header>
  );
}
