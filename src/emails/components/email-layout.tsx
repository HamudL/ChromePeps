import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";
import { APP_NAME, MAIL_SUPPORT_ADDRESS } from "@/lib/constants";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

/**
 * Shared brand layout for every transactional email.
 *
 * Keeps header/footer consistent and wraps content in `@react-email/components`
 * Tailwind so emails render reliably across clients.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-neutral-100 font-sans">
          <Container className="mx-auto my-8 max-w-xl rounded-lg bg-white p-8 shadow-sm">
            <Section className="border-b border-neutral-200 pb-4">
              <Text className="m-0 text-2xl font-bold text-neutral-900">
                {APP_NAME}
              </Text>
              <Text className="m-0 text-xs text-neutral-500">
                Premium Research Peptides
              </Text>
            </Section>

            <Section className="py-6">{children}</Section>

            <Hr className="my-4 border-neutral-200" />

            <Section>
              <Text className="m-0 text-xs text-neutral-500">
                Bei Fragen erreichen Sie uns unter{" "}
                <Link
                  href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
                  className="text-neutral-700 underline"
                >
                  {MAIL_SUPPORT_ADDRESS}
                </Link>
                .
              </Text>
              <Text className="m-0 mt-2 text-xs text-neutral-400">
                Diese E-Mail wurde automatisch versendet. Alle Produkte sind
                ausschlie&szlig;lich f&uuml;r In-vitro-Forschung bestimmt.
              </Text>
              <Text className="m-0 mt-2 text-xs text-neutral-400">
                &copy; {new Date().getFullYear()} {APP_NAME}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
