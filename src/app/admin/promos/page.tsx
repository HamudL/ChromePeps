"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Percent,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minOrderCents: number | null;
  isActive: boolean;
  isCombinable: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count?: { usages: number };
}

const INITIAL_FORM = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
  discountValue: 10,
  maxUses: "",
  minOrderCents: "",
  isActive: true,
  isCombinable: false,
  startsAt: "",
  expiresAt: "",
};

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPromos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/promos");
      const json = await res.json();
      if (json.success) {
        setPromos(json.data);
      } else {
        setError(json.error || "Failed to load promo codes");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      description: promo.description ?? "",
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxUses: promo.maxUses?.toString() ?? "",
      minOrderCents: promo.minOrderCents
        ? (promo.minOrderCents / 100).toString()
        : "",
      isActive: promo.isActive,
      isCombinable: promo.isCombinable,
      startsAt: promo.startsAt
        ? new Date(promo.startsAt).toISOString().slice(0, 16)
        : "",
      expiresAt: promo.expiresAt
        ? new Date(promo.expiresAt).toISOString().slice(0, 16)
        : "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(),
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: form.discountValue,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      minOrderCents: form.minOrderCents
        ? Math.round(parseFloat(form.minOrderCents) * 100)
        : null,
      isActive: form.isActive,
      isCombinable: form.isCombinable,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : null,
    };

    try {
      const url = editingId
        ? `/api/admin/promos/${editingId}`
        : "/api/admin/promos";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to save promo code");
        return;
      }

      setDialogOpen(false);
      loadPromos();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPromos((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const formatDiscount = (promo: PromoCode) => {
    if (promo.discountType === "PERCENTAGE") {
      return `${promo.discountValue}%`;
    }
    return formatPrice(promo.discountValue);
  };

  const isExpired = (promo: PromoCode) => {
    if (!promo.expiresAt) return false;
    return new Date(promo.expiresAt) < new Date();
  };

  const isMaxedOut = (promo: PromoCode) => {
    if (!promo.maxUses) return false;
    return promo.usedCount >= promo.maxUses;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes for your store.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Promo Code" : "Create Promo Code"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the promo code details."
                  : "Create a new discount code for customers."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Code */}
              <div className="grid gap-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="SUMMER25"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="font-mono uppercase"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Summer sale 25% off"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Discount Type *</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        discountType: v as "PERCENTAGE" | "FIXED_AMOUNT",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">
                        Fixed Amount (EUR)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountValue">
                    {form.discountType === "PERCENTAGE"
                      ? "Percent Off *"
                      : "Amount in Cents *"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min={1}
                    max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discountValue: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Max Uses + Min Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxUses">Max Uses (empty = unlimited)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxUses: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minOrderCents">Min Order (EUR)</Label>
                  <Input
                    id="minOrderCents"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="No minimum"
                    value={form.minOrderCents}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minOrderCents: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startsAt">Starts At</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startsAt: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expiresAt: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Active + Combinable */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isCombinable"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={form.isCombinable}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isCombinable: e.target.checked }))
                    }
                  />
                  <Label htmlFor="isCombinable" className="cursor-pointer">
                    Combinable with other codes
                  </Label>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.code || !form.discountValue}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {promos.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium">No promo codes yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first promo code to offer discounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promos.map((promo) => (
            <Card key={promo.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-mono text-lg">
                      {promo.code}
                    </CardTitle>
                    <div className="flex gap-2">
                      {promo.isActive && !isExpired(promo) && !isMaxedOut(promo) ? (
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {isExpired(promo)
                            ? "Expired"
                            : isMaxedOut(promo)
                              ? "Maxed Out"
                              : "Inactive"}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        {promo.discountType === "PERCENTAGE" ? (
                          <Percent className="h-3 w-3" />
                        ) : (
                          <Banknote className="h-3 w-3" />
                        )}
                        {formatDiscount(promo)}
                      </Badge>
                      {promo.isCombinable && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          Combinable
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(promo)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(promo.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {promo.description && (
                  <CardDescription>{promo.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Used: {promo.usedCount}
                    {promo.maxUses ? ` / ${promo.maxUses}` : " (unlimited)"}
                  </span>
                  {promo.minOrderCents && (
                    <span>
                      Min order: {formatPrice(promo.minOrderCents)}
                    </span>
                  )}
                  {promo.expiresAt && (
                    <span>
                      Expires:{" "}
                      {new Date(promo.expiresAt).toLocaleDateString("de-DE")}
                    </span>
                  )}
                  {promo.startsAt && (
                    <span>
                      Starts:{" "}
                      {new Date(promo.startsAt).toLocaleDateString("de-DE")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
