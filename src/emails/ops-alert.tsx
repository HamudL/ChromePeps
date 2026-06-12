import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

interface OpsAlertEmailProps {
  /** Kurzer Alert-Titel, z.B. "Datenbank-Backup fehlgeschlagen". */
  title: string;
  /** Detailzeilen — jede Zeile wird als eigener Absatz gerendert. */
  lines: string[];
  /** Kicker über der Headline, Default "Ops-Alert". */
  kicker?: string;
}

/**
 * Generische Betriebs-Alarm-Mail an die Admins (Backup-Watchdog,
 * künftige Ops-Checks). Bewusst schmucklos: Es geht um schnelle
 * Erfassbarkeit eines Problems, nicht um Marketing-Optik.
 */
export function OpsAlertEmail({
  title,
  lines,
  kicker = "Ops-Alert",
}: OpsAlertEmailProps) {
  return (
    <EmailLayout preview={title}>
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">
        {kicker}
      </Text>
      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        {title}
      </Heading>
      <Section className="mt-5">
        {lines.map((line, i) => (
          <Text key={i} className="m-0 mt-2 text-sm leading-6 text-neutral-700">
            {line}
          </Text>
        ))}
      </Section>
    </EmailLayout>
  );
}

export default OpsAlertEmail;
