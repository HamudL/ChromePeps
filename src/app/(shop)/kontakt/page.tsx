import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { SELLER_DETAILS } from "@/lib/constants";
import { localBusinessJsonLd, breadcrumbJsonLd, safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktieren Sie ChromePeps per E-Mail, Telefon oder Post.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/kontakt" },
};

// Statisch mit stuendlicher Revalidierung: Diese Seite liest Runtime-Env
// (SELLER_*/BANK_*-Stammdaten). Beim CI-Build (leere Env) wird der
// Platzhalter-Stand gebacken; zur Laufzeit regeneriert ISR die Seite im
// Container - gepflegte .env-Werte erscheinen ohne Image-Rebuild.
export const revalidate = 3600;

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
      <h1 className="text-3xl font-bold tracking-tight mb-2">Kontakt</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Bei Fragen zu Produkten, Bestellungen oder Forschungsanwendungen
        sind wir für Sie da.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">E-Mail</h3>
          </div>
          {/* E-Mail kommt zentral aus SELLER_DETAILS — vorher stand hier
              ein kaputter mailto-Link mit "[TODO: …]"-Adresse. */}
          <p className="text-muted-foreground text-sm">
            <a
              href={`mailto:${SELLER_DETAILS.email}`}
              className="underline"
            >
              {SELLER_DETAILS.email}
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Antwort innerhalb von 24 Stunden an Werktagen.
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Telefon</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {SELLER_DETAILS.phone}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Mo bis Fr, 9:00 bis 17:00 Uhr
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Postanschrift</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {SELLER_DETAILS.companyName}
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Geschäftszeiten</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Montag bis Freitag
            <br />
            9:00 bis 17:00 Uhr
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Bestellungen rund um die Uhr über den Shop möglich.
          </p>
        </div>
      </div>

      <div className="border-t pt-6 text-sm text-muted-foreground space-y-2">
        <p>
          Für Fragen zu bestehenden Bestellungen halten Sie bitte Ihre{" "}
          <strong>Bestellnummer</strong> bereit. Eingeloggte Kunden finden
          ihre Bestellhistorie unter{" "}
          <Link href="/dashboard/orders" className="underline">
            Mein Konto → Bestellungen
          </Link>
          .
        </p>
        <p>
          Vollständige Anbieterangaben finden Sie in unserem{" "}
          <Link href="/impressum" className="underline">
            Impressum
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
