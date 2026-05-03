import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { faqPageJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

/**
 * /faq — Live-FAQ-Seite. Liest FAQCategories + FAQItems aus der DB
 * (gepflegt via /admin/wissen/faq) und rendert kategorisiert.
 *
 * `force-dynamic` weil zur Build-Zeit keine DATABASE_URL existiert
 * (gleiches Pattern wie Homepage / Wissen-Hub).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ — Häufige Fragen",
  description: `Antworten auf häufig gestellte Fragen zu Bestellungen, Versand, Zahlung und Produkten bei ${APP_NAME}.`,
  robots: { index: true, follow: true },
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
    <div className="container max-w-3xl py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Häufig gestellte Fragen
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Hier finden Sie Antworten auf die häufigsten Fragen rund um
        Bestellungen, Versand, Produkte und Ihr Kundenkonto.
      </p>

      {categories.length === 0 ||
      categories.every((c) => c.items.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>Aktuell sind keine FAQ-Einträge gepflegt.</p>
          <p className="mt-2 text-sm">
            Schreib uns gern direkt über unsere{" "}
            <Link
              href="/kontakt"
              className="underline hover:text-foreground transition-colors"
            >
              Kontaktseite
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map((cat) => {
            if (cat.items.length === 0) return null;
            return (
              <section key={cat.id}>
                <header className="mb-4">
                  <h2 className="font-serif text-[24px] md:text-[28px] tracking-tight font-medium">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="mt-1 text-sm text-muted-foreground max-w-prose">
                      {cat.description}
                    </p>
                  )}
                </header>
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <details
                      key={item.id}
                      className="group border rounded-lg"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-5 font-medium hover:bg-muted/50 transition-colors rounded-lg">
                        <span className="pr-4">{item.question}</span>
                        <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                          &#9662;
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed faq-answer">
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

      <div className="border-t pt-6 mt-12 text-sm text-muted-foreground">
        <p>
          Ihre Frage ist nicht dabei? Schreiben Sie uns über unsere{" "}
          <Link
            href="/kontakt"
            className="underline hover:text-foreground transition-colors"
          >
            Kontaktseite
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
