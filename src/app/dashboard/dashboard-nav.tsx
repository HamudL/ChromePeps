"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, User, MapPin, Heart } from "lucide-react";

const navItems = [
  {
    label: "Orders",
    href: "/dashboard",
    icon: Package,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Addresses",
    href: "/dashboard/addresses",
    icon: MapPin,
  },
  {
    label: "Merkliste",
    href: "/dashboard/wishlist",
    icon: Heart,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-1 lg:flex-col">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname.startsWith("/dashboard/orders")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
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
