import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { HeaderMobileMenu } from "./header-mobile-menu";
import { HeaderBrand } from "./header-brand";
import { HeaderCartButton } from "./header-cart-button";
import { HeaderUserMenu } from "./header-user-menu";

/**
 * Header — Server Component.
 *
 * Vorher war der ganze Header `"use client"` weil `useSession()` +
 * `useCartStore()` + Mobile-Menu-State + User-Dropdown alles im
 * gleichen File saßen. Effekt: jede einzelne (shop)-Page zog die
 * komplette Header-Markup, alle Icons, Sheet, DropdownMenu und
 * NextAuth-React in ihren Client-Bundle.
 *
 * Jetzt: Session wird Server-seitig per `auth()` aus dem Redis-
 * gecachten JWT gezogen, die statische Markup-Struktur (Container,
 * Nav-Links, Logo-Wrapper) ist reines HTML. Vier kleine
 * Client-Islands kümmern sich um die interaktiven Slots:
 *   - HeaderMobileMenu (Sheet-State)
 *   - HeaderBrand (usePathname zum Hide-Logo-on-Home)
 *   - HeaderCartButton (Zustand-Badge)
 *   - HeaderUserMenu (Dropdown + signOut, nur wenn eingeloggt)
 */

const navLinks = [
  { href: "/products", label: "Shop" },
  { href: "/wissen", label: "Wissen" },
  { href: "/qualitaetskontrolle", label: "Qualität" },
  { href: "/faq", label: "FAQ" },
] as const;

export async function Header() {
  const session = await auth();
  const sessionUser = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Mobile menu — Client Island (Sheet + open-state). */}
        <HeaderMobileMenu links={navLinks} />

        {/* Logo — Client Island wegen usePathname-Conditional. */}
        <HeaderBrand />

        {/* Desktop nav — reines HTML. */}
        <nav
          aria-label="Hauptnavigation"
          className="hidden md:flex items-center gap-6"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <HeaderCartButton />

          {sessionUser?.id ? (
            <HeaderUserMenu
              user={{
                name: sessionUser.name,
                email: sessionUser.email,
                role: sessionUser.role,
              }}
            />
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Anmelden</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
