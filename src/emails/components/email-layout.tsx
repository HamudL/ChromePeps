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
 * Features a branded accent bar, improved header, and consistent footer
 * with clean typography optimized for all email clients and devices.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-neutral-100 font-sans">
          <Container className="mx-auto my-8 max-w-xl overflow-hidden rounded-lg bg-white shadow-sm">
            {/* Accent top bar */}
            <Section className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 h-1" />

            {/* Header */}
            <Section className="px-8 pt-6 pb-4 border-b border-neutral-100">
              <table width="100%">
                <tr>
                  <td>
                    <Text className="m-0 text-2xl font-bold tracking-tight text-neutral-900">
                      {APP_NAME}
                    </Text>
                  </td>
                  <td align="right">
                    <Text className="m-0 text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                      Research Peptides
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Content */}
            <Section className="px-8 py-6">{children}</Section>

            {/* Footer */}
            <Section className="bg-neutral-50 px-8 py-5 border-t border-neutral-100">
              <Text className="m-0 text-xs text-neutral-500 leading-5">
                Bei Fragen erreichen Sie uns unter{" "}
                <Link
                  href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
                  className="text-neutral-700 underline"
                >
                  {MAIL_SUPPORT_ADDRESS}
                </Link>
              </Text>
              <Text className="m-0 mt-3 text-[10px] text-neutral-400 leading-4">
                Alle Produkte sind ausschlie&szlig;lich als Referenzmaterialien
                f&uuml;r die In-vitro-Forschung und den Laborgebrauch bestimmt.
                Nicht f&uuml;r den menschlichen oder tierischen Verzehr.
              </Text>
              <Hr className="my-3 border-neutral-200" />
              <Text className="m-0 text-[10px] text-neutral-400">
                &copy; {new Date().getFullYear()} {APP_NAME}. Alle Rechte
                vorbehalten.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
