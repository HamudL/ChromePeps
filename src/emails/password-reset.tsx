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
  /** First name or full name — may be empty. */
  name?: string | null;
  /** Absolute URL with the reset token, e.g. https://chromepeps.com/reset-password/abc123 */
  resetUrl: string;
  /** Token expiry in minutes — defaults to 60. */
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

      <Text className="mt-4 text-sm text-neutral-700">{greeting}</Text>

      <Text className="text-sm text-neutral-700">
        wir haben eine Anfrage erhalten, das Passwort f&uuml;r Ihr
        ChromePeps-Konto zur&uuml;ckzusetzen. Klicken Sie auf den folgenden
        Button, um ein neues Passwort zu vergeben:
      </Text>

      <Section className="my-6 text-center">
        <Button
          href={resetUrl}
          className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-white no-underline"
        >
          Neues Passwort vergeben
        </Button>
      </Section>

      <Text className="text-xs text-neutral-500">
        Der Link ist aus Sicherheitsgr&uuml;nden {expiresInMinutes} Minuten
        lang g&uuml;ltig. Falls der Button nicht funktioniert, kopieren Sie
        diese Adresse in Ihren Browser:
      </Text>

      <Text className="break-all text-xs">
        <Link href={resetUrl} className="text-neutral-700 underline">
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
