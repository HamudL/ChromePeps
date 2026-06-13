export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { OrderStatusTag } from "@/components/dashboard/order-status-tag";
import { ArrowLeft, Download, Truck } from "lucide-react";

/**
 * Bestelldetail — der Beleg im Laborjournal: Kopf mit Mono-Bestell-
 * nummer und Mess-Lineal, Positionstabelle mit Mono-Beträgen,
 * Summenblock mit Haarlinien, Status-Timeline als Protokollspur.
 */
export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await props.params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      billingAddress: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Zurück zur Liste */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Bestellungen
        </Link>
      </Button>

      {/* Beleg-Kopf */}
      <div>
        <span className="eyebrow">Bestellprotokoll</span>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="display-title text-2xl">
              <span className="font-mono">{order.orderNumber}</span>
            </h2>
            <p className="mt-1.5 font-mono text-xs tabular-nums text-muted-foreground">
              Aufgegeben am{" "}
              {format(new Date(order.createdAt), "dd.MM.yyyy 'um' HH:mm")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusTag status={order.status} />
            {order.paymentStatus === "SUCCEEDED" && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`/api/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noopener"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Rechnung herunterladen
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="tick-rule mt-4" aria-hidden />
      </div>

      {/* Positionen — Beleg-Tabelle mit Summenblock */}
      <Card>
        <CardHeader className="pb-4">
          <span className="mono-label text-muted-foreground">
            Positionen ·{" "}
            <span className="tabular-nums">
              {String(order.items.length).padStart(2, "0")}
            </span>
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Pos.</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Produkt</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">SKU</TableHead>
                  <TableHead className="text-center font-mono text-[10px] uppercase tracking-[0.12em]">Menge</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.12em]">Preis</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.12em]">Zwischensumme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.productName}
                      {item.variantName && (
                        <span className="ml-1 text-muted-foreground">
                          ({item.variantName})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatPrice(item.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summenblock — Haarlinien wie auf einem Analysebeleg */}
          <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Zwischensumme</span>
              <span className="font-mono tabular-nums">
                {formatPrice(order.subtotalInCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versand</span>
              <span className="font-mono tabular-nums">
                {order.shippingInCents === 0 ? (
                  <span className="font-sans text-success">Kostenlos</span>
                ) : (
                  formatPrice(order.shippingInCents)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MwSt.</span>
              <span className="font-mono tabular-nums">
                {formatPrice(order.taxInCents)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-foreground pt-3">
              <span className="stat-key">Gesamt</span>
              <span className="stat-value text-xl">
                {formatPrice(order.totalInCents)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lieferadresse */}
        {order.shippingAddress && (
          <Card>
            <CardHeader className="pb-4">
              <span className="mono-label text-muted-foreground">
                Lieferadresse
              </span>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              <p className="font-medium">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
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
                {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.country}
              </p>
              {order.shippingAddress.phone && (
                <p className="mt-1 text-muted-foreground">
                  {order.shippingAddress.phone}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status-Timeline — Protokollspur mit eckigen Markern */}
        <Card>
          <CardHeader className="pb-4">
            <span className="mono-label text-muted-foreground">
              Statusverlauf
            </span>
          </CardHeader>
          <CardContent>
            {order.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Ereignisse erfasst.</p>
            ) : (
              <ol className="relative ml-1.5 border-l border-border">
                {order.events.map((event, index) => (
                  <li key={event.id} className="mb-6 ml-5 last:mb-0">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-[5px] mt-1 h-2.5 w-2.5 border border-background",
                        index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusTag status={event.status} />
                        <time className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {format(
                            new Date(event.createdAt),
                            "dd.MM.yyyy · HH:mm"
                          )}
                        </time>
                      </div>
                      {event.note && (
                        <p className="text-sm text-muted-foreground">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sendungsverfolgung */}
      {order.trackingNumber && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-primary-strong">
              <Truck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="mono-label text-muted-foreground">
                Sendungsnummer
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium tracking-wide">
                {order.trackingNumber}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
