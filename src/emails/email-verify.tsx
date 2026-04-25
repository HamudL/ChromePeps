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
  name?: string | null;
  verifyUrl: string;
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
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Konto-Aktivierung
      </Text>

      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        E-Mail-Adresse best&auml;tigen
      </Heading>

      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        willkommen bei ChromePeps. Bitte best&auml;tigen Sie Ihre
        E-Mail-Adresse mit dem Button unten, damit wir Ihnen
        Bestellbest&auml;tigungen, Versandmeldungen und wichtige
        Konto-Nachrichten zustellen k&ouml;nnen.
      </Text>

      <Section className="my-8 text-center">
        <Button
          href={verifyUrl}
          className="rounded-md bg-zinc-900 px-8 py-4 text-sm font-semibold text-white no-underline"
        >
          E-Mail jetzt best&auml;tigen
        </Button>
      </Section>

      <Section className="mt-8 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <Text className="m-0 text-xs leading-5 text-neutral-600">
          Der Link ist aus Sicherheitsgr&uuml;nden{" "}
          <strong className="text-neutral-900">{expiresInHours} Stunden</strong>{" "}
          g&uuml;ltig. Falls der Button nicht funktioniert, kopieren Sie diese
          Adresse in Ihren Browser:
        </Text>
        <Text className="m-0 mt-2 break-all text-xs leading-5">
          <Link href={verifyUrl} className="text-zinc-700 underline">
            {verifyUrl}
          </Link>
        </Text>
      </Section>

      <Text className="mt-6 text-xs leading-5 text-neutral-500">
        Sie haben sich nicht bei ChromePeps registriert? Dann k&ouml;nnen Sie
        diese E-Mail einfach ignorieren.
      </Text>
    </EmailLayout>
  );
}

export default EmailVerifyEmail;
