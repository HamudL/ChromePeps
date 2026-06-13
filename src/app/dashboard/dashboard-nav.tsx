"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * DashboardNav — Protokoll-Index des Laborjournals.
 *
 * Desktop: vertikale Liste an einer Haarlinie, aktiver Eintrag mit
 * Viridian-Strich. Mobil: horizontale Reihe eckiger Tags. Ordnungs-
 * nummern in Mono statt Icons — das Register eines Journals, kein
 * App-Menü.
 */
const navItems = [
  { label: "Bestellungen", href: "/dashboard" },
  { label: "Profil", href: "/dashboard/profile" },
  { label: "Adressen", href: "/dashboard/addresses" },
  { label: "Merkliste", href: "/dashboard/wishlist" },
  { label: "Sicherheit", href: "/dashboard/security/2fa" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Konto-Navigation"
      className="scrollbar-none flex flex-row gap-1.5 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-border"
    >
      {navItems.map((item, index) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname.startsWith("/dashboard/orders")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-baseline gap-3 px-3 py-2 text-sm font-medium transition-colors",
              "rounded-sm border lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:py-2.5 lg:pl-4",
              isActive
                ? "border-primary/50 bg-accent text-primary-strong lg:border-l-primary lg:bg-transparent"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground lg:border-l-transparent"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "font-mono text-[10px] tracking-[0.12em]",
                isActive ? "text-primary-strong" : "text-muted-foreground/70"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
