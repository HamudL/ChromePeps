import { z } from "zod";

export const createOrderSchema = z.object({
  shippingAddressId: z.string().cuid("Invalid shipping address"),
  billingAddressId: z.string().cuid("Invalid billing address").optional(),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  trackingNumber: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
