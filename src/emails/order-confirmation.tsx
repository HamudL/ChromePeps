import {
  Column,
  Heading,
  Hr,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";
import { formatPrice } from "@/lib/utils";

export interface OrderConfirmationItem {
  name: string;
  variant?: string | null;
  sku: string;
  quantity: number;
  priceInCents: number;
}

export interface OrderConfirmationBankDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
}

export interface OrderConfirmationShippingAddress {
  firstName: string;
  lastName: string;
  company?: string | null;
  street: string;
  street2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

interface OrderConfirmationEmailProps {
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  placedAt: Date;
  items: OrderConfirmationItem[];
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  paymentMethod: "STRIPE" | "BANK_TRANSFER";
  shippingAddress?: OrderConfirmationShippingAddress | null;
  /** Required when paymentMethod === "BANK_TRANSFER". */
  bankDetails?: OrderConfirmationBankDetails;
}

export function OrderConfirmationEmail({
  customerName,
  orderNumber,
  orderUrl,
  placedAt,
  items,
  subtotalInCents,
  shippingInCents,
  taxInCents,
  discountInCents,
  totalInCents,
  paymentMethod,
  shippingAddress,
  bankDetails,
}: OrderConfirmationEmailProps) {
  const greeting = customerName ? `Hallo ${customerName},` : "Hallo,";
  const isBank = paymentMethod === "BANK_TRANSFER";
  const dateText = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
  }).format(placedAt);

  const preview = isBank
    ? `Bestellbestaetigung ${orderNumber} – bitte per Vorkasse bezahlen`
    : `Bestellbestaetigung ${orderNumber} – vielen Dank fuer Ihren Einkauf`;

  return (
    <EmailLayout preview={preview}>
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        Vielen Dank f&uuml;r Ihre Bestellung!
      </Heading>

      <Text className="mt-4 text-sm text-neutral-700">{greeting}</Text>

      <Text className="text-sm text-neutral-700">
        {isBank
          ? "wir haben Ihre Bestellung erhalten. Sobald Ihre Zahlung per Vorkasse bei uns eingegangen ist, bereiten wir den Versand vor."
          : "wir haben Ihre Zahlung erhalten und bereiten Ihre Bestellung zum Versand vor."}
      </Text>

      <Section className="mt-4 rounded-md bg-neutral-50 p-4">
        <Row>
          <Column>
            <Text className="m-0 text-xs uppercase tracking-wide text-neutral-500">
              Bestellnummer
            </Text>
            <Text className="m-0 text-sm font-semibold text-neutral-900">
              {orderNumber}
            </Text>
          </Column>
          <Column>
            <Text className="m-0 text-xs uppercase tracking-wide text-neutral-500">
              Datum
            </Text>
            <Text className="m-0 text-sm font-semibold text-neutral-900">
              {dateText}
            </Text>
          </Column>
        </Row>
      </Section>

      {isBank && bankDetails && (
        <Section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <Text className="m-0 text-sm font-semibold text-amber-900">
            Bitte &uuml;berweisen Sie den Gesamtbetrag
          </Text>
          <Text className="m-0 mt-2 text-xs text-amber-900">
            Kontoinhaber: {bankDetails.accountHolder}
          </Text>
          <Text className="m-0 text-xs text-amber-900">
            IBAN: {bankDetails.iban}
          </Text>
          <Text className="m-0 text-xs text-amber-900">
            BIC: {bankDetails.bic}
          </Text>
          <Text className="m-0 text-xs text-amber-900">
            Bank: {bankDetails.bankName}
          </Text>
          <Text className="m-0 mt-2 text-xs text-amber-900">
            Verwendungszweck: <strong>{orderNumber}</strong>
          </Text>
          <Text className="m-0 mt-2 text-xs text-amber-900">
            Betrag: <strong>{formatPrice(totalInCents)}</strong>
          </Text>
        </Section>
      )}

      <Heading className="mt-6 text-base font-semibold text-neutral-900">
        Ihre Artikel
      </Heading>

      <Section className="mt-2">
        {items.map((item, idx) => (
          <Row key={`${item.sku}-${idx}`} className="py-2">
            <Column>
              <Text className="m-0 text-sm text-neutral-900">{item.name}</Text>
              {item.variant && (
                <Text className="m-0 text-xs text-neutral-500">
                  {item.variant}
                </Text>
              )}
              <Text className="m-0 text-xs text-neutral-500">
                SKU: {item.sku} &middot; {item.quantity}x
              </Text>
            </Column>
            <Column className="text-right">
              <Text className="m-0 text-sm font-medium text-neutral-900">
                {formatPrice(item.priceInCents * item.quantity)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr className="my-4 border-neutral-200" />

      <Section>
        <Row>
          <Column>
            <Text className="m-0 text-sm text-neutral-600">Zwischensumme</Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-sm text-neutral-900">
              {formatPrice(subtotalInCents)}
            </Text>
          </Column>
        </Row>
        {discountInCents > 0 && (
          <Row>
            <Column>
              <Text className="m-0 text-sm text-neutral-600">Rabatt</Text>
            </Column>
            <Column className="text-right">
              <Text className="m-0 text-sm text-neutral-900">
                &minus;{formatPrice(discountInCents)}
              </Text>
            </Column>
          </Row>
        )}
        <Row>
          <Column>
            <Text className="m-0 text-sm text-neutral-600">Versand</Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-sm text-neutral-900">
              {shippingInCents === 0
                ? "Kostenlos"
                : formatPrice(shippingInCents)}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text className="m-0 text-sm text-neutral-600">
              Mehrwertsteuer (enthalten)
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-sm text-neutral-900">
              {formatPrice(taxInCents)}
            </Text>
          </Column>
        </Row>
        <Hr className="my-2 border-neutral-200" />
        <Row>
          <Column>
            <Text className="m-0 text-base font-semibold text-neutral-900">
              Gesamtsumme
            </Text>
          </Column>
          <Column className="text-right">
            <Text className="m-0 text-base font-semibold text-neutral-900">
              {formatPrice(totalInCents)}
            </Text>
          </Column>
        </Row>
      </Section>

      {shippingAddress && (
        <>
          <Heading className="mt-6 text-base font-semibold text-neutral-900">
            Lieferadresse
          </Heading>
          <Text className="m-0 mt-1 text-sm text-neutral-700">
            {shippingAddress.firstName} {shippingAddress.lastName}
          </Text>
          {shippingAddress.company && (
            <Text className="m-0 text-sm text-neutral-700">
              {shippingAddress.company}
            </Text>
          )}
          <Text className="m-0 text-sm text-neutral-700">
            {shippingAddress.street}
          </Text>
          {shippingAddress.street2 && (
            <Text className="m-0 text-sm text-neutral-700">
              {shippingAddress.street2}
            </Text>
          )}
          <Text className="m-0 text-sm text-neutral-700">
            {shippingAddress.postalCode} {shippingAddress.city}
          </Text>
          <Text className="m-0 text-sm text-neutral-700">
            {shippingAddress.country}
          </Text>
        </>
      )}

      {orderUrl && (
        <Text className="mt-6 text-sm text-neutral-700">
          Sie k&ouml;nnen den Status Ihrer Bestellung jederzeit in Ihrem Konto
          einsehen:{" "}
          <Link href={orderUrl} className="text-neutral-900 underline">
            Bestellung anzeigen
          </Link>
        </Text>
      )}
    </EmailLayout>
  );
}

export default OrderConfirmationEmail;
