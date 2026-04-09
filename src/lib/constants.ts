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
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
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

export const RESEARCH_DISCLAIMER =
  "All products are strictly for in-vitro research and laboratory use only. Not for human consumption. Not intended to diagnose, treat, cure, or prevent any disease.";

// ---- Email configuration ----
// These are read at runtime on the server only. Keep the fallbacks safe for
// local dev so the build doesn't fail when no Resend key is present.
export const MAIL_FROM =
  process.env.MAIL_FROM ?? "ChromePeps <no-reply@chromepeps.com>";
export const MAIL_REPLY_TO =
  process.env.MAIL_REPLY_TO ?? "support@chromepeps.com";
export const MAIL_SUPPORT_ADDRESS = "support@chromepeps.com";

// Password reset tokens expire after 1 hour.
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
