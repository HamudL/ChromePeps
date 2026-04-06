"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { CheckCircle2, Package, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cart-store";
import { APP_NAME } from "@/lib/constants";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = use(searchParams);
  const sessionId = params.session_id;

  const clearCart = useCartStore((s) => s.clearCart);
  const clearedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear cart once on mount
  useEffect(() => {
    if (!clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }
  }, [clearCart]);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="h-64 w-full max-w-lg bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
            <CardDescription className="text-base">
              Thank you for your order. Your payment has been processed
              successfully.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">What happens next?</p>
                  <p className="text-muted-foreground">
                    We are preparing your order for shipment. You will receive an
                    email confirmation with tracking information once your order
                    has been shipped.
                  </p>
                </div>
              </div>

              {sessionId && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Payment Reference
                  </p>
                  <p className="font-mono text-xs mt-1 break-all">
                    {sessionId}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                <Link href="/dashboard">
                  <Package className="mr-2 h-4 w-4" />
                  View My Orders
                </Link>
              </Button>
              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href="/products">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Continue Shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              If you have any questions about your order, please contact our
              support team. Thank you for choosing {APP_NAME}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
