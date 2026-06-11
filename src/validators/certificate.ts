import { z } from "zod";

export const createCertificateSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  batchNumber: z.string().min(1, "Batch number is required").max(50),
  testDate: z.coerce.date(),
  purity: z.number().min(0).max(100).nullish(),
  testMethod: z.string().max(50).default("HPLC"),
  laboratory: z.string().max(100).default("Janoshik"),
  // Dosis-Angabe der Charge (z.B. "5mg"). Optional; muss die Notation
  // einer ProductVariant.name treffen, damit die Mail-Logik beim
  // Versand die richtige Charge per Variante anhängt.
  dosage: z.string().max(20).nullish(),
  reportUrl: z.string().url("Invalid URL").nullish().or(z.literal("")),
  // pdfUrl wird in lib/mail/send.ts als Filesystem-Pfad relativ zu
  // public/ gelesen (COA-Mail-Anhang via readFile). Sicherheitsrelevant
  // ist hier nur das Traversal-Verbot (`..`) — der /uploads/-Prefix
  // wird am Verwendungsort (Mail-Code) erzwungen, NICHT in der Eingabe:
  // updateCertificateSchema ist ein partial() desselben Schemas, und
  // Bestands-Zertifikate mit historisch anderem URL-Format würden sonst
  // bei jedem Admin-Edit (auch reiner notes-Korrektur) mit 400 abgelehnt
  // und wären unpflegbar, bis jemand das Feld manuell ersetzt.
  pdfUrl: z
    .string()
    .refine(
      (v) => !v.includes(".."),
      "pdfUrl darf keine ..-Segmente enthalten"
    )
    .nullish()
    .or(z.literal("")),
  notes: z.string().max(1000).nullish(),
  isPublished: z.boolean().default(true),
});

export const updateCertificateSchema = createCertificateSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
