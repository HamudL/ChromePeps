import { z } from "zod";

/**
 * Customer-facing review validator. Kept intentionally strict: short titles,
 * bounded body length, integer rating between 1 and 5.
 */
export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  rating: z
    .number({ invalid_type_error: "Rating must be a number" })
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  title: z
    .string()
    .trim()
    .max(120, "Title must be 120 characters or fewer")
    .optional()
    .or(z.literal("")),
  body: z
    .string()
    .trim()
    .max(2000, "Review must be 2000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
