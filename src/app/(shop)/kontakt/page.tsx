import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { localBusinessJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktieren Sie ChromePeps per E-Mail, Telefon oder Post.",
  robots: { index: true, follow: true },
};

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
            __html: JSON.stringify(localBusiness),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <h1 className="text-3xl font-bold tracking-tight mb-2">Kontakt</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Wir sind für Sie da — bei Fragen zu Produkten, Bestellungen oder
        Forschungsanwendungen.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">E-Mail</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            <a
              href="mailto:[TODO: kontakt@chromepeps.com]"
              className="underline"
            >
              [TODO: kontakt@chromepeps.com]
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
            [TODO: +49 XXX XXXXXXX]
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Mo–Fr, 9:00–17:00 Uhr
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Postanschrift</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            [TODO: Firmenname]
            <br />
            [TODO: Straße und Hausnummer]
            <br />
            [TODO: PLZ Ort]
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
            9:00–17:00 Uhr
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
