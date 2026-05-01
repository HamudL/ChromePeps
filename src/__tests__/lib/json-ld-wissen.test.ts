import { describe, expect, it } from "vitest";
import { articleJsonLd, faqPageJsonLd } from "@/lib/json-ld";

describe("articleJsonLd", () => {
  const baseInput = {
    title: "HPLC-Reinheitsanalyse",
    excerpt: "Methodischer Überblick.",
    slug: "hplc-reinheitsanalyse",
    authorName: "Dr. M. Reichert",
    publishedAt: new Date("2026-04-28T08:00:00Z"),
  };

  it("setzt Pflichtfelder mit Schema.org-Annotations", () => {
    const out = articleJsonLd(baseInput);
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("Article");
    expect(out.headline).toBe(baseInput.title);
    expect(out.description).toBe(baseInput.excerpt);
    expect(out.url).toContain(`/wissen/${baseInput.slug}`);
    expect(out.datePublished).toBe(baseInput.publishedAt.toISOString());
    expect(out.dateModified).toBe(baseInput.publishedAt.toISOString());
    expect(out.author).toMatchObject({
      "@type": "Person",
      name: baseInput.authorName,
    });
  });

  it("nutzt updatedAt als dateModified wenn gesetzt", () => {
    const updated = new Date("2026-04-30T12:00:00Z");
    const out = articleJsonLd({ ...baseInput, updatedAt: updated });
    expect(out.dateModified).toBe(updated.toISOString());
  });

  it("hängt jobTitle an Author wenn authorTitle gesetzt", () => {
    const out = articleJsonLd({
      ...baseInput,
      authorTitle: "Analytische Chemie",
    });
    expect(out.author).toMatchObject({
      jobTitle: "Analytische Chemie",
    });
  });

  it("absoluter Cover-URL wird unverändert übernommen, relative geprefixed", () => {
    const absolute = articleJsonLd({
      ...baseInput,
      coverImage: "https://cdn.example.com/cover.jpg",
    });
    expect(absolute.image).toBe("https://cdn.example.com/cover.jpg");

    const relative = articleJsonLd({
      ...baseInput,
      coverImage: "/uploads/cover.jpg",
    });
    expect(relative.image).toMatch(/\/uploads\/cover\.jpg$/);
    expect(typeof relative.image).toBe("string");
    expect(relative.image as string).toMatch(/^https?:\/\//);
  });

  it("setzt mainEntityOfPage auf die kanonische URL", () => {
    const out = articleJsonLd(baseInput);
    expect(out.mainEntityOfPage).toMatchObject({
      "@type": "WebPage",
    });
  });
});

describe("faqPageJsonLd", () => {
  it("erzeugt Question/Answer-Liste in Schema.org-Form", () => {
    const out = faqPageJsonLd([
      { question: "Wie lange dauert der Versand?", answer: "1–3 Tage." },
      { question: "Versand in die EU?", answer: "Ja, EU-weit." },
    ]);
    expect(out["@type"]).toBe("FAQPage");
    const entities = out.mainEntity as unknown[];
    expect(entities).toHaveLength(2);
    expect(entities[0]).toMatchObject({
      "@type": "Question",
      name: "Wie lange dauert der Versand?",
      acceptedAnswer: { "@type": "Answer", text: "1–3 Tage." },
    });
  });

  it("strippt simple Markdown im Answer-Text bevor er ins Schema geht", () => {
    const out = faqPageJsonLd([
      {
        question: "Mit Formatierung?",
        answer:
          "**Wichtig:** *kursiv* mit `code` und [Link](https://example.com).",
      },
    ]);
    const text = (out.mainEntity as Array<{ acceptedAnswer: { text: string } }>)[0]
      .acceptedAnswer.text;
    expect(text).not.toContain("*");
    expect(text).not.toContain("`");
    expect(text).not.toContain("[");
    expect(text).toContain("Wichtig:");
    expect(text).toContain("kursiv");
    expect(text).toContain("Link");
  });

  it("strippt Header-, Blockquote- und Listen-Marker", () => {
    const out = faqPageJsonLd([
      {
        question: "Wie?",
        answer: "# Header\n> Quote\n- Liste",
      },
    ]);
    const text = (out.mainEntity as Array<{ acceptedAnswer: { text: string } }>)[0]
      .acceptedAnswer.text;
    expect(text).not.toMatch(/^#/);
    expect(text).not.toMatch(/^>/);
    expect(text).toContain("Header");
    expect(text).toContain("Quote");
    expect(text).toContain("Liste");
  });
});
