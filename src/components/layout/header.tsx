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
 *     (shop)-Baum auf per-Request-SSR.
 *
 * Jetzt: Die Markup-Struktur bleibt Server-HTML, der session-abhängige
 * Slot ist ein kleines Client-Island (HeaderAuthSlot). Client-Islands:
 *   - HeaderMobileMenu (Sheet-State)
 *   - HeaderBrand (usePathname zum Hide-Logo-on-Home)
 *   - HeaderCartButton (Zustand-Badge)
 *   - HeaderAuthSlot (Session: UserMenu vs. Anmelden-Link)
 *
 * Design „Chromatogramm": ruhige Protokoll-Leiste — Wortmarke links,
 * indexierte Mono-Navigation mittig, Werkzeuge rechts, Haarlinie unten.
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Mobile menu — Client Island (Sheet + open-state). */}
        <HeaderMobileMenu links={navLinks} />

        {/* Logo — Client Island wegen usePathname-Conditional. */}
        <HeaderBrand />

        {/* Desktop nav — reines HTML (kein usePathname → Layout bleibt
            statik-fähig). Indexierte Mono-Labels: die Protokoll-Sprache
            macht die Navigation zur Gliederung des Dokuments. */}
        <nav
          aria-label="Hauptnavigation"
          className="hidden items-center gap-6 md:flex lg:gap-8"
        >
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-baseline gap-1.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                aria-hidden
                className="text-[9px] text-muted-foreground/50 transition-colors group-hover:text-primary-strong"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="gold-underline">{link.label}</span>
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
