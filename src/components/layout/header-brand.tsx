"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoIcon } from "@/components/brand/logo-icon";
import { APP_NAME } from "@/lib/constants";

/**
 * Brand-Link im Header. Hidden-on-homepage-Logic erfordert
 * `usePathname()` und damit ein Client-Island; Logo+Wortmarke selbst
 * sind statisch. Der Rest des Headers bleibt SSR.
 */
export function HeaderBrand() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      aria-label={`${APP_NAME} Startseite`}
    >
      {!isHomepage && (
        <span className="hidden font-display text-[22px] font-semibold tracking-tight chrome-text sm:inline">
          {APP_NAME}
        </span>
      )}
      <LogoIcon size={34} className="shrink-0" />
    </Link>
  );
}
