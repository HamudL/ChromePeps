import {
  Column,
  Heading,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

export interface ReviewRequestProduct {
  name: string;
  variant?: string | null;
  reviewUrl: string;
}

interface ReviewRequestEmailProps {
  customerName?: string | null;
  orderNumber: string;
  products: ReviewRequestProduct[];
}

export function ReviewRequestEmail({
  customerName,
  orderNumber,
  products,
}: ReviewRequestEmailProps) {
  const greeting = customerName ? `Hallo ${customerName},` : "Hallo,";

  return (
    <EmailLayout
      preview={`Wie war Ihre Bestellung ${orderNumber}? Ihre Meinung z\u00e4hlt.`}
    >
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Feedback
      </Text>

      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        Wie war Ihre Bestellung?
      </Heading>

      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        vielen Dank, dass Sie bei ChromePeps bestellt haben &ndash; wir hoffen,
        alles ist gut bei Ihnen angekommen. Wenn Sie einen Moment Zeit haben,
        w&uuml;rden wir uns sehr &uuml;ber eine kurze Bewertung freuen. Ihre
        R&uuml;ckmeldung hilft anderen Forschenden bei der Auswahl.
      </Text>

      {/* Order meta */}
      <Section className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-5">
        <Text className="m-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
          Bestellnummer
        </Text>
        <Text className="m-0 mt-1 text-sm font-semibold text-neutral-900">
          {orderNumber}
        </Text>
      </Section>

      {/* Products with individual review CTAs */}
      <Heading className="mt-8 text-base font-semibold text-neutral-900">
        Ihre Artikel
      </Heading>

      <Section className="mt-3">
        {products.map((product, idx) => (
          <Row
            key={`${product.name}-${idx}`}
            className={`py-4 ${
              idx < products.length - 1 ? "border-b border-neutral-200" : ""
            }`}
          >
            <Column className="align-middle">
              <Text className="m-0 text-sm font-medium text-neutral-900">
                {product.name}
              </Text>
              {product.variant && (
                <Text className="m-0 mt-1 text-xs text-neutral-500">
                  {product.variant}
                </Text>
              )}
            </Column>
            <Column align="right" className="align-middle">
              <Link
                href={product.reviewUrl}
                className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white no-underline"
              >
                Bewerten
              </Link>
            </Column>
          </Row>
        ))}
      </Section>

      <Text className="mt-8 text-xs leading-5 text-neutral-500">
        Sie k&ouml;nnen eine Bewertung jederzeit auch sp&auml;ter auf der
        Produktseite abgeben, solange Sie eingeloggt sind.
      </Text>
    </EmailLayout>
  );
}

export default ReviewRequestEmail;
