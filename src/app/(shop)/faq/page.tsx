import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { faqPageJsonLd, breadcrumbJsonLd, safeJsonLd } from "@/lib/json-ld";

/**
 * /faq — Live-FAQ-Seite. Liest FAQCategories + FAQItems aus der DB
 * (gepflegt via /admin/wissen/faq) und rendert kategorisiert.
 *
 * `force-dynamic` weil zur Build-Zeit keine DATABASE_URL existiert
 * (gleiches Pattern wie Homepage / Wissen-Hub).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ: Häufige Fragen",
  description: `Antworten auf häufig gestellte Fragen zu Bestellungen, Versand, Zahlung und Produkten bei ${APP_NAME}.`,
  robots: { index: true, follow: true },
  alternates: { canonical: "/faq" },
};

export default async function FAQPage() {
  const categories = await db.fAQCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Flache Liste für JSON-LD (FAQPage-Schema unterstützt keine
  // Kategorien — nur eine flache Question/Answer-Liste).
  const allItems = categories.flatMap((c) =>
    c.items.map((it) => ({ question: it.question, answer: it.answer })),
  );

  const faqSchema = faqPageJsonLd(allItems);
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "FAQ", path: "/faq" },
  ]);

  return (
    <div className="container max-w-3xl section-pad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbSchema),
        }}
      />

      <header>
        <span className="eyebrow">[ WISSENSBASIS ]</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Häufig gestellte Fragen
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Antworten auf das, was Forscher vor der Bestellung wissen wollen —
          von Versand und Zahlung über Lagerung bis zum Analysezertifikat.
        </p>
      </header>

      <hr className="rule-gold my-10" />

      {categories.length === 0 ||
      categories.every((c) => c.items.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground reveal-up">
          <p>Aktuell sind keine FAQ-Einträge gepflegt.</p>
          <p className="mt-2 text-sm">
            Schreib uns gern direkt über unsere{" "}
            <Link
              href="/kontakt"
              className="text-primary-strong underline-offset-2 hover:underline"
            >
              Kontaktseite
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-14">
          {categories.map((cat, ci) => {
            if (cat.items.length === 0) return null;
            return (
              <section key={cat.id} className="reveal-up">
                <header className="mb-5">
                  <span className="mono-label text-muted-foreground">
                    {String(ci + 1).padStart(2, "0")} · Kategorie
                  </span>
                  <h2 className="display-title mt-2 text-2xl md:text-[28px]">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                </header>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {cat.items.map((item) => (
                    <details key={item.id} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium transition-colors hover:text-primary-strong">
                        <span>{item.question}</span>
                        <span className="shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180 group-open:text-primary-strong">
                          &#9662;
                        </span>
                      </summary>
                      <div className="faq-answer px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.answer}
                        </ReactMarkdown>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <hr className="rule-gold my-10" />

      <div className="text-sm text-muted-foreground">
        <p>
          Ihre Frage ist nicht dabei? Schreiben Sie uns über unsere{" "}
          <Link
            href="/kontakt"
            className="text-primary-strong underline-offset-2 hover:underline"
          >
            Kontaktseite
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
