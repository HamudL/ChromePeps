"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CountrySelect } from "@/components/shop/country-select";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";

interface Address {
  id: string;
  label: string | null;
  company: string | null;
  firstName: string;
  lastName: string;
  street: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

interface AddressFormData {
  label: string;
  company: string;
  firstName: string;
  lastName: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = {
  label: "",
  company: "",
  firstName: "",
  lastName: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "DE",
  phone: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.success) {
        setAddresses(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  function openAddDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label ?? "",
      company: address.company ?? "",
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      street2: address.street2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? "",
      isDefault: address.isDefault,
    });
    setError(null);
    setDialogOpen(true);
  }

  function updateField(field: keyof AddressFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Required-Felder mit deutschen Labels — wird nur angezeigt, wenn der
    // HTML5 `required`-Check (oben in den Inputs) aus irgendeinem Grund
    // nicht greift. Eine map ist einfacher und stabiler als
    // dynamisches Stringbasteln, das eh nur englische Camel-Case-Wörter
    // produziert.
    const requiredLabels: Record<string, string> = {
      firstName: "Vorname",
      lastName: "Nachname",
      street: "Straße",
      city: "Stadt",
      postalCode: "PLZ",
      country: "Land",
    };

    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      if (typeof value === "string" && value.trim() === "") {
        if (key in requiredLabels) {
          setError(`${requiredLabels[key]} ist ein Pflichtfeld.`);
          setSubmitting(false);
          return;
        }
        continue;
      }
      payload[key] = value;
    }

    try {
      const url = editingId ? `/api/addresses/${editingId}` : "/api/addresses";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Adresse konnte nicht gespeichert werden.");
        return;
      }

      setDialogOpen(false);
      await fetchAddresses();
    } catch {
      setError("Etwas ist schiefgegangen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Adressbuch</span>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="display-title text-xl">Meine Adressen</h2>
              <span className="mono-label text-muted-foreground">
                {addresses.length === 1
                  ? "1 Eintrag"
                  : `${addresses.length} Einträge`}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Verwalten Sie Ihre Liefer- und Rechnungsadressen.
            </p>
          </div>
          <Button onClick={openAddDialog} size="sm" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Adresse hinzufügen
          </Button>
        </div>
        <div className="tick-rule mt-4" aria-hidden />
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted/50">
              <MapPin className="h-7 w-7 text-muted-foreground" />
            </div>
            <span className="eyebrow justify-center">Adressbuch</span>
            <h3 className="display-title mt-2 mb-2 text-lg">Noch keine Adressen</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Fügen Sie eine Adresse hinzu, um loszulegen.
            </p>
            <Button variant="gold" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adresse hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address, index) => (
            <Card
              variant="lift"
              key={address.id}
              className={cn(
                "relative",
                address.isDefault && "border-primary/40",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium">
                    <span
                      aria-hidden
                      className="mr-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {address.label || `${address.firstName} ${address.lastName}`}
                  </CardTitle>
                  {address.isDefault && (
                    <span className="mono-tag inline-flex shrink-0 items-center gap-1 rounded-[2px] border border-primary/40 bg-primary/10 px-2 py-1 text-primary-strong">
                      <Star className="h-3 w-3" aria-hidden />
                      Standard
                    </span>
                  )}
                </div>
                {address.label && (
                  <CardDescription>
                    {address.firstName} {address.lastName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm leading-relaxed text-muted-foreground">
                  {address.company && <p>{address.company}</p>}
                  <p>{address.street}</p>
                  {address.street2 && <p>{address.street2}</p>}
                  <p>
                    {address.postalCode} {address.city}
                    {address.state && `, ${address.state}`}
                  </p>
                  <p>{address.country}</p>
                  {address.phone && <p>{address.phone}</p>}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(address)}
                  >
                    <Pencil className="mr-1.5 h-3 w-3" />
                    Bearbeiten
                  </Button>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      <Star className="mr-1.5 h-3 w-3" />
                      Als Standard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteConfirmId(address.id)}
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" />
                    Löschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit address dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Adresse bearbeiten" : "Neue Adresse hinzufügen"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Aktualisieren Sie unten die Adressdaten."
                : "Füllen Sie unten die Adressdaten aus."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addr-label" className="field-label">
                Bezeichnung — optional
              </Label>
              <Input
                id="addr-label"
                value={form.label}
                onChange={(e) => updateField("label", e.target.value)}
                placeholder="z.B. Zuhause, Büro"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="addr-firstName" className="field-label">
                  Vorname
                </Label>
                <Input
                  id="addr-firstName"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-lastName" className="field-label">
                  Nachname
                </Label>
                <Input
                  id="addr-lastName"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-company" className="field-label">
                Firma — optional
              </Label>
              <Input
                id="addr-company"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-street" className="field-label">
                Straße
              </Label>
              <Input
                id="addr-street"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-street2" className="field-label">
                Adresszusatz — optional
              </Label>
              <Input
                id="addr-street2"
                value={form.street2}
                onChange={(e) => updateField("street2", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="addr-postalCode" className="field-label">
                  PLZ
                </Label>
                <Input
                  id="addr-postalCode"
                  value={form.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addr-city" className="field-label">
                  Stadt
                </Label>
                <Input
                  id="addr-city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="addr-state" className="field-label">
                  Bundesland — optional
                </Label>
                <Input
                  id="addr-state"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-country" className="field-label">
                  Land
                </Label>
                <CountrySelect
                  id="addr-country"
                  value={form.country}
                  onChange={(v) => updateField("country", v)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-phone" className="field-label">
                Telefon — optional
              </Label>
              <Input
                id="addr-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="addr-isDefault"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => updateField("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="addr-isDefault" className="text-sm font-normal">
                Als Standardadresse festlegen
              </Label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Änderungen speichern" : "Adresse hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adresse löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie diese Adresse wirklich löschen? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
