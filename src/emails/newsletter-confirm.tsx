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
      <Heading className="m-0 text-xl font-bold text-neutral-900">
        Newsletter-Anmeldung
      </Heading>

      <Text className="mt-4 text-sm text-neutral-700">
        Sie haben sich f&uuml;r den ChromePeps-Newsletter angemeldet.
        Bitte best&auml;tigen Sie Ihre Anmeldung mit dem Button unten
        (Double-Opt-In gem&auml;&szlig; DSGVO).
      </Text>

      <Section className="mt-6 text-center">
        <Button
          href={confirmUrl}
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white no-underline"
        >
          Anmeldung best&auml;tigen
        </Button>
      </Section>

      <Text className="mt-6 text-xs text-neutral-500">
        Falls Sie sich nicht angemeldet haben, k&ouml;nnen Sie diese E-Mail
        ignorieren. Der Link ist 7 Tage g&uuml;ltig.
      </Text>

      <Text className="mt-4 text-xs text-neutral-500">
        Oder kopieren Sie diesen Link:{" "}
        <Link href={confirmUrl} className="text-blue-600 underline">
          {confirmUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default NewsletterConfirmEmail;
