import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

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
