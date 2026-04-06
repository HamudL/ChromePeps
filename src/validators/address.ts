import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  street: z.string().min(1, "Street is required").max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z
    .string()
    .length(2, "Country must be a 2-letter ISO code")
    .toUpperCase(),
  phone: z.string().max(30).optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = addressSchema.partial().extend({
  id: z.string().cuid(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
