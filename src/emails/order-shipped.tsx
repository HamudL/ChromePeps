import {
  Button,
  Column,
  Heading,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

export interface OrderShippedItem {
  name: string;
  variant?: string | null;
  sku: string;
  quantity: number;
}

export interface OrderShippedAddress {
  firstName: string;
  lastName: string;
  company?: string | null;
  street: string;
  street2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

interface OrderShippedEmailProps {
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  shippedAt: Date;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: OrderShippedItem[];
  shippingAddress?: OrderShippedAddress | null;
}

export function OrderShippedEmail({
  customerName,
  orderNumber,
  orderUrl,
  shippedAt,
  trackingNumber,
  trackingUrl,
  items,
  shippingAddress,
}: OrderShippedEmailProps) {
  const greeting = customerName ? `Hallo ${customerName},` : "Hallo,";
  const dateText = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
  }).format(shippedAt);

  return (
    <EmailLayout preview={`Ihre Bestellung ${orderNumber} ist unterwegs`}>
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
        &#x2713; Versendet
      </Text>

      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        Ihre Bestellung ist unterwegs!
      </Heading>

      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        gute Nachricht &ndash; wir haben Ihre Bestellung heute verpackt und an
        den Versanddienstleister &uuml;bergeben. Sie sollte in den n&auml;chsten
        Tagen bei Ihnen eintreffen.
      </Text>

      {/* Order meta */}
      <Section className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-5">
        <Row>
          <Column>
            <Text className="m-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
              Bestellnummer
            </Text>
            <Text className="m-0 mt-1 text-sm font-semibold text-neutral-900">
              {orderNumber}
            </Text>
          </Column>
          <Column align="right">
            <Text className="m-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
              Versendet am
            </Text>
            <Text className="m-0 mt-1 text-sm font-semibold text-neutral-900">
              {dateText}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Tracking */}
      {trackingNumber && (
        <Section className="mt-5 rounded-md border border-sky-200 bg-sky-50 p-5">
          <Text className="m-0 text-sm font-semibold text-sky-900">
            Sendungsverfolgung
          </Text>
          <Text className="m-0 mt-2 text-xs leading-5 text-sky-800">
            Tracking-Nummer
          </Text>
          <Text className="m-0 font-mono text-sm font-semibold text-sky-900">
            {trackingNumber}
          </Text>

          {trackingUrl && (
            <Section className="mt-4">
              <Button
                href={trackingUrl}
                className="rounded-md bg-sky-700 px-6 py-3 text-xs font-semibold text-white no-underline"
              >
                Sendung verfolgen
              </Button>
            </Section>
          )}
        </Section>
      )}

      {/* Items */}
      <Heading className="mt-8 text-base font-semibold text-neutral-900">
        Versandte Artikel
      </Heading>

      <Section className="mt-3">
        {items.map((item, idx) => (
          <Row
            key={`${item.sku}-${idx}`}
            className={`py-3 ${
              idx < items.length - 1 ? "border-b border-neutral-200" : ""
            }`}
          >
            <Column>
              <Text className="m-0 text-sm font-medium text-neutral-900">
                {item.name}
              </Text>
              {item.variant && (
                <Text className="m-0 mt-1 text-xs text-neutral-500">
                  {item.variant}
                </Text>
              )}
              <Text className="m-0 mt-1 text-xs text-neutral-500">
                SKU: {item.sku} &middot; {item.quantity}&times;
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      {/* Shipping address */}
      {shippingAddress && (
        <>
          <Heading className="mt-8 text-base font-semibold text-neutral-900">
            Lieferadresse
          </Heading>
          <Section className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-5">
            <Text className="m-0 text-sm leading-6 text-neutral-700">
              {shippingAddress.firstName} {shippingAddress.lastName}
              {shippingAddress.company && (
                <>
                  <br />
                  {shippingAddress.company}
                </>
              )}
              <br />
              {shippingAddress.street}
              {shippingAddress.street2 && (
                <>
                  <br />
                  {shippingAddress.street2}
                </>
              )}
              <br />
              {shippingAddress.postalCode} {shippingAddress.city}
              <br />
              {shippingAddress.country}
            </Text>
          </Section>
        </>
      )}

      {/* CTA */}
      {orderUrl && (
        <Section className="mt-8 text-center">
          <Button
            href={orderUrl}
            className="rounded-md border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 no-underline"
          >
            Bestellung im Konto ansehen
          </Button>
        </Section>
      )}
    </EmailLayout>
  );
}

export default OrderShippedEmail;
