import "server-only";
import { sendMail, type SendMailResult } from "./client";
import PasswordResetEmail from "@/emails/password-reset";
import OrderConfirmationEmail, {
  type OrderConfirmationItem,
  type OrderConfirmationShippingAddress,
} from "@/emails/order-confirmation";
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

  return sendMail({
    to: input.to,
    subject,
    tag: isBank ? "order-confirmation-bank" : "order-confirmation-stripe",
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
    }),
  });
}
