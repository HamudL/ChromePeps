export const APP_NAME = "ChromePeps";
export const APP_DESCRIPTION =
  "Premium research peptides with verified purity. For laboratory and research use only.";

export const CURRENCY = "eur" as const;
export const CURRENCY_SYMBOL = "\u20AC";

export const ITEMS_PER_PAGE = 12;
export const ADMIN_ITEMS_PER_PAGE = 20;

export const PRODUCT_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A-Z", value: "name_asc" },
  { label: "Name: Z-A", value: "name_desc" },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  ARCHIVED: "Archived",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  ARCHIVED: "bg-zinc-100 text-zinc-500",
};

export const CACHE_KEYS = {
  PRODUCTS_LIST: "products:list",
  PRODUCT_DETAIL: (slug: string) => `products:detail:${slug}`,
  CATEGORIES: "categories:all",
  CART: (userId: string) => `cart:${userId}`,
  STATS: "admin:stats",
  PROMOS: "promos:all",
} as const;

export const CACHE_TTL = {
  PRODUCTS_LIST: 60,
  PRODUCT_DETAIL: 120,
  CATEGORIES: 300,
  CART: 3600,
  STATS: 30,
  PROMOS: 60,
} as const;

export const BANK_DETAILS = {
  accountHolder: "ChromePeps GmbH",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  bankName: "Commerzbank",
} as const;

/**
 * Seller data for invoices and official documents.
 *
 * NOTE: These fields must be kept in sync with the Impressum page. The
 * placeholder values here will be replaced with the real company data
 * before going live — the invoice PDF falls back to these values.
 */
export const SELLER_DETAILS = {
  companyName: "ChromePeps GmbH",
  streetLine1: "[TODO: Straße und Hausnummer]",
  postalCodeCity: "[TODO: PLZ Ort]",
  country: "Deutschland",
  email: "support@chromepeps.com",
  phone: "[TODO: Telefonnummer]",
  vatId: "[TODO: DE XXXXXXXXX]",
  taxId: "[TODO: Steuernummer]",
  registerCourt: "[TODO: Amtsgericht]",
  registerNumber: "[TODO: HRB XXXXXX]",
  managingDirector: "[TODO: Geschäftsführer]",
} as const;

// German statutory VAT rate (19%) used for invoices and checkout math.
export const TAX_RATE = 0.19;

export const RESEARCH_DISCLAIMER =
  "All products are sold strictly as reference materials for in-vitro research and laboratory use only. They are not intended for human or animal consumption, nor for any therapeutic, diagnostic, or medicinal purpose. By purchasing, you confirm that you are a qualified researcher or laboratory professional.";

// ---- Email configuration ----
// These are read at runtime on the server only. Keep the fallbacks safe for
// local dev so the build doesn't fail when no Resend key is present.
export const MAIL_FROM =
  process.env.MAIL_FROM ?? "ChromePeps <no-reply@chromepeps.com>";
export const MAIL_REPLY_TO =
  process.env.MAIL_REPLY_TO ?? "support@chromepeps.com";
export const MAIL_SUPPORT_ADDRESS = "support@chromepeps.com";

// Public-facing site URL — used in transactional E-Mails (für Footer-Link
// und Logo-Pfad). Bewusst KEIN localhost-Fallback wie in den anderen
// Callern, weil eine Mail mit einem `http://localhost:3000`-Logo bei
// jedem realen Empfänger kaputt aussieht. Dev-Mails laden das Logo
// daher per Default aus Prod — wenn man wirklich lokale Assets testen
// will, NEXT_PUBLIC_APP_URL setzen und einen Public-Tunnel nutzen.
export const WEBSITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://chromepeps.com";

// Logo für die transactional Mails. Mail-Clients laden nur absolute
// http(s)-URLs — daher zwingend aus WEBSITE_URL zusammensetzen, niemals
// als relativer Pfad referenzieren. Datei liegt in `public/email-logo.png`
// und wird vom Next-Static-Handler direkt ausgeliefert.
export const LOGO_URL = `${WEBSITE_URL}/email-logo.png`;

// Password reset tokens expire after 1 hour.
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Email verification tokens expire after 24 hours.
export const EMAIL_VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
