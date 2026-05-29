"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, LogOut, Package, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@prisma/client";

interface HeaderUserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

/**
 * Client-Island für das eingeloggte-User-Dropdown im Header. Wird nur
 * gerendert wenn der Server (Header.tsx, Server Component) eine Session
 * gelesen hat — sonst rendert der Header den "Anmelden"-Link inline.
 *
 * Vorher: useSession() im Header → kompletter Header war Client. Jetzt:
 * Session wird Server-side per `auth()` gelesen und als Prop runter-
 * gereicht. Logout-Action braucht trotzdem Client wegen NextAuth-
 * Form-Submission.
 */
export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Benutzerkonto">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <Package className="mr-2 h-4 w-4" />
            Bestellungen
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <Settings className="mr-2 h-4 w-4" />
            Profil
          </Link>
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin-Bereich
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            // Let NextAuth handle the whole flow: it POSTs to
            // /api/auth/signout with the CSRF token, the server
            // clears the session cookie via Set-Cookie, AND the
            // browser navigates to callbackUrl in one atomic form
            // submission. No React re-renders in between — which
            // avoids the race where pages with a
            // `useSession() → unauthenticated → router.push("/login")`
            // effect (like /checkout) fire their redirect between
            // signOut's session-cleared event and our own hard
            // navigation.
            signOut({ callbackUrl: "/", redirect: true });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
