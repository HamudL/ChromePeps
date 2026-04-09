import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

interface EmailVerifyEmailProps {
  /** First name or full name — may be empty. */
  name?: string | null;
  /** Absolute URL with the verify token, e.g. https://chromepeps.com/api/auth/verify-email?token=abc */
  verifyUrl: string;
  /** Token expiry in hours — defaults to 24. */
  expiresInHours?: number;
}

export function EmailVerifyEmail({
  name,
  verifyUrl,
  expiresInHours = 24,
}: EmailVerifyEmailProps) {
  const greeting = name ? `Hallo ${name},` : "Hallo,";

  return (
    <EmailLayout preview="Bitte best&auml;tigen Sie Ihre E-Mail-Adresse bei ChromePeps">
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        E-Mail-Adresse best&auml;tigen
      </Heading>

      <Text className="mt-4 text-sm text-neutral-700">{greeting}</Text>

      <Text className="text-sm text-neutral-700">
        willkommen bei ChromePeps! Bitte best&auml;tigen Sie Ihre
        E-Mail-Adresse, damit wir Ihnen Bestellbest&auml;tigungen,
        Versandmeldungen und wichtige Konto-Nachrichten zustellen k&ouml;nnen.
      </Text>

      <Section className="my-6 text-center">
        <Button
          href={verifyUrl}
          className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-white no-underline"
        >
          E-Mail jetzt best&auml;tigen
        </Button>
      </Section>

      <Text className="text-xs text-neutral-500">
        Der Link ist aus Sicherheitsgr&uuml;nden {expiresInHours} Stunden lang
        g&uuml;ltig. Falls der Button nicht funktioniert, kopieren Sie diese
        Adresse in Ihren Browser:
      </Text>

      <Text className="break-all text-xs">
        <Link href={verifyUrl} className="text-neutral-700 underline">
          {verifyUrl}
        </Link>
      </Text>

      <Text className="mt-6 text-xs text-neutral-500">
        Sie haben sich nicht bei ChromePeps registriert? Dann k&ouml;nnen Sie
        diese E-Mail ignorieren.
      </Text>
    </EmailLayout>
  );
}

export default EmailVerifyEmail;
