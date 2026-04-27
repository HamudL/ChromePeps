"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

export interface ShippingRateRow {
  id: string;
  countryCode: string;
  countryName: string;
  priceInCents: number;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM = {
  countryCode: "",
  countryName: "",
  priceEur: "",
  isActive: true,
  sortOrder: "10",
};

export function ShippingRatesClient({
  initial,
}: {
  initial: ShippingRateRow[];
}) {
  const router = useRouter();
  const [rates, setRates] = useState<ShippingRateRow[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRateRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(rate: ShippingRateRow) {
    setEditing(rate);
    setForm({
      countryCode: rate.countryCode,
      countryName: rate.countryName,
      priceEur: (rate.priceInCents / 100).toFixed(2),
      isActive: rate.isActive,
      sortOrder: String(rate.sortOrder),
    });
    setError("");
    setDialogOpen(true);
  }

  async function reload() {
    try {
      const res = await fetch("/api/admin/shipping");
      const json = await res.json();
      if (json.success) {
        setRates(json.data);
      }
    } catch {
      // ignore — UI bleibt mit alten Daten, nächster CRUD löst Reload aus
    }
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const priceInCents = Math.round(parseFloat(form.priceEur) * 100);
    if (isNaN(priceInCents) || priceInCents < 0) {
      setError("Bitte einen gültigen Preis angeben.");
      setSaving(false);
      return;
    }

    const body = {
      countryCode: form.countryCode.toUpperCase().trim(),
      countryName: form.countryName.trim(),
      priceInCents,
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };

    try {
      const url = editing
        ? `/api/admin/shipping/${editing.id}`
        : "/api/admin/shipping";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }
      toast.success(editing ? "Tarif aktualisiert" : "Tarif angelegt");
      setDialogOpen(false);
      await reload();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/shipping/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Löschen fehlgeschlagen");
        return;
      }
      toast.success("Tarif gelöscht");
      setDeleteId(null);
      await reload();
    } catch {
      toast.error("Netzwerkfehler beim Löschen");
    }
  }

  async function toggleActive(rate: ShippingRateRow) {
    try {
      const res = await fetch(`/api/admin/shipping/${rate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rate.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Update fehlgeschlagen");
        return;
      }
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Truck className="h-6 w-6" />
            Versandkosten pro Land
          </h2>
          <p className="text-sm text-muted-foreground">
            Wirkt sich sofort auf Checkout & /versand aus. Free-Shipping-Schwelle
            (200 €) gilt EU-weit für alle aktiven Länder.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tarif hinzufügen
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Code</TableHead>
                <TableHead>Land</TableHead>
                <TableHead className="text-right">Preis</TableHead>
                <TableHead className="text-right">Sortierung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length > 0 ? (
                rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {r.countryCode}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.countryName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(r.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.sortOrder}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleActive(r)}
                        className="cursor-pointer"
                        title="Klicken zum Umschalten"
                      >
                        <Badge
                          variant={r.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {r.isActive ? "Aktiv" : "Deaktiviert"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(r.id)}
                          aria-label="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Noch keine Tarife — Tabelle wird beim ersten Page-Load
                    automatisch mit den 27 EU-Defaults befüllt.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Tarif bearbeiten" : "Tarif anlegen"}
            </DialogTitle>
            <DialogDescription>
              ISO-3166-1 alpha-2 Ländercode. Preis pro Lieferung, brutto inkl.
              MwSt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="rate-code">Code *</Label>
                <Input
                  id="rate-code"
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      countryCode: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="DE"
                  maxLength={2}
                  className="uppercase"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="rate-name">Land *</Label>
                <Input
                  id="rate-name"
                  value={form.countryName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, countryName: e.target.value }))
                  }
                  placeholder="Deutschland"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate-price">Preis (EUR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="rate-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.priceEur}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, priceEur: e.target.value }))
                    }
                    placeholder="5.99"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-sort">Sortierung</Label>
                <Input
                  id="rate-sort"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sortOrder: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rate-active"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              <Label htmlFor="rate-active" className="cursor-pointer">
                Aktiv (Land erscheint im Checkout)
              </Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Aktualisieren" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tarif löschen?</DialogTitle>
            <DialogDescription>
              Das Land erscheint sofort nicht mehr im Checkout-Country-Select.
              Bereits abgeschlossene Bestellungen bleiben mit ihrem damaligen
              Versandpreis intakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
