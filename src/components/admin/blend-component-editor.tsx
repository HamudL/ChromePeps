"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Editor für Blend-Komponenten. Ein "Blend" ist ein Produkt, das aus
 * mehreren Wirkstoffen (jeweils selbst Produkte mit eigenen COAs)
 * zusammengesetzt ist — beim Mail-Versand werden die COAs aller
 * Komponenten dem Customer mitgeschickt.
 *
 * Kein eingebauter Such-Combobox aus shadcn (Command); stattdessen
 * eine simple typeahead-Filter-Liste, weil das Produkt-Inventar
 * überschaubar bleibt (~50). Wenn der Katalog auf 500+ wächst,
 * lohnt sich der Schwenk auf <Command> mit virtuellem Scroll.
 */

export interface BlendComponentRow {
  componentProductId: string;
  /** Snapshot zur Anzeige — kommt aus dem Parent und wird nicht gespeichert. */
  name: string;
  sku: string;
  /** Anzeige-Hilfsfeld: zeigt "inaktiv"-Badge in der ausgewählten Liste. */
  isActive?: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  /**
   * Inaktive Produkte (z.B. "RG3" — Wirkstoff der nur als Blend-
   * Komponente existiert, im Shop nicht direkt verkauft) werden
   * im Picker mit Badge gekennzeichnet, sind aber wählbar.
   */
  isActive: boolean;
}

interface Props {
  /** ID des Produkts, das gerade editiert wird — wird aus der Pickliste rausgefiltert. */
  parentProductId: string | null;
  components: BlendComponentRow[];
  onChange: (components: BlendComponentRow[]) => void;
  /** Alle anderen Produkte, aus denen ausgewählt werden kann (inkl. inaktive). */
  availableProducts: ProductOption[];
}

export function BlendComponentEditor({
  parentProductId,
  components,
  onChange,
  availableProducts,
}: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const selectedIds = useMemo(
    () => new Set(components.map((c) => c.componentProductId)),
    [components],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableProducts
      .filter((p) => p.id !== parentProductId)
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [availableProducts, query, selectedIds, parentProductId]);

  function addComponent(opt: ProductOption) {
    onChange([
      ...components,
      {
        componentProductId: opt.id,
        name: opt.name,
        sku: opt.sku,
        isActive: opt.isActive,
      },
    ]);
    setQuery("");
    setAdding(false);
  }

  function removeComponent(index: number) {
    onChange(components.filter((_, i) => i !== index));
  }

  function moveComponent(from: number, to: number) {
    if (to < 0 || to >= components.length) return;
    const next = [...components];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {components.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {components.map((c, i) => (
            <div
              key={c.componentProductId}
              className="flex items-center gap-3 px-3 py-2"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveComponent(i, i - 1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Nach oben verschieben"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => moveComponent(i, i + 1)}
                  disabled={i === components.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Nach unten verschieben"
                >
                  <GripVertical className="h-3 w-3 -rotate-90" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.isActive === false && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700"
                      title="Inaktives Produkt — nur als Blend-Komponente sichtbar"
                    >
                      inaktiv
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {c.sku}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeComponent(i)}
                aria-label="Komponente entfernen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Keine Komponenten — dieses Produkt gilt als Single-Wirkstoff. Bei einer
          Bestellung wird nur sein eigener COA angehängt.
        </p>
      )}

      {adding ? (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <Label className="text-xs">Produkt suchen</Label>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder SKU…"
            className="h-8 text-sm"
          />
          <div className="border rounded bg-background max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {query.trim()
                  ? "Keine Treffer."
                  : "Tippen, um zu suchen…"}
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addComponent(p)}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {p.sku}
                  </span>
                  {!p.isActive && (
                    <span
                      className="ml-auto text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700"
                      title="Inaktiv — nicht im Shop sichtbar, nur als Blend-Komponente verlinkbar"
                    >
                      inaktiv
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdding(false);
              setQuery("");
            }}
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Komponente hinzufügen
        </Button>
      )}
    </div>
  );
}
