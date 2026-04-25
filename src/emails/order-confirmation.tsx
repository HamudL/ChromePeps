import {
  Button,
  Column,
  Heading,
  Hr,
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
  productId?: string | null;
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
  bankDetails?: OrderConfirmationBankDetails;
  hasCoaAttachments?: boolean;
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
  hasCoaAttachments,
}: OrderConfirmationEmailProps) {
  const greeting = customerName ? `Hallo ${customerName},` : "Hallo,";
  const isBank = paymentMethod === "BANK_TRANSFER";
  const dateText = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
  }).format(placedAt);

  const preview = isBank
    ? `Bestellbest\u00e4tigung ${orderNumber} \u2013 bitte per Vorkasse bezahlen`
    : `Bestellbest\u00e4tigung ${orderNumber} \u2013 vielen Dank f\u00fcr Ihren Einkauf`;

  return (
    <EmailLayout preview={preview}>
      {/* Status kicker */}
      {isBank ? (
        <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Zahlung ausstehend
        </Text>
      ) : (
        <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
          &#x2713; Bestellung best&auml;tigt
        </Text>
      )}

      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        Vielen Dank f&uuml;r Ihre Bestellung!
      </Heading>

      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        {isBank
          ? "wir haben Ihre Bestellung erhalten. Sobald Ihre Zahlung per Vorkasse bei uns eingegangen ist, bereiten wir den Versand vor."
          : "wir haben Ihre Zahlung erhalten und bereiten Ihre Bestellung zum Versand vor."}
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
              Datum
            </Text>
            <Text className="m-0 mt-1 text-sm font-semibold text-neutral-900">
              {dateText}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Bank transfer instructions */}
      {isBank && bankDetails && (
        <Section className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-5">
          <Text className="m-0 text-sm font-semibold text-amber-900">
            Bitte &uuml;berweisen Sie den Gesamtbetrag
          </Text>
          <Text className="m-0 mt-1 text-xs leading-5 text-amber-800">
            Damit wir Ihre Zahlung zuordnen k&ouml;nnen, geben Sie unbedingt
            die Bestellnummer als Verwendungszweck an.
          </Text>

          <Section className="mt-4 rounded-md border border-amber-200 bg-white p-4">
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  Empf&auml;nger
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-xs text-neutral-900">
                  {bankDetails.accountHolder}
                </Text>
              </Column>
            </Row>
            <Hr className="my-2 border-0 border-t border-neutral-100" />
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  IBAN
                </Text>
              </Column>
              <Column>
                <Text className="m-0 font-mono text-xs text-neutral-900">
                  {bankDetails.iban}
                </Text>
              </Column>
            </Row>
            <Hr className="my-2 border-0 border-t border-neutral-100" />
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  BIC
                </Text>
              </Column>
              <Column>
                <Text className="m-0 font-mono text-xs text-neutral-900">
                  {bankDetails.bic}
                </Text>
              </Column>
            </Row>
            <Hr className="my-2 border-0 border-t border-neutral-100" />
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  Bank
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-xs text-neutral-900">
                  {bankDetails.bankName}
                </Text>
              </Column>
            </Row>
            <Hr className="my-2 border-0 border-t border-neutral-100" />
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  Verwendungszweck
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-xs font-semibold text-neutral-900">
                  {orderNumber}
                </Text>
              </Column>
            </Row>
            <Hr className="my-2 border-0 border-t border-neutral-100" />
            <Row>
              <Column className="w-[110px] align-top">
                <Text className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">
                  Betrag
                </Text>
              </Column>
              <Column>
                <Text className="m-0 text-sm font-bold text-neutral-900">
                  {formatPrice(totalInCents)}
                </Text>
              </Column>
            </Row>
          </Section>
        </Section>
      )}

      {/* Items */}
      <Heading className="mt-8 text-base font-semibold text-neutral-900">
        Ihre Artikel
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
            <Column align="right" className="align-top">
              <Text className="m-0 text-sm font-semibold text-neutral-900">
                {formatPrice(item.priceInCents * item.quantity)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      {/* Totals */}
      <Section className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-5">
        <Row>
          <Column>
            <Text className="m-0 py-1 text-sm text-neutral-600">
              Zwischensumme
            </Text>
          </Column>
          <Column align="right">
            <Text className="m-0 py-1 text-sm text-neutral-900">
              {formatPrice(subtotalInCents)}
            </Text>
          </Column>
        </Row>
        {discountInCents > 0 && (
          <Row>
            <Column>
              <Text className="m-0 py-1 text-sm text-emerald-700">Rabatt</Text>
            </Column>
            <Column align="right">
              <Text className="m-0 py-1 text-sm font-medium text-emerald-700">
                &minus;{formatPrice(discountInCents)}
              </Text>
            </Column>
          </Row>
        )}
        <Row>
          <Column>
            <Text className="m-0 py-1 text-sm text-neutral-600">Versand</Text>
          </Column>
          <Column align="right">
            <Text className="m-0 py-1 text-sm text-neutral-900">
              {shippingInCents === 0 ? "Kostenlos" : formatPrice(shippingInCents)}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text className="m-0 py-1 text-sm text-neutral-600">
              MwSt. (enthalten)
            </Text>
          </Column>
          <Column align="right">
            <Text className="m-0 py-1 text-sm text-neutral-900">
              {formatPrice(taxInCents)}
            </Text>
          </Column>
        </Row>
        <Hr className="my-3 border-0 border-t border-neutral-300" />
        <Row>
          <Column>
            <Text className="m-0 text-base font-bold text-neutral-900">
              Gesamtsumme
            </Text>
          </Column>
          <Column align="right">
            <Text className="m-0 text-base font-bold text-neutral-900">
              {formatPrice(totalInCents)}
            </Text>
          </Column>
        </Row>
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

      {/* COA attachments */}
      {hasCoaAttachments && (
        <Section className="mt-6 rounded-md border border-neutral-200 p-5">
          <Text className="m-0 text-sm font-semibold text-neutral-900">
            &#x1F4CE; Analysezertifikate im Anhang
          </Text>
          <Text className="m-0 mt-1 text-xs leading-5 text-neutral-600">
            Die Analysezertifikate (COA) f&uuml;r Ihre bestellten Produkte
            finden Sie als PDF im Anhang dieser E-Mail.
          </Text>
        </Section>
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

export default OrderConfirmationEmail;
