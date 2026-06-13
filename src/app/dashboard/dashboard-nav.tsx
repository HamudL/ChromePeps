"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, User, MapPin, Heart, ShieldCheck } from "lucide-react";

const navItems = [
  {
    label: "Bestellungen",
    href: "/dashboard",
    icon: Package,
  },
  {
    label: "Profil",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Adressen",
    href: "/dashboard/addresses",
    icon: MapPin,
  },
  {
    label: "Merkliste",
    href: "/dashboard/wishlist",
    icon: Heart,
  },
  {
    label: "Sicherheit",
    href: "/dashboard/security/2fa",
    icon: ShieldCheck,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-none flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {navItems.map((item) => {
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
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-12px_hsl(45_92%_41%/0.8)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
