"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { HeaderUserMenu } from "./header-user-menu";

/**
 * Auth-Slot des Headers — das EINZIGE session-abhängige Stück im
 * (shop)-Layoutbaum.
 *
 * Vorher las der Server-Header `await auth()` (Cookies) → der GESAMTE
 * (shop)-Baum war auf dynamic deoptet; selbst /impressum wurde pro
 * Request SSR-gerendert und `revalidate`-Exporte waren wirkungslos.
 * Jetzt holt dieses kleine Island die Session client-seitig über den
 * SessionProvider (Root-Layout) — der Header bleibt statisches Server-
 * Markup und Statik/ISR funktioniert wieder für den ganzen Shop-Baum.
 *
 * Bundle-Trade-off (bewusst): HeaderUserMenu + useSession wandern in
 * den Client-Chunk ALLER Shop-Seiten. useSession ist dort über
 * Checkout/Wishlist ohnehin präsent; das Dropdown ist klein. Dafür
 * entfällt Server-Rendering pro Request auf allen statischen Seiten.
 *
 * Während `status === "loading"` rendert ein Pulse-Platzhalter in den
 * Maßen des "Anmelden"-Buttons (h-9, ~5.5rem) — das ist der Endzustand
 * der MEHRHEIT (anonyme Shop-Besucher), für die der Slot damit
 * CLS-frei auflöst. Eingeloggte sehen einen kleinen Sprung auf den
 * 40px-Icon-Button — bewusster Trade-off, da ein Zustand immer
 * springen muss und der anonyme Cold-Load der Web-Vitals-relevante
 * Pfad ist.
 */
export function HeaderAuthSlot() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-[5.5rem] rounded-md bg-muted/40 animate-pulse"
      />
    );
  }

  const user = session?.user;
  if (user?.id) {
    return (
      <HeaderUserMenu
        user={{ name: user.name, email: user.email, role: user.role }}
      />
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/login">Anmelden</Link>
    </Button>
  );
}
