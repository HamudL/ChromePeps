import type {
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  OrderEvent,
  Address,
  Review,
  User,
} from "@prisma/client";

// ---- Product with Relations ----

export type ProductWithImages = Product & {
  images: ProductImage[];
};

export type ProductWithDetails = Product & {
  images: ProductImage[];
  category: Category;
  variants: ProductVariant[];
  reviews: Review[];
};

export type ProductCardData = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "shortDesc"
  | "priceInCents"
  | "compareAtPriceInCents"
  | "purity"
  | "weight"
  | "isActive"
  | "stock"
  | "createdAt"
> & {
  images: Pick<ProductImage, "url" | "alt">[];
  category: Pick<Category, "name" | "slug">;
  variants: Pick<ProductVariant, "priceInCents">[];
  /**
   * Neueste veröffentlichte Charge (COA). Wird vom Spec-Drawer der
   * ProductCard angezeigt (Reinheit als Float + Lot). Leeres Array wenn
   * für das Produkt noch kein CoA eingepflegt ist.
   */
  certificates: { batchNumber: string; purity: number | null }[];
  /**
   * Optional flag set by catalog/related-product queries when the product
   * is currently a bestseller. Undefined = not computed (no badge).
   */
  isBestseller?: boolean;
};

// ---- Order with Relations ----

export type OrderWithItems = Order & {
  items: OrderItem[];
  shippingAddress: Address | null;
  billingAddress: Address | null;
  events: OrderEvent[];
};

export type OrderListItem = Pick<
  Order,
  | "id"
  | "orderNumber"
  | "status"
  | "paymentStatus"
  | "totalInCents"
  | "currency"
  | "createdAt"
> & {
  items: Pick<OrderItem, "id" | "productName" | "quantity">[];
};

// ---- User ----

export type SafeUser = Pick<
  User,
  "id" | "name" | "email" | "image" | "role" | "createdAt"
>;

// ---- Cart ----

export interface CartItemLocal {
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  variantName: string | null;
  priceInCents: number;
  image: string | null;
  slug: string;
  stock: number;
}

// ---- API Responses ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- Search & Filters ----

export interface ProductFilters {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  purity?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
}

// ---- Admin Stats ----

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: OrderListItem[];
  revenueByMonth: { month: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
}
