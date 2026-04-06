export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
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
import { ArrowLeft, Clock, MapPin, Receipt } from "lucide-react";

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
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      {/* Order header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Placed on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn("w-fit text-sm", ORDER_STATUS_COLORS[order.status] ?? "")}
        >
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
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
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator className="my-4" />

          {/* Pricing summary */}
          <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {order.shippingInCents === 0
                  ? "Free"
                  : formatPrice(order.shippingInCents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(order.taxInCents)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.totalInCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipping address */}
        {order.shippingAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
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

        {/* Order timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Order Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded.</p>
            ) : (
              <ol className="relative border-l border-border ml-2">
                {order.events.map((event, index) => (
                  <li key={event.id} className="mb-6 ml-6 last:mb-0">
                    <span
                      className={cn(
                        "absolute -left-1.5 flex h-3 w-3 rounded-full border-2 border-background",
                        index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            ORDER_STATUS_COLORS[event.status] ?? ""
                          )}
                        >
                          {ORDER_STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                      </div>
                      {event.note && (
                        <p className="text-sm text-muted-foreground">
                          {event.note}
                        </p>
                      )}
                      <time className="text-xs text-muted-foreground">
                        {format(
                          new Date(event.createdAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking info */}
      {order.trackingNumber && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div>
              <p className="text-sm font-medium">Tracking Number</p>
              <p className="font-mono text-sm text-muted-foreground">
                {order.trackingNumber}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
