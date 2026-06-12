"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface HeaderMobileMenuProps {
  links: ReadonlyArray<{ href: string; label: string }>;
}

/**
 * Client-Island für das Mobile-Menu im Header. Braucht State für
 * Sheet-Open/Close. Der Rest des Headers (Logo, Desktop-Nav, Actions)
 * läuft als Server Component.
 */
export function HeaderMobileMenu({ links }: HeaderMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" aria-label="Menü öffnen">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        {/* Radix-Dialog braucht einen zugänglichen Namen — ohne Title
            warnt Radix und der Screenreader bekommt keinen Dialog-Namen. */}
        <SheetTitle className="sr-only">Hauptmenü</SheetTitle>
        <span className="mono-label mt-1 block text-muted-foreground">
          Navigation
        </span>
        <hr className="rule-gold mt-3" />
        <nav aria-label="Hauptmenü" className="mt-6 flex flex-col">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "relative border-l-2 border-primary py-2.5 pl-4 text-lg font-semibold text-primary-strong"
                    : "border-l-2 border-transparent py-2.5 pl-4 text-lg font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
