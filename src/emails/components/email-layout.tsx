import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  APP_NAME,
  LOGO_URL,
  MAIL_SUPPORT_ADDRESS,
  WEBSITE_URL,
} from "@/lib/constants";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

/**
 * Shared brand layout for every transactional email.
 *
 * Premium dark header with logo, generous white content area,
 * and a structured footer. Optimized for all major email clients
 * (Gmail, Apple Mail, Outlook, Thunderbird) and mobile devices.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="de">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="m-0 bg-neutral-100 p-0 font-sans">
          <Container className="mx-auto my-0 w-full max-w-[600px] bg-white">
            {/* Header — dark, branded */}
            <Section className="bg-zinc-950 px-8 py-7">
              <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
              >
                <tr>
                  <td valign="middle">
                    <Img
                      src={LOGO_URL}
                      alt={APP_NAME}
                      width="76"
                      height="55"
                      className="block"
                    />
                  </td>
                  <td valign="middle" align="right">
                    <Text className="m-0 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-400">
                      Research Peptides
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Content */}
            <Section className="px-8 py-9">{children}</Section>

            {/* Footer */}
            <Section className="border-t border-neutral-200 bg-neutral-50 px-8 py-7">
              <Text className="m-0 text-xs leading-5 text-neutral-700">
                Sie haben Fragen? Wir helfen gerne unter{" "}
                <Link
                  href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
                  className="font-medium text-zinc-900 underline"
                >
                  {MAIL_SUPPORT_ADDRESS}
                </Link>
                .
              </Text>

              <Text className="m-0 mt-2 text-xs leading-5 text-neutral-700">
                <Link
                  href={WEBSITE_URL}
                  className="font-medium text-zinc-900 no-underline"
                >
                  {WEBSITE_URL.replace(/^https?:\/\//, "")}
                </Link>
              </Text>

              <Hr className="my-4 border-0 border-t border-neutral-200" />

              <Text className="m-0 text-[11px] leading-4 text-neutral-500">
                Alle Produkte sind ausschlie&szlig;lich als Referenzmaterialien
                f&uuml;r die In-vitro-Forschung und den Laborgebrauch bestimmt.
                Nicht f&uuml;r den menschlichen oder tierischen Verzehr.
              </Text>

              <Text className="m-0 mt-3 text-[11px] text-neutral-400">
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
