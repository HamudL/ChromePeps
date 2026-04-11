import {
  Button,
  Column,
  Heading,
  Link,
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
    <EmailLayout
      preview={`Ihre Bestellung ${orderNumber} ist unterwegs`}
    >
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        Ihre Bestellung ist unterwegs!
      </Heading>

      <Text className="mt-4 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        gute Nachricht &ndash; wir haben Ihre Bestellung heute verpackt und an
        den Versanddienstleister &uuml;bergeben. Sie sollte in den n&auml;chsten
        Tagen bei Ihnen eintreffen.
      </Text>

      <Section className="mt-4 rounded-lg bg-neutral-50 p-4 border border-neutral-100">
        <Row>
          <Column>
            <Text className="m-0 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
              Bestellnummer
            </Text>
            <Text className="m-0 text-sm font-semibold text-neutral-900">
              {orderNumber}
            </Text>
          </Column>
          <Column>
            <Text className="m-0 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
              Versendet am
            </Text>
            <Text className="m-0 text-sm font-semibold text-neutral-900">
              {dateText}
            </Text>
          </Column>
        </Row>
      </Section>

      {trackingNumber && (
        <Section className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Text className="m-0 text-sm font-semibold text-blue-900">
            Sendungsverfolgung
          </Text>
          <Text className="m-0 mt-1 text-xs text-blue-800">
            Tracking-Nummer: <strong>{trackingNumber}</strong>
          </Text>
          {trackingUrl && (
            <Section className="mt-3">
              <Button
                href={trackingUrl}
                className="rounded-lg bg-blue-700 px-6 py-3 text-xs font-semibold text-white no-underline"
              >
                Sendung verfolgen
              </Button>
            </Section>
          )}
        </Section>
      )}

      <Heading className="mt-6 text-base font-semibold text-neutral-900">
        Versandte Artikel
      </Heading>

      <Section className="mt-2">
        {items.map((item, idx) => (
          <Row key={`${item.sku}-${idx}`} className="py-2 border-b border-neutral-100">
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
          </Row>
        ))}
      </Section>

      {shippingAddress && (
        <>
          <Heading className="mt-6 text-base font-semibold text-neutral-900">
            Lieferadresse
          </Heading>
          <Section className="mt-2 rounded-lg bg-neutral-50 p-4 border border-neutral-100">
            <Text className="m-0 text-sm text-neutral-700">
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
          </Section>
        </>
      )}

      {orderUrl && (
        <Text className="mt-6 text-sm text-neutral-700">
          Den Status Ihrer Bestellung k&ouml;nnen Sie jederzeit in Ihrem Konto
          einsehen:{" "}
          <Link href={orderUrl} className="text-zinc-900 underline font-medium">
            Bestellung anzeigen
          </Link>
        </Text>
      )}
    </EmailLayout>
  );
}

export default OrderShippedEmail;
