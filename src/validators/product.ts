import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDesc: z.string().max(300).nullish(),
  sku: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with dashes"),
  priceInCents: z.number().int().positive("Price must be positive"),
  compareAtPriceInCents: z.number().int().positive().nullish(),
  categoryId: z.string().cuid(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isBestseller: z.boolean().default(false),
  // Manuelle Sortier-Position. Niedriger = weiter vorn in Listings.
  // Wird im Admin per Drag-and-Drop oder Edit-Form gesetzt.
  sortOrder: z.number().int().min(0).default(0),
  purity: z.string().max(20).nullish(),
  molecularWeight: z.string().max(50).nullish(),
  sequence: z.string().nullish(),
  casNumber: z.string().max(30).nullish(),
  storageTemp: z.string().max(50).nullish(),
  form: z.string().max(50).nullish(),
  weight: z.string().max(50).nullish(),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        alt: z.string().max(200).optional(),
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().min(3).max(50),
        priceInCents: z.number().int().positive(),
        stock: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
      })
    )
    .optional(),
  // Wirkstoff-Komponenten für Blend-Produkte. Liste der Produkt-IDs, die
  // als Bestandteile dieses Produkts gelten — beim Mail-Versand werden
  // dann auch die COAs dieser Komponenten angehängt.
  components: z
    .array(
      z.object({
        componentProductId: z.string().cuid(),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
});

export const productFilterSchema = z.object({
  categorySlug: z.string().optional(),
  search: z.string().max(200).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  purity: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "name_asc", "name_desc"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  image: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
