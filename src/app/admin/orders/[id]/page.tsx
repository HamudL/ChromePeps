export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Package, MapPin, Clock, CreditCard, Building2, Tag } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrderArchiveButton } from "@/components/admin/order-archive-button";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: true,
      shippingAddress: true,
      billingAddress: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              Order {order.orderNumber}
            </h2>
            <Badge
              variant="secondary"
              className={cn("text-xs", ORDER_STATUS_COLORS[order.status])}
            >
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' HH:mm")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {item.sku}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
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
              <div className="px-4 py-3 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotalInCents)}</span>
                </div>
                {order.discountInCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Discount
                      {order.promoCode && (
                        <code className="text-xs bg-green-100 px-1 py-0.5 rounded">
                          {order.promoCode}
                        </code>
                      )}
                    </span>
                    <span className="text-green-600 font-medium">
                      &minus;{formatPrice(order.discountInCents)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(order.shippingInCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.taxInCents)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(order.totalInCents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">
                  {order.user?.name ?? order.guestName ?? "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.user?.email ?? order.guestEmail ?? "—"}
                </p>
                {!order.user && order.guestEmail && (
                  <p className="text-xs text-muted-foreground/70 italic mt-1">
                    Gastbestellung
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <div className="grid gap-6 sm:grid-cols-2">
            {order.shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.shippingAddress.firstName}{" "}
                    {order.shippingAddress.lastName}
                  </p>
                  {order.shippingAddress.company && (
                    <p>{order.shippingAddress.company}</p>
                  )}
                  <p>{order.shippingAddress.street}</p>
                  {order.shippingAddress.street2 && (
                    <p>{order.shippingAddress.street2}</p>
                  )}
                  <p>
                    {order.shippingAddress.postalCode}{" "}
                    {order.shippingAddress.city}
                    {order.shippingAddress.state &&
                      `, ${order.shippingAddress.state}`}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p className="text-muted-foreground">
                      {order.shippingAddress.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {order.billingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.billingAddress.firstName}{" "}
                    {order.billingAddress.lastName}
                  </p>
                  {order.billingAddress.company && (
                    <p>{order.billingAddress.company}</p>
                  )}
                  <p>{order.billingAddress.street}</p>
                  {order.billingAddress.street2 && (
                    <p>{order.billingAddress.street2}</p>
                  )}
                  <p>
                    {order.billingAddress.postalCode}{" "}
                    {order.billingAddress.city}
                    {order.billingAddress.state &&
                      `, ${order.billingAddress.state}`}
                  </p>
                  <p>{order.billingAddress.country}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Payment Method</dt>
                  <dd className="flex items-center gap-1.5 mt-0.5">
                    {order.paymentMethod === "BANK_TRANSFER" ? (
                      <>
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-medium">Bank Transfer</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                        <span className="font-medium">Stripe</span>
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Payment Status</dt>
                  <dd>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mt-0.5",
                        order.paymentStatus === "SUCCEEDED"
                          ? "border-green-300 text-green-700"
                          : order.paymentStatus === "FAILED"
                            ? "border-red-300 text-red-700"
                            : "border-yellow-300 text-yellow-700"
                      )}
                    >
                      {order.paymentStatus}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd className="font-medium uppercase">{order.currency}</dd>
                </div>
                {order.trackingNumber && (
                  <div>
                    <dt className="text-muted-foreground">Tracking Number</dt>
                    <dd className="font-medium">{order.trackingNumber}</dd>
                  </div>
                )}
                {order.stripePaymentIntentId && (
                  <div>
                    <dt className="text-muted-foreground">Stripe Payment ID</dt>
                    <dd>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {order.stripePaymentIntentId}
                      </code>
                    </dd>
                  </div>
                )}
                {order.notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd>{order.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update Form */}
          <OrderStatusForm
            orderId={order.id}
            currentStatus={order.status}
            currentTracking={order.trackingNumber}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
          />

          {/* Archive */}
          <OrderArchiveButton orderId={order.id} currentStatus={order.status} />

          {/* Event Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.events.length > 0 ? (
                <div className="space-y-4">
                  {order.events.map((event, index) => (
                    <div key={event.id} className="relative pl-6">
                      {/* Timeline line */}
                      {index < order.events.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
                      )}
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-background",
                          ORDER_STATUS_COLORS[event.status]
                            ? "bg-current"
                            : "bg-muted-foreground"
                        )}
                        style={{
                          backgroundColor:
                            event.status === "DELIVERED"
                              ? "#16a34a"
                              : event.status === "SHIPPED"
                                ? "#9333ea"
                                : event.status === "PROCESSING"
                                  ? "#2563eb"
                                  : event.status === "CANCELLED"
                                    ? "#dc2626"
                                    : event.status === "REFUNDED"
                                      ? "#6b7280"
                                      : "#eab308",
                        }}
                      />
                      <div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            ORDER_STATUS_COLORS[event.status]
                          )}
                        >
                          {ORDER_STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                        {event.note && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(
                            new Date(event.createdAt),
                            "MMM d, yyyy 'at' HH:mm"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No events recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
