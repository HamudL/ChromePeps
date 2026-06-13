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
  Lock,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useCartStore } from "@/store/cart-store";
import { APP_NAME, type BankTransferInfo } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

interface SuccessClientProps {
  searchParams: Promise<{
    session_id?: string;
    method?: string;
    orderId?: string;
    orderNumber?: string;
    total?: string;
  }>;
  // Vom Server-Wrapper (page.tsx) zur Laufzeit aus der Server-Env
  // gelesen — siehe Kommentar in src/lib/constants.ts.
  bankTransfer: BankTransferInfo;
}

export function CheckoutSuccessClient({
  searchParams,
  bankTransfer,
}: SuccessClientProps) {
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

  // Cart NICHT mehr rein URL-getriggert leeren: jeder Aufruf von
  // /checkout/success?... (Bookmark, Reload, fremder Link) hat vorher
  // den lokalen Warenkorb gelöscht. Stattdessen:
  //  - Stripe: erst NACH erfolgreicher verify-session-Antwort (siehe
  //    Effect unten) — eine erfundene session_id leert nichts mehr.
  //  - Vorkasse: orderId UND orderNumber müssen vorhanden sein — die
  //    hängt nur der Checkout selbst nach erfolgreicher Order-Anlage
  //    an die URL. (Eine stille Server-Verifikation gibt es für Gäste
  //    nicht: /api/order-status verlangt zusätzlich die E-Mail.)
  useEffect(() => {
    if (!clearedRef.current && isBankTransfer && params.orderId && orderNumber) {
      clearedRef.current = true;
      clearCart();
    }
  }, [clearCart, isBankTransfer, params.orderId, orderNumber]);

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
          // Erst jetzt ist die Zahlung serverseitig bestätigt — der
          // lokale Cart darf geleert werden.
          if (!clearedRef.current) {
            clearedRef.current = true;
            clearCart();
          }
        }
      } catch {
        // Silent — order may still be created by webhook
      } finally {
        setVerifying(false);
      }
    })();
  }, [sessionId, clearCart]);

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
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <span className="eyebrow justify-center">
            {isBankTransfer ? "Bestellung eingegangen" : "Bestellung bestätigt"}
          </span>
        </div>
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="pb-4 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ring-8 ${
                isBankTransfer
                  ? "bg-primary/10 text-primary-strong ring-primary/[0.06]"
                  : "bg-primary/15 text-primary-strong ring-primary/[0.08]"
              }`}
            >
              {isBankTransfer ? (
                <Building2 className="h-9 w-9" />
              ) : (
                <CheckCircle2 className="h-9 w-9" />
              )}
            </div>
            <CardTitle className="display-title text-2xl md:text-3xl">
              {isBankTransfer ? "Bestellung eingegangen" : "Vielen Dank für Ihre Bestellung"}
            </CardTitle>
            <CardDescription className="text-base">
              {isBankTransfer
                ? "Ihre Bestellung ist eingegangen. Bitte überweisen Sie den Betrag, damit wir die Bestellung bearbeiten können."
                : "Ihre Zahlung wurde erfolgreich verarbeitet. Eine Bestätigung ist auf dem Weg in Ihr Postfach."}
            </CardDescription>
            {!isBankTransfer && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="trust-pill">
                  <Lock className="h-3 w-3" aria-hidden />
                  SSL-verschlüsselt
                </span>
                <span className="trust-pill">
                  <PackageCheck className="h-3 w-3" aria-hidden />
                  Diskreter Versand
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <hr className="rule-gold" />

            {isBankTransfer ? (
              <>
                {/* Bank Transfer Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-strong" />
                    <div>
                      <p className="font-medium">Überweisungsdaten</p>
                      <p className="text-sm text-muted-foreground">
                        Bitte überweisen Sie den unten angegebenen Betrag mit
                        der Bestellnummer als Verwendungszweck.
                      </p>
                    </div>
                  </div>

                  <div className="card-ink space-y-3 rounded-lg border border-ink-border bg-ink p-4 text-ink-foreground shadow-[0_20px_60px_-30px_hsl(20_14%_4%/0.8)]">
                    {/* Betrag */}
                    {totalCents > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="stat-key">Betrag</span>
                        <span className="stat-value text-2xl">
                          {formatPrice(totalCents)}
                        </span>
                      </div>
                    )}

                    <hr className="rule-gold" />

                    {/* Bank info rows — nur rendern, wenn eine echte
                        Bankverbindung konfiguriert ist. Alt-Bestellungen
                        (Vorkasse deaktiviert) bekommen den Support-Hinweis. */}
                    {bankTransfer.enabled ? (
                      <>
                        <BankDetailRow
                          label="Kontoinhaber"
                          value={bankTransfer.accountHolder}
                          onCopy={() => copyToClipboard(bankTransfer.accountHolder, "holder")}
                          copied={copiedField === "holder"}
                        />
                        <BankDetailRow
                          label="IBAN"
                          value={bankTransfer.iban}
                          onCopy={() => copyToClipboard(bankTransfer.iban, "iban")}
                          copied={copiedField === "iban"}
                          mono
                        />
                        <BankDetailRow
                          label="BIC / SWIFT"
                          value={bankTransfer.bic}
                          onCopy={() => copyToClipboard(bankTransfer.bic, "bic")}
                          copied={copiedField === "bic"}
                          mono
                        />
                        <BankDetailRow
                          label="Bank"
                          value={bankTransfer.bankName}
                          onCopy={() => copyToClipboard(bankTransfer.bankName, "bank")}
                          copied={copiedField === "bank"}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Unsere Bankverbindung erhalten Sie vom Support unter{" "}
                        <a
                          href="mailto:support@chromepeps.com"
                          className="text-primary underline underline-offset-2"
                        >
                          support@chromepeps.com
                        </a>
                        . Bitte geben Sie dabei Ihre Bestellnummer an.
                      </p>
                    )}

                    <hr className="rule-gold" />

                    {/* Verwendungszweck */}
                    {orderNumber && (
                      <div>
                        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                          Verwendungszweck
                        </span>
                        <div className="flex items-center justify-between rounded-md border border-ink-border bg-white/[0.04] p-2 pl-3">
                          <span className="font-mono text-sm font-bold text-ink-foreground">
                            {orderNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-ink-foreground hover:bg-white/[0.08] hover:text-ink-foreground"
                            onClick={() => copyToClipboard(orderNumber, "ref")}
                          >
                            {copiedField === "ref" ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <AlertCircle className="h-4 w-4 text-primary-strong" aria-hidden />
                      Wichtig
                    </p>
                    <p className="mt-1 text-muted-foreground">
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
                  <Package className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-strong" />
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
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Bestellung wird bestätigt…
                    </p>
                  </div>
                ) : stripeOrder ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                    <span className="stat-key">Bestellnummer</span>
                    <span className="font-mono text-sm font-bold tracking-wide">
                      {stripeOrder.orderNumber}
                    </span>
                  </div>
                ) : sessionId ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="stat-key">Zahlungsreferenz</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {sessionId}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <hr className="rule-gold" />

            <div className="space-y-3">
              <Button variant="gold" className="w-full" size="lg" asChild>
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
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          {label}
        </span>
        <span
          className={`text-sm font-medium text-ink-foreground ${mono ? "font-mono tracking-wide" : ""}`}
        >
          {value}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0 text-ink-foreground hover:bg-white/[0.08] hover:text-ink-foreground"
        onClick={onCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
