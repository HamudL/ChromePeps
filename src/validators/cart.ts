import { z } from "zod";

// Einziges Cart-Schema: /api/cart hat nur noch den PUT-Sync-Handler
// (Client-Cart lebt im Zustand-Store; siehe Doc-Kommentar in
// src/app/api/cart/route.ts). Die Schemas der entfernten GET/POST/
// PATCH-Handler (addToCartSchema, updateCartItemSchema) wurden mit
// den Handlern entfernt.
export const syncCartSchema = z.object({
  // .max(100): Cap gegen Memory-/DB-DoS über überlange Cart-Payloads.
  // Reale Warenkörbe liegen weit darunter; addToCart cappt zusätzlich die
  // Menge pro Position auf 99.
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        variantId: z.string().cuid().nullable().default(null),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .max(100, "Zu viele Positionen im Warenkorb"),
});

export type SyncCartInput = z.infer<typeof syncCartSchema>;
