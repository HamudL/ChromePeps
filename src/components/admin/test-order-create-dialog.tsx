"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  priceInCents: number;
  variants: Array<{ id: string; name: string; priceInCents: number }>;
}

interface CartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

type CustomerType = "user" | "guest";
type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED";
type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
type PaymentMethod = "STRIPE" | "BANK_TRANSFER";

interface TestOrderCreateDialogProps {
  products: CatalogProduct[];
}

export function TestOrderCreateDialog({ products }: TestOrderCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerType, setCustomerType] = useState<CustomerType>("guest");
  const [userId, setUserId] = useState("");
  const [guestName, setGuestName] = useState("Test Kunde");
  const [guestEmail, setGuestEmail] = useState("test@chromepeps.de");

  const [status, setStatus] = useState<OrderStatus>("PROCESSING");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("SUCCEEDED");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("STRIPE");

  const [productQuery, setProductQuery] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);

  const productMap = useMemo(() => {
    const m = new Map<string, CatalogProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [productQuery, products]);

  const subtotalInCents = useMemo(() => {
    let total = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;
      const price = variant?.priceInCents ?? product.priceInCents;
      total += price * item.quantity;
    }
    return total;
  }, [items, productMap]);

  function resetForm() {
    setCustomerType("guest");
    setUserId("");
    setGuestName("Test Kunde");
    setGuestEmail("test@chromepeps.de");
    setStatus("PROCESSING");
    setPaymentStatus("SUCCEEDED");
    setPaymentMethod("STRIPE");
    setProductQuery("");
    setItems([]);
    setError(null);
    setLoading(false);
  }

  function addProduct(productId: string) {
    const product = productMap.get(productId);
    if (!product) return;
    const variantId = product.variants[0]?.id ?? null;
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === productId && it.variantId === variantId
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return next;
      }
      return [...prev, { productId, variantId, quantity: 1 }];
    });
    setProductQuery("");
  }

  function updateItemQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity };
      return next;
    });
  }

  function updateItemVariant(index: number, variantId: string | null) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], variantId };
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);

    if (items.length === 0) {
      setError("Bitte mindestens ein Produkt auswählen.");
      return;
    }
    if (customerType === "user" && !userId.trim()) {
      setError("Bitte User-ID angeben oder auf 'Gast' umstellen.");
      return;
    }
    if (customerType === "guest") {
      if (!guestName.trim()) {
        setError("Bitte Namen für die Gast-Testbestellung angeben.");
        return;
      }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        setError("Bitte eine gültige E-Mail-Adresse für den Gast angeben.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        customerType,
        ...(customerType === "user" ? { userId: userId.trim() } : {}),
        ...(customerType === "guest"
          ? {
              guestName: guestName.trim(),
              guestEmail: guestEmail.trim().toLowerCase(),
            }
          : {}),
        items: items.map((it) => ({
          productId: it.productId,
          ...(it.variantId ? { variantId: it.variantId } : {}),
          quantity: it.quantity,
        })),
        status,
        paymentStatus,
        paymentMethod,
      };

      const res = await fetch("/api/admin/orders/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Anlegen fehlgeschlagen.");
        setLoading(false);
        return;
      }

      setOpen(false);
      resetForm();
      router.push(`/admin/orders/${json.data.orderId}`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Test-Order anlegen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testbestellung anlegen</DialogTitle>
          <DialogDescription>
            Erzeugt eine Order mit <code>isTestOrder=true</code>. Sie wird
            aus Dashboard, Statistiken, Exports und E-Mail-Versand
            ausgeschlossen und dient nur dem manuellen Durchtesten von
            Flows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Kunde</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={customerType === "guest" ? "default" : "outline"}
                onClick={() => setCustomerType("guest")}
              >
                Gast
              </Button>
              <Button
                type="button"
                size="sm"
                variant={customerType === "user" ? "default" : "outline"}
                onClick={() => setCustomerType("user")}
              >
                Existierender User
              </Button>
            </div>

            {customerType === "guest" ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="E-Mail"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
            ) : (
              <Input
                placeholder="User-ID (cuid) — /admin/users kopieren"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            )}
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Produkte</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Produktname oder SKU suchen…"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
            </div>
            {productQuery.trim() && (
              <div className="rounded-md border bg-muted/30 max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Keine Treffer.
                  </p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2 border-b last:border-b-0"
                      onClick={() => addProduct(p.id)}
                    >
                      <span className="truncate">
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.sku}
                        </span>
                      </span>
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}

            {items.length > 0 && (
              <ul className="space-y-2">
                {items.map((item, idx) => {
                  const product = productMap.get(item.productId);
                  if (!product) return null;
                  const variant = item.variantId
                    ? product.variants.find((v) => v.id === item.variantId)
                    : null;
                  const price = variant?.priceInCents ?? product.priceInCents;
                  return (
                    <li
                      key={`${item.productId}-${item.variantId ?? "base"}-${idx}`}
                      className="rounded-md border bg-background p-2 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium flex-1 truncate">
                          {product.name}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeItem(idx)}
                          title="Entfernen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {product.variants.length > 0 && (
                          <Select
                            value={item.variantId ?? product.variants[0].id}
                            onValueChange={(v) =>
                              updateItemVariant(idx, v || null)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {product.variants.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name} · {formatPrice(v.priceInCents)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(
                              idx,
                              parseInt(e.target.value || "0", 10)
                            )
                          }
                          className="h-8 w-16 text-xs"
                        />
                        <span className="text-xs font-medium tabular-nums w-20 text-right">
                          {formatPrice(price * item.quantity)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {items.length > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Zwischensumme (ohne Versand/MwSt.-Split)</span>
                <span className="font-medium tabular-nums">
                  {formatPrice(subtotalInCents)}
                </span>
              </div>
            )}
          </div>

          {/* Status / payment */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as OrderStatus)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Testbestellung anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
