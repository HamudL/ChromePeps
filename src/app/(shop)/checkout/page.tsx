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

const SHIPPING_THRESHOLD_CENTS = 10000;
const SHIPPING_COST_CENTS = 599;
const TAX_RATE = 0.19;

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

  const items = useCartStore((s) => s.items);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/checkout");
    }
  }, [authStatus, router]);

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
        setAddressError(json.error || "Failed to create address");
        return;
      }
      // Add to list and select
      setAddresses((prev) => [json.data, ...prev]);
      setSelectedAddressId(json.data.id);
      setDialogOpen(false);
      setAddressForm(INITIAL_ADDRESS_FORM);
    } catch {
      setAddressError("Network error. Please try again.");
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
        body: JSON.stringify({ code, subtotalInCents }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPromoError(json.error || "Invalid promo code");
        return;
      }
      setAppliedPromo(json.data);
      setPromoError(null);
    } catch {
      setPromoError("Network error. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Sync Zustand cart to server DB before checkout
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
        setCheckoutError(json.error || "Failed to sync cart. Please try again.");
        return false;
      }
      return true;
    } catch {
      setCheckoutError("Network error. Please try again.");
      return false;
    }
  };

  // Handle checkout (routes to Stripe or bank transfer)
  const handleCheckout = async () => {
    if (!selectedAddressId) {
      setCheckoutError("Please select a shipping address.");
      return;
    }

    setCheckoutError(null);
    setCheckoutLoading(true);

    // Sync client cart to server before checkout
    const synced = await syncCartToServer();
    if (!synced) {
      setCheckoutLoading(false);
      return;
    }

    if (paymentMethod === "BANK_TRANSFER") {
      await handleBankTransferCheckout();
    } else {
      await handleStripeCheckout();
    }
  };

  const handleStripeCheckout = async () => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          promoCode: appliedPromo?.code ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckoutError(json.error || "Checkout failed. Please try again.");
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBankTransferCheckout = async () => {
    try {
      const res = await fetch("/api/checkout/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          promoCode: appliedPromo?.code ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckoutError(json.error || "Checkout failed. Please try again.");
        return;
      }
      router.push(
        `/checkout/success?method=bank-transfer&orderId=${json.data.orderId}&orderNumber=${json.data.orderNumber}&total=${json.data.totalInCents}`
      );
    } catch {
      setCheckoutError("Network error. Please try again.");
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

  if (authStatus === "unauthenticated") {
    return null; // Redirect is happening
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Add some products before checking out.
          </p>
          <Button size="lg" asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  const discount = appliedPromo?.discountAmount ?? 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const shipping =
    subtotalAfterDiscount >= SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_COST_CENTS;
  const total = subtotalAfterDiscount + shipping;
  const estimatedTax = Math.round(total - total / (1 + TAX_RATE));

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const updateFormField = (field: string, value: string | boolean) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
              <CardDescription>
                Select where to ship your order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingAddresses ? (
                <div className="space-y-3">
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                  <div className="h-16 bg-muted animate-pulse rounded-md" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No addresses found. Add a shipping address to continue.
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedAddressId}
                    onValueChange={setSelectedAddressId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an address" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.label
                            ? `${addr.label} - `
                            : ""}
                          {addr.firstName} {addr.lastName}, {addr.street},{" "}
                          {addr.city}
                          {addr.isDefault ? " (Default)" : ""}
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

              {/* Add New Address Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Address
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Address</DialogTitle>
                    <DialogDescription>
                      Enter the shipping address details below.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Label */}
                    <div className="grid gap-2">
                      <Label htmlFor="label">Label (optional)</Label>
                      <Input
                        id="label"
                        placeholder="e.g. Home, Office, Lab"
                        value={addressForm.label}
                        onChange={(e) =>
                          updateFormField("label", e.target.value)
                        }
                      />
                    </div>

                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name *</Label>
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
                        <Label htmlFor="lastName">Last Name *</Label>
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
                      <Label htmlFor="company">Company (optional)</Label>
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
                      <Label htmlFor="street">Street Address *</Label>
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
                        Apartment, suite, etc. (optional)
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
                        <Label htmlFor="city">City *</Label>
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
                        <Label htmlFor="postalCode">Postal Code *</Label>
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
                        <Label htmlFor="state">State / Province</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) =>
                            updateFormField("state", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="country">Country Code *</Label>
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
                      <Label htmlFor="phone">Phone (optional)</Label>
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
                        Set as default address
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
                      Cancel
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
                      Save Address
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Promo Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Promo Code
              </CardTitle>
              <CardDescription>
                Have a discount code? Apply it here.
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
                    placeholder="Enter code"
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
                      "Apply"
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
                Payment Method
              </CardTitle>
              <CardDescription>
                Choose how you&apos;d like to pay
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
                    Credit / Debit Card
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
                    Bank Transfer
                  </span>
                  <span className="text-xs text-muted-foreground">Vorkasse</span>
                </button>
              </div>

              {paymentMethod === "STRIPE" ? (
                <p className="text-sm text-muted-foreground">
                  You will be redirected to Stripe&apos;s secure checkout to
                  complete your payment. We accept all major credit and debit
                  cards.
                </p>
              ) : (
                <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-2">
                  <p className="font-medium">Bank Transfer (Vorkasse)</p>
                  <p className="text-muted-foreground">
                    After placing your order, you will receive our bank details.
                    Please transfer the total amount using your order number as
                    the payment reference. Your order will be processed once
                    payment is received.
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <span className="text-muted-foreground">Bank:</span>
                    <span>{BANK_DETAILS.bankName}</span>
                    <span className="text-muted-foreground">Account Holder:</span>
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
                  checkoutLoading || !selectedAddressId || items.length === 0
                }
              >
                {checkoutLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : paymentMethod === "STRIPE" ? (
                  <CreditCard className="mr-2 h-4 w-4" />
                ) : (
                  <Building2 className="mr-2 h-4 w-4" />
                )}
                {paymentMethod === "STRIPE" ? "Pay with Stripe" : "Place Order (Bank Transfer)"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
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
                          No img
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
                        Qty: {item.quantity}
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
