import { z } from "zod";

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase alphanumeric with dashes")
    .transform((v) => v.toUpperCase()),
  description: z.string().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().int().positive("Discount must be positive"),
  maxUses: z.number().int().positive().nullable().optional(),
  minOrderCents: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
  isCombinable: z.boolean().default(false),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updatePromoCodeSchema = createPromoCodeSchema.partial();

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
