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

// Status-Tags in der Specimen-Sprache: eckig, Mono, nur Token-Farben
// (Viridian/Success/Destructive) statt freier Farbpalette.
const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Zahlung ausstehend", className: "border-border bg-muted text-muted-foreground" },
  PROCESSING: { label: "In Bearbeitung", className: "border-primary/40 bg-primary/10 text-primary-strong" },
  SHIPPED: { label: "Versandt", className: "border-foreground bg-foreground text-background" },
  DELIVERED: { label: "Zugestellt", className: "border-success/40 bg-success/10 text-success" },
  CANCELLED: { label: "Storniert", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  REFUNDED: { label: "Erstattet", className: "border-destructive/30 bg-destructive/5 text-destructive" },
  ARCHIVED: { label: "Archiviert", className: "border-border bg-muted text-muted-foreground" },
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
        <div className="container relative py-12 md:py-16">
          <span className="eyebrow">Bestellstatus</span>
          <h1 className="display-title mt-4 text-4xl md:text-5xl lg:text-6xl">
            Bestellung verfolgen
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Bestellnummer und E-Mail-Adresse eingeben — wir zeigen dir in
            Echtzeit, wo deine Sendung gerade steht.
          </p>
          <div className="tick-rule mt-8 max-w-2xl" aria-hidden />
        </div>
      </section>

      <div className="container py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Such-Formular */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <span className="eyebrow">Tracking</span>
                <CardTitle className="display-title mt-2 text-xl">
                  Bestellung finden
                </CardTitle>
                <CardDescription>
                  Die Bestellnummer findest du in deiner
                  Bestellbestätigungs-E-Mail.
                </CardDescription>
                <div className="tick-rule !mt-3" aria-hidden />
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orderNumber" className="field-label">
                      Bestellnummer
                    </Label>
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
                    <Label htmlFor="email" className="field-label">
                      E-Mail-Adresse
                    </Label>
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
                    variant="gold"
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

          {/* Ergebnis */}
          <div className="lg:col-span-2 space-y-6">
            {!order && !loading && !error && (
              <div className="rounded-md border border-dashed border-border/70 py-16 text-center">
                <Package className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
                <p className="mono-label text-muted-foreground">
                  Kein Protokoll geladen
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
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
              className="font-medium text-primary-strong hover:underline"
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
    className: "border-border bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Status-Kopf */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="stat-key mb-1.5">Bestellnummer</p>
              <p className="font-mono text-xl font-bold tracking-wide md:text-2xl">
                {order.orderNumber}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
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
              className={`rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusLabel.className}`}
            >
              {statusLabel.label}
            </Badge>
          </div>

          {/* Status-Timeline als Mess-Strecke: tick-rule-Achse mit
              quadratischen Messpunkten — gefüllt (erledigt), umrandet
              (aktiv), neutral (ausstehend). */}
          <ol className="mt-6 grid grid-cols-1 border-t border-border pt-6 sm:grid-cols-3 sm:gap-4">
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
              last
            />
          </ol>

          {order.trackingNumber && (
            <div className="mt-5 flex items-baseline justify-between gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm">
              <span className="mono-label text-primary-strong">
                Tracking-Nr.
              </span>
              <span className="font-mono font-medium">
                {order.trackingNumber}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positionen als Protokollzeilen */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="display-title text-xl">Artikel</CardTitle>
          <div className="tick-rule !mt-3" aria-hidden />
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {order.items.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:block">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.productName}
                      {item.variantName && (
                        <span className="text-muted-foreground">
                          {" "}· {item.variantName}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {item.quantity} × {formatPrice(item.priceInCents)}
                    </p>
                  </div>
                </div>
                <div className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
                  {formatPrice(item.priceInCents * item.quantity)}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Beleg + Lieferadresse */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <span className="eyebrow">Beleg</span>
            <CardTitle className="display-title mt-2 text-lg">
              Zusammenfassung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
            {/* Summenzeile mit Doppellinie — Belegabschluss */}
            <div className="mt-2 border-t-[3px] border-double border-foreground/80 pt-2">
              <SummaryRow label="Gesamt" value={order.totalInCents} bold />
              <p className="mt-0.5 text-right text-xs text-muted-foreground">
                inkl. {formatPrice(order.taxInCents)} MwSt.
              </p>
            </div>
          </CardContent>
        </Card>

        {order.shippingAddress && (
          <Card>
            <CardHeader className="pb-4">
              <span className="eyebrow">Lieferung</span>
              <CardTitle className="display-title mt-2 flex items-center gap-2 text-lg">
                <MapPin className="h-4 w-4 text-primary-strong" />
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
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  timestamp: string | null;
  active: boolean;
  done: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative pb-7 pl-7 last:pb-0 sm:pb-0 sm:pl-0 sm:pt-6">
      {/* Mess-Achse zum nächsten Messpunkt (Desktop, horizontal) */}
      {!last && (
        <span
          aria-hidden
          className="tick-rule absolute left-5 right-0 top-0 hidden sm:block"
        />
      )}
      {/* Achse vertikal (Mobile) */}
      {!last && (
        <span
          aria-hidden
          className="absolute bottom-0 left-[4.5px] top-4 w-px bg-border sm:hidden"
        />
      )}
      {/* Messpunkt — quadratisch, Zustand über Füllung */}
      <span
        aria-hidden
        className={`absolute left-0 top-1 h-[10px] w-[10px] border sm:top-[2px] ${
          done
            ? "border-primary bg-primary"
            : active
              ? "border-primary bg-primary/15"
              : "border-input bg-muted"
        }`}
      />
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 shrink-0 ${
            done || active
              ? "text-primary-strong"
              : "text-muted-foreground/50"
          }`}
        />
        <p
          className={`text-sm font-medium ${
            done || active ? "" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
      </div>
      {timestamp && (
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {new Date(timestamp).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </li>
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
      <span
        className={
          bold
            ? "stat-key"
            : "font-mono text-xs text-muted-foreground"
        }
      >
        {label}
      </span>
      <span
        className={`font-mono tabular-nums ${
          accent === "discount"
            ? "text-xs font-medium text-primary-strong"
            : bold
              ? "text-lg font-semibold"
              : "text-xs"
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
