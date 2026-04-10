import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ — Häufige Fragen",
  description: `Antworten auf häufig gestellte Fragen zu Bestellungen, Versand, Zahlung und Produkten bei ${APP_NAME}.`,
  robots: { index: true, follow: true },
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const faqs: { question: string; answer: string }[] = [
  {
    question: "Wie lange dauert der Versand?",
    answer:
      "Bestellungen innerhalb Deutschlands werden in der Regel innerhalb von 1–3 Werktagen zugestellt. EU-weit dauert der Versand 3–7 Werktage. Eine Sendungsverfolgung erhalten Sie per E-Mail, sobald Ihr Paket versendet wurde.",
  },
  {
    question: "Welche Zahlungsmethoden werden akzeptiert?",
    answer:
      "Wir akzeptieren Kreditkarte (Visa, Mastercard), SEPA-Lastschrift und weitere Zahlungsarten über unseren Zahlungsdienstleister Stripe. Alle Transaktionen sind SSL-verschlüsselt.",
  },
  {
    question: "Sind die Peptide für den menschlichen Verzehr bestimmt?",
    answer:
      "Nein. Alle unsere Produkte sind ausschließlich für die Forschung und In-vitro-Anwendungen bestimmt (Research Use Only). Sie sind nicht für den menschlichen oder tierischen Verzehr zugelassen.",
  },
  {
    question: "Gibt es ein Analysezertifikat (CoA)?",
    answer:
      "Ja. Zu jedem Produkt stellen wir ein Analysezertifikat mit HPLC- und MS-Daten bereit. Sie finden das CoA auf der jeweiligen Produktseite oder können es per E-Mail anfordern.",
  },
  {
    question: "Wie lagere ich die Peptide richtig?",
    answer:
      "Die empfohlene Lagertemperatur finden Sie auf der Produktseite unter \u201ESpecifications\u201C. In der Regel sollten Peptide bei -20 °C trocken und lichtgeschützt gelagert werden. Geöffnete Vials sollten zeitnah verbraucht werden.",
  },
  {
    question: "Kann ich meine Bestellung stornieren oder ändern?",
    answer:
      "Solange Ihre Bestellung noch nicht versendet wurde, können Sie eine Stornierung oder Änderung per E-Mail an unseren Kundenservice beantragen. Nach dem Versand greift unser reguläres Widerrufsrecht.",
  },
  {
    question: "Wie funktioniert das Widerrufsrecht?",
    answer:
      "Sie können Ihre Bestellung innerhalb von 14 Tagen nach Erhalt ohne Angabe von Gründen widerrufen. Die Ware muss originalverpackt und ungeöffnet zurückgesendet werden. Details finden Sie auf unserer Widerrufsseite.",
  },
  {
    question: "Gibt es Mengenrabatte für Labore oder Institutionen?",
    answer:
      "Ja, bei größeren Bestellmengen bieten wir individuelle Konditionen an. Kontaktieren Sie uns über unsere Kontaktseite mit Angabe Ihrer Institution und dem gewünschten Volumen.",
  },
  {
    question: "Wie erstelle ich ein Kundenkonto?",
    answer:
      "Klicken Sie oben rechts auf \u201ESign In\u201C und dann auf \u201EKonto erstellen\u201C. Nach der Registrierung erhalten Sie eine Best\u00E4tigungs-E-Mail. Mit Ihrem Konto k\u00F6nnen Sie Bestellungen verfolgen und Bewertungen abgeben.",
  },
  {
    question: "Bieten Sie internationalen Versand an?",
    answer:
      "Derzeit versenden wir innerhalb der EU. Für Anfragen außerhalb der EU kontaktieren Sie bitte unseren Kundenservice. Versandkosten und Lieferzeiten variieren je nach Zielland.",
  },
];

/** FAQPage JSON-LD schema for Google Rich Results */
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function breadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "FAQ", item: `${BASE_URL}/faq` },
    ],
  };
}

export default function FAQPage() {
  return (
    <div className="container max-w-3xl py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd()) }}
      />

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Häufig gestellte Fragen
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Hier finden Sie Antworten auf die häufigsten Fragen rund um Bestellungen,
        Versand, Produkte und Ihr Kundenkonto.
      </p>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group border rounded-lg"
          >
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium hover:bg-muted/50 transition-colors rounded-lg">
              {faq.question}
              <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                &#9662;
              </span>
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>

      <div className="border-t pt-6 mt-8 text-sm text-muted-foreground">
        <p>
          Ihre Frage ist nicht dabei? Schreiben Sie uns über unsere{" "}
          <a href="/kontakt" className="underline hover:text-foreground transition-colors">
            Kontaktseite
          </a>
          .
        </p>
      </div>
    </div>
  );
}
