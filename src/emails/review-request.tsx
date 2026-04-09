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
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        Wie war Ihre Bestellung?
      </Heading>

      <Text className="mt-4 text-sm text-neutral-700">{greeting}</Text>

      <Text className="text-sm text-neutral-700">
        vielen Dank, dass Sie bei ChromePeps bestellt haben &ndash; wir hoffen,
        alles ist gut bei Ihnen angekommen. Wenn Sie einen Moment Zeit haben,
        w&uuml;rden wir uns sehr &uuml;ber eine kurze Bewertung freuen. Ihre
        R&uuml;ckmeldung hilft anderen Forschenden bei der Auswahl.
      </Text>

      <Section className="mt-4 rounded-md bg-neutral-50 p-4">
        <Text className="m-0 text-xs uppercase tracking-wide text-neutral-500">
          Bestellnummer
        </Text>
        <Text className="m-0 text-sm font-semibold text-neutral-900">
          {orderNumber}
        </Text>
      </Section>

      <Heading className="mt-6 text-base font-semibold text-neutral-900">
        Ihre Artikel
      </Heading>

      <Section className="mt-2">
        {products.map((product, idx) => (
          <Row key={`${product.name}-${idx}`} className="py-3">
            <Column>
              <Text className="m-0 text-sm font-medium text-neutral-900">
                {product.name}
              </Text>
              {product.variant && (
                <Text className="m-0 text-xs text-neutral-500">
                  {product.variant}
                </Text>
              )}
            </Column>
            <Column className="text-right">
              <Link
                href={product.reviewUrl}
                className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-white no-underline"
              >
                Bewerten
              </Link>
            </Column>
          </Row>
        ))}
      </Section>

      <Text className="mt-6 text-xs text-neutral-500">
        Sie k&ouml;nnen eine Bewertung jederzeit auch sp&auml;ter auf der
        Produktseite abgeben, solange Sie eingeloggt sind.
      </Text>
    </EmailLayout>
  );
}

export default ReviewRequestEmail;
