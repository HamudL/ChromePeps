import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDesc: z.string().max(300).optional(),
  sku: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with dashes"),
  priceInCents: z.number().int().positive("Price must be positive"),
  compareAtPriceInCents: z.number().int().positive().optional(),
  categoryId: z.string().cuid(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  purity: z.string().max(20).optional(),
  molecularWeight: z.string().max(50).optional(),
  sequence: z.string().optional(),
  casNumber: z.string().max(30).optional(),
  storageTemp: z.string().max(50).optional(),
  form: z.string().max(50).optional(),
  weight: z.string().max(50).optional(),
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
