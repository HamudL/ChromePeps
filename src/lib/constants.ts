export const APP_NAME = "ChromePeps";
export const APP_DESCRIPTION =
  "Forschungspeptide mit unabhängig verifizierter Reinheit. Lieferung ausschließlich als Referenzmaterial für die In-vitro-Forschung; nicht zur Anwendung am Menschen oder Tier bestimmt.";

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
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  REFUNDED: "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400",
};

export const CACHE_KEYS = {
  PRODUCTS_LIST: "products:list",
  PRODUCT_DETAIL: (slug: string) => `products:detail:${slug}`,
  CATEGORIES: "categories:all",
  CART: (userId: string) => `cart:${userId}`,
  STATS: "admin:stats",
  PROMOS: "promos:all",
  // Top-N Bestseller-Produkt-IDs (Set serialisiert als Array). Wird auf
  // Homepage, Hauptkatalog, Kategorie- und Detailseite gleichermaßen
  // gelesen — daher zentraler Key statt fünf parallel laufender groupBy-
  // Queries pro Page-Render.
  BESTSELLER_IDS: "products:bestseller-ids",
} as const;

export const CACHE_TTL = {
  PRODUCTS_LIST: 60,
  PRODUCT_DETAIL: 120,
  CATEGORIES: 300,
  CART: 3600,
  STATS: 30,
  PROMOS: 60,
  // Bestseller-Liste ändert sich basierend auf Orders. 5 min ist
  // schnell genug damit ein neuer Hit-Article rechtzeitig auftaucht,
  // aber lang genug dass typische Concurrency-Spikes (100+ User in
  // einer Minute) nur EINEN groupBy-Hit auf orders auslösen.
  BESTSELLER_IDS: 300,
} as const;

// Homepage-spezifische Cache-Keys + TTLs. Eigene Konstanten, weil die
// Daten-Helper auf der Homepage (Bestseller-Cards, Category-Tiles, Live-
// Metrics) eigene Aggregations-Queries fahren, die unabhängig von
// PRODUCTS_LIST invalidiert werden.
export const HOMEPAGE_CACHE = {
  BESTSELLERS: "homepage:bestsellers",
  CATEGORIES: "homepage:categories",
  METRICS: "homepage:metrics",
} as const;

export const HOMEPAGE_CACHE_TTL = {
  // Bestseller-Liste: hängt am isBestseller-Boolean (Admin-Toggle) — kein
  // hochfrequenter Wechsel, 2 min reicht.
  BESTSELLERS: 120,
  // Categories: ändern sich extrem selten — 10 min.
  CATEGORIES: 600,
  // Live-Metrics (Charge-Count, Ø Reinheit): aggregiert COA-Daten — 5 min.
  METRICS: 300,
} as const;

// Bankverbindung für Vorkasse — kommt ausschließlich aus der Umgebung.
// Hier stand früher eine Beispiel-IBAN hartkodiert, an die echte Kunden
// überwiesen hätten. NEXT_PUBLIC_, weil Checkout/Success Client-Components
// sind und die Daten ohnehin kundensichtbar (keine Secrets).
export const BANK_DETAILS = {
  accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ?? "",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN ?? "",
  bic: process.env.NEXT_PUBLIC_BANK_BIC ?? "",
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
} as const;

// Vorkasse ist nur buchbar, wenn sie explizit aktiviert wurde UND eine
// Bankverbindung hinterlegt ist — verhindert, dass die Zahlungsart je
// wieder ohne echte Kontodaten live geht. Server-seitig erzwungen in
// /api/checkout/bank-transfer, client-seitig im Checkout ausgeblendet.
export const BANK_TRANSFER_ENABLED =
  process.env.NEXT_PUBLIC_BANK_TRANSFER_ENABLED === "true" &&
  BANK_DETAILS.iban.length > 0;

/**
 * Seller data for invoices and official documents.
 *
 * NOTE: These fields must be kept in sync with the Impressum page. The
 * placeholder values here will be replaced with the real company data
 * before going live — the invoice PDF falls back to these values.
 */
export const SELLER_DETAILS = {
  companyName: "ChromePeps UG (haftungsbeschränkt)",
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
  "Alle Produkte werden ausschließlich als Referenzmaterialien für die In-vitro-Forschung und den Laborgebrauch abgegeben. Sie sind nicht zum Konsum durch Menschen oder Tiere bestimmt und nicht für therapeutische, diagnostische oder medizinische Zwecke. Mit der Bestellung bestätigen Sie, dass Sie in einem Forschungs- oder Laborkontext tätig sind und die Substanzen ausschließlich zu diesem Zweck verwenden.";

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
