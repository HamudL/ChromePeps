"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Globale Produktsuche im Header. Öffnet einen Dialog mit Such-Input und
 * navigiert bei Submit nach /products?search=….
 *
 * Bewusst OHNE useSearchParams: der Header sitzt auf jeder (shop)-Seite,
 * und useSearchParams würde alle diese Seiten in den dynamischen Render
 * zwingen bzw. eine Suspense-Boundary verlangen. Hier reicht useRouter
 * (nur schreiben). Der Server-Query auf /products unterstützt ?search=
 * über Name, Kurzbeschreibung, Beschreibung, SKU und CAS-Nummer bereits
 * vollständig — diese Komponente ist reine UI-Anbindung, kein Backend.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    setOpen(false);
    router.push(
      term ? `/products?search=${encodeURIComponent(term)}` : "/products",
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Suche öffnen">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-[18%] translate-y-0 sm:max-w-xl">
        <DialogTitle className="field-label !mb-0">Produktsuche</DialogTitle>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Peptid, CAS-Nummer oder SKU…"
              className="h-11 pl-10"
              aria-label="Suchbegriff"
            />
          </div>
          <Button type="submit" variant="gold" size="lg">
            Suchen
          </Button>
        </form>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Durchsucht Name · Beschreibung · CAS-Nummer · SKU
        </p>
      </DialogContent>
    </Dialog>
  );
}
