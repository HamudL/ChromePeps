import type { Metadata } from "next";
import Link from "next/link";
import { Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { SELLER_DETAILS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { localBusinessJsonLd, breadcrumbJsonLd, safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktieren Sie ChromePeps per E-Mail, Telefon oder Post.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/kontakt" },
};

// force-dynamic: Diese Seite liest Runtime-Env (SELLER_*/BANK_*-Stamm-
// daten). Statisches Prerender wuerde die LEERE CI-Build-Env backen und
// der fluechtige ISR-Cache (.next/cache liegt auf keinem Volume) wuerde
// die Platzhalter-Version nach JEDEM Deploy/Restart erneut servieren -
// auf Pflichtseiten inakzeptabel. Ohne DB-Zugriff ist per-Request-
// Rendering hier ohnehin praktisch kostenlos.
export const dynamic = "force-dynamic";

export default function KontaktPage() {
  // LocalBusiness-Schema wird nur ausgegeben wenn SELLER_DETAILS keine
  // [TODO: ...]-Platzhalter mehr enthält (siehe lib/json-ld.ts).
  const localBusiness = localBusinessJsonLd();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Kontakt", path: "/kontakt" },
  ]);

  return (
    <div className="container max-w-3xl py-12">
      {localBusiness && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(localBusiness),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }}
      />

      <header>
        <span className="eyebrow">[ KONTAKT ]</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Sprechen Sie mit uns
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Fragen zu Produkten, einer laufenden Bestellung oder einer
          Forschungsanwendung? Wir antworten innerhalb eines Werktags — kein
          Ticket-System, kein Bot.
        </p>
      </header>

      {/* E-Mail als Ink-Fokus-CTA — der primäre, schnellste Kanal. */}
      <Card variant="ink" className="card-ink mt-10 p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="eyebrow">[ SCHNELLSTER WEG ]</span>
            <p className="mt-2 font-mono text-lg text-ink-foreground">
              {SELLER_DETAILS.email}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Antwort innerhalb von 24 Stunden an Werktagen.
            </p>
          </div>
          {/* E-Mail kommt zentral aus SELLER_DETAILS — vorher stand hier
              ein kaputter mailto-Link mit "[TODO: …]"-Adresse. */}
          <Button asChild variant="gold" size="lg" className="shrink-0 gap-2">
            <a href={`mailto:${SELLER_DETAILS.email}`}>
              E-Mail schreiben
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <Phone className="h-5 w-5 text-primary-strong" />
          <h2 className="mono-label mt-3 text-muted-foreground">Telefon</h2>
          <p className="mt-1.5 text-sm">{SELLER_DETAILS.phone}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mo bis Fr, 9:00 bis 17:00 Uhr
          </p>
        </Card>

        <Card className="p-5">
          <MapPin className="h-5 w-5 text-primary-strong" />
          <h2 className="mono-label mt-3 text-muted-foreground">Postanschrift</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {SELLER_DETAILS.companyName}
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
          </p>
        </Card>

        <Card className="p-5">
          <Clock className="h-5 w-5 text-primary-strong" />
          <h2 className="mono-label mt-3 text-muted-foreground">
            Geschäftszeiten
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Montag bis Freitag
            <br />
            9:00 bis 17:00 Uhr
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shop rund um die Uhr bestellbar.
          </p>
        </Card>
      </div>

      <hr className="rule-gold my-10" />

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Für Fragen zu bestehenden Bestellungen halten Sie bitte Ihre{" "}
          <strong className="text-foreground">Bestellnummer</strong> bereit.
          Eingeloggte Kunden finden ihre Bestellhistorie unter{" "}
          <Link
            href="/dashboard/orders"
            className="text-primary-strong underline-offset-2 hover:underline"
          >
            Mein Konto → Bestellungen
          </Link>
          .
        </p>
        <p>
          Vollständige Anbieterangaben finden Sie in unserem{" "}
          <Link
            href="/impressum"
            className="text-primary-strong underline-offset-2 hover:underline"
          >
            Impressum
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
