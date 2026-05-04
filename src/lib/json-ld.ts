import {
  APP_NAME,
  APP_DESCRIPTION,
  SELLER_DETAILS,
} from "@/lib/constants";

// Base URL with sensible fallback for local/dev builds.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Organization structured data for the site operator.
 * Rendered once in the root layout so Google can surface brand info.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/icon`,
    description: APP_DESCRIPTION,
    sameAs: [],
  };
}

/**
 * WebSite structured data including a SearchAction, which enables
 * the Google sitelinks search box.
 */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: BASE_URL,
    description: APP_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "de-DE",
  };
}

interface ProductJsonLdInput {
  name: string;
  slug: string;
  description: string;
  sku?: string | null;
  priceInCents: number;
  currency?: string;
  inStock: boolean;
  image?: string | null;
  brand?: string;
  ratingValue?: number;
  ratingCount?: number;
}

/**
 * Product + Offer + optional AggregateRating structured data for
 * Google Merchant / Rich Results on product detail pages.
 */
export function productJsonLd(input: ProductJsonLdInput) {
  const price = (input.priceInCents / 100).toFixed(2);
  const url = `${BASE_URL}/products/${input.slug}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
    brand: {
      "@type": "Brand",
      name: input.brand ?? APP_NAME,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: (input.currency ?? "EUR").toUpperCase(),
      price,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (input.sku) {
    data.sku = input.sku;
  }

  if (input.image) {
    data.image = input.image.startsWith("http")
      ? input.image
      : `${BASE_URL}${input.image}`;
  }

  if (
    typeof input.ratingValue === "number" &&
    typeof input.ratingCount === "number" &&
    input.ratingCount > 0
  ) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.ratingValue.toFixed(1),
      reviewCount: input.ratingCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return data;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * BreadcrumbList structured data so Google can show breadcrumb
 * trails in search results.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}

interface ArticleJsonLdInput {
  title: string;
  excerpt: string;
  slug: string;
  authorName: string;
  authorTitle?: string | null;
  publishedAt: Date;
  updatedAt?: Date | null;
  coverImage?: string | null;
}

/**
 * Article structured data für Wissens-Posts unter `/wissen/[slug]`.
 * Schema.org Article — Google Rich Results für Editorial Content.
 * Setzt `mainEntityOfPage` auf die kanonische URL, damit Google die
 * URL-Variante (Feed vs. Page) korrekt zuordnet.
 */
export function articleJsonLd(input: ArticleJsonLdInput) {
  const url = `${BASE_URL}/wissen/${input.slug}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.excerpt,
    url,
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    author: {
      "@type": "Person",
      name: input.authorName,
      ...(input.authorTitle ? { jobTitle: input.authorTitle } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  if (input.coverImage) {
    data.image = input.coverImage.startsWith("http")
      ? input.coverImage
      : `${BASE_URL}${input.coverImage}`;
  }

  return data;
}

interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * FAQPage structured data für die `/faq`-Seite.
 *
 * Strippt simple Markdown-Formatierungen aus dem Answer-Text bevor er
 * ins Schema gepackt wird — Google will Plain-Text. Wir haben hier keine
 * react-markdown-Pipeline zur Hand (Server-Helper), daher Regex-basierte
 * Säuberung: Header-Markers `#`, Emphasis `*`/`_`, Inline-Code-Backticks,
 * Blockquote-`>`, Listen-`-`. Reicht für die handgepflegten FAQ-Texte;
 * komplexere Markdown-Konstrukte bleiben sichtbar (selten).
 */
export function faqPageJsonLd(items: FaqEntry[]) {
  const stripMarkdown = (s: string): string =>
    s
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*[#>-]+\s*/gm, "")
      .replace(/\n{2,}/g, " ")
      .trim();

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarkdown(item.answer),
      },
    })),
  };
}

/**
 * LocalBusiness JSON-LD für die Kontakt-Seite. Returnt `null` wenn die
 * Adressdaten in SELLER_DETAILS noch Platzhalter (`[TODO: ...]`)
 * enthalten — sonst würde Google ein Schema mit bedeutungsloser
 * Adresse indexieren. Sobald die Werte echt sind, wird das Schema
 * automatisch ausgegeben.
 *
 * AUDIT_REPORT_v3 §4.12.
 */
export function localBusinessJsonLd(): Record<string, unknown> | null {
  // Wenn IRGENDEIN Pflichtfeld noch ein "[TODO: ...]"-Platzhalter ist,
  // generieren wir kein Schema. Optional-Felder (phone, vatId etc.)
  // werden bei TODO einfach weggelassen.
  const requiredFields = [
    SELLER_DETAILS.companyName,
    SELLER_DETAILS.streetLine1,
    SELLER_DETAILS.postalCodeCity,
    SELLER_DETAILS.country,
  ];
  if (requiredFields.some((v) => !v || v.includes("[TODO"))) return null;

  const [postalCode, ...cityParts] =
    SELLER_DETAILS.postalCodeCity.split(" ");
  const addressLocality = cityParts.join(" ");

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/kontakt`,
    name: SELLER_DETAILS.companyName,
    url: BASE_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: SELLER_DETAILS.streetLine1,
      postalCode,
      addressLocality,
      addressCountry: "DE",
    },
    email: SELLER_DETAILS.email,
  };
  if (
    SELLER_DETAILS.phone &&
    !SELLER_DETAILS.phone.includes("[TODO")
  ) {
    data.telephone = SELLER_DETAILS.phone;
  }
  if (
    SELLER_DETAILS.vatId &&
    !SELLER_DETAILS.vatId.includes("[TODO")
  ) {
    data.vatID = SELLER_DETAILS.vatId;
  }
  return data;
}
