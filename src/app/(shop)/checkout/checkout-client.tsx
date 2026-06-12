"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Loader2,
  MapPin,
  Plus,
  CreditCard,
  ShoppingBag,
  AlertCircle,
  Tag,
  X,
  Check,
  Building2,
  LogIn,
  User as UserIcon,
  Mail,
  Lock,
  FlaskConical,
  PackageCheck,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/store/cart-store";
import { CountrySelect } from "@/components/shop/country-select";
import { formatPrice } from "@/lib/utils";
import type { BankTransferInfo } from "@/lib/constants";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/order/calculate-totals";

type PaymentMethod = "STRIPE" | "BANK_TRANSFER";

interface Address {
  id: string;
  label: string | null;
  company: string | null;
  firstName: string;
  lastName: string;
  street: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

// Shipping + Tax-Konstanten werden zentral aus
// `lib/order/calculate-totals` importiert, damit UI-Preview und
// serverseitige Order-Berechnung nicht mehr auseinanderlaufen können.

const INITIAL_ADDRESS_FORM = {
  firstName: "",
  lastName: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "DE",
  phone: "",
  label: "",
  company: "",
  isDefault: false,
};

// Client-Teil des Checkouts. Die Vorkasse-Infos kommen als Prop vom
// Server-Wrapper (page.tsx): BANK_*-Env wird zur LAUFZEIT auf dem
// Server gelesen — ein direkter Konstanten-Import hier sähe im
// Client-Bundle nur leere Build-Zeit-Werte (CI baut das Image generisch,
// die echten Werte stehen erst in der VPS-.env).
export function CheckoutClient({
  bankTransfer,
}: {
  bankTransfer: BankTransferInfo;
}) {
  const router = useRouter();
  const { status: authStatus } = useSession();
  // Derived flag used throughout: guests see the inline contact +
  // address form, authenticated users see the saved-addresses
  // dropdown + add-address dialog. `authStatus === "loading"` falls
  // into neither branch — the page shows a spinner until it resolves.
  const isGuest = authStatus === "unauthenticated";

  const items = useCartStore((s) => s.items);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Versandtarife pro Land. Wird einmal pro Page-Visit geladen und
  // dann clientseitig je nach gewähltem country resolved, damit das
  // Order-Summary live (ohne Roundtrip) aktualisiert wenn der Kunde
  // das Land wechselt. Fallback bleibt STANDARD_SHIPPING_CENTS für DE.
  const [shippingRates, setShippingRates] = useState<
    Array<{ countryCode: string; countryName: string; priceInCents: number }>
  >([]);

  // Guest-mode state. These fields only populate when the shopper
  // proceeds without an account. The server API accepts either a
  // `shippingAddressId` (auth) OR a full `shippingAddress` object
  // + `guestEmail` + `guestName` (guest).
  const [guestEmail, setGuestEmail] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestForm, setGuestForm] = useState({
    street: "",
    street2: "",
    city: "",
    postalCode: "",
    country: "DE",
    phone: "",
    company: "",
  });

  // Promo code — im Warenkorb hinterlegten Code beim Mount vorbefüllen,
  // damit der Kunde ihn nicht zweimal eingibt (aus dem localStorage-
  // persistierten Cart-Store). Die eigentliche Einlösung/Validierung
  // bleibt unverändert über handleApplyPromo hier im Checkout.
  const [promoInput, setPromoInput] = useState(
    () => useCartStore.getState().promoCode ?? "",
  );
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    description: string | null;
  } | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("STRIPE");

  // New address dialog
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(INITIAL_ADDRESS_FORM);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Versandtarife einmal beim Mount fetchen — ändern sich nur wenn
  // der Admin sie editiert, also kein Live-Refresh nötig.
  useEffect(() => {
    fetch("/api/shipping/rates")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setShippingRates(json.data);
        }
      })
      .catch(() => {
        // Silent fail — Order-Summary fällt dann auf STANDARD_SHIPPING_CENTS
        // zurück, der Server-side-Calc beim Submit ist die finale Quelle.
      });
  }, []);

  // Guest checkout is allowed now — we do NOT auto-redirect
  // unauthenticated users to /login any more. The page renders a
  // guest contact + inline address form for them instead. The login
  // banner at the top of the page offers to sign in for anyone who
  // prefers it.

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const res = await fetch("/api/addresses");
      const json = await res.json();
      if (json.success && json.data) {
        setAddresses(json.data);
        // Auto-select default address or first
        const defaultAddr = json.data.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (json.data.length > 0) {
          setSelectedAddressId(json.data[0].id);
        }
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchAddresses();
    }
  }, [authStatus, fetchAddresses]);

  // Handle new address submission
  const handleAddressSubmit = async () => {
    setAddressError(null);
    setAddressSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: addressForm.firstName,
          lastName: addressForm.lastName,
          street: addressForm.street,
          street2: addressForm.street2 || undefined,
          city: addressForm.city,
          state: addressForm.state || undefined,
          postalCode: addressForm.postalCode,
          country: addressForm.country,
          phone: addressForm.phone || undefined,
          label: addressForm.label || undefined,
          company: addressForm.company || undefined,
          isDefault: addressForm.isDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAddressError(json.error || "Adresse konnte nicht erstellt werden.");
        return;
      }
      // Add to list and select
      setAddresses((prev) => [json.data, ...prev]);
      setSelectedAddressId(json.data.id);
      setShowAddressForm(false);
      setAddressForm(INITIAL_ADDRESS_FORM);
    } catch {
      setAddressError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setAddressSaving(false);
    }
  };

  // Handle promo code validation
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setPromoError(null);
    setPromoLoading(true);
    try {
      const subtotalInCents = items.reduce(
        (sum, item) => sum + item.priceInCents * item.quantity,
        0
      );
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotalInCents,
          // Guests pass their email so the "one redemption per
          // buyer" rule can be enforced. Auth users are already
          // identified via session cookie on the server side.
          ...(isGuest && guestEmail.trim()
            ? { guestEmail: guestEmail.trim().toLowerCase() }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPromoError(json.error || "Ungültiger Gutscheincode.");
        return;
      }
      setAppliedPromo(json.data);
      setPromoError(null);
    } catch {
      setPromoError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Sync Zustand cart to server DB before checkout. Only runs for
  // authenticated users — guest checkouts pass items in the body of
  // the checkout request instead (no server-side Cart row exists
  // for guests, by design).
  const syncCartToServer = async (): Promise<boolean> => {
    try {
      const syncItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: syncItems }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckoutError(
          json.error ||
            "Warenkorb konnte nicht synchronisiert werden. Bitte erneut versuchen.",
        );
        return false;
      }
      return true;
    } catch {
      setCheckoutError("Netzwerkfehler. Bitte erneut versuchen.");
      return false;
    }
  };

  // Build the guest-mode payload shape shared by Stripe + bank
  // transfer. Returns null if a required field is missing, with the
  // error already surfaced through `setCheckoutError`. Both API
  // routes accept EITHER { shippingAddressId } for auth users OR
  // { guestEmail, guestName, shippingAddress, items } for guests.
  const buildGuestPayload = () => {
    const email = guestEmail.trim().toLowerCase();
    const firstName = guestFirstName.trim();
    const lastName = guestLastName.trim();
    const street = guestForm.street.trim();
    const city = guestForm.city.trim();
    const postalCode = guestForm.postalCode.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCheckoutError("Bitte eine gültige E-Mail-Adresse eingeben.");
      return null;
    }
    if (!firstName || !lastName) {
      setCheckoutError("Bitte Vor- und Nachname angeben.");
      return null;
    }
    if (!street || !city || !postalCode) {
      setCheckoutError("Bitte Lieferadresse vollständig ausfüllen.");
      return null;
    }

    return {
      guestEmail: email,
      guestName: `${firstName} ${lastName}`.trim(),
      shippingAddress: {
        firstName,
        lastName,
        street,
        street2: guestForm.street2.trim() || null,
        city,
        postalCode,
        country: guestForm.country,
        phone: guestForm.phone.trim() || null,
        company: guestForm.company.trim() || null,
      },
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };
  };

  // Handle checkout (routes to Stripe or bank transfer)
  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);

    let payload: Record<string, unknown>;
    if (isGuest) {
      const guestPayload = buildGuestPayload();
      if (!guestPayload) {
        setCheckoutLoading(false);
        return;
      }
      payload = { ...guestPayload, promoCode: appliedPromo?.code ?? null };
    } else {
      if (!selectedAddressId) {
        setCheckoutError("Bitte wählen Sie eine Lieferadresse.");
        setCheckoutLoading(false);
        return;
      }
      // Auth users: sync the Zustand cart so the server has the
      // same items when it reads db.cart inside the checkout route.
      const synced = await syncCartToServer();
      if (!synced) {
        setCheckoutLoading(false);
        return;
      }
      payload = {
        shippingAddressId: selectedAddressId,
        promoCode: appliedPromo?.code ?? null,
      };
    }

    if (paymentMethod === "BANK_TRANSFER") {
      await handleBankTransferCheckout(payload);
    } else {
      await handleStripeCheckout(payload);
    }
  };

  const handleStripeCheckout = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckoutError(
          json.error || "Bezahlvorgang fehlgeschlagen. Bitte erneut versuchen.",
        );
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch {
      setCheckoutError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBankTransferCheckout = async (
    payload: Record<string, unknown>
  ) => {
    try {
      const res = await fetch("/api/checkout/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckoutError(
          json.error || "Bezahlvorgang fehlgeschlagen. Bitte erneut versuchen.",
        );
        return;
      }
      router.push(
        `/checkout/success?method=bank-transfer&orderId=${json.data.orderId}&orderNumber=${json.data.orderNumber}&total=${json.data.totalInCents}`
      );
    } catch {
      setCheckoutError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Loading / auth states
  if (!mounted || authStatus === "loading") {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card">
            <ShoppingBag className="h-11 w-11 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <span className="eyebrow justify-center">Warenkorb leer</span>
            <h1 className="display-title text-3xl">
              Noch nichts zum Bezahlen
            </h1>
          </div>
          <p className="text-muted-foreground">
            Legen Sie Produkte in den Warenkorb, bevor Sie zur Kasse gehen.
          </p>
          <Button variant="gold" size="lg" asChild>
            <Link href="/products">Produkte entdecken</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  const discount = appliedPromo?.discountAmount ?? 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Live-Versandkosten basierend auf gewähltem Land. Resolved gegen die
  // gefetcheten Rates. Fallback auf STANDARD_SHIPPING_CENTS (DE) wenn:
  //  - Rates noch nicht geladen sind (initial render),
  //  - oder das Land nicht in der Tabelle ist (Server-side wird der
  //    Submit dann mit klarem Fehler abgelehnt).
  const currentCountry = isGuest
    ? guestForm.country
    : (selectedAddress?.country ?? "DE");
  const currentRate = shippingRates.find(
    (r) => r.countryCode === currentCountry,
  );
  const baseShippingPreview =
    currentRate?.priceInCents ?? STANDARD_SHIPPING_CENTS;
  const shipping =
    subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : baseShippingPreview;
  const total = subtotalAfterDiscount + shipping;

  // Gemeinsame disabled-Bedingung für den Haupt-Pay-Button UND die
  // Mobile-Sticky-Bar — eine Quelle, damit beide nie auseinanderlaufen.
  const payDisabled =
    checkoutLoading || items.length === 0 || (!isGuest && !selectedAddressId);

  const updateFormField = (field: string, value: string | boolean) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-28 lg:pb-8">
      <div className="mb-8 border-b border-border pb-6">
        <span className="eyebrow">Sichere Kasse</span>
        <h1 className="display-title mt-3 text-3xl md:text-4xl">
          Bestellung abschließen
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="trust-pill">
            <Lock className="h-3 w-3" aria-hidden />
            SSL-verschlüsselt
          </span>
          <span className="trust-pill">
            <FlaskConical className="h-3 w-3" aria-hidden />
            HPLC-verifiziert
          </span>
          <span className="trust-pill">
            <PackageCheck className="h-3 w-3" aria-hidden />
            Diskreter Versand
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest-mode banner: softly suggests logging in for
              saved addresses + order history, but doesn't block
              checkout. Hidden for authenticated users. */}
          {isGuest && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-strong">
                <LogIn className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Sie bestellen als Gast
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Schon ein Konto? Mit Login sehen Sie Ihre Bestellhistorie
                  und gespeicherte Adressen.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Link href="/login?callbackUrl=/checkout">Einloggen</Link>
              </Button>
            </div>
          )}

          {/* Guest Contact Section — email + name. Only the
              authenticated flow draws this info from the session;
              guests provide it here so the order confirmation has
              somewhere to go. */}
          {isGuest && (
            <Card>
              <CardHeader>
                <span className="eyebrow">Schritt 1 — Kontakt</span>
                <CardTitle className="display-title mt-2 flex items-center gap-2 text-xl">
                  <UserIcon className="h-5 w-5 text-primary-strong" />
                  Kontaktdaten
                </CardTitle>
                <CardDescription>
                  Für Bestellbestätigung und Updates zum Versand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="guestEmail" className="field-label">
                    [ E-Mail-Adresse ]
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guestEmail"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="ihre@e-mail.de"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="guestFirstName" className="field-label">
                      [ Vorname ]
                    </Label>
                    <Input
                      id="guestFirstName"
                      autoComplete="given-name"
                      required
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestLastName" className="field-label">
                      [ Nachname ]
                    </Label>
                    <Input
                      id="guestLastName"
                      autoComplete="family-name"
                      required
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipping Address Section */}
          <Card>
            <CardHeader>
              <span className="eyebrow">
                {isGuest ? "Schritt 2 — Lieferung" : "Schritt 1 — Lieferung"}
              </span>
              <CardTitle className="display-title mt-2 flex items-center gap-2 text-xl">
                <MapPin className="h-5 w-5 text-primary-strong" />
                Lieferadresse
              </CardTitle>
              <CardDescription>
                {isGuest
                  ? "Wohin soll die Bestellung geliefert werden?"
                  : "Wählen Sie eine Lieferadresse für Ihre Bestellung."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Guest inline address form — no "saved addresses"
                  for guests (nowhere to save to). They fill in a
                  one-time delivery address that persists only on
                  the order record. */}
              {isGuest ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="guestCompany" className="field-label">
                      [ Firma — optional ]
                    </Label>
                    <Input
                      id="guestCompany"
                      autoComplete="organization"
                      value={guestForm.company}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, company: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestStreet" className="field-label">
                      [ Straße und Hausnummer ]
                    </Label>
                    <Input
                      id="guestStreet"
                      autoComplete="street-address"
                      required
                      value={guestForm.street}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, street: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestStreet2" className="field-label">
                      [ Adresszusatz — optional ]
                    </Label>
                    <Input
                      id="guestStreet2"
                      value={guestForm.street2}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, street2: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="guestPostalCode" className="field-label">
                        [ PLZ ]
                      </Label>
                      <Input
                        id="guestPostalCode"
                        autoComplete="postal-code"
                        required
                        value={guestForm.postalCode}
                        onChange={(e) =>
                          setGuestForm((p) => ({
                            ...p,
                            postalCode: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2 col-span-2">
                      <Label htmlFor="guestCity" className="field-label">
                        [ Stadt ]
                      </Label>
                      <Input
                        id="guestCity"
                        autoComplete="address-level2"
                        required
                        value={guestForm.city}
                        onChange={(e) =>
                          setGuestForm((p) => ({ ...p, city: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="guestCountry" className="field-label">
                        [ Land ]
                      </Label>
                      {/* CountrySelect fetcht selbst die aktiven shipping_rates.
                          Der parent-state `shippingRates` bleibt für den Live-
                          Versandpreis-Preview im Order-Summary erhalten. */}
                      <CountrySelect
                        id="guestCountry"
                        value={guestForm.country}
                        onChange={(v) =>
                          setGuestForm((p) => ({ ...p, country: v }))
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="guestPhone" className="field-label">
                        [ Telefon — optional ]
                      </Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        autoComplete="tel"
                        value={guestForm.phone}
                        onChange={(e) =>
                          setGuestForm((p) => ({ ...p, phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : loadingAddresses ? (
                <div className="space-y-3">
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                  <div className="h-16 bg-muted animate-pulse rounded-md" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
                  <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Noch keine Adresse hinterlegt. Fügen Sie eine Lieferadresse
                    hinzu, um fortzufahren.
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedAddressId}
                    onValueChange={setSelectedAddressId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Adresse auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.label
                            ? `${addr.label} - `
                            : ""}
                          {addr.firstName} {addr.lastName}, {addr.street},{" "}
                          {addr.city}
                          {addr.isDefault ? " (Standard)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAddress && (
                    <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-strong">
                        <MapPin className="h-3 w-3" aria-hidden />
                        Liefert an
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedAddress.firstName} {selectedAddress.lastName}
                      </p>
                      {selectedAddress.company && (
                        <p className="text-muted-foreground">
                          {selectedAddress.company}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {selectedAddress.street}
                      </p>
                      {selectedAddress.street2 && (
                        <p className="text-muted-foreground">
                          {selectedAddress.street2}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {selectedAddress.postalCode} {selectedAddress.city}
                        {selectedAddress.state
                          ? `, ${selectedAddress.state}`
                          : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedAddress.country}
                      </p>
                      {selectedAddress.phone && (
                        <p className="text-muted-foreground">
                          {selectedAddress.phone}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Inline-Adressform — authenticated users only. Gäste haben
                  oben den festen Inline-Block. Statt eines Modals klappt
                  unter dem Address-Dropdown ein Form auf — Form-State und
                  POST-Logik sind unverändert (handleAddressSubmit nutzt
                  weiter /api/addresses), nur die Render-Schale ist neu. */}
              {!isGuest && !showAddressForm && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Neue Adresse hinzufügen
                </Button>
              )}

              {!isGuest && showAddressForm && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-primary-strong">
                      Neue Lieferadresse
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddressForm(false)}
                      disabled={addressSaving}
                    >
                      Abbrechen
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="label" className="field-label">
                        [ Bezeichnung — optional ]
                      </Label>
                      <Input
                        id="label"
                        placeholder="z.B. Zuhause, Büro, Labor"
                        value={addressForm.label}
                        onChange={(e) =>
                          updateFormField("label", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName" className="field-label">
                          [ Vorname * ]
                        </Label>
                        <Input
                          id="firstName"
                          autoComplete="given-name"
                          value={addressForm.firstName}
                          onChange={(e) =>
                            updateFormField("firstName", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName" className="field-label">
                          [ Nachname * ]
                        </Label>
                        <Input
                          id="lastName"
                          autoComplete="family-name"
                          value={addressForm.lastName}
                          onChange={(e) =>
                            updateFormField("lastName", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="company" className="field-label">
                        [ Firma — optional ]
                      </Label>
                      <Input
                        id="company"
                        autoComplete="organization"
                        value={addressForm.company}
                        onChange={(e) =>
                          updateFormField("company", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="street" className="field-label">
                        [ Straße und Hausnummer * ]
                      </Label>
                      <Input
                        id="street"
                        autoComplete="street-address"
                        value={addressForm.street}
                        onChange={(e) =>
                          updateFormField("street", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="street2" className="field-label">
                        [ Adresszusatz — optional ]
                      </Label>
                      <Input
                        id="street2"
                        value={addressForm.street2}
                        onChange={(e) =>
                          updateFormField("street2", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="postalCode" className="field-label">
                          [ PLZ * ]
                        </Label>
                        <Input
                          id="postalCode"
                          autoComplete="postal-code"
                          value={addressForm.postalCode}
                          onChange={(e) =>
                            updateFormField("postalCode", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2 grid gap-2">
                        <Label htmlFor="city" className="field-label">
                          [ Stadt * ]
                        </Label>
                        <Input
                          id="city"
                          autoComplete="address-level2"
                          value={addressForm.city}
                          onChange={(e) =>
                            updateFormField("city", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="state" className="field-label">
                          [ Bundesland — optional ]
                        </Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) =>
                            updateFormField("state", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country" className="field-label">
                          [ Land * ]
                        </Label>
                        <CountrySelect
                          id="country"
                          value={addressForm.country}
                          onChange={(v) => updateFormField("country", v)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="field-label">
                        [ Telefon — optional ]
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={addressForm.phone}
                        onChange={(e) =>
                          updateFormField("phone", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="isDefault"
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={addressForm.isDefault}
                        onChange={(e) =>
                          updateFormField("isDefault", e.target.checked)
                        }
                      />
                      <Label
                        htmlFor="isDefault"
                        className="cursor-pointer text-sm font-normal"
                      >
                        Als Standardadresse festlegen
                      </Label>
                    </div>

                    {addressError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {addressError}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAddressSubmit}
                    className="w-full"
                    disabled={
                      addressSaving ||
                      !addressForm.firstName ||
                      !addressForm.lastName ||
                      !addressForm.street ||
                      !addressForm.city ||
                      !addressForm.postalCode ||
                      !addressForm.country
                    }
                  >
                    {addressSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Adresse speichern
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promo Code Section */}
          <Card>
            <CardHeader>
              <span className="eyebrow">Vorteil</span>
              <CardTitle className="display-title mt-2 flex items-center gap-2 text-xl">
                <Tag className="h-5 w-5 text-primary-strong" />
                Gutscheincode
              </CardTitle>
              <CardDescription>
                Sie haben einen Rabattcode? Hier einlösen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="font-mono font-medium">
                      {appliedPromo.code}
                    </span>
                    <span className="text-success">
                      &minus;{formatPrice(appliedPromo.discountAmount)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={removePromo}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Code eingeben"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="font-mono uppercase"
                    disabled={promoLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                  >
                    {promoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Einlösen"
                    )}
                  </Button>
                </div>
              )}
              {promoError && (
                <p className="text-sm text-destructive">{promoError}</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Section */}
          <Card>
            <CardHeader>
              <span className="eyebrow">
                {isGuest ? "Schritt 3 — Zahlung" : "Schritt 2 — Zahlung"}
              </span>
              <CardTitle className="display-title mt-2 flex items-center gap-2 text-xl">
                <CreditCard className="h-5 w-5 text-primary-strong" />
                Zahlungsart
              </CardTitle>
              <CardDescription>
                Wählen Sie Ihre bevorzugte Zahlungsart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment method toggle — Vorkasse erscheint nur, wenn sie
                  aktiviert UND eine echte Bankverbindung hinterlegt ist. */}
              <div className={`grid gap-3 ${bankTransfer.enabled ? "grid-cols-2" : "grid-cols-1"}`}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("STRIPE")}
                  aria-pressed={paymentMethod === "STRIPE"}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                    paymentMethod === "STRIPE"
                      ? "border-primary bg-primary/[0.06] shadow-[0_8px_24px_-16px_hsl(45_92%_41%/0.7)]"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {paymentMethod === "STRIPE" && (
                    <Check className="absolute right-2 top-2 h-4 w-4 text-primary-strong" aria-hidden />
                  )}
                  <CreditCard className={`h-6 w-6 ${paymentMethod === "STRIPE" ? "text-primary-strong" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-semibold ${paymentMethod === "STRIPE" ? "text-foreground" : ""}`}>
                    Kredit-/Debitkarte
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">via Stripe</span>
                </button>
                {bankTransfer.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    aria-pressed={paymentMethod === "BANK_TRANSFER"}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "border-primary bg-primary/[0.06] shadow-[0_8px_24px_-16px_hsl(45_92%_41%/0.7)]"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {paymentMethod === "BANK_TRANSFER" && (
                      <Check className="absolute right-2 top-2 h-4 w-4 text-primary-strong" aria-hidden />
                    )}
                    <Building2 className={`h-6 w-6 ${paymentMethod === "BANK_TRANSFER" ? "text-primary-strong" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === "BANK_TRANSFER" ? "text-foreground" : ""}`}>
                      Banküberweisung
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Vorkasse</span>
                  </button>
                )}
              </div>

              {paymentMethod === "STRIPE" ? (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3.5 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" aria-hidden />
                  <p className="text-muted-foreground">
                    Sie werden zur sicheren Bezahlseite von Stripe weitergeleitet,
                    um Ihre Zahlung abzuschließen. Wir akzeptieren alle gängigen
                    Kredit- und Debitkarten.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Building2 className="h-4 w-4 text-primary-strong" aria-hidden />
                    Banküberweisung (Vorkasse)
                  </p>
                  <p className="text-muted-foreground">
                    Nach Aufgabe der Bestellung erhalten Sie unsere Bankdaten.
                    Bitte überweisen Sie den Gesamtbetrag mit Ihrer
                    Bestellnummer als Verwendungszweck. Ihre Bestellung wird
                    nach Zahlungseingang bearbeitet.
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 pt-1 text-xs">
                    <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">Bank</span>
                    <span className="font-medium">{bankTransfer.bankName}</span>
                    <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">Inhaber</span>
                    <span className="font-medium">{bankTransfer.accountHolder}</span>
                  </div>
                </div>
              )}

              {checkoutError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {checkoutError}
                </div>
              )}

              <Button
                variant="gold"
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={payDisabled}
              >
                {checkoutLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : paymentMethod === "STRIPE" ? (
                  <CreditCard className="mr-2 h-4 w-4" />
                ) : (
                  <Building2 className="mr-2 h-4 w-4" />
                )}
                {paymentMethod === "STRIPE" ? "Sicher bezahlen" : "Bestellung verbindlich aufgeben"}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden />
                256-Bit-SSL · Keine Kartendaten auf unseren Servern
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary (Ink-Panel als Trust-Fokus) */}
        <div className="lg:col-span-1">
          <Card variant="ink" className="card-ink sticky top-24 overflow-hidden">
            <CardHeader>
              <span className="eyebrow">Bestellübersicht</span>
              <CardTitle className="display-title mt-2 text-lg text-ink-foreground">
                Ihre Bestellung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items List */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-3"
                  >
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-ink-border bg-white/[0.04]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-muted">
                          Kein Bild
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-ink-foreground">
                        {item.name}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-ink-muted">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-ink-muted">
                        Menge: {item.quantity}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium tabular-nums text-ink-foreground">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <hr className="rule-gold" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Zwischensumme</span>
                  <span className="tabular-nums text-ink-foreground">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
                      Rabatt {appliedPromo?.code}
                    </span>
                    <span className="font-medium tabular-nums text-primary">
                      &minus;{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Versand</span>
                  <span className="tabular-nums">
                    {shipping === 0 ? (
                      <span className="font-medium text-primary">Kostenlos</span>
                    ) : (
                      <span className="text-ink-foreground">{formatPrice(shipping)}</span>
                    )}
                  </span>
                </div>
              </div>

              <hr className="rule-gold" />

              <div className="flex items-baseline justify-between">
                <span className="stat-key">Gesamt</span>
                <span className="stat-value text-3xl">
                  {formatPrice(total)}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Alle Preise inkl. 19% MwSt.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full border-ink-border bg-transparent text-ink-foreground hover:bg-white/[0.06] hover:text-ink-foreground"
                asChild
              >
                <Link href="/cart">Warenkorb bearbeiten</Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="trust-pill">
                  <Lock className="h-3 w-3" aria-hidden />
                  SSL
                </span>
                <span className="trust-pill">
                  <PackageCheck className="h-3 w-3" aria-hidden />
                  Diskret
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile-Sticky-Checkout-Bar — Gesamtbetrag + CTA immer sichtbar,
          ohne zur Order-Summary am Seitenende scrollen zu müssen (nur <lg).
          Nutzt denselben handleCheckout + payDisabled wie der Haupt-Button. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="leading-tight">
            <p className="stat-key">Gesamt</p>
            <p className="text-lg font-bold tabular-nums">{formatPrice(total)}</p>
          </div>
          <Button
            variant="gold"
            size="lg"
            className="flex-1"
            onClick={handleCheckout}
            disabled={payDisabled}
          >
            {checkoutLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : paymentMethod === "STRIPE" ? (
              <CreditCard className="mr-2 h-4 w-4" />
            ) : (
              <Building2 className="mr-2 h-4 w-4" />
            )}
            {paymentMethod === "STRIPE" ? "Bezahlen" : "Bestellen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
