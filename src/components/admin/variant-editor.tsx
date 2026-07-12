"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  priceInCents: number;
  stock: number;
  isActive: boolean;
}

interface VariantEditorProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

const EMPTY_VARIANT: VariantRow = {
  name: "",
  sku: "",
  priceInCents: 0,
  stock: 0,
  isActive: true,
};

export function VariantEditor({ variants, onChange }: VariantEditorProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<VariantRow>({ ...EMPTY_VARIANT });
  // Roh-Eingabestrings der Preisfelder je Zeile, solange sie aktiv editiert
  // werden. Ohne diesen Puffer würde der Anzeigewert bei JEDEM Tastendruck aus
  // priceInCents via toFixed(2) neu formatiert — Zwischenstände wie "10." oder
  // "10.5" springen dann zurück und präzise Eingaben werden unzuverlässig. Der
  // Puffer wird onBlur wieder verworfen, sodass der Wert normal aus den Props
  // abgeleitet und auf zwei Nachkommastellen normalisiert wird.
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [draftPriceStr, setDraftPriceStr] = useState("0.00");

  const eurToCents = (raw: string) => Math.round((parseFloat(raw) || 0) * 100);

  const updateVariant = (index: number, field: keyof VariantRow, value: string | number | boolean) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
    // Zeilenindizes verschieben sich beim Entfernen → Preis-Puffer verwerfen,
    // damit kein Draft an der falschen Zeile klebt.
    setPriceDrafts({});
  };

  const addVariant = () => {
    if (!draft.name || !draft.sku) return;
    onChange([...variants, { ...draft }]);
    setDraft({ ...EMPTY_VARIANT });
    setDraftPriceStr("0.00");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price (EUR)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v, i) => (
                <TableRow key={v.id ?? `new-${i}`}>
                  <TableCell>
                    <Input
                      value={v.name}
                      onChange={(e) => updateVariant(i, "name", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="e.g. 10mg"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={v.sku}
                      onChange={(e) => updateVariant(i, "sku", e.target.value.toUpperCase())}
                      className="h-8 text-sm font-mono"
                      placeholder="CP-XXX-10MG"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceDrafts[i] ?? (v.priceInCents / 100).toFixed(2)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setPriceDrafts((p) => ({ ...p, [i]: raw }));
                        updateVariant(i, "priceInCents", eurToCents(raw));
                      }}
                      onBlur={() =>
                        setPriceDrafts((p) => {
                          const next = { ...p };
                          delete next[i];
                          return next;
                        })
                      }
                      className="h-8 text-sm w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                      className="h-8 text-sm w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => updateVariant(i, "isActive", e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeVariant(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {adding ? (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">New Variant</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. 10mg"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU *</Label>
              <Input
                value={draft.sku}
                onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value.toUpperCase() }))}
                placeholder="CP-XXX-10MG"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={draftPriceStr}
                onChange={(e) => {
                  setDraftPriceStr(e.target.value);
                  setDraft((d) => ({ ...d, priceInCents: eurToCents(e.target.value) }));
                }}
                onBlur={() => setDraftPriceStr((draft.priceInCents / 100).toFixed(2))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stock</Label>
              <Input
                type="number"
                min="0"
                value={draft.stock}
                onChange={(e) => setDraft((d) => ({ ...d, stock: parseInt(e.target.value) || 0 }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addVariant} disabled={!draft.name || !draft.sku}>
              Add
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Variant
        </Button>
      )}
    </div>
  );
}
