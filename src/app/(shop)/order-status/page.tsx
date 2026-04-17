"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  Truck,
  XCircle,
  MapPin,
  Mail,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

type OrderStatusData = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  placedAt: string;
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  promoCode: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: Array<{
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    priceInCents: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company: string | null;
    street: string;
    street2: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Zahlung ausstehend", className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
  PROCESSING: { label: "In Bearbeitung", className: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  SHIPPED: { label: "Versandt", className: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  DELIVERED: { label: "Zugestellt", className: "bg-green-500/10 text-green-700 border-green-500/30" },
  CANCELLED: { label: "Storniert", className: "bg-red-500/10 text-red-700 border-red-500/30" },
  REFUNDED: { label: "Erstattet", className: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  ARCHIVED: { label: "Archiviert", className: "bg-muted text-muted-foreground border-border" },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ausstehend",
  SUCCEEDED: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Erstattet",
};

function OrderStatusInner() {
  const params = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(
    params.get("orderNumber") ?? ""
  );
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderStatusData | null>(null);

  const lookup = async (nextOrderNumber?: string, nextEmail?: string) => {
    const useOrderNumber = nextOrderNumber ?? orderNumber;
    const useEmail = nextEmail ?? email;
    if (!useOrderNumber.trim() || !useEmail.trim()) {
      setError("Bitte beide Felder ausfüllen.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: useOrderNumber.trim(),
          email: useEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Fehler beim Abrufen der Bestellung.");
        setOrder(null);
        return;
      }
      setOrder(json.data);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run if both values came from the URL (e.g. from the
  // confirmation email's one-click link).
  useEffect(() => {
    const urlOrder = params.get("orderNumber");
    const urlEmail = params.get("email");
    if (urlOrder && urlEmail) {
      void lookup(urlOrder, urlEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookup();
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative hero-ambient border-b border-border/60">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="container relative py-10 md:py-14">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 px-3 py-1 text-xs mb-3"
          >
            <Package className="mr-1.5 h-3 w-3 text-primary" />
            Bestellstatus
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Bestellung verfolgen
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl">
            Bestellnummer und E-Mail-Adresse eingeben — wir zeigen dir den
            aktuellen Stand deiner Bestellung.
          </p>
        </div>
      </section>

      <div className="container py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Lookup form */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Bestellung finden
                </CardTitle>
                <CardDescription>
                  Die Bestellnummer findest du in deiner
                  Bestellbestätigungs-E-Mail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orderNumber">Bestellnummer</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="orderNumber"
                        placeholder="CP-XXXXXX-XXXXXXXX"
                        required
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="pl-9 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-Mail-Adresse</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="du@beispiel.de"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  {error && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
                    >
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Bestellung abrufen
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Result */}
          <div className="lg:col-span-2 space-y-6">
            {!order && !loading && !error && (
              <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Gib deine Bestellnummer und E-Mail-Adresse ein, um den
                  Status zu sehen.
                </p>
              </div>
            )}

            {order && <OrderResult order={order} />}
          </div>
        </div>
      </div>

      <section className="border-t">
        <div className="container py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Du hast ein Konto?{" "}
            <Link
              href="/login?callbackUrl=/dashboard"
              className="text-primary hover:underline font-medium"
            >
              Einloggen
            </Link>{" "}
            für deine komplette Bestellhistorie.
          </p>
        </div>
      </section>
    </div>
  );
}

function OrderResult({ order }: { order: OrderStatusData }) {
  const statusLabel = STATUS_LABEL[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      {/* Status header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1">
                Bestellnummer
              </p>
              <p className="font-mono text-lg font-semibold">
                {order.orderNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Bestellt am{" "}
                {new Date(order.placedAt).toLocaleDateString("de-DE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`px-3 py-1 text-xs ${statusLabel.className}`}
            >
              {statusLabel.label}
            </Badge>
          </div>

          {/* Status timeline */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-6">
            <TimelineStep
              icon={Clock}
              label="Bestellt"
              timestamp={order.placedAt}
              active
              done
            />
            <TimelineStep
              icon={
                order.paymentMethod === "BANK_TRANSFER"
                  ? Building2
                  : CreditCard
              }
              label={
                order.paymentStatus === "SUCCEEDED"
                  ? "Bezahlt"
                  : PAYMENT_STATUS_LABEL[order.paymentStatus] ?? "Zahlung"
              }
              timestamp={null}
              active={order.paymentStatus === "SUCCEEDED"}
              done={order.paymentStatus === "SUCCEEDED"}
            />
            <TimelineStep
              icon={
                order.status === "DELIVERED"
                  ? CheckCircle2
                  : order.status === "CANCELLED"
                    ? XCircle
                    : Truck
              }
              label={
                order.status === "DELIVERED"
                  ? "Zugestellt"
                  : order.status === "SHIPPED"
                    ? "Versandt"
                    : order.status === "CANCELLED"
                      ? "Storniert"
                      : "Versand"
              }
              timestamp={
                order.deliveredAt ?? order.shippedAt ?? order.cancelledAt
              }
              active={
                order.status === "SHIPPED" ||
                order.status === "DELIVERED" ||
                order.status === "CANCELLED"
              }
              done={
                order.status === "DELIVERED" || order.status === "CANCELLED"
              }
            />
          </div>

          {order.trackingNumber && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <span className="font-medium">Tracking-Nr:</span>{" "}
              <span className="font-mono">{order.trackingNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Artikel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.productName}
                  {item.variantName && (
                    <span className="text-muted-foreground">
                      {" "}· {item.variantName}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {formatPrice(item.priceInCents)}
                </p>
              </div>
              <div className="font-semibold text-sm tabular-nums">
                {formatPrice(item.priceInCents * item.quantity)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals + address */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zusammenfassung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow label="Zwischensumme" value={order.subtotalInCents} />
            {order.discountInCents > 0 && (
              <SummaryRow
                label={
                  order.promoCode ? `Rabatt (${order.promoCode})` : "Rabatt"
                }
                value={-order.discountInCents}
                accent="discount"
              />
            )}
            <SummaryRow
              label="Versand"
              value={order.shippingInCents}
              hint={order.shippingInCents === 0 ? "Gratis" : undefined}
            />
            <div className="pt-2 mt-2 border-t">
              <SummaryRow label="Gesamt" value={order.totalInCents} bold />
              <p className="text-xs text-muted-foreground text-right mt-0.5">
                inkl. {formatPrice(order.taxInCents)} MwSt.
              </p>
            </div>
          </CardContent>
        </Card>

        {order.shippingAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lieferadresse
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-0.5">
              <p className="font-medium">
                {order.shippingAddress.firstName}{" "}
                {order.shippingAddress.lastName}
              </p>
              {order.shippingAddress.company && (
                <p className="text-muted-foreground">
                  {order.shippingAddress.company}
                </p>
              )}
              <p className="text-muted-foreground">
                {order.shippingAddress.street}
              </p>
              {order.shippingAddress.street2 && (
                <p className="text-muted-foreground">
                  {order.shippingAddress.street2}
                </p>
              )}
              <p className="text-muted-foreground">
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.country}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  label,
  timestamp,
  active,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  timestamp: string | null;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          done
            ? "border-primary bg-primary text-primary-foreground"
            : active
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-muted/30 text-muted-foreground/50"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium ${
            done || active ? "" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {timestamp && (
          <p className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleDateString("de-DE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
  hint,
  bold,
}: {
  label: string;
  value: number;
  accent?: "discount";
  hint?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={bold ? "text-base font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={`tabular-nums ${
          accent === "discount"
            ? "text-primary font-medium"
            : bold
              ? "text-base font-semibold"
              : ""
        }`}
      >
        {hint ?? formatPrice(value)}
      </span>
    </div>
  );
}

export default function OrderStatusPage() {
  // useSearchParams requires a Suspense boundary in client components
  // for static rendering compatibility.
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrderStatusInner />
    </Suspense>
  );
}
