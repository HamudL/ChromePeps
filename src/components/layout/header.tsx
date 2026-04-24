"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ShoppingCart, User, Menu, LogOut, Package, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cart-store";
import { APP_NAME } from "@/lib/constants";
import { LogoIcon } from "@/components/brand/logo-icon";
import { useState } from "react";

const navLinks = [
  { href: "/products", label: "Shop" },
  { href: "/qualitaetskontrolle", label: "Qualität" },
  { href: "/faq", label: "FAQ" },
];

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  // Individual selector for items — compute totalItems from it directly.
  // Never call store methods (s.totalItems()) inside selectors with Zustand v5 + React 19.
  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Menü öffnen">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <nav aria-label="Hauptmenü" className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label={`${APP_NAME} Startseite`}
        >
          {/* Text: only on desktop (sm+) AND not on homepage.
              On mobile or homepage, the icon carries the brand alone. */}
          {!isHomepage && (
            <span className="hidden sm:inline text-xl font-bold tracking-tight chrome-text">
              {APP_NAME}
            </span>
          )}
          {/* Icon: always visible. Mobile gets a slightly smaller size
              than desktop so the wider chrome logo doesn't crowd the nav. */}
          <LogoIcon size={36} className="shrink-0" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Hauptnavigation" className="hidden md:flex items-center gap-6">
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
          <Button variant="ghost" size="icon" className="relative" onClick={openCart} aria-label={`Warenkorb${totalItems > 0 ? ` (${totalItems})` : ""}`}>
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {totalItems}
              </Badge>
            )}
          </Button>

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Benutzerkonto">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard"><Package className="mr-2 h-4 w-4" />Bestellungen</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile"><Settings className="mr-2 h-4 w-4" />Profil</Link>
                </DropdownMenuItem>
                {session.user.role === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin-Bereich</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  // Let NextAuth handle the whole flow: it POSTs to
                  // /api/auth/signout with the CSRF token, the server
                  // clears the session cookie via Set-Cookie, AND the
                  // browser navigates to callbackUrl in one atomic
                  // form submission. No React re-renders in between —
                  // which avoids the race where pages with a
                  // `useSession() → unauthenticated → router.push("/login")`
                  // effect (like /checkout) fire their redirect
                  // between signOut's session-cleared event and our
                  // own hard navigation, and the user ends up at
                  // /login?callbackUrl=… instead of on the home page.
                  signOut({ callbackUrl: "/", redirect: true });
                }}>
                  <LogOut className="mr-2 h-4 w-4" />Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
