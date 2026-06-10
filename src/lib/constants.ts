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
  // Shop-Variante der Kategorie-Liste (FilterBar auf /products +
  // Kategorie-Landingpages). Gleiche Tabelle wie CATEGORIES, aber
  // anderes Shape: zählt nur AKTIVE Produkte pro Kategorie. Eigener
  // Key, weil CATEGORIES bereits vom Admin-Endpoint mit dem Admin-
  // Shape (Count über ALLE Produkte) belegt ist — ein geteilter Key
  // würde die beiden Shapes gegenseitig vergiften.
  CATEGORIES_SHOP: "categories:shop",
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
 * Verkäufer-/Impressumsdaten — die EINE Quelle für Impressum, Datenschutz,
 * AGB, Widerruf, Kontakt-Seite, JSON-LD und das Rechnungs-PDF.
 *
 * Env-basiert (SELLER_*), damit der Betreiber vor Live-Schaltung nur die
 * .env füllen muss statt fünf Rechtsseiten zu editieren. Solange ein Wert
 * fehlt, bleibt der bisherige "[TODO: …]"-Platzhalter sichtbar — daran
 * erkennen Konsumenten (z. B. lib/json-ld.ts, die Betreiber-Hinweisboxen)
 * automatisch, dass die Daten noch unvollständig sind.
 *
 * Bewusst `||` statt `??`: eine aus .env.example kopierte, noch leere
 * Variable (SELLER_STREET="") ist definiert, aber nicht gepflegt — sie
 * soll den Platzhalter zeigen, nicht einen leeren String ins Impressum
 * rendern.
 *
 * KEIN NEXT_PUBLIC_ nötig: alle Konsumenten sind Server-Components bzw.
 * server-only (Rechnungs-PDF) — die Werte landen im gerenderten HTML,
 * nicht im Client-Bundle. Falls SELLER_DETAILS je in einer "use client"-
 * Datei gebraucht wird, müssen die betroffenen Felder auf NEXT_PUBLIC_
 * umgestellt werden, sonst greift im Browser immer der Fallback.
 */
export const SELLER_DETAILS = {
  companyName:
    process.env.SELLER_COMPANY_NAME || "ChromePeps UG (haftungsbeschränkt)",
  streetLine1: process.env.SELLER_STREET || "[TODO: Straße und Hausnummer]",
  postalCodeCity: process.env.SELLER_POSTAL_CITY || "[TODO: PLZ Ort]",
  country: process.env.SELLER_COUNTRY || "Deutschland",
  email: process.env.SELLER_EMAIL || "support@chromepeps.com",
  phone: process.env.SELLER_PHONE || "[TODO: Telefonnummer]",
  vatId: process.env.SELLER_VAT_ID || "[TODO: DE XXXXXXXXX]",
  taxId: process.env.SELLER_TAX_ID || "[TODO: Steuernummer]",
  registerCourt: process.env.SELLER_REGISTER_COURT || "[TODO: Amtsgericht]",
  registerNumber: process.env.SELLER_REGISTER_NUMBER || "[TODO: HRB XXXXXX]",
  managingDirector:
    process.env.SELLER_MANAGING_DIRECTOR || "[TODO: Geschäftsführer]",
} as const;

// True, solange mindestens ein Verkäufer-Feld noch ein "[TODO: …]"-
// Platzhalter ist. Die Rechtsseiten blenden damit ihre Betreiber-
// Warnhinweise automatisch aus, sobald alle SELLER_*-Variablen gepflegt
// sind — kein manuelles Entfernen der Hinweisboxen nötig.
export const SELLER_DETAILS_INCOMPLETE = Object.values(SELLER_DETAILS).some(
  (v) => v.includes("[TODO")
);

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
