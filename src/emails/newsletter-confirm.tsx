import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

interface NewsletterConfirmEmailProps {
  confirmUrl: string;
}

export function NewsletterConfirmEmail({
  confirmUrl,
}: NewsletterConfirmEmailProps) {
  return (
    <EmailLayout preview="Newsletter-Anmeldung best&auml;tigen">
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Newsletter
      </Text>

      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        Anmeldung best&auml;tigen
      </Heading>

      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        Sie haben sich f&uuml;r den ChromePeps-Newsletter angemeldet. Bitte
        best&auml;tigen Sie Ihre Anmeldung mit dem Button unten
        (Double-Opt-In gem&auml;&szlig; DSGVO).
      </Text>

      <Section className="my-8 text-center">
        <Button
          href={confirmUrl}
          className="rounded-md bg-zinc-900 px-8 py-4 text-sm font-semibold text-white no-underline"
        >
          Anmeldung best&auml;tigen
        </Button>
      </Section>

      <Section className="mt-8 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <Text className="m-0 text-xs leading-5 text-neutral-600">
          Der Link ist <strong className="text-neutral-900">7 Tage</strong>{" "}
          g&uuml;ltig. Falls der Button nicht funktioniert, kopieren Sie diese
          Adresse in Ihren Browser:
        </Text>
        <Text className="m-0 mt-2 break-all text-xs leading-5">
          <Link href={confirmUrl} className="text-zinc-700 underline">
            {confirmUrl}
          </Link>
        </Text>
      </Section>

      <Text className="mt-6 text-xs leading-5 text-neutral-500">
        Sie haben sich nicht angemeldet? Dann k&ouml;nnen Sie diese E-Mail
        einfach ignorieren &mdash; ohne Best&auml;tigung tragen wir Sie nicht
        in den Verteiler ein.
      </Text>
    </EmailLayout>
  );
}

export default NewsletterConfirmEmail;
