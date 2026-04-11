import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

interface PasswordResetEmailProps {
  name?: string | null;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes = 60,
}: PasswordResetEmailProps) {
  const greeting = name ? `Hallo ${name},` : "Hallo,";

  return (
    <EmailLayout preview="Setzen Sie Ihr ChromePeps-Passwort zur&uuml;ck">
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        Passwort zur&uuml;cksetzen
      </Heading>

      <Text className="mt-4 text-sm leading-6 text-neutral-700">
        {greeting}
      </Text>

      <Text className="text-sm leading-6 text-neutral-700">
        wir haben eine Anfrage erhalten, das Passwort f&uuml;r Ihr
        ChromePeps-Konto zur&uuml;ckzusetzen. Klicken Sie auf den folgenden
        Button, um ein neues Passwort zu vergeben:
      </Text>

      <Section className="my-6 text-center">
        <Button
          href={resetUrl}
          className="rounded-lg bg-zinc-900 px-8 py-4 text-sm font-semibold text-white no-underline"
        >
          Neues Passwort vergeben
        </Button>
      </Section>

      <Text className="text-xs leading-5 text-neutral-500">
        Der Link ist aus Sicherheitsgr&uuml;nden {expiresInMinutes} Minuten
        lang g&uuml;ltig. Falls der Button nicht funktioniert, kopieren Sie
        diese Adresse in Ihren Browser:
      </Text>

      <Text className="break-all text-xs">
        <Link href={resetUrl} className="text-zinc-700 underline">
          {resetUrl}
        </Link>
      </Text>

      <Text className="mt-6 text-xs text-neutral-500">
        Sie haben diese E-Mail nicht angefordert? Dann k&ouml;nnen Sie sie
        ignorieren &mdash; Ihr Passwort bleibt unver&auml;ndert.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
