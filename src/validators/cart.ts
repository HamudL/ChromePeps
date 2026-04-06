import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().cuid("Invalid product"),
  variantId: z.string().cuid("Invalid variant").nullable().default(null),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99),
});

export const updateCartItemSchema = z.object({
  itemId: z.string().cuid("Invalid cart item"),
  quantity: z.number().int().min(0, "Quantity cannot be negative").max(99),
});

export const syncCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().cuid(),
      variantId: z.string().cuid().nullable().default(null),
      quantity: z.number().int().min(1).max(99),
    })
  ),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SyncCartInput = z.infer<typeof syncCartSchema>;
