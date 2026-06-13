import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

  // Kontakt-Fakten als Protokollzeilen — eine ruhige Liste statt
  // Karten-Raster. Werte kommen zentral aus SELLER_DETAILS (env-basiert).
  const protokoll: ReadonlyArray<{ key: string; value: React.ReactNode; note?: string }> = [
    {
      key: "Telefon",
      value: SELLER_DETAILS.phone,
      note: "Mo bis Fr, 9:00 bis 17:00 Uhr",
    },
    {
      key: "Postanschrift",
      value: (
        <>
          {SELLER_DETAILS.companyName}
          <br />
          {SELLER_DETAILS.streetLine1}
          <br />
          {SELLER_DETAILS.postalCodeCity}
        </>
      ),
    },
    {
      key: "Geschäftszeiten",
      value: (
        <>
          Montag bis Freitag
          <br />
          9:00 bis 17:00 Uhr
        </>
      ),
      note: "Shop rund um die Uhr bestellbar.",
    },
    {
      key: "Antwortzeit",
      value: "innerhalb eines Werktags",
      note: "Kein Ticket-System, kein Bot.",
    },
  ];

  return (
    <div className="container max-w-3xl section-pad">
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
        <span className="eyebrow">Kontakt</span>
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
      <Card variant="ink" className="mt-10 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-6">
          <span className="mono-tag text-ink-muted">Kanal 01 · E-Mail</span>
          <span className="mono-tag text-ink-muted">bevorzugt</span>
        </div>
        <div className="tick-rule mt-4" aria-hidden="true" />
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-lg text-ink-foreground">
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

      {/* Weitere Kanäle als Protokollzeilen. */}
      <section className="mt-12">
        <span className="mono-label text-muted-foreground">
          Weitere Kanäle
        </span>
        <div className="tick-rule mt-3" aria-hidden="true" />
        <dl>
          {protokoll.map((row) => (
            <div
              key={row.key}
              className="grid gap-x-10 gap-y-1.5 border-b border-border py-5 sm:grid-cols-[180px_1fr]"
            >
              <dt className="field-label !mb-0 pt-0.5">{row.key}</dt>
              <dd>
                <p className="text-sm leading-relaxed">{row.value}</p>
                {row.note && (
                  <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

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
