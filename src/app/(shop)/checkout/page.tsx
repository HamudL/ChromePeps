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
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import { BANK_DETAILS } from "@/lib/constants";
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

export default function CheckoutPage() {
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

  // Promo code
  const [promoInput, setPromoInput] = useState("");
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
  const [dialogOpen, setDialogOpen] = useState(false);
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
      setDialogOpen(false);
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
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Ihr Warenkorb ist leer</h1>
          <p className="text-muted-foreground">
            Legen Sie Produkte in den Warenkorb, bevor Sie zur Kasse gehen.
          </p>
          <Button size="lg" asChild>
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

  const updateFormField = (field: string, value: string | boolean) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Kasse</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest-mode banner: softly suggests logging in for
              saved addresses + order history, but doesn't block
              checkout. Hidden for authenticated users. */}
          {isGuest && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LogIn className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Du bestellst als Gast
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Schon ein Konto? Mit Login siehst du deine
                  Bestellhistorie und gespeicherte Adressen.
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
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Kontaktdaten
                </CardTitle>
                <CardDescription>
                  Für Bestellbestätigung und Updates zum Versand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="guestEmail">E-Mail-Adresse</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="guestEmail"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="du@beispiel.de"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="guestFirstName">Vorname</Label>
                    <Input
                      id="guestFirstName"
                      autoComplete="given-name"
                      required
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guestLastName">Nachname</Label>
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
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Lieferadresse
              </CardTitle>
              <CardDescription>
                {isGuest
                  ? "Wohin soll die Bestellung geliefert werden?"
                  : "Wählen Sie eine Lieferadresse für Ihre Bestellung."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Guest inline address form — no "saved addresses"
                  for guests (nowhere to save to). They fill in a
                  one-time delivery address that persists only on
                  the order record. */}
              {isGuest ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="guestCompany">
                      Firma (optional)
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
                    <Label htmlFor="guestStreet">
                      Straße und Hausnummer
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
                    <Label htmlFor="guestStreet2">
                      Adresszusatz (optional)
                    </Label>
                    <Input
                      id="guestStreet2"
                      value={guestForm.street2}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, street2: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="guestPostalCode">PLZ</Label>
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
                      <Label htmlFor="guestCity">Stadt</Label>
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
                      <Label htmlFor="guestCountry">Land</Label>
                      <Select
                        value={guestForm.country}
                        onValueChange={(v) =>
                          setGuestForm((p) => ({ ...p, country: v }))
                        }
                      >
                        <SelectTrigger id="guestCountry">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Liefer-Länder kommen aus shipping_rates.
                              So bleiben Country-Auswahl und Versand-
                              Berechnung garantiert konsistent: was nicht
                              hier steht, wird auch nicht versendet. */}
                          {shippingRates.length === 0 ? (
                            <SelectItem value="DE">Deutschland</SelectItem>
                          ) : (
                            shippingRates.map((r) => (
                              <SelectItem
                                key={r.countryCode}
                                value={r.countryCode}
                              >
                                {r.countryName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="guestPhone">
                        Telefon (optional)
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
                <div className="text-center py-6 space-y-3">
                  <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Keine Adressen gefunden. Fügen Sie eine Lieferadresse hinzu, um fortzufahren.
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
                    <div className="rounded-md border p-4 bg-muted/50 text-sm space-y-1">
                      <p className="font-medium">
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

              {/* Add New Address Dialog — authenticated users only.
                  Guests use the inline form above, which pushes
                  a one-time address straight into the order
                  record instead of persisting to their (non-
                  existent) profile. */}
              {!isGuest && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Neue Adresse hinzufügen
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Neue Adresse hinzufügen</DialogTitle>
                    <DialogDescription>
                      Geben Sie unten die Lieferadressdaten ein.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Label */}
                    <div className="grid gap-2">
                      <Label htmlFor="label">Bezeichnung (optional)</Label>
                      <Input
                        id="label"
                        placeholder="z.B. Zuhause, Büro, Labor"
                        value={addressForm.label}
                        onChange={(e) =>
                          updateFormField("label", e.target.value)
                        }
                      />
                    </div>

                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">Vorname *</Label>
                        <Input
                          id="firstName"
                          value={addressForm.firstName}
                          onChange={(e) =>
                            updateFormField("firstName", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">Nachname *</Label>
                        <Input
                          id="lastName"
                          value={addressForm.lastName}
                          onChange={(e) =>
                            updateFormField("lastName", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div className="grid gap-2">
                      <Label htmlFor="company">Firma (optional)</Label>
                      <Input
                        id="company"
                        value={addressForm.company}
                        onChange={(e) =>
                          updateFormField("company", e.target.value)
                        }
                      />
                    </div>

                    {/* Street */}
                    <div className="grid gap-2">
                      <Label htmlFor="street">Straße und Hausnummer *</Label>
                      <Input
                        id="street"
                        value={addressForm.street}
                        onChange={(e) =>
                          updateFormField("street", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* Street 2 */}
                    <div className="grid gap-2">
                      <Label htmlFor="street2">
                        Adresszusatz (optional)
                      </Label>
                      <Input
                        id="street2"
                        value={addressForm.street2}
                        onChange={(e) =>
                          updateFormField("street2", e.target.value)
                        }
                      />
                    </div>

                    {/* City + Postal */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city">Stadt *</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) =>
                            updateFormField("city", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="postalCode">PLZ *</Label>
                        <Input
                          id="postalCode"
                          value={addressForm.postalCode}
                          onChange={(e) =>
                            updateFormField("postalCode", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* State + Country */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="state">Bundesland (optional)</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) =>
                            updateFormField("state", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country">Ländercode *</Label>
                        <Input
                          id="country"
                          placeholder="DE"
                          maxLength={2}
                          value={addressForm.country}
                          onChange={(e) =>
                            updateFormField(
                              "country",
                              e.target.value.toUpperCase()
                            )
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefon (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={addressForm.phone}
                        onChange={(e) =>
                          updateFormField("phone", e.target.value)
                        }
                      />
                    </div>

                    {/* Default checkbox */}
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
                      <Label htmlFor="isDefault" className="cursor-pointer">
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

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={addressSaving}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleAddressSubmit}
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
                  </DialogFooter>
                </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Promo Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Gutscheincode
              </CardTitle>
              <CardDescription>
                Sie haben einen Rabattcode? Hier einlösen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-mono font-medium">
                      {appliedPromo.code}
                    </span>
                    <span className="text-green-700">
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
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Zahlungsart
              </CardTitle>
              <CardDescription>
                Wählen Sie Ihre bevorzugte Zahlungsart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment method toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("STRIPE")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    paymentMethod === "STRIPE"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <CreditCard className={`h-6 w-6 ${paymentMethod === "STRIPE" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${paymentMethod === "STRIPE" ? "text-primary" : ""}`}>
                    Kredit-/Debitkarte
                  </span>
                  <span className="text-xs text-muted-foreground">via Stripe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("BANK_TRANSFER")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    paymentMethod === "BANK_TRANSFER"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <Building2 className={`h-6 w-6 ${paymentMethod === "BANK_TRANSFER" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${paymentMethod === "BANK_TRANSFER" ? "text-primary" : ""}`}>
                    Banküberweisung
                  </span>
                  <span className="text-xs text-muted-foreground">Vorkasse</span>
                </button>
              </div>

              {paymentMethod === "STRIPE" ? (
                <p className="text-sm text-muted-foreground">
                  Sie werden zur sicheren Bezahlseite von Stripe weitergeleitet,
                  um Ihre Zahlung abzuschließen. Wir akzeptieren alle gängigen
                  Kredit- und Debitkarten.
                </p>
              ) : (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-2">
                  <p className="font-medium">Banküberweisung (Vorkasse)</p>
                  <p className="text-muted-foreground">
                    Nach Aufgabe der Bestellung erhalten Sie unsere Bankdaten.
                    Bitte überweisen Sie den Gesamtbetrag mit Ihrer
                    Bestellnummer als Verwendungszweck. Ihre Bestellung wird
                    nach Zahlungseingang bearbeitet.
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <span className="text-muted-foreground">Bank:</span>
                    <span>{BANK_DETAILS.bankName}</span>
                    <span className="text-muted-foreground">Kontoinhaber:</span>
                    <span>{BANK_DETAILS.accountHolder}</span>
                  </div>
                </div>
              )}

              {checkoutError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {checkoutError}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={
                  checkoutLoading ||
                  items.length === 0 ||
                  // For authenticated users: a saved address must
                  // be picked. Guests fill the inline form instead
                  // (validated inside handleCheckout via
                  // buildGuestPayload).
                  (!isGuest && !selectedAddressId)
                }
              >
                {checkoutLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : paymentMethod === "STRIPE" ? (
                  <CreditCard className="mr-2 h-4 w-4" />
                ) : (
                  <Building2 className="mr-2 h-4 w-4" />
                )}
                {paymentMethod === "STRIPE" ? "Mit Stripe bezahlen" : "Bestellung aufgeben (Vorkasse)"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Bestellübersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items List */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-3"
                  >
                    <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                          Kein Bild
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {item.name}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Menge: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap">
                      {formatPrice(item.priceInCents * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zwischensumme</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      Rabatt ({appliedPromo?.code})
                    </span>
                    <span className="text-green-600 font-medium">
                      &minus;{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Versand</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">Kostenlos</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Gesamt</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alle Preise inkl. 19% MwSt.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link href="/cart">Warenkorb bearbeiten</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
