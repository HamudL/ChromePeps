import "server-only";
import { sendMail, type SendMailResult } from "./client";
import PasswordResetEmail from "@/emails/password-reset";
import EmailVerifyEmail from "@/emails/email-verify";
import OrderConfirmationEmail, {
  type OrderConfirmationItem,
  type OrderConfirmationShippingAddress,
} from "@/emails/order-confirmation";
import OrderShippedEmail, {
  type OrderShippedItem,
  type OrderShippedAddress,
} from "@/emails/order-shipped";
import ReviewRequestEmail, {
  type ReviewRequestProduct,
} from "@/emails/review-request";
import { BANK_DETAILS } from "@/lib/constants";

/**
 * High-level mail wrappers. Each one is a thin shell around `sendMail` that
 * constructs the React element, subject, and tag. Callers don't need to know
 * about templates — just pass the data.
 *
 * All wrappers inherit the graceful-failure contract from `sendMail`:
 * they never throw, they log, and they return a result the caller can log too.
 */

export interface SendPasswordResetInput {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInMinutes?: number;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: "Passwort zur\u00fccksetzen",
    tag: "password-reset",
    react: PasswordResetEmail({
      name: input.name,
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    }),
  });
}

export interface SendOrderConfirmationInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  placedAt: Date;
  items: OrderConfirmationItem[];
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  paymentMethod: "STRIPE" | "BANK_TRANSFER";
  shippingAddress?: OrderConfirmationShippingAddress | null;
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput
): Promise<SendMailResult> {
  const isBank = input.paymentMethod === "BANK_TRANSFER";
  const subject = isBank
    ? `Ihre Bestellung ${input.orderNumber} \u2013 bitte Vorkasse \u00fcberweisen`
    : `Bestellbest\u00e4tigung ${input.orderNumber}`;

  // Load COA PDFs for ordered products
  const attachments = await loadCoaAttachments(
    input.items.map((i) => i.productId).filter(Boolean) as string[]
  );

  return sendMail({
    to: input.to,
    subject,
    tag: isBank ? "order-confirmation-bank" : "order-confirmation-stripe",
    attachments,
    react: OrderConfirmationEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      orderUrl: input.orderUrl,
      placedAt: input.placedAt,
      items: input.items,
      subtotalInCents: input.subtotalInCents,
      shippingInCents: input.shippingInCents,
      taxInCents: input.taxInCents,
      discountInCents: input.discountInCents,
      totalInCents: input.totalInCents,
      paymentMethod: input.paymentMethod,
      shippingAddress: input.shippingAddress,
      bankDetails: isBank
        ? {
            accountHolder: BANK_DETAILS.accountHolder,
            iban: BANK_DETAILS.iban,
            bic: BANK_DETAILS.bic,
            bankName: BANK_DETAILS.bankName,
          }
        : undefined,
      hasCoaAttachments: attachments.length > 0,
    }),
  });
}

/** Load COA PDF files for the given product IDs and return as email attachments */
async function loadCoaAttachments(
  productIds: string[]
): Promise<import("./client").SendMailAttachment[]> {
  if (productIds.length === 0) return [];

  try {
    const { db } = await import("@/lib/db");
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    // Get the latest COA with a PDF for each product
    const coas = await db.certificateOfAnalysis.findMany({
      where: {
        productId: { in: productIds },
        isPublished: true,
        pdfUrl: { not: null },
      },
      orderBy: { testDate: "desc" },
      select: {
        pdfUrl: true,
        product: { select: { name: true } },
      },
      distinct: ["productId"],
    });

    const attachments: import("./client").SendMailAttachment[] = [];

    // Defense-in-depth: `pdfUrl` kommt aus der DB und wird von Admins
    // gesetzt. Ein kompromittierter Admin-Account (oder ein Bug, der
    // non-admin input in das Feld bringt) könnte `../../server.js`
    // hinterlegen → `join()` resolved zu einem Pfad außerhalb von
    // public/uploads/certificates und ein sensibler File wäre als
    // Mail-Anhang leakbar. Wir pinnen den erlaubten Prefix hart,
    // bevor readFile läuft — wenn der Path nicht darunter liegt,
    // überspringen wir still.
    const allowedRoot = join(
      process.cwd(),
      "public",
      "uploads",
      "certificates"
    );
    for (const coa of coas) {
      if (!coa.pdfUrl) continue;
      try {
        const filePath = join(process.cwd(), "public", coa.pdfUrl);
        if (!filePath.startsWith(allowedRoot)) {
          console.warn(
            `[mail] COA pdfUrl outside allowed root, skipping: ${coa.pdfUrl}`
          );
          continue;
        }
        const content = await readFile(filePath);
        const safeName = coa.product.name.replace(/[^a-zA-Z0-9-]/g, "_");
        attachments.push({
          filename: `COA-${safeName}.pdf`,
          content,
        });
      } catch {
        // File not found — skip silently
        console.warn(`[mail] COA PDF not found: ${coa.pdfUrl}`);
      }
    }

    return attachments;
  } catch (err) {
    console.error("[mail] Failed to load COA attachments:", err);
    return [];
  }
}

// -------- Email verification --------

export interface SendEmailVerifyInput {
  to: string;
  name?: string | null;
  verifyUrl: string;
  expiresInHours?: number;
}

export async function sendEmailVerifyEmail(
  input: SendEmailVerifyInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: "Bitte best\u00e4tigen Sie Ihre E-Mail-Adresse",
    tag: "email-verify",
    react: EmailVerifyEmail({
      name: input.name,
      verifyUrl: input.verifyUrl,
      expiresInHours: input.expiresInHours,
    }),
  });
}

// -------- Order shipped --------

export interface SendOrderShippedInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  shippedAt: Date;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: OrderShippedItem[];
  shippingAddress?: OrderShippedAddress | null;
}

export async function sendOrderShippedEmail(
  input: SendOrderShippedInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: `Ihre Bestellung ${input.orderNumber} ist unterwegs`,
    tag: "order-shipped",
    react: OrderShippedEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      orderUrl: input.orderUrl,
      shippedAt: input.shippedAt,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
      items: input.items,
      shippingAddress: input.shippingAddress,
    }),
  });
}

// -------- Review request --------

export interface SendReviewRequestInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  products: ReviewRequestProduct[];
}

export async function sendReviewRequestEmail(
  input: SendReviewRequestInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: `Wie war Ihre Bestellung ${input.orderNumber}?`,
    tag: "review-request",
    react: ReviewRequestEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      products: input.products,
    }),
  });
}
