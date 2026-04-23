"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Package,
  ShoppingBag,
  ArrowRight,
  Building2,
  Copy,
  Check,
  Loader2,
  Search,
} from "lucide-react";
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
import { APP_NAME, BANK_DETAILS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
    method?: string;
    orderId?: string;
    orderNumber?: string;
    total?: string;
  }>;
}

export default function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = use(searchParams);
  const sessionId = params.session_id;
  const isBankTransfer = params.method === "bank-transfer";
  const orderNumber = params.orderNumber;
  const totalCents = parseInt(params.total ?? "0") || 0;

  const clearCart = useCartStore((s) => s.clearCart);
  const clearedRef = useRef(false);
  const verifiedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stripeOrder, setStripeOrder] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(!!sessionId);
  // `/dashboard` requires a real account — sending a guest there
  // just bounces them to /login, which is confusing right after
  // they've completed a purchase. The post-order CTA switches to
  // "Bestellung verfolgen" → /order-status for guests.
  const { status: authStatus } = useSession();
  const isGuest = authStatus === "unauthenticated";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear cart once — only if we arrived via a real checkout (has session_id or orderId)
  useEffect(() => {
    if (!clearedRef.current && (sessionId || params.orderId)) {
      clearedRef.current = true;
      clearCart();
    }
  }, [clearCart, sessionId, params.orderId]);

  // For Stripe payments: verify session and create order if webhook hasn't
  useEffect(() => {
    if (!sessionId || verifiedRef.current) return;
    verifiedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setStripeOrder({
            orderId: json.data.orderId,
            orderNumber: json.data.orderNumber,
          });
        }
      } catch {
        // Silent — order may still be created by webhook
      } finally {
        setVerifying(false);
      }
    })();
  }, [sessionId]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback — ignore
    }
  };

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
        <Card className={`shadow-lg ${isBankTransfer ? "border-blue-200" : "border-green-200"}`}>
          <CardHeader className="text-center pb-4">
            <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
              isBankTransfer ? "bg-blue-100" : "bg-green-100"
            }`}>
              {isBankTransfer ? (
                <Building2 className="h-10 w-10 text-blue-600" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isBankTransfer ? "Bestellung eingegangen!" : "Bestellung bestätigt!"}
            </CardTitle>
            <CardDescription className="text-base">
              {isBankTransfer
                ? "Ihre Bestellung ist eingegangen. Bitte überweisen Sie den Betrag, damit wir die Bestellung bearbeiten können."
                : "Vielen Dank für Ihre Bestellung. Ihre Zahlung wurde erfolgreich verarbeitet."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Separator />

            {isBankTransfer ? (
              <>
                {/* Bank Transfer Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Überweisungsdaten</p>
                      <p className="text-sm text-muted-foreground">
                        Bitte überweisen Sie den unten angegebenen Betrag mit
                        der Bestellnummer als Verwendungszweck.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                    {/* Betrag */}
                    {totalCents > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Betrag</span>
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(totalCents)}
                        </span>
                      </div>
                    )}

                    <Separator />

                    {/* Bank info rows */}
                    <BankDetailRow
                      label="Kontoinhaber"
                      value={BANK_DETAILS.accountHolder}
                      onCopy={() => copyToClipboard(BANK_DETAILS.accountHolder, "holder")}
                      copied={copiedField === "holder"}
                    />
                    <BankDetailRow
                      label="IBAN"
                      value={BANK_DETAILS.iban}
                      onCopy={() => copyToClipboard(BANK_DETAILS.iban, "iban")}
                      copied={copiedField === "iban"}
                      mono
                    />
                    <BankDetailRow
                      label="BIC / SWIFT"
                      value={BANK_DETAILS.bic}
                      onCopy={() => copyToClipboard(BANK_DETAILS.bic, "bic")}
                      copied={copiedField === "bic"}
                      mono
                    />
                    <BankDetailRow
                      label="Bank"
                      value={BANK_DETAILS.bankName}
                      onCopy={() => copyToClipboard(BANK_DETAILS.bankName, "bank")}
                      copied={copiedField === "bank"}
                    />

                    <Separator />

                    {/* Verwendungszweck */}
                    {orderNumber && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">
                          Verwendungszweck
                        </span>
                        <div className="flex items-center justify-between bg-background rounded-md border p-2">
                          <span className="font-mono font-bold text-sm">
                            {orderNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(orderNumber, "ref")}
                          >
                            {copiedField === "ref" ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    <p className="font-medium">Wichtig</p>
                    <p className="mt-1">
                      Bitte verwenden Sie Ihre Bestellnummer als
                      Verwendungszweck, damit wir Ihre Überweisung der
                      Bestellung zuordnen können. Die Bearbeitung startet,
                      sobald der Zahlungseingang bestätigt ist.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Wie geht es weiter?</p>
                    <p className="text-muted-foreground">
                      Wir bereiten Ihre Bestellung für den Versand vor. Sie
                      erhalten eine Versandbestätigung mit Tracking-Nummer
                      per E-Mail, sobald die Sendung unterwegs ist.
                    </p>
                  </div>
                </div>

                {verifying ? (
                  <div className="rounded-md border bg-muted/50 p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Bestellung wird bestätigt…
                    </p>
                  </div>
                ) : stripeOrder ? (
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Bestellnummer</p>
                    <p className="font-mono font-bold text-sm mt-1">
                      {stripeOrder.orderNumber}
                    </p>
                  </div>
                ) : sessionId ? (
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Zahlungsreferenz</p>
                    <p className="font-mono text-xs mt-1 break-all">
                      {sessionId}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                {isGuest ? (
                  <Link href="/order-status">
                    <Search className="mr-2 h-4 w-4" />
                    Bestellung verfolgen
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Package className="mr-2 h-4 w-4" />
                    Meine Bestellungen
                  </Link>
                )}
              </Button>
              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href="/products">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Weiter einkaufen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Bei Fragen zu Ihrer Bestellung wenden Sie sich bitte an unseren
              Support. Vielen Dank, dass Sie sich für {APP_NAME} entschieden
              haben.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BankDetailRow({
  label,
  value,
  onCopy,
  copied,
  mono = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={onCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
